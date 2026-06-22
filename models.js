// ═══════════════════════════════════════════════════
//  models.js  — 데이터 모델 & 상수 정의
// ═══════════════════════════════════════════════════
"use strict";

// ── 전역 게임 상수 ─────────────────────────────────
const MAX_LEVEL = 99;         // 최고 레벨 상한
const MAX_GOLD  = 9_999_999;  // 골드 상한 (9,999,999G)

// ── 직업 정의 ──────────────────────────────────────
const CLASSES = {
  knight:   { name: "기사",   hp: 160, attack: 32, defense: 8,  icon: "⚔",  portrait: "images/sd_knight.png"   },
  mage:     { name: "마법사", hp: 100, attack: 38, defense: 3,  icon: "🔮", portrait: "images/sd_magician.png" },
  magician: { name: "마법사", hp: 100, attack: 38, defense: 3,  icon: "🔮", portrait: "images/sd_magician.png" },
  archer:   { name: "궁수",   hp: 120, attack: 30, defense: 5,  icon: "🏹", portrait: "images/sd_archer.png"   },
  tanker:   { name: "탱커",   hp: 200, attack: 22, defense: 15, icon: "🛡", portrait: "images/SD_Tanker.png"   },
  healer:   { name: "힐러",   hp: 130, attack: 20, defense: 6,  icon: "✝",  portrait: "images/sd_healer.png"   },
};

// ── 동료 정의 ──────────────────────────────────────
const PARTY_MEMBERS = {
  healer:    { name: "리온",   className: "힐러",   hp: 90,  attack: 12, defense: 5, icon: "✝"  },
  tanker:    { name: "카인",   className: "탱커",   hp: 140, attack: 18, defense: 8, icon: "🛡" },
  dealer:    { name: "카르나", className: "딜러",   hp: 100, attack: 28, defense: 2, icon: "⚔"  },
  mage_party:{ name: "엘린",   className: "마법사", hp: 85,  attack: 30, defense: 1, icon: "🔮" },
  archer:    { name: "아리아", className: "궁수",   hp: 110, attack: 22, defense: 3, icon: "🏹" },
};

// ── 던전 맵 오브젝트 정의 ──────────────────────────
// dungeon-scene.js의 TILE enum과 동일한 값을 유지합니다.
// (이전 버전의 NPC:7, PLAYER:2, STAIRS:8은 실제 TILE enum과 불일치로 제거됨)
const DUNGEON_OBJECTS = {
  WALL:    0,
  FLOOR:   1,
  ENEMY:   2,
  BOSS:    3,
  CHEST:   4,
  EXIT:    5,
  STAIRS:  6,
  START:   7,
};

