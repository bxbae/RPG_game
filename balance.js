// ═══════════════════════════════════════════════════
//  balance.js — 밸런스 수식 한 곳에 모으기
//
//  게임 규칙 중 "숫자"에 해당하는 것(경험치 곡선, 몬스터 스케일, 보상, 피해, 회복)을
//  전부 이 파일의 순수 함수로 둔다. 다른 파일은 여기를 호출만 한다.
//   - 밸런스를 바꿀 때는 이 파일만 고치면 된다.
//   - DOM·전역 상태에 의존하지 않아서 Node 에서도 그대로 불러 테스트/시뮬레이션할 수 있다.
//     (tests/, tools/balance-sim.js)
//
//  개편 이력
//   곡선 1  (v2.2 이전) 경험치 ×1.3 지수 성장, 몬스터 +15%/레벨, 보상 고정, 정액 방어, 고정 회복 → 레벨 20 부근에서 막히고
//           레벨이 오를수록 전투가 더 위험해지는 구조였다 (tools/balance-sim.js 로 확인)
//   곡선 2  (v2.3) 최고 레벨 50, 경험치 완만한 거듭제곱 성장, 몬스터 +8.5%/레벨 + 보상이 같은 배수로 증가,
//           방어는 비율 감쇠, 회복은 최대 HP 비율. 목표: 전투당 HP 손실 15~35%, 레벨당 처치 수 완만 증가
// ═══════════════════════════════════════════════════
"use strict";

