// ═══════════════════════════════════════════════════
//  models.js  — 데이터 모델 & 상수 정의
// ═══════════════════════════════════════════════════
"use strict";

// ── 직업 정의 ──────────────────────────────────────
const CLASSES = {
  knight: {
    name: "기사",
    hp: 160,
    attack: 32,
    icon: "⚔",
    portrait: "images/portrait_Knight.png",
  },
  magician: {
    name: "마법사",
    hp: 100,
    attack: 22,
    icon: "🔮",
    portrait: "images/portrait_magician.png",
  },
  archer: {
    name: "궁수",
    hp: 120,
    attack: 28,
    icon: "🏹",
    portrait: "images/portrait_archer.png",
  },
  tanker: {
    name: "탱커",
    hp: 220,
    attack: 24,
    icon: "🛡",
    portrait: "images/portrait_tanker.png",
  },
};

// ── 동료 정의 ──────────────────────────────────────
const PARTY_MEMBERS = {
  healer: {
    name: "리온",
    className: "힐러",
    hp: 90,
    attack: 12,
    defense: 5,
    icon: "✝",
  },
  tanker: {
    name: "카인",
    className: "탱커",
    hp: 140,
    attack: 18,
    defense: 8,
    icon: "🛡",
  },
  dealer: {
    name: "카르나",
    className: "딜러",
    hp: 100,
    attack: 28,
    defense: 2,
    icon: "⚔",
  },
  mage_party: {
    name: "엘린",
    className: "마법사",
    hp: 85,
    attack: 30,
    defense: 1,
    icon: "🔮",
  },
  archer: {
    name: "아리아",
    className: "궁수",
    hp: 110,
    attack: 22,
    defense: 3,
    icon: "🏹",
  },
};

// ── 던전 맵 오브젝트 정의 ──────────────────────────
const DUNGEON_OBJECTS = {
  WALL: 0,
  FLOOR: 1,
  PLAYER: 2,
  ENEMY: 3,
  BOSS: 4,
  CHEST: 5,
  EXIT: 6,
  NPC: 7,
  STAIRS: 8,
};

// ── 몬스터 정의 ────────────────────────────────────
const MONSTERS = [
  {
    id: "slime",
    name: "슬라임",
    baseHp: 80,
    baseAtk: 8,
    img: "images/sd_slime.png",
    expRate: 40,
    goldRate: 30,
  },
  {
    id: "goblin",
    name: "고블린",
    baseHp: 110,
    baseAtk: 12,
    img: "images/sd_goblin.png",
    expRate: 55,
    goldRate: 45,
  },
  {
    id: "skeleton",
    name: "해골 기사",
    baseHp: 130,
    baseAtk: 14,
    img: "images/sd_skeleton.png",
    expRate: 70,
    goldRate: 55,
  },
  {
    id: "orc",
    name: "오크 전사",
    baseHp: 150,
    baseAtk: 16,
    img: "images/sd_orc.png",
    expRate: 85,
    goldRate: 70,
  },
  {
    id: "orc2",
    name: "오크 도발",
    baseHp: 170,
    baseAtk: 18,
    img: "images/sd_orc2.png",
    expRate: 100,
    goldRate: 85,
  },
  {
    id: "guardian",
    name: "던전 수호자",
    baseHp: 400,
    baseAtk: 22,
    img: "images/sd_guardian.png",
    expRate: 200,
    goldRate: 180,
    isBoss: true,
  },
  {
    id: "demon",
    name: "마왕 다르카스",
    baseHp: 800,
    baseAtk: 28,
    img: "images/sd_demon.png",
    expRate: 300,
    goldRate: 500,
    isBoss: true,
    isFinal: true,
  },
  // ══════════════════════════════════════════════
  //  심연 전용 몬스터
  // ══════════════════════════════════════════════
  {
    id: "abyss_knight",
    name: "심연 기사",
    baseHp: 220,
    baseAtk: 26,
    img: "images/sd_skeleton.png",
    expRate: 150,
    goldRate: 120,
  },
  {
    id: "abyss_mage",
    name: "심연 마법사",
    baseHp: 180,
    baseAtk: 32,
    img: "images/sd_abyss_mage.png",
    expRate: 160,
    goldRate: 130,
  },
  {
    id: "abyss_guardian",
    name: "심연 수호자",
    baseHp: 280,
    baseAtk: 36,
    img: "images/sd_Dungeon_Guardian.png",
    expRate: 220,
    goldRate: 180,
  },
  {
    id: "abyss_demon",
    name: "어둠의 악마",
    baseHp: 350,
    baseAtk: 42,
    img: "images/sd_Demon.png",
    expRate: 280,
    goldRate: 240,
  },
  {
    id: "abyss_adversary",
    name: "어드버서리",
    baseHp: 420,
    baseAtk: 48,
    img: "images/sd_Adversary.png",
    expRate: 340,
    goldRate: 300,
  },
  {
    id: "abyss_overlord",
    name: "심연 지배자",
    baseHp: 900,
    baseAtk: 55,
    img: "images/sd_guardian.png",
    expRate: 600,
    goldRate: 700,
    isBoss: true,
  },
  {
    id: "abyss_lord",
    name: "심연 군주",
    baseHp: 1500,
    baseAtk: 65,
    img: "images/sd_Adversary.png",
    expRate: 800,
    goldRate: 1200,
    isBoss: true,
    isFinal: true,
  },
  // ★ 도시 탐험 몬스터
  {
    id: "city_thief",
    name: "도시 도적",
    baseHp: 100,
    baseAtk: 14,
    img: "images/sd_goblin.png",
    expRate: 80,
    goldRate: 100,
  },
  {
    id: "city_guard",
    name: "타락한 경비",
    baseHp: 160,
    baseAtk: 18,
    img: "images/sd_orc.png",
    expRate: 100,
    goldRate: 120,
  },
  {
    id: "city_boss",
    name: "암흑 단장",
    baseHp: 600,
    baseAtk: 32,
    img: "images/sd_adversary.png",
    expRate: 400,
    goldRate: 600,
    isBoss: true,
  },
];

