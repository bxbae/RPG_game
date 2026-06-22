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
          completedQuests:  p.completedQuests  || [],
          _cardWins:        p._cardWins        || 0,
          _cardStreak:      p._cardStreak      || 0,
          _diceWins:        p._diceWins        || 0,
          _diceJackpot:     p._diceJackpot     || 0,
          _minigameGold:    p._minigameGold    || 0,
          _altarBuff:       p._altarBuff       || 0,
          _altarBuffTurns:  p._altarBuffTurns  || 0,
          killCount: p.killCount,
          guardianKillCount: p.guardianKillCount || 0,
          abyssUnlocked: p.abyssUnlocked,
          abyssKillCount: p.abyssKillCount || 0,
          storyPhase: p.storyPhase,
          ultimateGauge: p.ultimateGauge,
          guardBuff: p.guardBuff,
          cooldowns: p.cooldowns,
          status: p.status,
          // ★ 업적 카운트
          _critCount:   p._critCount   || 0,
          _chestCount:  p._chestCount  || 0,
          _maxFloor:    p._maxFloor    || 1,
          _cityEntered: p._cityEntered || false,
          _noHealBoss:  p._noHealBoss  || false,
          achievements: p.achievements || {},
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

      // ★ QuotaExceededError — 저장 공간 부족
      const isQuota = e instanceof DOMException && (
        e.code === 22 ||                    // 구버전 Chrome/Safari
        e.code === 1014 ||                  // Firefox
        e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED"
      );

      SaveManager._showSaveErrorToast(
        isQuota
          ? "⚠ 저장 공간이 부족합니다.\n오래된 슬롯을 삭제하거나 브라우저 저장소를 정리해주세요."
          : "❌ 저장에 실패했습니다.\n잠시 후 다시 시도해주세요."
      );
      return false;
    }
  }

  // ★ 저장 실패 토스트 (정적 메서드 — game 객체 없이 호출 가능)
  static _showSaveErrorToast(msg) {
    const old = document.getElementById("saveErrorToast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "saveErrorToast";
    toast.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      z-index:99999;
      background:#1a0808;border:2px solid #cc3333;border-radius:10px;
      padding:16px 24px;
      font-family:'Noto Serif KR',serif;font-size:.85rem;
      color:#ffaaaa;text-align:center;white-space:pre-line;
      box-shadow:0 4px 24px rgba(200,50,50,.4);
      animation:popupIn .3s ease;
      max-width:min(360px,90vw);
      line-height:1.7;`;

    toast.innerHTML = `
      <div style="font-size:1.1rem;margin-bottom:6px;">💾 저장 오류</div>
      <div>${msg.replace(/\n/g,"<br>")}</div>
      <button onclick="this.parentElement.remove()"
        style="margin-top:10px;background:transparent;border:1px solid #cc3333;
        color:#ff7777;padding:4px 16px;cursor:pointer;border-radius:4px;
        font-family:inherit;font-size:.78rem;">확인</button>`;

    document.body.appendChild(toast);

    // 8초 후 자동 제거
    setTimeout(() => toast.remove(), 8000);
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
    // 구버전 타입명 → 현재 타입명으로 변환
    const typeMap = { warrior: "knight", night: "knight", mage: "magician" };
    const type = typeMap[rawType] || rawType;
    const p = new Player(type);
    Object.assign(p, raw);
    p.type = type; // Object.assign이 덮어쓸 수 있으므로 재설정

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

    // ★ activeSkills 복원 (저장 후 스킬 초기화 방지)
    p.activeSkills = {
      whirlwind: raw.activeSkills?.whirlwind || false,
      magicBall: raw.activeSkills?.magicBall || false,
      rapidShot: raw.activeSkills?.rapidShot  || false,
      ironWall:  raw.activeSkills?.ironWall   || false,
    };

    // ★ cooldowns 음수 방지
    const rawCd = raw.cooldowns || {};
    p.cooldowns = {
      jobSkill:       Math.max(0, rawCd.jobSkill       || 0),
      partyUltimate:  Math.max(0, rawCd.partyUltimate  || 0),
      heal:           Math.max(0, rawCd.heal           || 0),
    };
    p.status = raw.status
      ? { poison:0, stun:0, burn:0, freeze:0, bleed:0, weaken:0, ...raw.status }
      : { poison:0, stun:0, burn:0, freeze:0, bleed:0, weaken:0 };
    p.affinity = raw.affinity || {
      archer: 0,
      healer: 0,
      tanker: 0,
      mage_party: 0,
    };
    p.bonusAttack = raw.bonusAttack || 0;
    p.guardianKillCount = raw.guardianKillCount ?? 0;
    p.abyssKillCount = raw.abyssKillCount ?? 0;
    // ★ 업적 카운트 복원
    p._critCount    = raw._critCount    || 0;
    p._chestCount   = raw._chestCount   || 0;
    p._maxFloor     = raw._maxFloor     || 1;
    p._cityEntered  = raw._cityEntered  || false;
    p._noHealBoss   = raw._noHealBoss   || false;
    p.achievements  = raw.achievements  || {};
    p.completedQuests = raw.completedQuests || [];

    // ★ 미니게임 업적 카운터 복원
    p._cardWins     = raw._cardWins     || 0;
    p._cardStreak   = raw._cardStreak   || 0;
    p._diceWins     = raw._diceWins     || 0;
    p._diceJackpot  = raw._diceJackpot  || 0;
    p._minigameGold = raw._minigameGold || 0;

    // ★ 제단 버프 복원
    p._altarBuff      = raw._altarBuff      || 0;
    p._altarBuffTurns = raw._altarBuffTurns || 0;

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
    // ★ 인덱스 범위 검증
    if (!Number.isInteger(index) || index < 0 || index >= (p.inventory?.length || 0)) return;
    const item = p.inventory[index];
    if (!item || item.type === "potion") return;
    const target = forParty ? p.partyEquipment : p.equipment;
    if (item.weaponClass && !forParty) {
      // ★ knight/tanker/magician/archer 모두 포함
      const allowed = {
        knight: "sword", night: "sword",
        tanker: "sword",
        magician: "staff", mage: "staff",
        archer: "bow",
      }[p.type];
      if (allowed && item.weaponClass !== allowed) {
        game.log(`❌ ${CLASSES[p.type]?.name || p.type}은(는) ${allowed}만 사용 가능`);
        return;
      }
    }
    if (item.weaponClass && forParty && p.party) {
      const allowed = {
        healer:     "staff",
        mage_party: "staff",
        archer:     "bow",
        tanker:     "sword",
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
    p.money = Math.max(0, p.money - item.cost);
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
    p.money = Math.max(0, p.money - cost);
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
    const done = player.completedQuests || [];
    return QUESTS.filter(q =>
      q.id !== activeId &&
      !done.includes(q.id) &&
      (q.minLevel || 1) <= player.level
    );
  }

  accept(game, questId) {
    const q = QUESTS.find(q => q.id === questId);
    if (!q) return false;
    game.player.quest = q;
    game.player.questProgress = 0;
    const desc = this._progressDesc(q, 0);
    game.log(`📜 퀘스트 수락: ${q.title} — ${desc}`);
    return true;
  }

  // 퀘스트 진행 설명 텍스트
  _progressDesc(q, prog) {
    switch (q.type) {
      case "kill":     return `${q.target} ${prog}/${q.goal}마리`;
      case "chest":    return `보물 상자 ${prog}/${q.goal}개`;
      case "gold":     return `골드 ${prog}/${q.goal}G`;
      case "affinity": return `호감도 ${prog}/${q.goal}`;
      case "level":    return `레벨 ${prog}/${q.goal}`;
      case "floor":    return `${prog}/${q.goal}층 도달`;
      default:         return `${prog}/${q.goal}`;
    }
  }

  // ── 완료 공통 처리 ──
  _complete(game) {
    const p = game.player;
    const q = p.quest;
    if (!q) return;
    p.money += q.rewardGold;
    if (q.rewardExp) {
      const lvUp = p.gainExp(q.rewardExp);
      if (lvUp) game.log(`🎉 레벨 업! Lv.${p.level}`);
    }
    if (q.rewardSkillPoint) {
      p.skillPoints = (p.skillPoints || 0) + q.rewardSkillPoint;
      game.log(`⭐ 스킬 포인트 +${q.rewardSkillPoint}`);
    }
    if (q.rewardItem) {
      const item = createRandomItem(Math.random() < 0.4);
      game.itemManager.add(game, item);
      game.log(`🎁 보상 아이템: ${item.name}`);
    }
    game.log(`🏆 퀘스트 완료! [${q.title}] +${q.rewardGold}G${q.rewardExp ? ` +${q.rewardExp}EXP` : ""}`);
    if (!p.completedQuests) p.completedQuests = [];
    p.completedQuests.push(q.id);
    p.quest = null;
    p.questProgress = 0;
    game.achievementManager?.check(game);
    return { cleared: true, quest: q };
  }

  // ── 몬스터 처치 ──
  onKill(game, monsterName) {
    const p = game.player;
    if (!p.quest || p.quest.type !== "kill") return { cleared: false };
    if (p.quest.target !== monsterName) return { cleared: false };
    p.questProgress++;
    game.log(`📜 [${p.quest.title}] ${p.questProgress}/${p.quest.goal}`);
    if (p.questProgress >= p.quest.goal) return this._complete(game) || { cleared: false };
    return { cleared: false };
  }

  // ── 보물 상자 ──
  onChest(game) {
    const p = game.player;
    if (!p.quest || p.quest.type !== "chest") return { cleared: false };
    p.questProgress++;
    game.log(`📜 [${p.quest.title}] 상자 ${p.questProgress}/${p.quest.goal}`);
    if (p.questProgress >= p.quest.goal) return this._complete(game) || { cleared: false };
    return { cleared: false };
  }

  // ── 상태 기반 체크 (골드/호감도/레벨/층수) ──
  checkState(game) {
    const p = game.player;
    if (!p.quest) return { cleared: false };
    let cur = 0;
    switch (p.quest.type) {
      case "gold":     cur = p.money; break;
      case "affinity": cur = p.party ? (p.affinity?.[p.party] || 0) : 0; break;
      case "level":    cur = p.level; break;
      case "floor":    cur = game.dungeonFloor || 1; break;
      default: return { cleared: false };
    }
    p.questProgress = cur;
    if (cur >= p.quest.goal) return this._complete(game) || { cleared: false };
    return { cleared: false };
  }

  getProgressPct(player) {
    if (!player.quest) return 0;
    const prog = player.questProgress || 0;
    return Math.floor((prog / player.quest.goal) * 100);
  }
}

// 전역 노출
window.SaveManager = SaveManager;
window.ItemManager = ItemManager;
window.QuestManager = QuestManager;
