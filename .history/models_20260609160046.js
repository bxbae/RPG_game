// ═══════════════════════════════════════════════════
//  models.js  — 데이터 모델 & 상수 정의
// ═══════════════════════════════════════════════════
"use strict";

// ── 직업 정의 ──────────────────────────────────────
const CLASSES = {
  night:  { name: "기사",   hp: 160, attack: 32, icon: "⚔",  portrait: "images/portrait_Night.png" },
  mage:   { name: "마법사", hp: 100, attack: 22, icon: "🔮", portrait: "images/portrait_mage.png"   },
  archer: { name: "궁수",   hp: 120, attack: 28, icon: "🏹", portrait: "images/portrait_archer.png" },
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
const DUNGEON_OBJECTS = {
  WALL: 0, FLOOR: 1, PLAYER: 2, ENEMY: 3,
  BOSS: 4, CHEST: 5, EXIT: 6, NPC: 7, STAIRS: 8,
};

// ── 몬스터 정의 ────────────────────────────────────
const MONSTERS = [
  { id:"slime",    name:"슬라임",       baseHp:80,  baseAtk:8,  img:"images/slime.png",    expRate:40,  goldRate:30  },
  { id:"goblin",   name:"고블린",       baseHp:110, baseAtk:12, img:"images/goblin.png",   expRate:55,  goldRate:45  },
  { id:"skeleton", name:"해골 기사",    baseHp:130, baseAtk:14, img:"images/skeleton.png", expRate:70,  goldRate:55  },
  { id:"orc",      name:"오크 전사",    baseHp:150, baseAtk:16, img:"images/orc.png",      expRate:85,  goldRate:70  },
  { id:"orc2",     name:"오크 도발",    baseHp:170, baseAtk:18, img:"images/orc2.png",     expRate:100, goldRate:85  },
  { id:"guardian", name:"던전 수호자",  baseHp:400, baseAtk:22, img:"images/guardian.png", expRate:200, goldRate:180, isBoss:true },
  { id:"demon",    name:"마왕 다르카스",baseHp:800, baseAtk:28, img:"images/demon.png",    expRate:300, goldRate:500, isBoss:true, isFinal:true },
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
  constructor(type = "night") {
    const base = CLASSES[type] || CLASSES.night;
    this.type       = type;
    this.name       = base.name;
    this.icon       = base.icon;
    this.portrait   = base.portrait || "";
    this.hp         = base.hp;
    this.maxHp      = base.hp;
    this.baseAttack = base.attack;
    this.bonusAttack= 0;
    this.money      = 300;
    this.level      = 1;
    this.exp        = 0;
    this.nextExp    = 100;
    this.skillPoints= 0;

    const starterWeapon = {
      night:  { name:"나무 목검",   type:"weapon", weaponClass:"sword", attack:8, defense:0, class:"normal", enhance:0 },
      mage:   { name:"나무 지팡이", type:"weapon", weaponClass:"staff", attack:6, defense:0, class:"normal", enhance:0 },
      archer: { name:"나무 활",     type:"weapon", weaponClass:"bow",   attack:7, defense:0, class:"normal", enhance:0 },
    }[type] || { name:"나무 목검", type:"weapon", weaponClass:"sword", attack:8, defense:0, class:"normal", enhance:0 };
    starterWeapon.itemId = "starter-" + type;

    this.equipment      = { weapon: starterWeapon, helmet: null, armor: null };
    this.partyEquipment = { weapon: null, helmet: null, armor: null };
    this.inventory      = [];
    this.party          = null;
    this.partyHp        = 0;
    this.partyMaxHp     = 0;
    this.skills         = { attackBoost:0, hpBoost:0, criticalBoost:0 };
    this.activeSkills   = { whirlwind:false, magicBall:false, rapidShot:false };
    this.passiveSkills  = {};
    this.ultimateGauge  = 0;
    this.guardBuff      = 0;
    this.cooldowns      = { jobSkill:0, partyUltimate:0, heal:0 };
    this.status         = { poison:0, stun:0, burn:0 };
    this.affinity       = { archer:0, healer:0, tanker:0, dealer:0, mage_party:0 };
    this.partyEvents    = { affinity25:false, affinity50:false, affinity75:false, affinity100:false };
    this.partyUltimateUnlocked = false;
    this.partyUltimateEX       = false;
    this.partyExAwakened       = false;
    this.partyStoryUnlocked    = false;
    this.partyBondMax          = false;
    this.storyRewardClaimed    = {};
    this.partyCutinLevel       = { healer:0, tanker:0, mage_party:0, archer:0, dealer:0 };
    this.quest         = null;
    this.questProgress = 0;
    this.killCount        = 0;
    this.guardianKillCount = 0;
    this.abyssUnlocked = false;
    this.abyssKillCount   = 0;
    this.pendingAbyssBoss = false;
    this.storyPhase    = "town";
    this.mapX = 1;
    this.mapY = 1;
    this.pixelX = 0;
    this.pixelY = 0;
  }

  get totalAttack() {
    let atk = this.baseAttack
      + (this.equipment.weapon?.attack  || 0)
      + (this.equipment.weapon?.enhance || 0)
      + this.skills.attackBoost * 3
      + this.bonusAttack;
    const bersLv = (this.passiveSkills || {}).berserker || 0;
    if (bersLv > 0) {
      const ratio = this.hp / (this.maxHp + this.bonusHp);
      const thr   = [0, 0.3, 0.4, 0.5][bersLv];
      const bonus = [0, 0.2, 0.35, 0.5][bersLv];
      if (ratio <= thr) atk = Math.floor(atk * (1 + bonus));
    }
    return atk + this.setBonus.attack;
  }
  get bonusHp()     { return this.skills.hpBoost * 20; }
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
         + (this.partyEquipment.weapon?.attack  || 0)
         + (this.partyEquipment.weapon?.enhance || 0);
  }
  get partyDefense() {
    return (this.partyEquipment.helmet?.defense || 0)
         + (this.partyEquipment.armor?.defense  || 0);
  }
  get setBonus() {
    const w = this.equipment.weapon?.name || "";
    const h = this.equipment.helmet?.name || "";
    const a = this.equipment.armor?.name  || "";
    let atk = 0, def = 0, crit = 0;
    if (w.includes("수호자") && h.includes("수호자") && a.includes("수호자")) { atk += 50; def += 20; }
    if (w.includes("용사")   && h.includes("용사")   && a.includes("용사"))   { atk += 100; def += 50; crit += 20; }
    const abyssCount = [w, h, a].filter(n => n.startsWith("심연의")).length;
    if (abyssCount >= 3) { atk += 80; def += 50; }
    return { attack: atk, defense: def, crit };
  }
  gainExp(amount) {
    this.exp += amount;
    let leveledUp = false;
    while (this.exp >= this.nextExp) {
      this.exp -= this.nextExp;
      this.level += 1;
      this.skillPoints += 1;
      this.maxHp += 20;
      this.hp = this.maxHp + this.bonusHp;
      this.baseAttack += 5;
      this.nextExp = Math.floor(this.nextExp * 1.3);
      leveledUp = true;
    }
    return leveledUp;
  }
}