// ── 아이템 유틸리티 ────────────────────────────────
function createItemId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function normalizeItem(item) {
  if (!item) return item;
  return {
    ...item,
    itemId: item.itemId || createItemId(),
    enhance: item.enhance || 0,
  };
}
function sameItem(a, b) {
  if (!a || !b) return false;
  if (a.itemId && b.itemId) return a.itemId === b.itemId;
  return a.name === b.name && a.type === b.type;
}

// ── Player 클래스 ──────────────────────────────────
class Player {
  constructor(type = "knight") {
    const base = CLASSES[type] || CLASSES.night;
    this.type = type;
    this.name = base.name;
    this.icon = base.icon;
    this.portrait = base.portrait || "";
    this.hp = base.hp;
    this.maxHp = base.hp;
    this.baseAttack = base.attack;
    this.bonusAttack = 0;
    this.money = 300;
    this.level = 1;
    this.exp = 0;
    this.nextExp = 100;
    this.skillPoints = 0;

    const starterWeapon = {
      knight: {
        name: "나무 목검",
        type: "weapon",
        weaponClass: "sword",
        attack: 8,
        defense: 0,
        class: "normal",
        enhance: 0,
      },
      magician: {
        name: "나무 지팡이",
        type: "weapon",
        weaponClass: "staff",
        attack: 6,
        defense: 0,
        class: "normal",
        enhance: 0,
      },
      archer: {
        name: "나무 활",
        type: "weapon",
        weaponClass: "bow",
        attack: 7,
        defense: 0,
        class: "normal",
        enhance: 0,
      },
    }[type] || {
      name: "나무 목검",
      type: "weapon",
      weaponClass: "sword",
      attack: 8,
      defense: 0,
      class: "normal",
      enhance: 0,
    };
    starterWeapon.itemId = "starter-" + type;

    this.equipment = { weapon: starterWeapon, helmet: null, armor: null };
    this.partyEquipment = { weapon: null, helmet: null, armor: null };
    this.inventory = [];
    this.party = null;
    this.partyHp = 0;
    this.partyMaxHp = 0;
    this.skills = { attackBoost: 0, hpBoost: 0, criticalBoost: 0 };
    this.activeSkills = {
      whirlwind: false,   // 기사 — 회전베기
      magicBall: false,   // 마법사 — 매직볼
      rapidShot: false,   // 궁수 — 속사
      ironWall:  false,   // 탱커 — 방패 강타
    };
    this.passiveSkills = {};
    this.ultimateGauge = 0;
    this.guardBuff = 0;
    this.cooldowns = { jobSkill: 0, partyUltimate: 0, heal: 0 };
    this.status = { poison: 0, stun: 0, burn: 0, freeze: 0, bleed: 0, weaken: 0 };
    this.affinity = { archer: 0, healer: 0, tanker: 0, mage_party: 0 };
    this.partyEvents = {
      affinity25: false,
      affinity50: false,
      affinity75: false,
      affinity100: false,
    };
    this.partyUltimateUnlocked = false;
    this.partyUltimateEX = false;
    this.partyExAwakened = false;
    this.partyStoryUnlocked = false;
    this.partyBondMax = false;
    this.storyRewardClaimed = {};
    this.partyCutinLevel = { healer: 0, tanker: 0, mage_party: 0, archer: 0 };
    this.quest = null;
    this.questProgress = 0;
    this.killCount = 0;
    this.guardianKillCount = 0;
    this.abyssUnlocked = false;
    this.abyssKillCount = 0;
    this.pendingAbyssBoss = false;
    this.storyPhase = "town";
    this.mapX = 1;
    this.mapY = 1;
    this.pixelX = 0;
    this.pixelY = 0;
  }