// ── 몬스터 정의 (19종 — 일반 12·보스 2·심연 전용 5) ──
const MONSTERS = [
  // ── 일반 던전 1층 ──────────────────────────────────
  { id:"bat",         name:"동굴 박쥐",    baseHp:60,  baseAtk:7,  img:"images/sd_bats.png",           expRate:35,  goldRate:25  },
  { id:"slime",       name:"슬라임",       baseHp:80,  baseAtk:8,  img:"images/sd_slime.png",        expRate:40,  goldRate:30  },
  { id:"ice_slime",   name:"아이스 슬라임",baseHp:95,  baseAtk:10, img:"images/sd_ice_slime.png",      expRate:48,  goldRate:38  },
  { id:"goblin",      name:"고블린",       baseHp:110, baseAtk:12, img:"images/sd_goblin.png",      expRate:55,  goldRate:45  },
  // ── 일반 던전 2층 ──────────────────────────────────
  { id:"wolf",        name:"암흑 늑대",    baseHp:125, baseAtk:13, img:"images/sd_dark_wolf.png",          expRate:62,  goldRate:50  },
  { id:"skeleton",    name:"해골 기사",    baseHp:130, baseAtk:14, img:"images/sd_skeleton.png",      expRate:70,  goldRate:55  },
  { id:"lizardman",   name:"리자드맨",     baseHp:142, baseAtk:15, img:"images/sd_lizardfolk.png",           expRate:78,  goldRate:62  },
  { id:"orc",         name:"오크 전사",    baseHp:150, baseAtk:16, img:"images/sd_orc.png",    expRate:85,  goldRate:70  },
  // ── 일반 던전 3층 ──────────────────────────────────
  { id:"orc2",        name:"오크 도발",    baseHp:170, baseAtk:18, img:"images/sd_orc2.png",expRate:100, goldRate:85  },
  { id:"mage_golem",  name:"마법 골렘",    baseHp:165, baseAtk:20, img:"images/sd_magic_Golem.png",          expRate:108, goldRate:88  },
  { id:"dark_knight", name:"암흑 기사",    baseHp:195, baseAtk:21, img:"images/sd_guardian.png",          expRate:115, goldRate:95  },
  { id:"vampire",     name:"뱀파이어",     baseHp:180, baseAtk:22, img:"images/sd_vampire.png",        expRate:125, goldRate:100 },
  // ── 심연 던전 전용 ────────────────────────────────
  { id:"wyvern",      name:"와이번",       baseHp:260, baseAtk:25, img:"images/sd_wyvern.png",         expRate:165, goldRate:135 },
  { id:"chimera",     name:"키메라",       baseHp:295, baseAtk:27, img:"images/sd_chimera.png",             expRate:190, goldRate:158 },
  { id:"lich",        name:"미라",         baseHp:350, baseAtk:26, img:"images/sd_mummy.png",          expRate:225, goldRate:185 },
  { id:"demon_knight",name:"악마 기사",    baseHp:325, baseAtk:29, img:"images/sd_demon_knight.png",   expRate:245, goldRate:205 },
  { id:"dragon",      name:"고대 드래곤",  baseHp:500, baseAtk:28, img:"images/sd_dragon.png",         expRate:290, goldRate:350, isBoss:true },
  // ── 보스 ─────────────────────────────────────────
  { id:"guardian",    name:"던전 수호자",  baseHp:400, baseAtk:22, img:"images/sd_Dungeon_Guardian.png",        expRate:200, goldRate:180, isBoss:true },
  // ── 마왕군 간부 (지역별 재난의 진짜 원인 — 각 동료의 사연과 직결) ──
  { id:"general_gramos", name:"마왕군 간부 그라모스", baseHp:480, baseAtk:24, img:"images/sd_Dungeon_Guardian.png", expRate:240, goldRate:220, isBoss:true },
  { id:"general_barkan", name:"마왕군 간부 바르칸",   baseHp:500, baseAtk:25, img:"images/sd_Dungeon_Guardian.png", expRate:250, goldRate:230, isBoss:true },
  { id:"general_lilith", name:"마왕군 간부 릴리스",   baseHp:520, baseAtk:26, img:"images/sd_Dungeon_Guardian.png", expRate:260, goldRate:240, isBoss:true },
  { id:"general_belzeron", name:"마왕군 간부 벨제론", baseHp:560, baseAtk:28, img:"images/sd_Dungeon_Guardian.png", expRate:280, goldRate:260, isBoss:true },
  { id:"demon",       name:"마왕 다르카스",baseHp:800, baseAtk:28, img:"images/sd_Demon.png",        expRate:300, goldRate:500, isBoss:true, isFinal:true },
  // ── 진짜 최종보스 — 공허의 군주 네메시스 ──
  // 다르카스가 처치된 직후, 그의 몸에 갈무리되어 있던 봉인이 무너지며 등장하는
  // 고대부터 봉인된 진짜 존재. isFinal 도 함께 줘서 보상 배율 등 기존 보스 처리
  // 로직은 그대로 타되, isTrueFinal 로 "진짜 승리"를 구분해 트리거한다.
  { id:"nemesis",     name:"공허의 군주 네메시스",baseHp:1100, baseAtk:34, img:"images/Nemesis_Lord_of_the_Void.png", expRate:400, goldRate:700, isBoss:true, isFinal:true, isTrueFinal:true },
  // ── 봉인의 관리자 — 수도 재건 완료 후 컷신 전투. 지금까지 "마왕"으로 알려졌던
  // 존재이나, 사실은 진짜 마왕(다르카스)이 갇힌 봉인을 관리하던 자였음이 드러남.
  // isFinal 이 아니므로 처치해도 게임이 끝나지 않고, 심연 던전(진실 탐색)이 열린다.
  { id:"seal_keeper", name:"봉인의 관리자",baseHp:650, baseAtk:30, img:"images/sd_Demon.png",        expRate:280, goldRate:400, isBoss:true },
];

