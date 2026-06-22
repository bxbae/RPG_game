// ═══════════════════════════════════════════════════
//  region-data.js — 지역(월드맵) 데이터 + RegionManager
//
//  설계 메모:
//   - REGIONS 는 "정적 정의"(이름·아이콘·해금 조건 등 변하지 않는 값).
//   - 플레이어별로 변하는 "진행 상태"(재건도·해금·완료 여부)는
//     player.regions 객체에 저장한다. 이렇게 하면 블랙리스트 방식의
//     SaveManager 가 자동으로 저장/복원하므로 별도 직렬화 코드가 필요 없다.
//   - RegionManager 는 정적 정의 + 플레이어 상태를 합쳐서 다루는 헬퍼.
// ═══════════════════════════════════════════════════
"use strict";

// ── 지역 정적 정의 ───────────────────────────────────
// prosperity(번영/재건도): 0~100. completed: 재건 완료 여부.
// unlocked: 기본 해금 여부(잠긴 지역은 조건 충족 시 해금).
// requires: 이 지역을 해금하려면 먼저 완료해야 하는 지역 id (없으면 처음부터 후보).
const REGIONS = [
  {
    id: "starterVillage",
    name: "시작마을",
    icon: "🏘",
    desc: "마왕의 습격에서 가장 먼저 일어선 평화의 마을.",
    unlocked: true,
    prosperity: 100,
    completed: true,
    requires: null,
    dungeonType: "normal",
  },
  {
    id: "mineTown",
    name: "광산도시",
    icon: "⛏",
    desc: "무너진 갱도와 멈춰버린 제련소. 다시 불을 지펴야 한다.",
    unlocked: true,
    prosperity: 0,
    completed: false,
    requires: "starterVillage",
    dungeonType: "mine",
  },
  {
    id: "harborTown",
    name: "항구도시",
    icon: "⚓",
    desc: "폐허가 된 부둣가. 바닷길을 되살리면 교역이 열린다.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "mineTown",
    dungeonType: "harbor",
  },
  {
    id: "forestVillage",
    name: "깊은 숲",
    icon: "🌲",
    desc: "엘프들이 숨어 사는 깊은 숲. 말로 다 못할 사연이 있는 듯하다.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "harborTown",
    dungeonType: "elfForest",
  },
  {
    id: "capital",
    name: "수도",
    icon: "🏰",
    desc: "왕실이 있는 마지막 거점. 마왕의 부하들이 이미 잠입해 있다.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "forestVillage",
    dungeonType: "capital",
  },

  // ── 마왕 사천왕의 진짜 영역 (잠김 상태 — 아직 풀리지 않음) ──
  // 그라모스·바르칸·릴리스·벨제론은 이미 광산도시·항구도시·깊은 숲·수도 던전의
  // 보스로 등장하지만, 그곳에서 만난 건 본대가 아니라 파견된 일부였다.
  // 이 네 지역은 그들을 "사천왕"으로서 제대로 상대하는 진짜 영역이며,
  // 지금은 region-data.js에 자리만 만들어두고 잠긴 상태로 둔다 (던전·이미지는 추후 연동).
  {
    id: "lavaCanyon",
    name: "용암 협곡",
    icon: "🌋",
    desc: "사천왕 그라모스의 진짜 영역. 끝없이 끓어오르는 용암이 갱도 깊숙한 곳까지 이어져 있다.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "capital",
    dungeonType: "lavaCanyon",
    fourKing: "general_gramos",
    excludeFromKingdomCalc: true, // 아직 던전 콘텐츠 없는 미래 지역 — 왕국 번영도 100% 계산에서 제외
    bgImage: "images/lava_cobbles.png",
  },
  {
    id: "sunkenWreck",
    name: "심해 폐선",
    icon: "🚢",
    desc: "사천왕 바르칸의 진짜 영역. 가라앉은 함대의 잔해 속에 그가 숨어 있다.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "capital",
    dungeonType: "sunkenWreck",
    fourKing: "general_barkan",
    excludeFromKingdomCalc: true,
    bgImage: "images/Haunted_shipwreck_on_a_stormy_shore.png",
  },
  {
    id: "corruptedGrove",
    name: "오염된 정령숲",
    icon: "🕸",
    desc: "사천왕 릴리스의 진짜 영역. 정령들의 힘이 완전히 뒤틀려버린 깊은 숲의 핵심부.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "capital",
    dungeonType: "corruptedGrove",
    fourKing: "general_lilith",
    excludeFromKingdomCalc: true,
    bgImage: "images/Corrupted_forest_of_forgotten_ruins.png",
  },
  {
    id: "royalDungeon",
    name: "왕성 지하 감옥",
    icon: "⛓",
    desc: "사천왕 벨제론의 진짜 영역. 왕성 깊은 곳, 빛이 닿지 않는 지하 감옥.",
    unlocked: false,
    prosperity: 0,
    completed: false,
    requires: "capital",
    dungeonType: "royalDungeon",
    fourKing: "general_belzeron",
    excludeFromKingdomCalc: true,
    bgImage: "images/Gothic_dungeon_with_hanging_cages.png",
  },
];