  get totalAttack() {
    let atk =
      this.baseAttack +
      (this.equipment.weapon?.attack || 0) +
      (this.equipment.weapon?.enhance || 0) +
      this.skills.attackBoost * 3 +
      this.bonusAttack;
    // 광전사 패시브
    const bersLv = (this.passiveSkills || {}).berserker || 0;
    if (bersLv > 0) {
      const ratio = this.hp / (this.maxHp + this.bonusHp);
      const thr   = [0, 0.3, 0.4, 0.5][bersLv];
      const bonus = [0, 0.2, 0.35, 0.5][bersLv];
      if (ratio <= thr) atk = Math.floor(atk * (1 + bonus));
    }
    // ★ 제단 버프 (턴 소모는 battle-manager에서)
    if ((this._altarBuff || 0) > 0 && (this._altarBuffTurns || 0) > 0) {
      atk += this._altarBuff;
    }
    // ★ 약화 상태이상 — ATK 25% 감소
    if ((this.status?.weaken || 0) > 0) {
      atk = Math.floor(atk * 0.75);
    }
    return Math.max(1, atk + this.setBonus.attack);
  }
  get bonusHp() {
    return this.skills.hpBoost * 20;
  }
  get defense() {
    const ironLv     = (this.passiveSkills || {}).iron_body   || 0;
    const ironWallLv = (this.passiveSkills || {}).iron_wall   || 0;
    return (
      (this.equipment.helmet?.defense || 0) +
      (this.equipment.armor?.defense  || 0) +
      [0, 5, 12, 22][ironLv] +
      [0, 8, 18, 30][ironWallLv] +       // ★ 탱커 철벽
      this.setBonus.defense
    );
  }
  get partyAttack() {
    if (!this.party) return 0;
    return (
      (PARTY_MEMBERS[this.party]?.attack || 0) +
      (this.partyEquipment.weapon?.attack || 0) +
      (this.partyEquipment.weapon?.enhance || 0)
    );
  }
  get partyDefense() {
    return (
      (this.partyEquipment.helmet?.defense || 0) +
      (this.partyEquipment.armor?.defense || 0)
    );
  }
  get setBonus() {
    const w = this.equipment.weapon?.name || "";
    const h = this.equipment.helmet?.name || "";
    const a = this.equipment.armor?.name || "";
    let atk = 0,
      def = 0,
      crit = 0;
    if (w.includes("수호자") && h.includes("수호자") && a.includes("수호자")) {
      atk += 50;
      def += 20;
    }
    if (w.includes("용사") && h.includes("용사") && a.includes("용사")) {
      atk += 100;
      def += 50;
      crit += 20;
    }
    const abyssCount = [w, h, a].filter((n) => n.startsWith("심연의")).length;
    if (abyssCount >= 3) {
      atk += 80;
      def += 50;
    }
    return { attack: atk, defense: def, crit };
  }
  gainExp(amount) {
    const MAX_LEVEL = 99;

    // ★ 이미 최대 레벨이면 EXP 적용 안 함
    if (this.level >= MAX_LEVEL) {
      this.exp = 0;
      return false;
    }

    this.exp += amount;
    let leveledUp = false;

    while (this.exp >= this.nextExp && this.level < MAX_LEVEL) {
      this.exp -= this.nextExp;
      this.level += 1;
      this.skillPoints  += 1;
      this.maxHp        += 20;
      this.hp            = this.maxHp + this.bonusHp;
      this.baseAttack   += 5;
      this.nextExp       = Math.floor(this.nextExp * 1.3);
      leveledUp = true;
    }

    // ★ 최대 레벨 도달 시 잉여 EXP 제거
    if (this.level >= MAX_LEVEL) {
      this.exp    = 0;
      this.level  = MAX_LEVEL;
    }

    return leveledUp;
  }
}