// ── 아이템 유틸리티 ────────────────────────────────
function createItemId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeItem(item) {
  if (!item) return item;
  return { ...item, itemId: item.itemId || createItemId(), enhance: item.enhance || 0 };
}

function sameItem(a, b) {
  if (!a || !b) return false;
  if (a.itemId && b.itemId) return a.itemId === b.itemId;
  return a.name === b.name && a.type === b.type;
}

// ── Player 클래스 ──────────────────────────────────
class Player {
  constructor(type = "knight") {
    const base = CLASSES[type] || CLASSES.knight;
    this.type      = type;
    this.name      = base.name;
    this.icon      = base.icon;
    this.portrait  = base.portrait || "";

    // 스탯
    this.hp        = base.hp;
    this.maxHp     = base.hp;
    this.baseAttack= base.attack;
    this.bonusAttack= 0;
    this.money     = 300;

    // 레벨
    this.level     = 1;
    this.exp       = 0;
    this.nextExp   = 100;
    this.skillPoints = 0;

    // 장비
    const starterWeapon = {
      knight: { name:"나무 목검",  type:"weapon", weaponClass:"sword", attack:8,  defense:0, class:"normal", enhance:0 },
      mage:    { name:"나무 지팡이",type:"weapon", weaponClass:"staff", attack:6,  defense:0, class:"normal", enhance:0 },
      archer:  { name:"나무 활",    type:"weapon", weaponClass:"bow",   attack:7,  defense:0, class:"normal", enhance:0 },
    }[type] || { name:"나무 목검", type:"weapon", weaponClass:"sword", attack:8, defense:0, class:"normal", enhance:0 };
    starterWeapon.itemId = "starter-" + type;

    this.equipment      = { weapon: starterWeapon, helmet: null, armor: null };
    this.partyEquipment = { weapon: null, helmet: null, armor: null };
    this.party2Equipment= { weapon: null, helmet: null, armor: null };
    this.inventory      = [];

    // 동료
    this.party      = null;
    this.partyHp    = 0;
    this.partyMaxHp = 0;

    // 심연 보조 동료 (party2 — 일반 던전+)
    this.party2            = null;
    this.party2Hp          = 0;
    this.party2MaxHp       = 0;
    this._party2KnockedOut = false;

    // 심연 3번째 동료 (party3 — 심연 던전 전용)
    this.party3            = null;
    this.party3Hp          = 0;
    this.party3MaxHp       = 0;
    this._party3KnockedOut = false;

    // 스킬
    this.skills       = { attackBoost:0, hpBoost:0, criticalBoost:0 };
    this.activeSkills = { whirlwind:false, magicBall:false, rapidShot:false };
    this.passiveSkills= {};

    // 전투
    this.ultimateGauge= 0;
    this.guardBuff    = 0;
    this.cooldowns    = { jobSkill:0, partyUltimate:0, party2Ultimate:0, party3Ultimate:0, heal:0 };
    this.status       = { poison:0, stun:0, burn:0 };

    // 호감도
    this.affinity = { archer:0, healer:0, tanker:0, dealer:0, mage_party:0 };
    this.partyEvents = { affinity25:false, affinity50:false, affinity75:false, affinity100:false };
    this.partyUltimateUnlocked = false;
    this.partyUltimateEX      = false;
    this.partyExAwakened      = false;
    this.partyStoryUnlocked   = false;
    this.partyBondMax         = false;
    this.party2BondMax        = false;
    this.storyRewardClaimed   = {};
    this.partyCutinLevel      = { healer:0, tanker:0, mage_party:0, archer:0, dealer:0 };

    // 퀘스트
    this.quest         = null;
    this.questProgress = 0;

    // 진행
    this.killCount      = 0;
    this.abyssUnlocked  = false;
    this.metVillageChief = false; // 이장 첫 만남 여부
    this.guideDailyDate  = "";   // 일일 퀘스트 날짜
    this.guideDailyInvest = 0;   // 오늘 투자액
    this.guideDailyBattle = 0;   // 오늘 전투 승리 수
    this.princessAffinity = 0;        // 공주 호감도 (0~100)
    this.princessEvents   = { aff25:false, aff50:false, aff75:false, aff100:false };
    this.princessTalkDate = "";       // 마지막으로 공주와 대화한 날 (일일 1회 제한)
    this.introChainDone  = false;     // 첫 마을 입장 오프닝 스토리 체인 완료 여부
    this.introPendingEquipPrompt = false; // 합류 대화 종료 후 장비 안내 대사 트리거용
    this.introDepartureDone = false;      // 첫 "성 밖" 출발 전 대사 완료 여부
    this.guardianDefeated = false; // 일반 던전 보스 처치 → 심연 해금
    this.abyssKillCount = 0;
    this.pendingAbyssBoss = false;
    this.storyPhase     = "town";

    // 은행/투자 시스템
    this.bank = { deposit:0, interest:0, totalInvested:0, milestones:[] };

    // 업적
    this.achievements = {};

    // 탐험
    this.mapX = 1;  // 던전 맵 타일 위치
    this.mapY = 1;
    this.pixelX = 0; // 픽셀 위치 (렌더용)
    this.pixelY = 0;
  }