// 빠른 조회용 맵
const REGION_BY_ID = REGIONS.reduce((m, r) => { m[r.id] = r; return m; }, {});

// ── 지역별 투자 시스템 설정 ───────────────────────────
// 시작마을의 은행·마을단계(TOWN_STAGES)와 같은 구조를 지역마다 따로 둔다.
// player.regionInvest[regionId] = { totalInvested, milestones:[] } 에 진행 상태 저장.
// 새 지역에 투자 시스템을 추가하려면 이 객체에 항목만 추가하면 된다(코드 변경 불필요).
const REGION_INVESTMENT = {
  mineTown: {
    bgImage: "images/Grim_mining_village_beneath_rocky_cliffs.png", // 재건 전 거점 배경
    completedBgImage: "images/Gold_discovery_festival_in_the_mountains.png", // 재건 완료 후 거점 배경
    npcId:     "miner_chief",          // 거점 화면에 등장하는 NPC id (town-scene.js NPC_DATA에 정의)
    npcName:   "광부 두칸",
    princessBriefId: "princess_brief_mine", // 첫 선택 시 마을에서 먼저 들려주는 공주의 사전 설명 (town-scene.js NPC_DATA)
    departDialogueId: "miner_chief_send_off", // "던전으로 출발" 첫 클릭 시 1회성 응원 대사
    stages: [
      { level:0, name:"붕괴 직후", minInvest:0,    icon:"💀", color:"#8B4513" },
      { level:1, name:"갱도 보수", minInvest:300,  icon:"🔧", color:"#CD853F" },
      { level:2, name:"제련소 재가동", minInvest:1200, icon:"🔥", color:"#FF8C42" },
      { level:3, name:"광산 번영", minInvest:3000, icon:"⛏",  color:"#FFD700" },
    ],
    rewards: [
      { minInvest:300,  atkBonus:4,  hpBonus:0,  msg:"공격력 +4" },
      { minInvest:1200, atkBonus:8,  hpBonus:40, msg:"공격력 +8, HP +40" },
      { minInvest:3000, atkBonus:15, hpBonus:80, msg:"공격력 +15, HP +80" },
    ],
  },
  harborTown: {
    bgImage: "images/Mediterranean_fortress_by_the_sea.png", // 재건 전 거점 배경
    completedBgImage: "images/Coastal_port_festival_celebration_in_full_swing.png", // 재건 완료 후 거점 배경
    npcId:     "harbor_master",          // 거점 화면에 등장하는 NPC id (town-scene.js NPC_DATA에 정의)
    npcName:   "항구장 모리스",
    princessBriefId: "princess_brief_harbor", // 첫 선택 시 마을에서 먼저 들려주는 공주의 사전 설명
    departDialogueId: "harbor_master_send_off",
    stages: [
      { level:0, name:"약탈당한 항구", minInvest:0,    icon:"💀", color:"#1a4a5a" },
      { level:1, name:"방파제 복구",   minInvest:400,  icon:"🛟", color:"#2a6a7a" },
      { level:2, name:"교역선 재취항", minInvest:1500, icon:"⛵", color:"#3a8a9a" },
      { level:3, name:"항구 번영",     minInvest:3500, icon:"⚓", color:"#5ad0e8" },
    ],
    rewards: [
      { minInvest:400,  atkBonus:5,  hpBonus:0,  msg:"공격력 +5" },
      { minInvest:1500, atkBonus:9,  hpBonus:50, msg:"공격력 +9, HP +50" },
      { minInvest:3500, atkBonus:17, hpBonus:90, msg:"공격력 +17, HP +90" },
    ],
  },
  forestVillage: {
    bgImage: "images/Elven_village_amidst_mist_and_ruin.png", // 재건 전 거점 배경
    completedBgImage: "images/Elven_festival_in_a_verdant_valley.png", // 재건 완료 후 거점 배경
    npcId:     "elf_elder",          // 거점 화면에 등장하는 NPC id (town-scene.js NPC_DATA에 정의)
    npcName:   "엘프 장로 실라",
    princessBriefId: "princess_brief_forest", // 첫 선택 시 마을에서 먼저 들려주는 공주의 사전 설명
    departDialogueId: "elf_elder_send_off",
    stages: [
      { level:0, name:"경계하는 숲",   minInvest:0,    icon:"🌑", color:"#1a3a1e" },
      { level:1, name:"마음을 열다",   minInvest:500,  icon:"🌱", color:"#2a5a30" },
      { level:2, name:"숲의 결계 복원", minInvest:1800, icon:"✨", color:"#4a9a5a" },
      { level:3, name:"숲의 번영",     minInvest:4000, icon:"🌳", color:"#6cd0a0" },
    ],
    rewards: [
      { minInvest:500,  atkBonus:6,  hpBonus:0,   msg:"공격력 +6" },
      { minInvest:1800, atkBonus:10, hpBonus:60,  msg:"공격력 +10, HP +60" },
      { minInvest:4000, atkBonus:19, hpBonus:100, msg:"공격력 +19, HP +100" },
    ],
  },
  capital: {
    npcId:     "royal_guard_captain",          // 거점 화면에 등장하는 NPC id (town-scene.js NPC_DATA에 정의)
    npcName:   "근위대장 레오니스",
    princessBriefId: "princess_brief_capital", // 첫 선택 시 마을에서 먼저 들려주는 공주의 사전 설명
    departDialogueId: "royal_guard_captain_send_off",
    stages: [
      { level:0, name:"잠입당한 왕성", minInvest:0,    icon:"🩸", color:"#3a0a0a" },
      { level:1, name:"인질 일부 구출", minInvest:600,  icon:"⛓",  color:"#6a1818" },
      { level:2, name:"왕실 친위대 재건", minInvest:2200, icon:"🛡", color:"#aa3030" },
      { level:3, name:"왕성 수복",     minInvest:5000, icon:"👑", color:"#ffd700" },
    ],
    rewards: [
      { minInvest:600,  atkBonus:8,  hpBonus:0,   msg:"공격력 +8" },
      { minInvest:2200, atkBonus:14, hpBonus:80,  msg:"공격력 +14, HP +80" },
      { minInvest:5000, atkBonus:25, hpBonus:140, msg:"공격력 +25, HP +140" },
    ],
  },
};