// ── 몬스터 인스턴스 생성 ───────────────────────────
function createMonsterInstance(id, difficultyMult = 1) {
  const def = MONSTERS.find((m) => m.id === id) || MONSTERS[0];
  const hp = Math.floor(def.baseHp * difficultyMult);
  return {
    ...def,
    hp,
    maxHp: hp,
    attack: Math.floor(def.baseAtk * difficultyMult),
    status: { poison: 0, stun: 0, burn: 0, freeze: 0, bleed: 0, weaken: 0 },
    phase: 1,
  };
}

// ── 랜덤 아이템 생성 ──────────────────────────────
function createRandomItem(isBossReward = false) {
  const grades = ["일반", "고급", "희귀", "영웅", "전설"];
  const colors = ["normal", "uncommon", "rare", "epic", "legend"];
  const roll = Math.random();
  let grade =
    roll > 0.98 ? 4 : roll > 0.9 ? 3 : roll > 0.7 ? 2 : roll > 0.4 ? 1 : 0;
  if (isBossReward) grade = Math.max(grade, 2);
  const bonus = [0, 5, 12, 25, 40][grade];
  const types = ["weapon", "armor", "helmet"];
  const type = types[Math.floor(Math.random() * 3)];
  const names = { weapon: "무기", armor: "갑옷", helmet: "투구" };
  return normalizeItem({
    name: `${grades[grade]} ${names[type]}`,
    type,
    attack: type === "weapon" ? 12 + bonus : 0,
    defense: type !== "weapon" ? 6 + bonus : 0,
    class: colors[grade],
    enhance: 0,
  });
}

// ── 퀘스트 목록 ───────────────────────────────────
// ★ 퀘스트는 반드시 id, title, target, goal, rewardGold, rewardExp, minLevel 형식
// ── 던전 층수 설정 ────────────────────────────────
const DUNGEON_FLOORS = {
  normal: [
    {
      floor: 1,
      name: "던전 1층",
      label: "어둠의 입구",
      enemies: ["slime", "goblin"],
      boss: "guardian",
      bossName: "던전 수호자",
      mapW: 25,
      mapH: 18,
      bgCanvas: "#1a0808",
      bossMultiplier: 1.0,
    },
    {
      floor: 2,
      name: "던전 2층",
      label: "해골의 묘지",
      enemies: ["skeleton", "orc"],
      boss: "guardian",
      bossName: "강화 수호자",
      mapW: 28,
      mapH: 20,
      bgCanvas: "#080818",
      bossMultiplier: 1.5,
    },
    {
      floor: 3,
      name: "던전 3층",
      label: "마왕의 전실",
      enemies: ["orc2", "abyss_knight"],
      boss: "demon",
      bossName: "마왕 다르카스",
      mapW: 30,
      mapH: 22,
      bgCanvas: "#180818",
      bossMultiplier: 1.0,
    },
  ],
  abyss: [
    {
      floor: 1,
      name: "심연 1층",
      label: "어둠의 입구",
      enemies: ["abyss_knight", "abyss_mage"],
      boss: "abyss_overlord",
      bossName: "심연 지배자",
      mapW: 30,
      mapH: 22,
      bgCanvas: "#050010",
      bossMultiplier: 1.0,
    },
    {
      floor: 2,
      name: "심연 2층",
      label: "악마의 회랑",
      enemies: ["abyss_guardian", "abyss_demon"],
      boss: "abyss_overlord",
      bossName: "심연 지배자",
      mapW: 32,
      mapH: 24,
      bgCanvas: "#080008",
      bossMultiplier: 1.2,
    },
    {
      floor: 3,
      name: "심연 3층",
      label: "군주의 왕좌",
      enemies: ["abyss_adversary", "abyss_demon"],
      boss: "abyss_lord",
      bossName: "심연 군주",
      mapW: 34,
      mapH: 26,
      bgCanvas: "#0a0005",
      bossMultiplier: 1.5,
    },
  ],
  city: [
    {
      floor: 1,
      name: "도시 탐험",
      label: "번영한 왕도",
      enemies: ["city_thief", "city_guard"],
      boss: "city_boss",
      bossName: "암흑 단장",
      mapW: 32,
      mapH: 24,
      bgCanvas: "#0a0a08",
      bossMultiplier: 1.0,
      specialTiles: true,
    },
  ],
};