(function (root) {
  const Balance = {
    // ── 성장 ────────────────────────────────────────
    // 경험치 곡선의 "버전". 곡선(BASE_EXP/EXP_GROWTH 등)을 바꿀 때 반드시 1 올린다.
    // 세이브에 같이 기록되어, 불러올 때 옛 곡선의 진행도를 새 곡선에 비율로 옮겨 준다(save-schema.js).
    CURVE_ID: 2,

    MAX_LEVEL: 50,            // 최고 레벨
    BASE_EXP: 100,            // 1→2 레벨에 필요한 경험치
    EXP_COEF: 30,             // 레벨이 오를 때 늘어나는 경험치의 크기
    EXP_POWER: 1.65,          // 1이면 직선, 2면 제곱. 지수 성장(×1.3)이 아니라 완만한 거듭제곱이라 후반이 막히지 않는다
    LEVELUP: { hp: 20, atk: 5, skillPoints: 1 },

    // 직업별 레벨업 성장량(없는 직업은 LEVELUP 기본값). 직업의 성격(마법사·궁수=공격형, 탱커·힐러=방어형)은 여기서 조절한다.
    CLASS_GROWTH: {
      mage:   { hp: 28, atk: 7 },       // 공격형: 기본 방어가 낮은 대신 레벨업 때 더 많이 큰다
      archer: { hp: 30, atk: 7.5 },
      tanker: { hp: 18, atk: 4.5 },     // 방어 패시브·방패 강타로 이미 단단해서 성장은 조금 낮춘다
      healer: { hp: 17, atk: 4 },
    },
    growth(type) { return { ...Balance.LEVELUP, ...(Balance.CLASS_GROWTH[type] || {}) }; },

    // 다음 레벨까지 필요한 경험치 = BASE + COEF × (레벨-1)^POWER
    expToNext(level) {
      const lv = Math.max(1, Math.floor(level) || 1);
      return Math.floor(Balance.BASE_EXP + Balance.EXP_COEF * Math.pow(lv - 1, Balance.EXP_POWER));
    },

    // ── 몬스터 ──────────────────────────────────────
    // 플레이어 레벨 + 던전 층 난이도로 몬스터 능력치 배수를 구한다.
    LEVEL_SCALE_PER_LEVEL: 0.085,
    // 구역·층에는 "기준 레벨"(zoneLevel)이 있다. 몬스터는 플레이어 레벨을 일부(ZONE_FOLLOW)만 따라간다:
    //   기준 레벨보다 약하게 들어가면 몬스터가 상대적으로 더 강하고, 기준보다 강해지면 점점 쉬워진다.
    //   (전부 따라가면 어느 구역이든 레벨과 무관하게 같은 난이도라 구역 순서가 의미 없어진다 — tools/fullkit-sim.js 로 확인)
    //   zoneLevel 을 생략하면 예전처럼 플레이어 레벨을 그대로 따라간다.
    ZONE_FOLLOW: 0.35,
    effectiveLevel(playerLevel, zoneLevel) {
      if (!zoneLevel) return playerLevel;
      return Math.max(1, zoneLevel + (playerLevel - zoneLevel) * Balance.ZONE_FOLLOW);
    },
    monsterScale(playerLevel, floorMult = 1, zoneLevel) {
      return (1 + (Balance.effectiveLevel(playerLevel, zoneLevel) - 1) * Balance.LEVEL_SCALE_PER_LEVEL) * floorMult;
    },
    monsterStats(def, scale = 1) {
      return { hp: Math.floor(def.baseHp * scale), attack: Math.floor(def.baseAtk * scale) };
    },

    // ── 전투 보상 ───────────────────────────────────
    // 보상은 몬스터가 강해진 배수(monster.scale = 레벨 × 층 난이도)만큼 함께 늘어난다.
    //   → 레벨이 올라 몬스터가 강해져도 "같은 수고로 같은 가치"를 벌고, 깊은 층일수록 더 번다.
    // 왕국 번영 보너스(%)는 골드에만 적용된다.
    battleRewards(monster, kingdomBonusPct = 0) {
      const scale = monster.scale ?? 1;
      const baseGold = monster.goldRate ?? (monster.isFinal ? 500 : monster.isBoss ? 180 : 50);
      const baseExp  = monster.expRate  ?? (monster.isFinal ? 300 : monster.isBoss ? 120 : 40);
      let gold = Math.floor(baseGold * scale);
      const exp = Math.floor(baseExp * scale);
      if (kingdomBonusPct > 0) gold = Math.floor(gold * (1 + kingdomBonusPct / 100));
      return { gold, exp };
    },

    // ── 직업 스킬 ───────────────────────────────────
    JOB_SKILL_KEY: { knight:"whirlwind", night:"whirlwind", warrior:"whirlwind", mage:"magicBall", archer:"rapidShot", tanker:"shieldBash", healer:"holyLight" },
    BLESSING: [0, 0.08, 0.16, 0.24],      // 힐러 패시브 '축복': 회복 스킬 증가율(레벨 1~3)
    JOB_SKILL: { tankerMult: 1.6, tankerGuard: 1, healerMult: 1.3, healerHealPct: 0.04, healerUltHealPct: 0.2 },

    // ── 동료 슬롯 ───────────────────────────────────
    // 던전 종류별로 함께 싸우는 동료 수: 심연 3명, 그 밖(성 밖 사냥터·일반·지역 던전)은 2명.
    // 전투 계산(공격 가세·반격 피해·궁극기)과 전투 화면이 모두 이 값을 따른다.
    // (v2.7 에서 성 밖을 0명으로 했더니 처음 동료를 초대해도 전투 화면에 주인공만 보여서 2명으로 되돌렸다)
    partySlots(dungeonType) {
      return dungeonType === "abyss" ? 3 : 2;
    },

    // ── 동료 궁극기 ─────────────────────────────────
    // 예전에는 마법사 동료(엘린)의 궁극기가 주인공 공격력의 5~13배라 한 방에 끝났고 궁수 동료는 전혀 못 따라갔다(tools/fullkit-sim.js).
    PARTY_ULT: {
      mage:   { mult: 3.5, exMult: 5.5, storyMult: 6, storyExMult: 8 },   // 주인공 공격력 배수
      archer: { hits: 6, exHits: 10, atkShare: 0.25 },                    // 타수, 타당 피해 = 동료 공격력 + 주인공 공격력 × atkShare
    },
    // 피해를 주는 동료 궁극기는 레벨에 따라 위력이 커진다. 몬스터 HP 에 대한 비율이 초반(Lv15 약 100%)엔 한 방에 끝나고
    // 후반(Lv47 약 40%)엔 보조에 그쳤기 때문이다 — 이 계수로 어느 구간에서나 몬스터 HP 의 절반 안팎이 되게 맞춘다.
    partyUltLevelFactor(level) { return Math.min(1.3, Math.max(0.3, 0.2 + 0.0205 * (level || 1))); },
    partyMageMult(story, ex, level) {
      const u = Balance.PARTY_ULT.mage;
      return (story ? (ex ? u.storyExMult : u.storyMult) : (ex ? u.exMult : u.mult)) * Balance.partyUltLevelFactor(level);
    },
    partyArcherHits(ex) { const u = Balance.PARTY_ULT.archer; return ex ? u.exHits : u.hits; },
    partyArcherHit(partyAttack, heroAttack, level) {
      return Math.floor((partyAttack + heroAttack * Balance.PARTY_ULT.archer.atkShare) * Balance.partyUltLevelFactor(level));
    },

    // ── 피해 / 회복 ─────────────────────────────────
    // 방어는 "비율 감쇠": 피해 = 공격 × K/(K+방어).  방어 K 면 피해가 절반.
    //   (예전 정액 차감 방식은 초반엔 방어가 공격을 넘어 피해가 0, 후반엔 방어가 무의미해졌다.)
    //   공격이 있는 한 최소 1은 들어가서 어떤 방어로도 완전 무적이 되지 않는다.
    DEFENSE_K: 100,
    damageAfterDefense(attack, defense) {
      if (!(attack > 0)) return 0;
      const def = Math.max(0, defense || 0);
      return Math.max(1, Math.floor(attack * Balance.DEFENSE_K / (Balance.DEFENSE_K + def)));
    },
    // 동료가 받는 반격 피해 비율 (1번·2번·3번 동료)
    PARTY_COUNTER_RATIO: [0.6, 0.4, 0.35],
    partyCounterDamage(monsterAttack, slot, defense) {
      const r = Balance.PARTY_COUNTER_RATIO[slot] ?? 0.35;
      return Balance.damageAfterDefense(Math.floor(monsterAttack * r), defense);
    },
    // 회복은 최대 HP 의 비율 (고정값이면 레벨이 오를수록 의미가 없어진다). 아래 값은 그 최솟값.
    HEAL_SKILL: 25,           // 회복 스킬 최소 회복량
    HEAL_SKILL_PCT: 0.20,     // 회복 스킬: 최대 HP 의 20%
    POTION_DEFAULT: 50,       // 물약 최소 회복량(아이템에 heal 값이 없을 때의 기본값)
    POTION_PCT: 0.35,         // 물약: 최대 HP 의 35%
    healSkillAmount(maxHp) { return Math.max(Balance.HEAL_SKILL, Math.floor((maxHp || 0) * Balance.HEAL_SKILL_PCT)); },
    potionAmount(item, maxHp) {
      const flat = (item && item.heal) || Balance.POTION_DEFAULT;
      return Math.max(flat, Math.floor((maxHp || 0) * Balance.POTION_PCT));
    },
  };

  root.Balance = Balance;
  if (typeof module !== "undefined" && module.exports) module.exports = Balance;
})(typeof window !== "undefined" ? window : globalThis);
