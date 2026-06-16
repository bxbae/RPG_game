// ═══════════════════════════════════════════════════
//  managers.js  — SaveManager / ItemManager / QuestManager
// ═══════════════════════════════════════════════════
"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SaveManager  — 5슬롯 멀티 세이브
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SaveManager {
  constructor() {
    this.prefix = "rpgSaveV4_slot"; // 슬롯별 키: rpgSaveV4_slot0 ~ slot4
    this.legacyKey = "rpgSaveV3"; // 구버전 호환
    this.SLOT_COUNT = 5;
  }

  // ── 슬롯에 저장 ───────────────────────────────
  save(game, slotIndex = 0) {
    try {
      const p = game.player;
      const data = {
        version: 4,
        savedAt: Date.now(),
        player: {
          type: p.type,
          name: p.name,
          hp: p.hp,
          maxHp: p.maxHp,
          baseAttack: p.baseAttack,
          bonusAttack: p.bonusAttack || 0,
          money: p.money,
          level: p.level,
          exp: p.exp,
          nextExp: p.nextExp,
          skillPoints: p.skillPoints,
          skills: p.skills,
          activeSkills: p.activeSkills,
          passiveSkills: p.passiveSkills || {},
          equipment: p.equipment,
          partyEquipment: p.partyEquipment,
          inventory: p.inventory,
          party: p.party,
          partyHp: p.partyHp,
          partyMaxHp: p.partyMaxHp,
          affinity: p.affinity,
          partyEvents: p.partyEvents,
          partyUltimateUnlocked: p.partyUltimateUnlocked,
          partyUltimateEX: p.partyUltimateEX,
          partyExAwakened: p.partyExAwakened,
          partyStoryUnlocked: p.partyStoryUnlocked,
          partyBondMax: p.partyBondMax,
          storyRewardClaimed: p.storyRewardClaimed || {},
          partyCutinLevel: p.partyCutinLevel,
          quest: p.quest,
          questProgress: p.questProgress,
          killCount: p.killCount,
          guardianKillCount: p.guardianKillCount || 0,
          abyssUnlocked: p.abyssUnlocked,
          abyssKillCount: p.abyssKillCount || 0,
          storyPhase: p.storyPhase,
          ultimateGauge: p.ultimateGauge,
          guardBuff: p.guardBuff,
          cooldowns: p.cooldowns,
          status: p.status,
          // ★ 은행/투자
          bank: {
            deposit: p.bank?.deposit || 0,
            interest: p.bank?.interest || 0,
            totalInvested: p.bank?.totalInvested || 0,
            milestones: p.bank?.milestones || [],
          },
        },
      };
      localStorage.setItem(this.prefix + slotIndex, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Save failed:", e);
      return false;
    }
  }

  // ── 슬롯에서 로드 ─────────────────────────────
  load(slotIndex = 0) {
    try {
      const r = localStorage.getItem(this.prefix + slotIndex);
      if (r) return JSON.parse(r);
      // 슬롯0이면 구버전도 체크
      if (slotIndex === 0) {
        const legacy = localStorage.getItem(this.legacyKey);
        if (legacy) return JSON.parse(legacy);
      }
      return null;
    } catch (e) {
      console.error("Load failed:", e);
      return null;
    }
  }

  // ── 슬롯 삭제 ────────────────────────────────
  deleteSlot(slotIndex) {
    localStorage.removeItem(this.prefix + slotIndex);
  }

  // ── 전체 슬롯 정보 (UI용) ─────────────────────
  getAllSlots() {
    const slots = [];
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      try {
        const raw = localStorage.getItem(this.prefix + i);
        if (raw) {
          const data = JSON.parse(raw);
          slots.push({ index: i, empty: false, data });
        } else {
          // 슬롯0 구버전 체크
          if (i === 0) {
            const legacy = localStorage.getItem(this.legacyKey);
            if (legacy) {
              const data = JSON.parse(legacy);
              slots.push({ index: i, empty: false, data, legacy: true });
              continue;
            }
          }
          slots.push({ index: i, empty: true, data: null });
        }
      } catch (e) {
        slots.push({ index: i, empty: true, data: null });
      }
    }
    return slots;
  }

  // ── hydrate ───────────────────────────────────
  hydrate(raw) {
    if (!raw) return null;
    const rawType = raw.type || "knight";
    const type = rawType === "warrior" ? "knight" : rawType;
    const p = new Player(type);
    Object.assign(p, raw);

    p.inventory = (raw.inventory || []).map(normalizeItem).filter(Boolean);
    p.equipment = {
      weapon: raw.equipment?.weapon
        ? normalizeItem(raw.equipment.weapon)
        : null,
      helmet: raw.equipment?.helmet
        ? normalizeItem(raw.equipment.helmet)
        : null,
      armor: raw.equipment?.armor ? normalizeItem(raw.equipment.armor) : null,
    };
    p.partyEquipment = {
      weapon: raw.partyEquipment?.weapon
        ? normalizeItem(raw.partyEquipment.weapon)
        : null,
      helmet: raw.partyEquipment?.helmet
        ? normalizeItem(raw.partyEquipment.helmet)
        : null,
      armor: raw.partyEquipment?.armor
        ? normalizeItem(raw.partyEquipment.armor)
        : null,
    };

    // 기본값 보호 (구버전 호환)
    p.partyEvents = raw.partyEvents || {
      affinity25: false,
      affinity50: false,
      affinity75: false,
      affinity100: false,
    };
    p.storyRewardClaimed = raw.storyRewardClaimed || {};
    p.passiveSkills = raw.passiveSkills || {};
    p.cooldowns = raw.cooldowns || { jobSkill: 0, partyUltimate: 0, heal: 0 };
    p.status = raw.status || { poison: 0, stun: 0, burn: 0 };
    p.affinity = raw.affinity || {
      archer: 0,
      healer: 0,
      tanker: 0,
      dealer: 0,
      mage_party: 0,
    };
    p.bonusAttack = raw.bonusAttack || 0;
    p.guardianKillCount = raw.guardianKillCount ?? 0;
    p.abyssKillCount = raw.abyssKillCount ?? 0;

    // 은행 복원
    if (raw.bank && typeof raw.bank === "object") {
      p.bank = {
        deposit: raw.bank.deposit ?? 0,
        interest: raw.bank.interest ?? 0,
        totalInvested: raw.bank.totalInvested ?? 0,
        milestones: Array.isArray(raw.bank.milestones)
          ? raw.bank.milestones
          : [],
      };
    } else {
      p.bank = { deposit: 0, interest: 0, totalInvested: 0, milestones: [] };
    }

    p.storyPhase = "town";
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
      const gradeOrder = ["normal", "uncommon", "rare", "epic", "legend"];
      let sellIdx = -1;
      for (const g of gradeOrder) {
        sellIdx = p.inventory.findIndex((i) => (i.class || "normal") === g);
        if (sellIdx >= 0) break;
      }
      if (sellIdx < 0) sellIdx = 0;
      const sold = p.inventory.splice(sellIdx, 1)[0];
      const price = Math.max(
        10,
        Math.floor(((sold.attack || 0) + (sold.defense || 0)) * 5) + 10,
      );
      p.money += price;
      game.log(
        `🎒 인벤토리 가득! <span class="${sold.class}">${sold.name}</span> 자동 매각 +${price}G`,
      );
    }
    p.inventory.push(normalizeItem(item));
  }

  equip(game, index, forParty = false) {
    const p = game.player;
    const item = p.inventory[index];
    if (!item || item.type === "potion") return;
    const target = forParty ? p.partyEquipment : p.equipment;
    if (item.weaponClass && !forParty) {
      const allowed = { night: "sword", mage: "staff", archer: "bow" }[p.type];
      if (allowed && item.weaponClass !== allowed) {
        game.log(`❌ ${CLASSES[p.type].name}은(는) ${allowed}만 사용 가능`);
        return;
      }
    }
    if (item.weaponClass && forParty && p.party) {
      const allowed = {
        healer: "staff",
        mage_party: "staff",
        archer: "bow",
        tanker: "sword",
        dealer: "sword",
      }[p.party];
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
    const p = game.player;
    const eq = forParty ? p.partyEquipment : p.equipment;
    const it = eq[slot];
    if (!it) return;
    p.inventory.push(it);
    eq[slot] = null;
    game.log(`🔓 ${it.name} 해제`);
  }

  remove(game, index) {
    const p = game.player;
    const item = p.inventory[index];
    if (!item) return;
    const allEq = [
      ...Object.values(p.equipment),
      ...Object.values(p.partyEquipment),
    ];
    if (allEq.some((e) => sameItem(e, item))) {
      game.log("⚠ 장착 해제 후 삭제하세요");
      return;
    }
    p.inventory.splice(index, 1);
  }

  buyShop(game, shopIndex) {
    const p = game.player;
    const item = SHOP_ITEMS[shopIndex];
    if (!item) return false;
    if (p.money < item.cost) {
      game.log("💰 골드 부족");
      return false;
    }
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
    const p = game.player;
    const item = p.inventory[index];
    if (!item) return;
    const cost = (item.enhance + 1) * 100;
    if (p.money < cost) {
      game.log("💰 골드 부족");
      return;
    }
    p.money -= cost;
    const chance = Math.max(20, 100 - item.enhance * 10);
    if (Math.random() * 100 < chance) {
      item.enhance++;
      if (item.type === "weapon") item.attack += 2;
      else item.defense += 2;
      game.log(`✨ 강화 성공! +${item.enhance}`);
      if (item.enhance === 5) game.log("💎 희귀 장비로 진화!");
      if (item.enhance === 10) game.log("👑 전설 장비 탄생!");
    } else {
      game.log("💥 강화 실패!");
    }
  }

  sellToBlacksmith(game, index, price) {
    const p = game.player;
    if (index < 0 || index >= p.inventory.length) return;
    const item = p.inventory[index];
    const allEq = [
      ...Object.values(p.equipment),
      ...Object.values(p.partyEquipment),
    ];
    if (allEq.some((e) => sameItem(e, item))) {
      game.log("⚠ 장착 중인 아이템");
      return;
    }
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
    return QUESTS.filter(
      (q) => q.id !== activeId && (q.minLevel || 1) <= player.level,
    );
  }

  accept(game, questId) {
    const q = QUESTS.find((q) => q.id === questId);
    if (!q) return false;
    game.player.quest = q;
    game.player.questProgress = 0;
    game.log(`📜 퀘스트 수락: ${q.title} — ${q.target} ${q.goal}마리`);
    return true;
  }

  onKill(game, monsterName) {
    const p = game.player;
    if (!p.quest) return { cleared: false };
    if (p.quest.target !== monsterName) return { cleared: false };
    p.questProgress++;
    game.log(`📜 [${p.quest.title}] ${p.questProgress}/${p.quest.goal}`);
    if (p.questProgress >= p.quest.goal) {
      const completed = { ...p.quest };
      p.money += completed.rewardGold;
      const lvUp = p.gainExp(completed.rewardExp);
      game.log(
        `🏆 퀘스트 완료! +${completed.rewardGold}G +${completed.rewardExp}EXP`,
      );
      if (lvUp) game.log(`🎉 레벨 업! Lv.${p.level}`);
      p.quest = null;
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
window.SaveManager = SaveManager;
window.ItemManager = ItemManager;
window.QuestManager = QuestManager;