const QUESTS = [
  // ── 몬스터 처치 ──────────────────────────────────
  {
    id: "q_slime",
    type: "kill",
    title: "슬라임 토벌",
    desc: "던전의 슬라임을 처치하라",
    target: "슬라임",
    goal: 5,
    rewardGold: 100,
    rewardExp: 60,
    minLevel: 1,
  },
  {
    id: "q_goblin",
    type: "kill",
    title: "고블린 소탕",
    desc: "마을 근처 고블린을 소탕하라",
    target: "고블린",
    goal: 4,
    rewardGold: 150,
    rewardExp: 90,
    minLevel: 1,
  },
  {
    id: "q_skeleton",
    type: "kill",
    title: "해골 기사 격멸",
    desc: "던전 깊은 곳의 해골 기사를 없애라",
    target: "해골 기사",
    goal: 3,
    rewardGold: 280,
    rewardExp: 160,
    minLevel: 3,
  },
  {
    id: "q_orc",
    type: "kill",
    title: "오크 전사 토벌",
    desc: "오크 전사 무리를 토벌하라",
    target: "오크 전사",
    goal: 3,
    rewardGold: 220,
    rewardExp: 130,
    minLevel: 2,
  },
  {
    id: "q_orc2",
    type: "kill",
    title: "오크 도발꾼 처단",
    desc: "도발꾼 오크를 처단하라",
    target: "오크 도발",
    goal: 2,
    rewardGold: 350,
    rewardExp: 200,
    minLevel: 4,
  },
  {
    id: "q_guardian",
    type: "kill",
    title: "수호자 토벌",
    desc: "강력한 던전 수호자를 쓰러뜨려라",
    target: "던전 수호자",
    goal: 1,
    rewardGold: 800,
    rewardExp: 500,
    minLevel: 6,
  },

  // ── 보물 상자 수집 ────────────────────────────────
  {
    id: "q_chest1",
    type: "chest",
    title: "보물 사냥꾼",
    desc: "던전에서 보물 상자를 열어라",
    goal: 3,
    rewardGold: 200,
    rewardExp: 80,
    rewardItem: true,
    minLevel: 1,
  },
  {
    id: "q_chest2",
    type: "chest",
    title: "탐험가의 자질",
    desc: "던전 곳곳의 보물 상자를 수집하라",
    goal: 7,
    rewardGold: 450,
    rewardExp: 220,
    rewardItem: true,
    minLevel: 3,
  },
  {
    id: "q_chest3",
    type: "chest",
    title: "전설의 약탈자",
    desc: "수많은 보물 상자를 열어라",
    goal: 15,
    rewardGold: 1200,
    rewardExp: 600,
    rewardItem: true,
    minLevel: 6,
  },

  // ── 골드 모으기 ───────────────────────────────────
  {
    id: "q_gold1",
    type: "gold",
    title: "첫 재산",
    desc: "골드를 모아 부를 쌓아라",
    goal: 500,
    rewardGold: 150,
    rewardExp: 70,
    minLevel: 1,
  },
  {
    id: "q_gold2",
    type: "gold",
    title: "상인의 꿈",
    desc: "넉넉한 자금을 마련하라",
    goal: 2000,
    rewardGold: 500,
    rewardExp: 250,
    minLevel: 3,
  },
  {
    id: "q_gold3",
    type: "gold",
    title: "황금의 제왕",
    desc: "엄청난 부를 축적하라",
    goal: 8000,
    rewardGold: 2000,
    rewardExp: 800,
    minLevel: 7,
  },

  // ── 동료 호감도 달성 ──────────────────────────────
  {
    id: "q_aff1",
    type: "affinity",
    title: "첫 유대감",
    desc: "동료와 신뢰를 쌓아라",
    goal: 30,
    rewardGold: 200,
    rewardExp: 120,
    minLevel: 1,
  },
  {
    id: "q_aff2",
    type: "affinity",
    title: "진정한 동료",
    desc: "동료와 깊은 유대를 쌓아라",
    goal: 70,
    rewardGold: 500,
    rewardExp: 350,
    minLevel: 3,
  },
  {
    id: "q_aff3",
    type: "affinity",
    title: "영원한 파트너",
    desc: "동료와 최고의 신뢰를 이루어라",
    goal: 100,
    rewardGold: 1500,
    rewardExp: 1000,
    minLevel: 5,
  },

  // ── 레벨 달성 ─────────────────────────────────────
  {
    id: "q_lv5",
    type: "level",
    title: "성장하는 용사",
    desc: "레벨 5에 도달하라",
    goal: 5,
    rewardGold: 300,
    rewardExp: 0,
    rewardSkillPoint: 2,
    minLevel: 1,
  },
  {
    id: "q_lv10",
    type: "level",
    title: "숙련된 모험가",
    desc: "레벨 10에 도달하라",
    goal: 10,
    rewardGold: 800,
    rewardExp: 0,
    rewardSkillPoint: 3,
    minLevel: 5,
  },

  // ── 던전 층수 도달 ────────────────────────────────
  {
    id: "q_floor2",
    type: "floor",
    title: "던전 탐험가",
    desc: "던전 2층에 도달하라",
    goal: 2,
    rewardGold: 250,
    rewardExp: 150,
    minLevel: 1,
  },
  {
    id: "q_floor3",
    type: "floor",
    title: "심층 탐험",
    desc: "던전 3층의 깊은 곳까지 나아가라",
    goal: 3,
    rewardGold: 600,
    rewardExp: 400,
    minLevel: 4,
  },
];