// ── 지역 완료 통합 이벤트 (재건 100% + 투자 최종 단계를 한 장면으로) ──
// 지역마다 등록해두면, 두 조건이 모두 충족되는 순간 일반 "재건 완료!" 알림 +
// 동료 결말편 개별 트리거 대신 이 통합 시퀀스로 대체된다.
// 아직 등록 안 된 지역(harborTown 등)은 기존 방식이 그대로 적용된다.
const REGION_FESTIVAL = {
  mineTown: {
    // 분위기 전환 — 거점 NPC(두칸)가 축제 소식을 전함 (town-scene.js NPC_DATA)
    introNpcId: "miner_chief_festival_intro",
    // 이 동료가 파티에 있고 결말편을 볼 조건이 갖춰져 있으면, 같은 장면 안에서 이어붙인다
    companionKey: "tanker",
    // 축제 마무리 — 동료 결말편(또는 동료가 없을 때의 일반 버전) 다음에 재생
    outroNpcId: "mine_festival_outro",
  },
  harborTown: {
    // 배들이 돌아오고 아이들이 기뻐하는 장면 (town-scene.js NPC_DATA)
    introNpcId: "harbor_master_festival_intro",
    companionKey: "dealer",
    outroNpcId: "harbor_festival_outro",
    // 이 장면 마지막에 항해 허가증을 인벤토리에 지급 (스토리용 — 실제 잠금 효과 없음)
    itemReward: { name: "항해 허가증", type: "key", class: "rare", desc: "항구도시 재건을 도운 증표. 어디든 배를 타고 나갈 수 있다는 항구장의 허락이 담겨 있다." },
  },
  forestVillage: {
    // 결계가 회복된 직후, 인간으로 변장한 마족이 성소를 파괴했었다는 진실이 드러남
    introNpcId: "elf_elder_festival_intro",
    companionKey: "archer",
    // 동료 결말편(아리아) 다음, 마무리(outro) 전에 — 장로 실라의 축복
    interludeNpcId: "elf_elder_blessing",
    outroNpcId: "archer_blessing_outro",
  },
};