  // ── money: 모든 골드 변동을 자동으로 상한(MAX_GOLD) 클램프 ──
  get money()  { return this._money ?? 0; }
  set money(v) { this._money = Math.min(MAX_GOLD, Math.max(0, Math.floor(+v || 0))); }

  // ── 계산 프로퍼티 ──
  get totalAttack() {
    let atk = this.baseAttack
      + (this.equipment.weapon?.attack  || 0)
      + (this.equipment.weapon?.enhance || 0)
      + this.skills.attackBoost * 3
      + this.bonusAttack;

    // 광전사 패시브
    const bersLv = (this.passiveSkills || {}).berserker || 0;
    if (bersLv > 0) {
      const ratio = this.hp / (this.maxHp + this.bonusHp);
      const thr   = [0, 0.3, 0.4, 0.5][bersLv];
      const bonus = [0, 0.2, 0.35, 0.5][bersLv];
      if (ratio <= thr) atk = Math.floor(atk * (1 + bonus));
    }
    return atk + this.setBonus.attack;
  }

  get bonusHp() { return this.skills.hpBoost * 20; }

  get defense() {
    const ironLv = (this.passiveSkills || {}).iron_body || 0;
    return (this.equipment.helmet?.defense || 0)
         + (this.equipment.armor?.defense  || 0)
         + [0, 5, 12, 22][ironLv]
         + this.setBonus.defense;
  }

  get partyAttack() {
    if (!this.party) return 0;
    return (PARTY_MEMBERS[this.party]?.attack || 0)
         + (this.partyEquipment.weapon?.attack || 0)
         + (this.partyEquipment.weapon?.enhance || 0);
  }

  get partyDefense() {
    return (this.partyEquipment.helmet?.defense || 0)
         + (this.partyEquipment.armor?.defense  || 0);
  }

  // 심연 보조 동료 스탯 (이제 장비 반영)
  get party2Attack() {
    if (!this.party2) return 0;
    return (PARTY_MEMBERS[this.party2]?.attack || 0)
         + (this.party2Equipment.weapon?.attack  || 0)
         + (this.party2Equipment.weapon?.enhance || 0);
  }

  get party2Defense() {
    if (!this.party2) return 0;
    return (PARTY_MEMBERS[this.party2]?.defense || 0)
         + (this.party2Equipment.helmet?.defense || 0)
         + (this.party2Equipment.armor?.defense  || 0);
  }

  // 심연 3번째 동료 스탯
  get party3Attack() {
    if (!this.party3) return 0;
    return PARTY_MEMBERS[this.party3]?.attack || 0;
  }

  get party3Defense() {
    if (!this.party3) return 0;
    return PARTY_MEMBERS[this.party3]?.defense || 0;
  }

  // 세트 효과 계산
  get setBonus() {
    const w = this.equipment.weapon?.name  || "";
    const h = this.equipment.helmet?.name  || "";
    const a = this.equipment.armor?.name   || "";
    let atk = 0, def = 0, crit = 0;

    if (w.includes("수호자") && h.includes("수호자") && a.includes("수호자"))
      { atk += 50; def += 20; }
    if (w.includes("용사") && h.includes("용사") && a.includes("용사"))
      { atk += 100; def += 50; crit += 20; }
    const abyssCount = [w, h, a].filter(n => n.startsWith("심연의")).length;
    if (abyssCount >= 3) { atk += 80; def += 50; }

    return { attack: atk, defense: def, crit };
  }

