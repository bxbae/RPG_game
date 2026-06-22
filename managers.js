// ═══════════════════════════════════════════════════
//  managers.js  — SaveManager / ItemManager / QuestManager
// ═══════════════════════════════════════════════════
"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SaveManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 저장에서 제외할 "휘발성" 필드 ────────────────────────
// 핵심 설계: 저장할 필드를 일일이 나열하지 않고, "저장하면 안 되는 것"만 여기 모은다.
// Player에 새 속성을 추가해도 자동으로 저장되므로, 목록 누락으로 인한
// "불러오면 그 값만 초기화되는" 버그가 원천적으로 생기지 않는다.
//
// 여기 넣을 것: 화면 좌표·렌더용 임시값, 다음 세션에서 새로 계산되는 전투 임시 상태,
//             게임 인스턴스가 런타임에 붙이는 내부 플래그 등.
// 여기 넣지 말 것: 스토리 진행·호감도·일일 퀘스트·소지품 등 "이어서 해야 하는" 모든 것.
const TRANSIENT_PLAYER_FIELDS = new Set([
  // 렌더 전용 좌표 (던전 진입 시 mapX/mapY로부터 다시 계산됨)
  "pixelX", "pixelY",
  // 전투 임시 상태 (다음 전투 시작 시 새로 세팅됨)
  "guardBuff",
  // 마을 대화 체인이 런타임에 붙이는 진행 플래그
  "_introChainActive",
  // 게임 흐름 제어용 휘발성 플래그 (불러오기·전투 귀환 감지용, 세션 한정)
  "_returnedFromLoad", "_returnedFromBattle", "_returnedFromFlee",
  "_hadLoad", "_hadBattle", "_hadFlee", "_destroyed",
]);

class SaveManager {
  constructor(key = "rpgSaveV3") { this.key = key; }

  // 플레이어 직렬화 — save / autoSave 공통 사용
  // 화이트리스트(나열) 대신 블랙리스트(제외) 방식:
  //   객체의 모든 자체 열거 가능 필드를 저장하되, TRANSIENT_PLAYER_FIELDS 와
  //   함수만 건너뛴다. getter(money 등)는 Object.keys 에 잡히지 않으므로,
  //   클램프된 값이 필요한 money 는 아래에서 명시적으로 저장한다.
  _serializePlayer(p) {
    const out = {};
    for (const key of Object.keys(p)) {
      if (TRANSIENT_PLAYER_FIELDS.has(key)) continue;
      if (typeof p[key] === "function") continue;
      out[key] = p[key];
    }
    // money 는 getter/setter 로 동작(_money 에 클램프되어 저장됨) →
    // 불러올 때 setter 가 다시 클램프하도록 money 키를 명시적으로 기록
    out.money = p.money;
    return out;
  }

  // ══════════════════════════════════════════════════
  //  멀티 슬롯 저장 시스템 (슬롯 0·1·2)
  //  키: rpgSave_slot_0 / rpgSave_slot_1 / rpgSave_slot_2
  // ══════════════════════════════════════════════════

  _slotKey(idx) { return `rpgSave_slot_${idx}`; }

  // 슬롯 저장 (slotIndex 없으면 slot_0 에 저장)
  save(game, slotIndex = 0) {
    try {
      if (!game.player) return false;
      const data = {
        version: 3, savedAt: Date.now(),
        player: this._serializePlayer(game.player),
      };
      localStorage.setItem(this._slotKey(slotIndex), JSON.stringify(data));
      return true;
    } catch(e) { console.error("Save failed:", e); return false; }
  }

  // 슬롯 불러오기 (slotIndex 없으면 slot_0 → 구 rpgSaveV3 순서로 시도)
  load(slotIndex = 0) {
    try {
      const r = localStorage.getItem(this._slotKey(slotIndex));
      if (r) return JSON.parse(r);
      // 구버전 단일 저장 키 호환 (슬롯 0에서만 시도)
      if (slotIndex === 0) {
        const legacy = localStorage.getItem(this.key);
        if (legacy) return JSON.parse(legacy);
      }
      return null;
    } catch(e) { console.error("Load failed:", e); return null; }
  }

  // 3개 슬롯 전체 반환 — town-scene.js _renderSaveSlots()에서 호출
  getAllSlots() {
    const slots = [];
    for (let i = 0; i < 3; i++) {
      try {
        const raw = localStorage.getItem(this._slotKey(i));
        if (raw) {
          slots.push({ index: i, empty: false, data: JSON.parse(raw) });
        } else {
          // 슬롯 0에 한해 구버전 키도 확인
          if (i === 0) {
            const legacy = localStorage.getItem(this.key);
            if (legacy) {
              slots.push({ index: 0, empty: false, data: JSON.parse(legacy) });
              continue;
            }
          }
          slots.push({ index: i, empty: true, data: null });
        }
      } catch(e) {
        slots.push({ index: i, empty: true, data: null });
      }
    }
    return slots;
  }