// ── 동료 개인 스토리 설정 ─────────────────────────────
// 동료마다 자기 사연이 있는 지역이 정해져 있고, 그 지역을 완전히 재건하면서
// 호감도가 일정 이상이면 개인 스토리(갈등 → 해결) 가 풀린다.
// player.companionStory[partyKey] = { unlocked, done } 에 진행 상태 저장.
//
// reward.type 종류:
//   "stat"    — baseAttack/maxHp 등 즉시 스탯 보너스 (atkBonus/hpBonus)
//   "passive" — 전투 중 상시 발동하는 패시브. battle-scene.js 가 컴패니언 머리 위에
//               배지로 표시(클릭하면 설명). 실제 효과는 battle-manager.js 에서 처리.
//   "ultimate_upgrade" — 그 동료의 궁극기 자체를 강화 (battle-manager.js 에서 분기 처리)
const COMPANION_STORY = {
  tanker: {
    partyKey: "tanker", companionName: "카인",
    regionId: "mineTown",
    affinityRequired: 75,
    conflictNpcId:  "tanker_story_conflict",   // 무너진 갱도 조사 중 실종 광부 발견 + 괴물 습격
    resolutionNpcId:"tanker_story_resolution", // 광부 구출 후
    reward: { type:"passive", id:"tanker_guard_pulse",
      name:"수호의 맥동", desc:"전투 시작 후 3턴 동안 받는 피해 30% 감소",
      icon:"🛡" },
  },
  dealer: {
    partyKey: "dealer", companionName: "카르나",
    regionId: "harborTown",
    affinityRequired: 75,
    conflictNpcId:  "dealer_story_conflict",   // 옛 부하 생존자 발견 + 배신자의 진실
    resolutionNpcId:"dealer_story_resolution", // 해적 선장 처치 후
    reward: { type:"passive", id:"dealer_redemption",
      name:"기사의 책무", desc:"전투 중 치명타율 +15%",
      icon:"⚔" },
  },
  archer: {
    partyKey: "archer", companionName: "아리아",
    regionId: "forestVillage",
    affinityRequired: 75,
    conflictNpcId:  "archer_story_conflict",   // 장로 실라가 인간을 데려온 것에 분노, 아리아가 주인공을 변호
    resolutionNpcId:"archer_story_resolution", // 성소 복구 후 화해
    reward: { type:"stat", atkBonus:15, hpBonus:0,
      name:"놓아준 과거", desc:"공격력 +15, 치명타 피해 +20%",
      icon:"🏹" },
  },
  mage_party: {
    partyKey: "mage_party", companionName: "엘린",
    regionId: "capital",
    affinityRequired: 75,
    conflictNpcId:  "mage_story_conflict",   // 옛 스승 등장, 추방 사유(마왕의 흔적 조사 중 누명) 공개
    resolutionNpcId:"mage_story_resolution", // 누명 해소 후 왕립 마법사 복권
    reward: { type:"ultimate_upgrade", id:"mage_forbidden_spell",
      name:"금단의 비전", desc:"궁극기 위력 대폭 강화 (왕립 마법사 복권)",
      icon:"🔮" },
  },
  healer: {
    partyKey: "healer", companionName: "리온",
    regionId: "starterVillage", // 심연 진입 전 트리거 (아래 abyssGate: true 참고)
    abyssGate: true,            // 일반 지역이 아니라 "심연 진입 전" 시점에 트리거
    affinityRequired: 75,
    conflictNpcId:  "healer_story_conflict",   // 부모를 죽인 마물 등장, 복수와 용서 사이 선택
    resolutionNpcId:"healer_story_resolution", // 용서를 선택한 뒤
    reward: { type:"ultimate_upgrade", id:"healer_full_restore",
      name:"완전한 자비", desc:"궁극기가 파티 전체 완전 회복 + 상태이상 전체 해제로 강화",
      icon:"✝" },
  },
};

