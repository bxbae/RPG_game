// ═══════════════════════════════════════════════════
//  achievement-system.js  — 업적 시스템
// ═══════════════════════════════════════════════════
"use strict";

// ── 업적 정의 ─────────────────────────────────────
const ACHIEVEMENTS = [
  // ── 전투 ──
  { id:"first_blood",   cat:"전투", icon:"⚔",  title:"첫 번째 전투",      desc:"첫 몬스터를 처치하라",              cond: p => p.killCount >= 1,        reward:"경험치 +50" },
  { id:"kill_10",       cat:"전투", icon:"💀",  title:"전사의 길",          desc:"몬스터 10마리 처치",               cond: p => p.killCount >= 10,       reward:"골드 +100" },
  { id:"kill_50",       cat:"전투", icon:"⚔",  title:"던전의 사냥꾼",      desc:"몬스터 50마리 처치",               cond: p => p.killCount >= 50,       reward:"골드 +500" },
  { id:"kill_100",      cat:"전투", icon:"🏆",  title:"백전노장",           desc:"몬스터 100마리 처치",              cond: p => p.killCount >= 100,      reward:"공격력 +5" },
  { id:"slay_guardian", cat:"전투", icon:"🛡",  title:"수호자의 적",        desc:"수호자를 처치하라",                cond: p => p.abyssUnlocked,         reward:"골드 +300" },
  { id:"slay_demon",    cat:"전투", icon:"👹",  title:"마왕 처치",          desc:"마왕 다르카스를 쓰러뜨려라",       cond: p => !!p.darkasDefeated,      reward:"공격력 +10" },
  { id:"no_heal_win",   cat:"전투", icon:"💪",  title:"불굴의 용사",        desc:"회복 없이 보스를 처치하라",        cond: p => p._noHealBoss,           reward:"HP +30" },
  { id:"critical_10",   cat:"전투", icon:"💥",  title:"치명적 타격",        desc:"치명타를 10회 발생시켜라",         cond: p => (p._critCount||0) >= 10, reward:"치명타율 +3%" },

  // ── 탐험 ──
  { id:"first_chest",   cat:"탐험", icon:"📦",  title:"보물 사냥꾼",        desc:"처음으로 보물상자를 열어라",       cond: p => (p._chestCount||0) >= 1, reward:"골드 +50" },
  { id:"chest_10",      cat:"탐험", icon:"💎",  title:"보물 수집가",        desc:"보물상자 10개 획득",               cond: p => (p._chestCount||0) >= 10,reward:"골드 +200" },
  { id:"floor_2",       cat:"탐험", icon:"🗡",  title:"던전 2층 도달",      desc:"던전 2층에 진입하라",              cond: p => (p._maxFloor||1) >= 2,   reward:"경험치 +100" },
  { id:"floor_3",       cat:"탐험", icon:"🔥",  title:"던전 3층 도달",      desc:"던전 3층 마왕의 전실에 도달",      cond: p => (p._maxFloor||1) >= 3,   reward:"경험치 +200" },
  { id:"abyss_enter",   cat:"탐험", icon:"🌌",  title:"심연의 문",          desc:"심연 던전에 입장하라",             cond: p => p.abyssUnlocked,         reward:"HP +50" },
  { id:"city_enter",    cat:"탐험", icon:"🏙",  title:"도시 탐험가",        desc:"도시 탐험에 입장하라",             cond: p => (p._cityEntered||false), reward:"골드 +200" },

  // ── 마을 ──
  { id:"town_lv1",      cat:"마을", icon:"🏗",  title:"재건의 시작",        desc:"마을을 공사중 단계로 발전",         cond: p => (p.bank?.totalInvested||0) >= 500,  reward:"공격력 +3" },
  { id:"town_lv2",      cat:"마을", icon:"🏘",  title:"번화가 조성",        desc:"마을을 번화가 단계로 발전",         cond: p => (p.bank?.totalInvested||0) >= 2000, reward:"공격력 +5" },
  { id:"town_lv3",      cat:"마을", icon:"🌟",  title:"왕국 최고의 마을",   desc:"마을을 번영 단계로 발전",           cond: p => (p.bank?.totalInvested||0) >= 5000, reward:"공격력 +10, HP +50" },
  { id:"bank_rich",     cat:"마을", icon:"🏦",  title:"은행가",             desc:"예금 잔고 1000G 달성",             cond: p => (p.bank?.deposit||0) >= 1000,       reward:"이자율 보너스" },

  // ── 동료 ──
  { id:"party_first",   cat:"동료", icon:"🤝",  title:"첫 동료",            desc:"처음으로 동료를 영입하라",          cond: p => !!p.party,                          reward:"경험치 +100" },
  { id:"affinity_30",   cat:"동료", icon:"💛",  title:"신뢰의 시작",        desc:"동료 호감도 30 달성",              cond: p => Object.values(p.affinity||{}).some(v=>v>=30), reward:"동료 궁극기 해금" },
  { id:"affinity_75",   cat:"동료", icon:"🧡",  title:"진정한 전우",        desc:"동료 호감도 75 달성",              cond: p => Object.values(p.affinity||{}).some(v=>v>=75), reward:"스토리 해금" },
  { id:"affinity_100",  cat:"동료", icon:"❤",   title:"불멸의 유대",        desc:"동료 호감도 100 달성",             cond: p => Object.values(p.affinity||{}).some(v=>v>=100), reward:"EX 궁극기 해금" },

  // ── 성장 ──
  { id:"level_5",       cat:"성장", icon:"⭐",  title:"신진 용사",          desc:"레벨 5 달성",                      cond: p => p.level >= 5,            reward:"스킬 포인트 +1" },
  { id:"level_10",      cat:"성장", icon:"🌟",  title:"숙련된 용사",        desc:"레벨 10 달성",                     cond: p => p.level >= 10,           reward:"스킬 포인트 +2" },
  { id:"level_20",      cat:"성장", icon:"💫",  title:"전설의 용사",        desc:"레벨 20 달성",                     cond: p => p.level >= 20,           reward:"스킬 포인트 +3" },
  { id:"rich",          cat:"성장", icon:"💰",  title:"부자 용사",          desc:"보유 골드 5000G 달성",             cond: p => p.money >= 5000,         reward:"상점 할인 해금" },
  { id:"full_equip",    cat:"성장", icon:"⚔",  title:"완전 무장",          desc:"무기/투구/갑옷을 모두 장착",        cond: p => !!(p.equipment?.weapon && p.equipment?.helmet && p.equipment?.armor), reward:"방어력 +5" },

  // ── 미니게임 ──
  { id:"card_first_win",  cat:"미니게임", icon:"🃏",  title:"첫 승부",           desc:"카드 게임에서 처음 승리하라",         cond: p => (p._cardWins||0) >= 1,        reward:"호감도 +3" },
  { id:"card_3wins",      cat:"미니게임", icon:"🎴",  title:"카드의 달인",       desc:"카드 게임에서 3번 승리하라",          cond: p => (p._cardWins||0) >= 3,        reward:"골드 +200" },
  { id:"card_10wins",     cat:"미니게임", icon:"🏅",  title:"불패의 승부사",     desc:"카드 게임에서 10번 승리하라",         cond: p => (p._cardWins||0) >= 10,       reward:"공격력 +5" },
  { id:"card_streak3",    cat:"미니게임", icon:"🔥",  title:"3연승",             desc:"카드 게임 3연승을 달성하라",          cond: p => (p._cardStreak||0) >= 3,      reward:"호감도 +5" },
  { id:"dice_first_hit",  cat:"미니게임", icon:"🎲",  title:"행운의 주사위",     desc:"주사위 도박에서 처음 적중하라",       cond: p => (p._diceWins||0) >= 1,        reward:"골드 +100" },
  { id:"dice_jackpot",    cat:"미니게임", icon:"💎",  title:"대박!",             desc:"주사위 소/대(×2.5)를 적중하라",      cond: p => (p._diceJackpot||0) >= 1,     reward:"골드 +500" },
  { id:"dice_10wins",     cat:"미니게임", icon:"🎰",  title:"도박꾼",            desc:"주사위 도박에서 10번 적중하라",       cond: p => (p._diceWins||0) >= 10,       reward:"골드 +1000" },
  { id:"minigame_rich",   cat:"미니게임", icon:"💸",  title:"주막의 제왕",       desc:"미니게임으로 총 5000G를 획득하라",    cond: p => (p._minigameGold||0) >= 5000, reward:"공격력 +3" },
  { id:"trap_first_clear",cat:"미니게임", icon:"🕳",  title:"함정 해체사",       desc:"함정의 방을 처음 클리어하라",         cond: p => (p._trapRoomClears||0) >= 1, reward:"골드 +150" },
  { id:"trap_clear_5",    cat:"미니게임", icon:"🧭",  title:"유적 탐사가",       desc:"함정의 방을 5번 클리어하라",          cond: p => (p._trapRoomClears||0) >= 5, reward:"공격력 +5" },
  { id:"trap_abyss_clear",cat:"미니게임", icon:"💀",  title:"심연의 정복자",     desc:"심연 던전에서 함정의 방을 클리어하라", cond: p => p._trapAbyssClear === true,  reward:"HP +50" },

  // ── 왕국 ──
  { id:"region_complete_1", cat:"왕국", icon:"🏗",  title:"첫 재건",            desc:"지역 하나를 완전히 재건하라",         cond: p => Object.entries(p.regions||{}).filter(([id,r])=>id!=="starterVillage"&&r.completed).length >= 1, reward:"골드 +300" },
  { id:"region_complete_all",cat:"왕국", icon:"👑", title:"왕국의 재건자",      desc:"왕국 번영도 100% 달성",              cond: p => (window.rpgGame?.regionManager?.kingdomProsperity(p) ?? 0) >= 100, reward:"공격력 +15, HP +100" },
  { id:"companion_story_1", cat:"왕국", icon:"💝",  title:"마음을 나누다",      desc:"동료의 개인 사연을 하나 해결하라",     cond: p => Object.values(p.companionStory||{}).some(s=>s.done), reward:"호감도 +10" },
  { id:"companion_story_all",cat:"왕국", icon:"🌈", title:"모두의 이야기",      desc:"모든 동료의 개인 사연을 해결하라",     cond: p => ["tanker","dealer","archer","mage_party","healer"].every(k => p.companionStory?.[k]?.done), reward:"전 동료 호감도 +10" },
  { id:"title_guardian",    cat:"왕국", icon:"🛡",  title:"왕국의 수호자",      desc:"왕국의 수호자 칭호를 받아라",         cond: p => !!p.guardianTitle, reward:"방어력 +10" },
  { id:"title_chancellor",  cat:"왕국", icon:"⚜",  title:"재상",               desc:"진엔딩에서 재상 칭호를 받아라",       cond: p => !!p.chancellorTitle, reward:"공격력 +10, 방어력 +10" },
  { id:"sacheonwang_all",   cat:"왕국", icon:"👑",  title:"진짜 사천왕 토벌자",  desc:"사천왕 진짜 본체 넷을 모두 쓰러뜨려라", cond: p => ["lavaCanyon","sunkenWreck","corruptedGrove","royalDungeon"].every(id => p.regions?.[id]?.completed), reward:"공격력 +20, HP +150" },

  // ── 심연 ──
  { id:"slay_nemesis", cat:"심연", icon:"🌌",  title:"공허를 가른 자",      desc:"공허의 군주 네메시스를 쓰러뜨려라",    cond: p => !!p.nemesisDefeated, reward:"공격력 +20, HP +150" },
  { id:"true_ending",  cat:"심연", icon:"✨",  title:"진실된 결말",         desc:"진엔딩을 완성하라",                  cond: p => !!p.nemesisDefeated && !!p.darkasDefeated, reward:"칭호 해금" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AchievementManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class AchievementManager {
  constructor() {
    this._toastQueue = [];
    this._showing    = false;
  }

  // ── 업적 체크 (매 전투/이동/저장 후 호출) ──────
  check(game) {
    const p = game.player;
    if (!p) return;
    if (!p.achievements) p.achievements = {};

    ACHIEVEMENTS.forEach(ach => {
      if (p.achievements[ach.id]) return; // 이미 달성
      try {
        if (ach.cond(p)) {
          p.achievements[ach.id] = Date.now();
          this._onUnlock(game, ach);
        }
      } catch(e) {}
    });
  }

  // ── 달성 시 처리 ─────────────────────────────
  _onUnlock(game, ach) {
    game.log(`🏆 업적 달성: [${ach.title}]`);
    this._applyReward(game, ach);
    this._showToast(ach);
  }

  // ── 보상 적용 ────────────────────────────────
  _applyReward(game, ach) {
    const p = game.player;
    const r = ach.reward;
    if (r.includes("공격력 +")) {
      const n = parseInt(r.match(/공격력 \+(\d+)/)?.[1] || 0);
      if (n) { p.bonusAttack = (p.bonusAttack||0) + n; }
    }
    if (r.includes("HP +")) {
      const n = parseInt(r.match(/HP \+(\d+)/)?.[1] || 0);
      if (n) { p.maxHp += n; p.hp = Math.min(p.hp + n, p.maxHp + (p.bonusHp||0)); }
    }
    if (r.includes("스킬 포인트 +")) {
      const n = parseInt(r.match(/스킬 포인트 \+(\d+)/)?.[1] || 0);
      if (n) p.skillPoints = (p.skillPoints||0) + n;
    }
    if (r.includes("골드 +")) {
      const n = parseInt(r.match(/골드 \+(\d+)/)?.[1] || 0);
      if (n) { p.money = (p.money||0) + n; }
    }
    if (r.includes("경험치 +")) {
      const n = parseInt(r.match(/경험치 \+(\d+)/)?.[1] || 0);
      if (n) p.gainExp?.(n);
    }
    if (r.includes("호감도 +")) {
      const n = parseInt(r.match(/호감도 \+(\d+)/)?.[1] || 0);
      if (n && p.party) {
        if (!p.affinity) p.affinity = {};
        p.affinity[p.party] = Math.min(100, (p.affinity[p.party] || 0) + n);
      }
    }
  }

  // ── 토스트 팝업 ──────────────────────────────
  _showToast(ach) {
    this._toastQueue.push(ach);
    if (!this._showing) this._nextToast();
  }

  _nextToast() {
    if (!this._toastQueue.length) { this._showing = false; return; }
    this._showing = true;
    const ach = this._toastQueue.shift();

    const toast = document.createElement("div");
    toast.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);
      z-index:9999;background:rgba(10,6,16,0.97);
      border:2px solid var(--gold);border-radius:8px;
      padding:12px 20px;display:flex;align-items:center;gap:12px;
      font-family:'Noto Serif KR',serif;min-width:280px;max-width:360px;
      box-shadow:0 4px 24px rgba(0,0,0,0.8),0 0 20px rgba(200,152,14,0.3);
      opacity:0;transition:opacity .4s ease,transform .4s ease;
    `;
    toast.innerHTML = `
      <div style="font-size:1.8rem;flex-shrink:0;">${ach.icon}</div>
      <div style="flex:1;">
        <div style="font-size:.62rem;color:var(--gold);letter-spacing:.1em;margin-bottom:2px;">
          🏆 업적 달성!
        </div>
        <div style="font-size:.88rem;font-weight:700;color:var(--gold2);">${ach.title}</div>
        <div style="font-size:.68rem;color:var(--text-dim);margin-top:2px;">${ach.desc}</div>
        <div style="font-size:.65rem;color:#88ddff;margin-top:4px;">🎁 ${ach.reward}</div>
      </div>`;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(10px)";
      setTimeout(() => {
        toast.remove();
        setTimeout(() => this._nextToast(), 300);
      }, 400);
    }, 3200);
  }

  // ── 업적 목록 UI 렌더 ────────────────────────
  renderUI(player) {
    const achieved = player?.achievements || {};
    const cats  = [...new Set(ACHIEVEMENTS.map(a => a.cat))];
    const total = ACHIEVEMENTS.length;
    const done  = Object.keys(achieved).length;
    const pct   = total > 0 ? Math.floor(done / total * 100) : 0;

    const CAT_COLOR = {
      "전투":    "#e84444",
      "탐험":    "#44aadd",
      "마을":    "#88cc44",
      "동료":    "#ff77aa",
      "성장":    "#e8b830",
      "미니게임": "#bb66ff",
      "왕국":    "#ffd700",
      "심연":    "#a83cff",
    };

    return `
      <div style="font-family:'Noto Serif KR',serif;padding:4px 0;">

        <!-- 전체 달성률 카드 -->
        <div style="background:rgba(200,152,14,.06);border:1px solid #3a2410;
          border-radius:10px;padding:14px 16px;margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:.78rem;color:var(--gold);font-weight:700;">🏆 전체 달성률</span>
            <span style="font-size:.85rem;color:var(--gold2);font-weight:700;">${done} / ${total}</span>
          </div>
          <div style="height:12px;background:#1a0e14;border-radius:6px;
            overflow:hidden;border:1px solid #3a2428;margin-bottom:6px;">
            <div style="height:100%;width:${pct}%;
              background:linear-gradient(90deg,#8b4513,#e8b830);
              border-radius:6px;transition:width .8s ease;"></div>
          </div>
          <div style="text-align:right;font-size:.68rem;color:var(--text-dim);">${pct}% 완료</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;">
            ${cats.map(cat => {
              const catAchs = ACHIEVEMENTS.filter(a => a.cat === cat);
              const catDone = catAchs.filter(a => achieved[a.id]).length;
              const catPct  = Math.floor(catDone / catAchs.length * 100);
              const col = CAT_COLOR[cat] || "#786050";
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;
                    font-size:.62rem;color:${col};margin-bottom:3px;">
                    <span>${cat}</span><span>${catDone}/${catAchs.length}</span>
                  </div>
                  <div style="height:4px;background:#1a0e14;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${catPct}%;background:${col};
                      border-radius:2px;opacity:.85;"></div>
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>

        <!-- 카테고리별 목록 -->
        ${cats.map(cat => {
          const catAchs = ACHIEVEMENTS.filter(a => a.cat === cat);
          const catDone = catAchs.filter(a => achieved[a.id]).length;
          const col = CAT_COLOR[cat] || "#786050";
          return `
            <div style="margin-bottom:18px;">
              <div style="display:flex;align-items:center;gap:8px;
                margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #2a1a24;">
                <span style="font-size:.72rem;font-weight:700;color:${col};letter-spacing:.08em;">${cat}</span>
                <span style="font-size:.65rem;color:var(--text-dim);">${catDone}/${catAchs.length}</span>
                <div style="flex:1;height:3px;background:#1a0e14;border-radius:2px;overflow:hidden;">
                  <div style="height:100%;width:${Math.floor(catDone/catAchs.length*100)}%;
                    background:${col};opacity:.7;border-radius:2px;"></div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;">
                ${catAchs.map(a => {
                  const isDone = !!achieved[a.id];
                  const col2 = CAT_COLOR[a.cat] || "#786050";
                  return `
                    <div style="display:flex;align-items:center;gap:10px;
                      background:${isDone ? "rgba(200,152,14,.07)" : "rgba(255,255,255,.02)"};
                      border:1px solid ${isDone ? col2+"55" : "#2a1a24"};
                      border-radius:6px;padding:8px 10px;
                      opacity:${isDone ? "1" : "0.55"};">
                      <div style="font-size:1.2rem;flex-shrink:0;">${isDone ? a.icon : "🔒"}</div>
                      <div style="flex:1;min-width:0;">
                        <div style="font-size:.76rem;font-weight:700;
                          color:${isDone ? "var(--gold2)" : "var(--text-dim)"};">${a.title}</div>
                        <div style="font-size:.63rem;color:var(--text-dim);margin-top:1px;">${a.desc}</div>
                        ${isDone ? `<div style="font-size:.58rem;color:#88ddff;margin-top:2px;">✅ ${a.reward}</div>` : ""}
                      </div>
                      ${isDone ? `<div style="font-size:.58rem;color:#44cc44;flex-shrink:0;font-weight:700;">달성!</div>` : ""}
                    </div>`;
                }).join("")}
              </div>
            </div>`;
        }).join("")}
      </div>`;
  }
}

window.AchievementManager = AchievementManager;
window.ACHIEVEMENTS        = ACHIEVEMENTS;