// ── 몬스터 인스턴스 생성 ───────────────────────────
function createMonsterInstance(id, difficultyMult = 1) {
  const def = MONSTERS.find(m => m.id === id) || MONSTERS[0];
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
function createRandomItem(isBossReward = false) {
  const grades = ["일반","고급","희귀","영웅","전설"];
  const colors = ["normal","uncommon","rare","epic","legend"];
  const roll   = Math.random();
  let grade = roll > 0.98 ? 4 : roll > 0.9 ? 3 : roll > 0.7 ? 2 : roll > 0.4 ? 1 : 0;
  if (isBossReward) grade = Math.max(grade, 2);
  const bonus = [0, 5, 12, 25, 40][grade];
  const types = ["weapon","armor","helmet"];
  const type  = types[Math.floor(Math.random() * 3)];
  const names = { weapon:"무기", armor:"갑옷", helmet:"투구" };
  return normalizeItem({
    name:    `${grades[grade]} ${names[type]}`,
    type,
    attack:  type === "weapon" ? 12 + bonus : 0,
    defense: type !== "weapon" ? 6  + bonus : 0,
    class:   colors[grade],
    enhance: 0,
  });
}

// ── 퀘스트 목록 ───────────────────────────────────
// ★ 퀘스트는 반드시 id, title, target, goal, rewardGold, rewardExp, minLevel 형식
const QUESTS = [
  { id:"q_slime",    title:"슬라임 토벌",     target:"슬라임",      goal:5, rewardGold:100, rewardExp:60,  minLevel:1 },
  { id:"q_goblin",   title:"고블린 소탕",     target:"고블린",      goal:4, rewardGold:150, rewardExp:90,  minLevel:1 },
  { id:"q_skeleton", title:"해골 기사 격멸",  target:"해골 기사",   goal:3, rewardGold:280, rewardExp:160, minLevel:3 },
  { id:"q_orc",      title:"오크 전사 토벌",  target:"오크 전사",   goal:3, rewardGold:220, rewardExp:130, minLevel:2 },
  { id:"q_orc2",     title:"오크 도발꾼 처단",target:"오크 도발",   goal:2, rewardGold:350, rewardExp:200, minLevel:4 },
  { id:"q_guardian", title:"수호자 토벌",     target:"던전 수호자", goal:1, rewardGold:800, rewardExp:500, minLevel:6 },
];

// ── 상점 아이템 ───────────────────────────────────
const SHOP_ITEMS = [
  { name:"철검",       type:"weapon", weaponClass:"sword", attack:20, defense:0,  class:"normal", cost:60,  enhance:0 },
  { name:"강철검",     type:"weapon", weaponClass:"sword", attack:35, defense:0,  class:"rare",   cost:140, enhance:0 },
  { name:"철 갑옷",    type:"armor",  attack:0, defense:10, class:"normal", cost:50,  enhance:0 },
  { name:"사슬 갑옷",  type:"armor",  attack:0, defense:18, class:"rare",   cost:120, enhance:0 },
  { name:"철 투구",    type:"helmet", attack:0, defense:5,  class:"normal", cost:35,  enhance:0 },
  { name:"강철 투구",  type:"helmet", attack:0, defense:10, class:"rare",   cost:90,  enhance:0 },
  { name:"회복 물약",  type:"potion", attack:0, defense:0,  heal:50, class:"normal", cost:40, enhance:0 },
];

// 전역 노출
window.CLASSES              = CLASSES;
window.PARTY_MEMBERS        = PARTY_MEMBERS;
window.DUNGEON_OBJECTS      = DUNGEON_OBJECTS;
window.MONSTERS             = MONSTERS;
window.QUESTS               = QUESTS;
window.SHOP_ITEMS           = SHOP_ITEMS;
window.Player               = Player;
window.createItemId         = createItemId;
window.normalizeItem        = normalizeItem;
window.sameItem             = sameItem;
window.createMonsterInstance= createMonsterInstance;
window.createRandomItem     = createRandomItem;