  gainExp(amount) {
    // 최고 레벨 도달 후 경험치 획득 불가 — EXP 바는 풀 상태로 고정
    if (this.level >= MAX_LEVEL) {
      this.exp = this.nextExp - 1;
      return false;
    }

    this.exp += amount;
    let leveledUp = false;

    while (this.exp >= this.nextExp && this.level < MAX_LEVEL) {
      this.exp        -= this.nextExp;
      this.level      += 1;
      this.skillPoints += 1;
      this.maxHp      += 20;
      this.hp          = this.maxHp + this.bonusHp;
      this.baseAttack  += 5;
      this.nextExp     = Math.floor(this.nextExp * 1.3);
      leveledUp        = true;
    }

    // MAX_LEVEL 도달 직후 잉여 경험치 정리 — 바가 꽉 찬 채로 고정
    if (this.level >= MAX_LEVEL) {
      this.exp = this.nextExp - 1;
    }

    return leveledUp;
  }
}

// ── 몬스터 인스턴스 생성 ───────────────────────────
function createMonsterInstance(id, difficultyMult = 1) {
  // 알 수 없는 ID: 슬라임을 기본 폴백으로 고정 (배열 순서 변경에 무관)
  const def = MONSTERS.find(m => m.id === id)
           || MONSTERS.find(m => m.id === "slime")
           || MONSTERS[0];
  const hp  = Math.floor(def.baseHp * difficultyMult);
  return {
    ...def,
    hp, maxHp: hp,
    attack: Math.floor(def.baseAtk * difficultyMult),
    status: { poison:0, stun:0, burn:0 },
    phase: 1,
  };
}

// ── 랜덤 아이템 생성 ──────────────────────────────
function createRandomItem(isBossReward = false, minGrade = 0) {
  const grades  = ["일반","고급","희귀","영웅","전설"];
  const colors  = ["normal","uncommon","rare","epic","legend"];
  const roll    = Math.random();
  let grade = roll > 0.98 ? 4 : roll > 0.9 ? 3 : roll > 0.7 ? 2 : roll > 0.4 ? 1 : 0;
  if (isBossReward) grade = Math.max(grade, 2);
  grade = Math.max(grade, minGrade); // 출석 보상·특수 드랍 최소 등급 보장

  const bonus  = [0, 5, 12, 25, 40][grade];
  const types  = ["weapon","armor","helmet"];
  const type   = types[Math.floor(Math.random() * 3)];

  // weapon 드랍에 직업별 무기 종류 랜덤 배정 — 상점과 동일하게 제한 적용
  const WEAPON_CLASSES = ["sword", "staff", "bow"];
  const WEAPON_NAMES   = { sword: "검", staff: "지팡이", bow: "활" };
  const weaponClass    = type === "weapon"
    ? WEAPON_CLASSES[Math.floor(Math.random() * WEAPON_CLASSES.length)]
    : undefined;

  const names = {
    weapon: weaponClass ? WEAPON_NAMES[weaponClass] : "무기",
    armor:  "갑옷",
    helmet: "투구",
  };

  return normalizeItem({
    name:    `${grades[grade]} ${names[type]}`,
    type,
    ...(weaponClass && { weaponClass }),
    attack:  type === "weapon" ? 12 + bonus : 0,
    defense: type !== "weapon" ? 6  + bonus : 0,
    class:   colors[grade],
    enhance: 0,
  });
}