// ── 상점 아이템 ───────────────────────────────────
const SHOP_ITEMS = [
  {
    name: "철검",
    type: "weapon",
    weaponClass: "sword",
    attack: 20,
    defense: 0,
    class: "normal",
    cost: 60,
    enhance: 0,
  },
  {
    name: "강철검",
    type: "weapon",
    weaponClass: "sword",
    attack: 35,
    defense: 0,
    class: "rare",
    cost: 140,
    enhance: 0,
  },
  {
    name: "철 갑옷",
    type: "armor",
    attack: 0,
    defense: 10,
    class: "normal",
    cost: 50,
    enhance: 0,
  },
  {
    name: "사슬 갑옷",
    type: "armor",
    attack: 0,
    defense: 18,
    class: "rare",
    cost: 120,
    enhance: 0,
  },
  {
    name: "철 투구",
    type: "helmet",
    attack: 0,
    defense: 5,
    class: "normal",
    cost: 35,
    enhance: 0,
  },
  {
    name: "강철 투구",
    type: "helmet",
    attack: 0,
    defense: 10,
    class: "rare",
    cost: 90,
    enhance: 0,
  },
  {
    name: "회복 물약",
    type: "potion",
    attack: 0,
    defense: 0,
    heal: 50,
    class: "normal",
    cost: 40,
    enhance: 0,
  },
];

// 전역 노출
window.CLASSES = CLASSES;
window.PARTY_MEMBERS = PARTY_MEMBERS;
window.DUNGEON_OBJECTS = DUNGEON_OBJECTS;
window.MONSTERS = MONSTERS;
window.QUESTS = QUESTS;
window.SHOP_ITEMS = SHOP_ITEMS;
window.Player = Player;
window.createItemId = createItemId;
window.normalizeItem = normalizeItem;
window.sameItem = sameItem;
window.createMonsterInstance = createMonsterInstance;
window.createRandomItem = createRandomItem;
window.DUNGEON_FLOORS = DUNGEON_FLOORS;
