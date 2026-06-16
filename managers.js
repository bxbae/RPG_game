// ═══════════════════════════════════════════════════
//  managers.js  — SaveManager / ItemManager / QuestManager
// ═══════════════════════════════════════════════════
"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SaveManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SaveManager {
  constructor(key = "rpgSaveV3") { this.key = key; }

  // 플레이어 직렬화 — save / autoSave 공통 사용
  _serializePlayer(p) {
    return {
      type: p.type, name: p.name, hp: p.hp, maxHp: p.maxHp,
      baseAttack: p.baseAttack, bonusAttack: p.bonusAttack,
      money: p.money, level: p.level, exp: p.exp, nextExp: p.nextExp,
      skillPoints: p.skillPoints,
      skills: p.skills, activeSkills: p.activeSkills, passiveSkills: p.passiveSkills,
      equipment: p.equipment, partyEquipment: p.partyEquipment,
      inventory: p.inventory,
      party: p.party, partyHp: p.partyHp, partyMaxHp: p.partyMaxHp,
      _partyKnockedOut: p._partyKnockedOut || false,
      party2: p.party2, party2Hp: p.party2Hp, party2MaxHp: p.party2MaxHp,
      _party2KnockedOut: p._party2KnockedOut || false,
      party3: p.party3, party3Hp: p.party3Hp, party3MaxHp: p.party3MaxHp,
      _party3KnockedOut: p._party3KnockedOut || false,
      affinity: p.affinity, partyEvents: p.partyEvents,
      partyUltimateUnlocked: p.partyUltimateUnlocked,
      partyUltimateEX: p.partyUltimateEX, partyExAwakened: p.partyExAwakened,
      partyStoryUnlocked: p.partyStoryUnlocked, partyBondMax: p.partyBondMax,
      storyRewardClaimed: p.storyRewardClaimed, partyCutinLevel: p.partyCutinLevel,
      quest: p.quest, questProgress: p.questProgress,
      killCount: p.killCount, abyssUnlocked: p.abyssUnlocked,
      guardianDefeated: p.guardianDefeated || false,
      storyPhase: p.storyPhase,
      bank: p.bank || { deposit:0, interest:0, totalInvested:0, milestones:[] },
      achievements: p.achievements || {},
      ultimateGauge: p.ultimateGauge, guardBuff: p.guardBuff,
      cooldowns: p.cooldowns, status: p.status,
    };
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
    Object.assign(p, raw);

    // Object.assign이 raw.type 등으로 덮어쓰므로 재설정
    if (rawType !== type) {
      const base = CLASSES[type] || CLASSES.knight;
      p.type      = type;
      p.name      = base.name;
      p.icon      = base.icon;
      p.portrait  = base.portrait || "";
    }
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
    // partyEvents: 기본 구조와 저장값 병합 — 신규 필드(affinity25 등)가 구 세이브에 없어도 안전
    p.partyEvents = {
      affinity25: false, affinity50: false, affinity75: false, affinity100: false,
      ...(raw.partyEvents || {}),
    };
    p.storyRewardClaimed= raw.storyRewardClaimed || {};
    p.passiveSkills     = raw.passiveSkills      || {};
    p.cooldowns         = raw.cooldowns          || { jobSkill:0, partyUltimate:0, heal:0 };
    p.status            = raw.status             || { poison:0, stun:0, burn:0 };
    p.affinity          = raw.affinity           || { archer:0, healer:0, tanker:0, dealer:0, mage_party:0 };
    p._partyKnockedOut  = raw._partyKnockedOut   || false;
    p.party2            = raw.party2             || null;
    p.party2Hp          = raw.party2Hp           || 0;
    p.party2MaxHp       = raw.party2MaxHp        || 0;
    p._party2KnockedOut = raw._party2KnockedOut  || false;
    p.party3            = raw.party3             || null;
    p.party3Hp          = raw.party3Hp           || 0;
    p.party3MaxHp       = raw.party3MaxHp        || 0;
    p._party3KnockedOut = raw._party3KnockedOut  || false;
    p.guardianDefeated  = raw.guardianDefeated   || false;
    p.storyPhase        = "town";
    p.bank = raw.bank || { deposit:0, interest:0, totalInvested:0, milestones:[] };
    p.achievements = raw.achievements || {};
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
        [...Object.values(p.equipment), ...Object.values(p.partyEquipment)]
          .filter(Boolean).map(e => e.itemId)
      );
      const gradeOrder = ["normal","uncommon","rare","epic","legend"];
      let sellIdx = -1;
      for (const g of gradeOrder) {
        sellIdx = p.inventory.findIndex(i =>
          (i.class || "normal") === g && !equippedIds.has(i.itemId)
        );
        if (sellIdx >= 0) break;
      }
      if (sellIdx < 0) sellIdx = 0; // 모두 장착 중인 극단적 상황 대비 fallback
      const sold = p.inventory.splice(sellIdx, 1)[0];
      const price = Math.max(10, Math.floor(((sold.attack||0)+(sold.defense||0))*5)+10);
      p.money += price;
      game.log(`🎒 인벤토리 가득! <span class="${sold.class}">${sold.name}</span> 자동 매각 +${price}G`);
    }
    p.inventory.push(normalizeItem(item));
  }

  equip(game, index, forParty = false) {
    const p    = game.player;
    const item = p.inventory[index];
    if (!item || item.type === "potion") return;

    const target = forParty ? p.partyEquipment : p.equipment;

    // 직업 무기 제한
    if (item.weaponClass && !forParty) {
      const allowed = { knight:"sword", night:"sword", mage:"staff", archer:"bow" }[p.type];
      if (allowed && item.weaponClass !== allowed) {
        game.log(`❌ ${CLASSES[p.type].name}은(는) ${allowed}만 사용 가능`);
        return;
      }
    }
    if (item.weaponClass && forParty && p.party) {
      const allowed = { healer:"staff", mage_party:"staff", archer:"bow", tanker:"sword", dealer:"sword" }[p.party];
      if (allowed && item.weaponClass !== allowed) {
        game.log(`❌ 동료는 ${allowed}만 사용 가능`);
        return;
      }
    }

    const old = target[item.type];
    if (old) p.inventory.push(old);
    target[item.type] = item;
    p.inventory.splice(index, 1);
    game.log(`⚔ ${item.name} 장착`);
  }

  unequip(game, slot, forParty = false) {
    const p  = game.player;
    const eq = forParty ? p.partyEquipment : p.equipment;
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
    const allEq = [...Object.values(p.equipment), ...Object.values(p.partyEquipment)];
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
    if (item.type === "potion") {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + (item.heal || 50));
      game.log(`💊 ${item.name} 사용! HP 회복`);
    } else {
      this.add(game, { ...item, itemId: createItemId() });
      game.log(`🛒 ${item.name} 구매`);
    }
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
    const allEq = [...Object.values(p.equipment), ...Object.values(p.partyEquipment)];
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