// ── 퀘스트 목록 ───────────────────────────────────
const QUESTS = [
  { id:"q_slime",
    title:"슬라임 토벌", target:"슬라임", goal:5,
    rewardGold:100, rewardExp:60, minLevel:1,
    giver:"상인 카를로", giverColor:"#44dd88",
    giverPortrait:"images/sd_merchant.png",
    giverNpc:"qaccept_q_slime", completeNpc:"qcomplete_q_slime" },

  { id:"q_goblin",
    title:"고블린 소탕", target:"고블린", goal:4,
    rewardGold:150, rewardExp:90, minLevel:1,
    giver:"마을 주민 마르타", giverColor:"#ddbb88",
    giverPortrait:"images/sd_merchant.png",
    giverNpc:"qaccept_q_goblin", completeNpc:"qcomplete_q_goblin" },

  { id:"q_skeleton",
    title:"해골 기사 격멸", target:"해골 기사", goal:3,
    rewardGold:280, rewardExp:160, minLevel:3,
    giver:"경비대장 가르", giverColor:"#aaaacc",
    giverPortrait:"images/portrait_Knight.png",
    giverNpc:"qaccept_q_skeleton", completeNpc:"qcomplete_q_skeleton" },

  { id:"q_orc",
    title:"오크 전사 토벌", target:"오크 전사", goal:3,
    rewardGold:220, rewardExp:130, minLevel:2,
    giver:"농부 티모", giverColor:"#99cc77",
    giverPortrait:"images/sd_merchant.png",
    giverNpc:"qaccept_q_orc", completeNpc:"qcomplete_q_orc" },

  { id:"q_orc2",
    title:"오크 도발꾼 처단", target:"오크 도발", goal:2,
    rewardGold:350, rewardExp:200, minLevel:4,
    giver:"공주 실비아", giverColor:"#ffaacc",
    giverPortrait:"images/Silvia_front.png",
    giverNpc:"qaccept_q_orc2", completeNpc:"qcomplete_q_orc2" },

  { id:"q_guardian",
    title:"수호자 토벌", target:"던전 수호자", goal:1,
    rewardGold:800, rewardExp:500, minLevel:6,
    giver:"왕 에드워드 3세", giverColor:"#FFD700",
    giverPortrait:"images/King_Edward_III_SIDE.png",
    giverNpc:"qaccept_q_guardian", completeNpc:"qcomplete_q_guardian" },
];

// ── 상점 아이템 ───────────────────────────────────
const SHOP_ITEMS = [
  // ── 기사 (sword) ──────────────────────────────
  { name:"철검",        type:"weapon", weaponClass:"sword", attack:20, defense:0,  class:"normal", cost:60,  enhance:0 },
  { name:"강철검",      type:"weapon", weaponClass:"sword", attack:35, defense:0,  class:"rare",   cost:140, enhance:0 },
  // ── 마법사 (staff) ─────────────────────────────
  { name:"나무 지팡이", type:"weapon", weaponClass:"staff", attack:18, defense:0,  class:"normal", cost:60,  enhance:0 },
  { name:"수정 지팡이", type:"weapon", weaponClass:"staff", attack:32, defense:0,  class:"rare",   cost:140, enhance:0 },
  // ── 궁수 (bow) ────────────────────────────────
  { name:"단궁",        type:"weapon", weaponClass:"bow",   attack:16, defense:0,  class:"normal", cost:55,  enhance:0 },
  { name:"장궁",        type:"weapon", weaponClass:"bow",   attack:30, defense:0,  class:"rare",   cost:130, enhance:0 },
  // ── 방어구 (공용) ─────────────────────────────
  { name:"철 갑옷",   type:"armor",  attack:0, defense:10, class:"normal", cost:50,  enhance:0 },
  { name:"사슬 갑옷", type:"armor",  attack:0, defense:18, class:"rare",   cost:120, enhance:0 },
  { name:"철 투구",   type:"helmet", attack:0, defense:5,  class:"normal", cost:35,  enhance:0 },
  { name:"강철 투구", type:"helmet", attack:0, defense:10, class:"rare",   cost:90,  enhance:0 },
  // ── 소비 ─────────────────────────────────────
  { name:"회복 물약", type:"potion", attack:0, defense:0,  heal:50,  class:"normal", cost:40, enhance:0 },
];

// ── 골드 표시 포맷 (콤마 + MAX 표기) ──────────────
function formatGold(amount) {
  const n = Math.floor(amount);
  const s = n.toLocaleString("ko-KR") + "G";
  return n >= MAX_GOLD ? s + " ✦MAX" : s;
}

// 전역 노출
window.MAX_LEVEL   = MAX_LEVEL;
window.MAX_GOLD    = MAX_GOLD;
window.formatGold  = formatGold;
window.CLASSES         = CLASSES;
window.PARTY_MEMBERS   = PARTY_MEMBERS;
window.DUNGEON_OBJECTS = DUNGEON_OBJECTS;
window.MONSTERS        = MONSTERS;
window.QUESTS          = QUESTS;
window.SHOP_ITEMS      = SHOP_ITEMS;
window.Player          = Player;
window.createItemId    = createItemId;
window.normalizeItem   = normalizeItem;
window.sameItem        = sameItem;
window.createMonsterInstance = createMonsterInstance;
window.createRandomItem      = createRandomItem;