  // 슬롯 삭제
  deleteSlot(slotIndex) {
    try {
      localStorage.removeItem(this._slotKey(slotIndex));
      if (slotIndex === 0) localStorage.removeItem(this.key); // 구버전 키도 제거
    } catch(e) { console.warn("DeleteSlot failed:", e); }
  }

  // [ARCH 05] 자동저장 — 수동 저장 슬롯과 분리된 "rpg_autosave" 키 사용
  autoSave(game) {
    try {
      if (!game.player) return false;
      const data = { version: 3, savedAt: Date.now(), isAutoSave: true, player: this._serializePlayer(game.player) };
      localStorage.setItem("rpg_autosave", JSON.stringify(data));
      console.info("[RPG] 자동저장 완료 (rpg_autosave)");
      return true;
    } catch(e) { console.warn("AutoSave failed:", e); return false; }
  }

  hydrate(raw) {
    if (!raw) return null;
    const rawType = raw.type || "knight";
    // 구버전 세이브 자동 변환: warrior·night → knight
    const type = (rawType === "warrior" || rawType === "night") ? "knight" : rawType;
    const p = new Player(type);

    // 1) 저장값을 통째로 복사 — 단순 필드(플래그·숫자·문자열)는 이 한 줄로 끝.
    //    생성자가 이미 기본값을 세팅해뒀으므로, 저장에 없는 신규 필드는
    //    자동으로 기본값이 유지된다 (Object.assign 은 raw 에 있는 키만 덮어씀).
    Object.assign(p, raw);

    // 2) 직업 마이그레이션 시 Object.assign 이 옛 type 으로 덮어쓰므로 재설정
    if (rawType !== type) {
      const base = CLASSES[type] || CLASSES.knight;
      p.type      = type;
      p.name      = base.name;
      p.icon      = base.icon;
      p.portrait  = base.portrait || "";
    }

    // 3) 아이템은 단순 복사가 아니라 normalizeItem 으로 변환 필요(itemId/enhance 보정)
    p.inventory      = (raw.inventory || []).map(normalizeItem).filter(Boolean);
    p.equipment      = {
      weapon:  raw.equipment?.weapon  ? normalizeItem(raw.equipment.weapon)  : null,
      helmet:  raw.equipment?.helmet  ? normalizeItem(raw.equipment.helmet)  : null,
      armor:   raw.equipment?.armor   ? normalizeItem(raw.equipment.armor)   : null,
    };
    p.partyEquipment = {
      weapon:  raw.partyEquipment?.weapon  ? normalizeItem(raw.partyEquipment.weapon)  : null,
      helmet:  raw.partyEquipment?.helmet  ? normalizeItem(raw.partyEquipment.helmet)  : null,
      armor:   raw.partyEquipment?.armor   ? normalizeItem(raw.partyEquipment.armor)   : null,
    };
    p.party2Equipment = {
      weapon:  raw.party2Equipment?.weapon  ? normalizeItem(raw.party2Equipment.weapon)  : null,
      helmet:  raw.party2Equipment?.helmet  ? normalizeItem(raw.party2Equipment.helmet)  : null,
      armor:   raw.party2Equipment?.armor   ? normalizeItem(raw.party2Equipment.armor)   : null,
    };

    // 4) "구조가 있는" 객체는 기본 틀 + 저장값 병합 — 구 세이브에 하위 필드가
    //    없어도 안전하도록 백필. (단순 복사로는 새 하위 키가 undefined 가 됨)
    p.partyEvents = {
      affinity25: false, affinity50: false, affinity75: false, affinity100: false,
      ...(raw.partyEvents || {}),
    };
    p.cooldowns = { jobSkill:0, partyUltimate:0, party2Ultimate:0, party3Ultimate:0, heal:0, ...(raw.cooldowns || {}) };
    p.status    = { poison:0, stun:0, burn:0,          ...(raw.status    || {}) };
    p.affinity  = { archer:0, healer:0, tanker:0, dealer:0, mage_party:0, ...(raw.affinity || {}) };
    p.bank      = { deposit:0, interest:0, totalInvested:0, milestones:[], ...(raw.bank || {}) };

    // 5) storyPhase 는 항상 마을에서 다시 시작 (저장값 무시)
    p.storyPhase = "town";

    // 6) 이 수정 이전에 저장된 구버전 세이브 보정 — metVillageChief 는 인트로 체인
    //    안에서만 true 가 되므로, 그게 true 인데 introChainDone 이 false 라면
    //    (예전엔 저장이 안 됐을 뿐) 인트로는 이미 끝난 것으로 간주해 재생을 막는다
    if (p.metVillageChief && !p.introChainDone) {
      p.introChainDone = true;
      p.introDepartureDone = true;
    }
    return p;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ItemManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ItemManager {
  static MAX_INVENTORY = 20;

  add(game, item) {
    const p = game.player;
    if (p.inventory.length >= ItemManager.MAX_INVENTORY) {
      // [BALANCE 06] 장착 중인 아이템 ID를 먼저 수집해 매각 후보에서 제외
      const equippedIds = new Set(
        [...Object.values(p.equipment), ...Object.values(p.partyEquipment), ...Object.values(p.party2Equipment||{})]
          .filter(Boolean).map(e => e.itemId)
      );
      const gradeOrder = ["normal","uncommon","rare","epic","legend"];
      let sellIdx = -1;
      for (const g of gradeOrder) {
        sellIdx = p.inventory.findIndex(i =>
          (i.class || "normal") === g && i.type !== "key" && !equippedIds.has(i.itemId)
        );
        if (sellIdx >= 0) break;
      }
      if (sellIdx < 0) sellIdx = p.inventory.findIndex(i => i.type !== "key"); // 모두 장착 중인 극단적 상황 대비 fallback (열쇠류는 절대 매각 대상에서 제외)
      if (sellIdx < 0) sellIdx = 0; // 정말 인벤토리가 전부 열쇠류뿐인 극단적 경우의 최종 안전장치
      const sold = p.inventory.splice(sellIdx, 1)[0];
      const price = Math.max(10, Math.floor(((sold.attack||0)+(sold.defense||0))*5)+10);
      p.money += price;
      game.log(`🎒 인벤토리 가득! <span class="${sold.class}">${sold.name}</span> 자동 매각 +${price}G`);
    }
    p.inventory.push(normalizeItem(item));
  }

  // target: false/"player" → 주인공, true/"party" → 1번 동료, "party2" → 2번 동료
  equip(game, index, target = false) {
    const p    = game.player;
    const item = p.inventory[index];
    if (!item || item.type === "potion" || item.type === "key") return;

    // 하위호환: boolean → 문자열 정규화
    const who = target === true ? "party" : (target === false ? "player" : target);
    const slotMap = {
      player: { eq: p.equipment,       member: p.type,   isParty: false },
      party:  { eq: p.partyEquipment,  member: p.party,  isParty: true  },
      party2: { eq: p.party2Equipment, member: p.party2, isParty: true  },
    };
    const dest = slotMap[who] || slotMap.player;
    const eqTarget = dest.eq;

    // 직업 무기 제한
    if (item.weaponClass && who === "player") {
      const allowed = { knight:"sword", night:"sword", mage:"staff", archer:"bow" }[p.type];
      if (allowed && item.weaponClass !== allowed) {
        game.log(`❌ ${CLASSES[p.type].name}은(는) ${allowed}만 사용 가능`);
        return;
      }
    }
    if (item.weaponClass && dest.isParty && dest.member) {
      const allowed = { healer:"staff", mage_party:"staff", archer:"bow", tanker:"sword", dealer:"sword" }[dest.member];
      if (allowed && item.weaponClass !== allowed) {
        game.log(`❌ 동료는 ${allowed}만 사용 가능`);
        return;
      }
    }

    const old = eqTarget[item.type];
    if (old) p.inventory.push(old);
    eqTarget[item.type] = item;
    p.inventory.splice(index, 1);
    game.log(`⚔ ${item.name} 장착`);
  }

  unequip(game, slot, target = false) {
    const p  = game.player;
    const who = target === true ? "party" : (target === false ? "player" : target);
    const eq = who === "party"  ? p.partyEquipment
             : who === "party2" ? p.party2Equipment
             : p.equipment;
    const it = eq[slot];
    if (!it) return;
    p.inventory.push(it);
    eq[slot] = null;
    game.log(`🔓 ${it.name} 해제`);
  }

  remove(game, index) {
    const p    = game.player;
    const item = p.inventory[index];
    if (!item) return;

    // 장착 중인 아이템인지 확인
    const allEq = [...Object.values(p.equipment), ...Object.values(p.partyEquipment), ...Object.values(p.party2Equipment||{})];
    if (allEq.some(e => sameItem(e, item))) {
      game.log("⚠ 장착 해제 후 삭제하세요");
      return;
    }
    p.inventory.splice(index, 1);
  }

  buyShop(game, shopIndex) {
    const p    = game.player;
    const item = SHOP_ITEMS[shopIndex];
    if (!item) return false;
    if (p.money < item.cost) { game.log("💰 골드 부족"); return false; }

    p.money -= item.cost;
    this.add(game, { ...item, itemId: createItemId() });
    game.log(`🛒 ${item.name} 구매`);
    return true;
  }

  // 인벤토리에 보관 중인 물약을 실제로 사용(HP 회복 후 소모)
  usePotion(game, index) {
    const p    = game.player;
    const item = p.inventory[index];
    if (!item || item.type !== "potion") return false;

    const before = p.hp;
    p.hp = Math.min(p.maxHp + (p.bonusHp||0), p.hp + (item.heal || 50));
    const healed = p.hp - before;
    p.inventory.splice(index, 1);
    game.log(`💊 ${item.name} 사용! HP +${healed}`);
    return true;
  }

  enhance(game, index) {
    const p    = game.player;
    const item = p.inventory[index];
    if (!item) return;

    const cost = (item.enhance + 1) * 100;
    if (p.money < cost) { game.log("💰 골드 부족"); return; }
    p.money -= cost;

    // [BALANCE 03] 강화 확률 테이블: +7부터 급락 (기존 하한 20% 제거)
    // +0:100% +1:90% +2:80% +3:70% +4:60% +5:50% +6:40% +7:20% +8:12% +9:8% +10:5%
    const ENHANCE_CHANCE = [100, 90, 80, 70, 60, 50, 40, 20, 12, 8, 5];
    const chance = ENHANCE_CHANCE[Math.min(item.enhance, ENHANCE_CHANCE.length - 1)] ?? 5;
    if (Math.random() * 100 < chance) {
      item.enhance++;
      if (item.type === "weapon") item.attack  += 2;
      else                        item.defense += 2;
      game.log(`✨ 강화 성공! +${item.enhance}`);
      if (item.enhance === 5)  game.log("💎 희귀 장비로 진화!");
      if (item.enhance === 10) game.log("👑 전설 장비 탄생!");
    } else {
      game.log("💥 강화 실패!");
    }
  }

  sellToBlacksmith(game, index, price) {
    const p = game.player;
    if (index < 0 || index >= p.inventory.length) return;
    const item = p.inventory[index];
    // 장착 중이면 판매 불가
    const allEq = [...Object.values(p.equipment), ...Object.values(p.partyEquipment), ...Object.values(p.party2Equipment||{})];
    if (allEq.some(e => sameItem(e, item))) { game.log("⚠ 장착 중인 아이템"); return; }
    p.money += price;
    p.inventory.splice(index, 1);
    game.log(`💰 ${item.name} 판매 +${price}G`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  QuestManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class QuestManager {
  getAvailable(player) {
    const activeId = player.quest?.id;
    return QUESTS.filter(q => q.id !== activeId && (q.minLevel || 1) <= player.level);
  }

  accept(game, questId) {
    const q = QUESTS.find(q => q.id === questId);
    if (!q) return false;
    game.player.quest         = q;
    game.player.questProgress = 0;
    game.log(`📜 퀘스트 수락: ${q.title} — ${q.target} ${q.goal}마리`);
    return true;
  }

  // 몬스터 처치 시 호출 → { cleared, quest }
  onKill(game, monsterName) {
    const p = game.player;
    if (!p.quest) return { cleared: false };
    if (p.quest.target !== monsterName) return { cleared: false };

    p.questProgress++;
    game.log(`📜 [${p.quest.title}] ${p.questProgress}/${p.quest.goal}`);

    if (p.questProgress >= p.quest.goal) {
      const completed = { ...p.quest };
      p.money += completed.rewardGold; // setter가 MAX_GOLD 자동 클램프
      const lvUp = p.gainExp(completed.rewardExp);
      game.log(`🏆 퀘스트 완료! +${completed.rewardGold.toLocaleString()}G +${completed.rewardExp}EXP`);
      if (lvUp) {
        game.log(p.level >= MAX_LEVEL
          ? `🏆 최고 레벨 달성! Lv.${p.level} ✦MAX`
          : `🎉 레벨 업! Lv.${p.level}`
        );
      }
      p.quest         = null;
      p.questProgress = 0;
      // 완료 대화 예약 (마을 귀환 시 표시)
      if (completed.completeNpc) game._pendingQuestCompleteDlg = completed.completeNpc;
      // 공주가 의뢰인인 퀘스트 완료 시 호감도 보너스
      if (completed.giver === "공주 실비아") {
        p.princessAffinity = Math.min(100, (p.princessAffinity||0) + 10);
        game.log(`👸 공주 호감도 +10 (현재 ${p.princessAffinity})`);
      }
      return { cleared: true, quest: completed };
    }
    return { cleared: false };
  }

  getProgressPct(player) {
    if (!player.quest) return 0;
    return Math.floor((player.questProgress / player.quest.goal) * 100);
  }
}

// 전역 노출
window.SaveManager   = SaveManager;
window.ItemManager   = ItemManager;
window.QuestManager  = QuestManager;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AttendanceManager — 일일 출석 보상
//  localStorage 키: "rpg_attendance"
//  7일 사이클: 연속 출석할수록 보상 증가, 7일 후 재시작
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class AttendanceManager {
  static KEY = "rpg_attendance";

  // 7일 보상 테이블 (1-based index)
  static REWARDS = [
    { day:1, gold:200,  potion:0, item:null,       icon:"💰", label:"200G"             },
    { day:2, gold:300,  potion:0, item:null,       icon:"💰", label:"300G"             },
    { day:3, gold:200,  potion:2, item:null,       icon:"💊", label:"회복 물약 2개 + 200G"},
    { day:4, gold:800,  potion:0, item:null,       icon:"💰", label:"800G"             },
    { day:5, gold:0,    potion:0, item:"uncommon", icon:"⚔",  label:"고급 장비"         },
    { day:6, gold:1200, potion:0, item:null,       icon:"💰", label:"1,200G"           },
    { day:7, gold:1500, potion:0, item:"rare",     icon:"🌟", label:"1,500G + 희귀 장비", special:true },
  ];

  // ── 날짜 유틸 ─────────────────────────────────────
  _dateStr(offset = 0) {
    const d = new Date();
    if (offset) d.setDate(d.getDate() + offset);
    const y  = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }

  // ── 저장 / 불러오기 ───────────────────────────────
  load() {
    try {
      const raw = localStorage.getItem(AttendanceManager.KEY);
      return raw ? JSON.parse(raw) : { lastDate:null, streak:0, totalDays:0 };
    } catch(e) { return { lastDate:null, streak:0, totalDays:0 }; }
  }

  _save(data) {
    try { localStorage.setItem(AttendanceManager.KEY, JSON.stringify(data)); }
    catch(e) { console.warn("Attendance save failed:", e); }
  }

  // ── 출석 체크 ─────────────────────────────────────
  // 오늘 이미 출석했으면 null 반환 (중복 방지)
  // 신규/연속이면 { streak, totalDays, reward } 반환
  check() {
    const today     = this._dateStr();
    const yesterday = this._dateStr(-1);
    const data      = this.load();

    if (data.lastDate === today) return null; // 이미 오늘 체크함

    const isConsecutive = data.lastDate === yesterday;
    // 오염 데이터 방어: streak은 반드시 0~7 범위로 클램프
    const curStreak = Math.max(0, Math.min(7, Math.floor(data.streak || 0)));
    const newStreak = isConsecutive ? (curStreak >= 7 ? 1 : curStreak + 1) : 1;
    const newTotalDays = Math.max(0, (data.totalDays || 0)) + 1;

    this._save({ lastDate: today, streak: newStreak, totalDays: newTotalDays });

    const reward = AttendanceManager.REWARDS[newStreak - 1];
    return { streak: newStreak, totalDays: newTotalDays, reward };
  }

  // ── 보상 지급 ─────────────────────────────────────
  applyReward(game, reward) {
    const p = game.player;
    if (!p || !reward) return;

    if (reward.gold > 0) {
      p.money += reward.gold;
      game.log(`📅 출석 보상: +${reward.gold.toLocaleString()}G`);
    }
    for (let i = 0; i < (reward.potion || 0); i++) {
      game.itemManager.add(game, normalizeItem({
        name:"회복 물약", type:"potion", heal:50, attack:0, defense:0, class:"normal", enhance:0,
      }));
    }
    if (reward.potion > 0) game.log(`📅 출석 보상: 회복 물약 ${reward.potion}개`);
    if (reward.item) {
      // Bug 2 fix: 아이템 등급 하한 보장 (uncommon:1, rare:2, epic:3)
      const GRADE_MAP = { uncommon:1, rare:2, epic:3 };
      const minGrade  = GRADE_MAP[reward.item] ?? 0;
      const item = createRandomItem(minGrade >= 2, minGrade);
      game.itemManager.add(game, item);
      game.log(`📅 출석 보상: ${item.name}`);
    }
  }
}

window.AttendanceManager = AttendanceManager;