// 재건 완료로 간주하는 번영도 임계값
const REGION_COMPLETE_THRESHOLD = 100;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RegionManager
//  플레이어의 지역 진행 상태(player.regions)를 읽고 쓰는 헬퍼.
//  상태는 { [id]: { unlocked, prosperity, completed } } 형태.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class RegionManager {
  // 플레이어에 regions 상태가 없으면 정적 정의를 기반으로 초기화.
  // 이미 있으면 정의에 새로 추가된 지역만 보충(구 세이브 호환).
  ensureState(player) {
    if (!player) return;
    if (!player.regions) player.regions = {};
    for (const def of REGIONS) {
      if (!player.regions[def.id]) {
        player.regions[def.id] = {
          unlocked:   def.unlocked,
          prosperity: def.prosperity,
          completed:  def.completed,
        };
      }
    }
    // 선택된 현재 지역 기본값
    if (!player.currentRegion) player.currentRegion = "starterVillage";
  }

  // 정적 정의 + 플레이어 상태를 합친 "뷰" 객체 목록 반환
  list(player) {
    this.ensureState(player);
    return REGIONS.map(def => {
      const st = player.regions[def.id] || {};
      return {
        ...def,
        unlocked:   st.unlocked   ?? def.unlocked,
        prosperity: st.prosperity ?? def.prosperity,
        completed:  st.completed  ?? def.completed,
        isCurrent:  player.currentRegion === def.id,
      };
    });
  }

  // 해금된 지역만
  unlockedList(player) {
    return this.list(player).filter(r => r.unlocked);
  }

  get(player, id) {
    this.ensureState(player);
    const def = REGION_BY_ID[id];
    if (!def) return null;
    const st = player.regions[id] || {};
    return {
      ...def,
      unlocked:   st.unlocked   ?? def.unlocked,
      prosperity: st.prosperity ?? def.prosperity,
      completed:  st.completed  ?? def.completed,
      isCurrent:  player.currentRegion === id,
    };
  }

  // 현재 선택된 지역 뷰
  getCurrent(player) {
    this.ensureState(player);
    return this.get(player, player.currentRegion);
  }

  // 지역 선택(이동) — 해금된 지역만 선택 가능. 성공 시 true.
  select(player, id) {
    this.ensureState(player);
    const r = this.get(player, id);
    if (!r) return false;
    if (!r.unlocked) return false;
    player.currentRegion = id;
    return true;
  }

  // 재건도(번영도) 추가. completed/해금 전이를 자동 처리.
  // 반환: { region, leveledUp, completed, newlyUnlocked: [id...] }
  addProsperity(player, id, amount) {
    this.ensureState(player);
    const st = player.regions[id];
    if (!st) return { region: null, leveledUp: false, completed: false, newlyUnlocked: [] };

    const before = st.prosperity || 0;
    st.prosperity = Math.max(0, Math.min(REGION_COMPLETE_THRESHOLD, before + amount));
    const after = st.prosperity;

    let completed = false;
    const newlyUnlocked = [];

    if (!st.completed && after >= REGION_COMPLETE_THRESHOLD) {
      st.completed = true;
      completed = true;
      // 이 지역 완료를 requires 로 하는 지역들 해금
      for (const def of REGIONS) {
        if (def.requires === id) {
          const ds = player.regions[def.id];
          if (ds && !ds.unlocked) { ds.unlocked = true; newlyUnlocked.push(def.id); }
        }
      }
    }

    return {
      region: this.get(player, id),
      leveledUp: after > before,
      completed,
      newlyUnlocked,
    };
  }

  // 명시적 해금(이벤트/보상용)
  unlock(player, id) {
    this.ensureState(player);
    const st = player.regions[id];
    if (st && !st.unlocked) { st.unlocked = true; return true; }
    return false;
  }

  // ── 지역 투자 시스템 ──────────────────────────────
  // 이 지역에 투자 설정이 있는지 확인
  hasInvestment(regionId) {
    return !!REGION_INVESTMENT[regionId];
  }

  // 투자 상태 초기화 (없으면 생성)
  ensureInvestState(player, regionId) {
    if (!player.regionInvest) player.regionInvest = {};
    if (!player.regionInvest[regionId]) {
      player.regionInvest[regionId] = { totalInvested: 0, milestones: [] };
    }
    return player.regionInvest[regionId];
  }

  getInvestConfig(regionId) {
    return REGION_INVESTMENT[regionId] || null;
  }

  getInvestStage(regionId, totalInvested) {
    const cfg = REGION_INVESTMENT[regionId];
    if (!cfg) return null;
    let s = cfg.stages[0];
    for (const st of cfg.stages) if (totalInvested >= st.minInvest) s = st;
    return s;
  }

  getNextInvestStage(regionId, totalInvested) {
    const cfg = REGION_INVESTMENT[regionId];
    if (!cfg) return null;
    return cfg.stages.find(s => s.minInvest > totalInvested) || null;
  }

  // 이 지역에 더 이상 투자할 단계가 없으면(최종 단계 도달) true
  isFullyInvested(player, regionId) {
    const state = this.ensureInvestState(player, regionId);
    return this.getNextInvestStage(regionId, state.totalInvested) === null;
  }

  // ── 지역 완료 통합 이벤트 (재건 100% + 투자 최종 단계 모두 달성) ──
  // 둘 중 어느 쪽이 나중에 끝나든, 그 순간 한 번만 발동한다.
  ensureFestivalState(player) {
    if (!player.regionFestivalDone) player.regionFestivalDone = {};
  }

  isRegionFestivalDone(player, regionId) {
    this.ensureFestivalState(player);
    return !!player.regionFestivalDone[regionId];
  }

  markRegionFestivalDone(player, regionId) {
    this.ensureFestivalState(player);
    player.regionFestivalDone[regionId] = true;
  }

  // 지금 이 지역의 통합 완료 이벤트를 틔워도 되는지: 재건 100% + 투자 최종 단계 + 아직 안 봄
  canTriggerRegionFestival(player, regionId) {
    if (this.isRegionFestivalDone(player, regionId)) return false;
    const region = this.get(player, regionId);
    if (!region?.completed) return false;
    if (!this.hasInvestment(regionId)) return false;
    return this.isFullyInvested(player, regionId);
  }

  getFestivalConfig(regionId) {
    return REGION_FESTIVAL[regionId] || null;
  }

  // 투자 실행 — 골드를 차감하고 totalInvested 증가, 마일스톤 보상 적용
  // 반환: { invested, prevStage, nextStage, leveledUp, newMilestones:[{minInvest,atkBonus,hpBonus,msg}] }
  invest(player, regionId, amount) {
    const cfg = this.getInvestConfig(regionId);
    if (!cfg) return null;
    const state = this.ensureInvestState(player, regionId);

    const a = Math.min(amount, player.money);
    if (a <= 0) return null;

    const prevStage = this.getInvestStage(regionId, state.totalInvested);
    player.money -= a;
    state.totalInvested += a;
    const nextStage = this.getInvestStage(regionId, state.totalInvested);

    const newMilestones = [];
    for (const r of cfg.rewards) {
      if (state.totalInvested >= r.minInvest && !state.milestones.includes(r.minInvest)) {
        state.milestones.push(r.minInvest);
        if (r.atkBonus) player.bonusAttack = (player.bonusAttack || 0) + r.atkBonus;
        if (r.hpBonus) {
          player.maxHp += r.hpBonus;
          player.hp = Math.min(player.hp + r.hpBonus, player.maxHp + (player.bonusHp || 0));
        }
        newMilestones.push(r);
      }
    }

    return {
      invested: a,
      prevStage, nextStage,
      leveledUp: nextStage !== prevStage,
      newMilestones,
    };
  }

  // 전체 왕국 번영도(모든 지역 번영도 평균) — 8번 "왕국 번영도 시스템" 의 기초값
  kingdomProsperity(player) {
    this.ensureState(player);
    const all = REGIONS.filter(d => !d.excludeFromKingdomCalc).map(d => player.regions[d.id]?.prosperity ?? 0);
    if (!all.length) return 0;
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
  }

  // 완료된 지역 수 (왕국 번영도 계산에서 제외된 미래 지역은 포함하지 않음)
  completedCount(player) {
    this.ensureState(player);
    return REGIONS.filter(d => !d.excludeFromKingdomCalc && player.regions[d.id]?.completed).length;
  }

  // ── 동료 개인 스토리 ──────────────────────────────
  ensureCompanionStoryState(player) {
    if (!player.companionStory) player.companionStory = {};
    for (const key of Object.keys(COMPANION_STORY)) {
      if (!player.companionStory[key]) player.companionStory[key] = { conflictShown: false, done: false };
    }
  }

  getCompanionStoryConfig(partyKey) {
    return COMPANION_STORY[partyKey] || null;
  }

  isCompanionStoryDone(player, partyKey) {
    this.ensureCompanionStoryState(player);
    return !!player.companionStory[partyKey]?.done;
  }

  isCompanionConflictShown(player, partyKey) {
    this.ensureCompanionStoryState(player);
    return !!player.companionStory[partyKey]?.conflictShown;
  }

  markCompanionConflictShown(player, partyKey) {
    this.ensureCompanionStoryState(player);
    player.companionStory[partyKey].conflictShown = true;
  }

  // 이 동료의 갈등편을 지금 트리거해도 되는지 확인:
  //  - 스토리 설정이 있고, 갈등편을 아직 안 봤고
  //  - 호감도가 충분하고
  //  - (심연 게이트형이 아니면) 그 동료의 지역이 현재 활성 지역과 일치
  canTriggerCompanionStory(player, partyKey, currentRegionId) {
    const cfg = this.getCompanionStoryConfig(partyKey);
    if (!cfg) return false;
    if (this.isCompanionConflictShown(player, partyKey)) return false;
    const aff = player.affinity?.[partyKey] || 0;
    if (aff < cfg.affinityRequired) return false;
    if (cfg.abyssGate) return false; // 심연 게이트형은 별도 트리거(던전 진입 전)로만 발동
    return cfg.regionId === currentRegionId;
  }

  // 갈등편을 본 동료의 해당 지역이 완료됐을 때 결말편을 틔워도 되는지
  canTriggerCompanionResolution(player, partyKey, currentRegionId) {
    const cfg = this.getCompanionStoryConfig(partyKey);
    if (!cfg) return false;
    if (this.isCompanionStoryDone(player, partyKey)) return false;
    if (!this.isCompanionConflictShown(player, partyKey)) return false; // 갈등편을 먼저 봐야 함
    if (cfg.abyssGate) return false;
    return cfg.regionId === currentRegionId;
  }

  // 심연 게이트형(리온/힐러) 스토리를 지금 트리거해도 되는지 — 지역 일치 검사 없이 호감도만 확인
  canTriggerAbyssGateStory(player, partyKey) {
    const cfg = this.getCompanionStoryConfig(partyKey);
    if (!cfg || !cfg.abyssGate) return false;
    if (this.isCompanionStoryDone(player, partyKey)) return false;
    const aff = player.affinity?.[partyKey] || 0;
    return aff >= cfg.affinityRequired;
  }

  markCompanionStoryDone(player, partyKey) {
    this.ensureCompanionStoryState(player);
    player.companionStory[partyKey].done = true;
  }
}

// ── 전역 등록 (다른 모듈에서 사용) ───────────────────
window.REGIONS                    = REGIONS;
window.REGION_BY_ID               = REGION_BY_ID;
window.REGION_COMPLETE_THRESHOLD  = REGION_COMPLETE_THRESHOLD;
window.REGION_INVESTMENT          = REGION_INVESTMENT;
window.REGION_FESTIVAL             = REGION_FESTIVAL;
window.COMPANION_STORY            = COMPANION_STORY;
window.RegionManager              = RegionManager;
