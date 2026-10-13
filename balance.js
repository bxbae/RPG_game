// ═══════════════════════════════════════════════════
//  balance.js — 밸런스 수식 한 곳에 모으기
//
//  게임 규칙 중 "숫자"에 해당하는 것(경험치 곡선, 몬스터 스케일, 보상, 피해, 회복)을
//  전부 이 파일의 순수 함수로 둔다. 다른 파일은 여기를 호출만 한다.
//   - 밸런스를 바꿀 때는 이 파일만 고치면 된다.
//   - DOM·전역 상태에 의존하지 않아서 Node 에서도 그대로 불러 테스트/시뮬레이션할 수 있다.
//     (tests/, tools/balance-sim.js)
//
//  ※ 현재 값은 기존 게임과 100% 같다(동작 보존 리팩터링). 수치 개편은 이 파일에서만 한다.
// ═══════════════════════════════════════════════════
"use strict";

(function (root) {
  const Balance = {
    // ── 성장 ────────────────────────────────────────
    // 경험치 곡선의 "버전". 곡선(BASE_EXP/EXP_GROWTH 등)을 바꿀 때 반드시 1 올린다.
    // 세이브에 같이 기록되어, 불러올 때 옛 곡선의 진행도를 새 곡선에 비율로 옮겨 준다(save-schema.js).
    CURVE_ID: 1,

    BASE_EXP: 100,            // 1→2 레벨에 필요한 경험치
    EXP_GROWTH: 1.3,          // 레벨마다 필요 경험치 배율
    LEVELUP: { hp: 20, atk: 5, skillPoints: 1 },

    // 다음 레벨까지 필요한 경험치. 기존 게임이 "매 레벨 floor(nextExp × 1.3)"로 누적 계산했으므로
    // 같은 결과를 내도록 똑같이 반복 계산한다(닫힌 식은 소수점 처리가 달라진다).
    expToNext(level) {
      const lv = Math.max(1, Math.floor(level) || 1);
      let n = Balance.BASE_EXP;
      for (let i = 1; i < lv; i++) n = Math.floor(n * Balance.EXP_GROWTH);
      return n;
    },

    // ── 몬스터 ──────────────────────────────────────
    // 플레이어 레벨 + 던전 층 난이도로 몬스터 능력치 배수를 구한다.
    LEVEL_SCALE_PER_LEVEL: 0.15,
    monsterScale(playerLevel, floorMult = 1) {
      return (1 + (playerLevel - 1) * Balance.LEVEL_SCALE_PER_LEVEL) * floorMult;
    },
    monsterStats(def, scale = 1) {
      return { hp: Math.floor(def.baseHp * scale), attack: Math.floor(def.baseAtk * scale) };
    },

    // ── 전투 보상 ───────────────────────────────────
    // 왕국 번영 보너스(%)는 골드에만 적용된다.
    battleRewards(monster, kingdomBonusPct = 0) {
      let gold = monster.goldRate ?? (monster.isFinal ? 500 : monster.isBoss ? 180 : 50);
      const exp = monster.expRate ?? (monster.isFinal ? 300 : monster.isBoss ? 120 : 40);
      if (kingdomBonusPct > 0) gold = Math.floor(gold * (1 + kingdomBonusPct / 100));
      return { gold, exp };
    },

    // ── 피해 / 회복 ─────────────────────────────────
    // 몬스터가 플레이어에게 주는 기본 피해(정액 차감 방식).
    damageAfterDefense(attack, defense) {
      return Math.max(0, attack - defense);
    },
    // 동료가 받는 반격 피해 비율 (1번·2번·3번 동료)
    PARTY_COUNTER_RATIO: [0.6, 0.4, 0.35],
    partyCounterDamage(monsterAttack, slot, defense) {
      const r = Balance.PARTY_COUNTER_RATIO[slot] ?? 0.35;
      return Math.max(0, Math.floor(monsterAttack * r) - defense);
    },
    // 회복 스킬 / 물약
    HEAL_SKILL: 25,
    POTION_DEFAULT: 50,
    healSkillAmount(/* maxHp */) { return Balance.HEAL_SKILL; },
    potionAmount(item /*, maxHp */) { return (item && item.heal) || Balance.POTION_DEFAULT; },
  };

  root.Balance = Balance;
  if (typeof module !== "undefined" && module.exports) module.exports = Balance;
})(typeof window !== "undefined" ? window : globalThis);
