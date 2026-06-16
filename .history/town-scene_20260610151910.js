// ═══════════════════════════════════════════════════
//  town-scene.js  — 마을 화면 + 은행/투자 시스템
// ═══════════════════════════════════════════════════
"use strict";

// ── 마을 4단계 정의 ────────────────────────────────
const TOWN_STAGES = [
  {
    level: 0,
    name: "폐허",
    minInvest: 0,
    bg: "images/공사중 건물 사람 없는이미지.png",
    color: "#8B4513",
    icon: "💀",
    desc: "마을이 황폐해 있다. 재건이 필요하다.",
  },
  {
    level: 1,
    name: "공사중",
    minInvest: 500,
    bg: "images/town_bustling.png",
    color: "#CD853F",
    icon: "🏗",
    desc: "마을 재건이 시작됐다. 인부들이 바쁘게 움직인다.",
  },
  {
    level: 2,
    name: "번화가",
    minInvest: 2000,
    bg: "images/town_bustling.png",
    color: "#4CAF50",
    icon: "🏘",
    desc: "상점들이 들어서고 사람들이 모여들기 시작했다.",
  },
  {
    level: 3,
    name: "번영",
    minInvest: 5000,
    bg: "images/town_prosperity.png",
    color: "#FFD700",
    icon: "🌟",
    desc: "마을이 크게 번창했다! 왕국 최고의 마을이 됐다.",
  },
];

// 투자 보상 (단계 최초 달성 시)
const INVEST_REWARDS = [
  { minInvest: 500, atkBonus: 5, hpBonus: 0, msg: "공격력 +5" },
  { minInvest: 2000, atkBonus: 10, hpBonus: 50, msg: "공격력 +10, HP +50" },
  { minInvest: 5000, atkBonus: 20, hpBonus: 100, msg: "공격력 +20, HP +100" },
];

// 예금 이자율 (전투 1회당)
const INTEREST_RATE = 0.05;

function getTownStage(totalInvested) {
  let stage = TOWN_STAGES[0];
  for (const s of TOWN_STAGES) {
    if (totalInvested >= s.minInvest) stage = s;
  }
  return stage;
}

function getNextStage(totalInvested) {
  return TOWN_STAGES.find((s) => s.minInvest > totalInvested) || null;
}

// ★ 전투 후 이자 적용 (game.js의 onBattleVictory에서 호출)
function applyBattleInterest(player) {
  const bank = player.bank;
  if (!bank || bank.deposit <= 0) return 0;
  const interest = Math.floor(bank.deposit * INTEREST_RATE);
  if (interest > 0) {
    bank.interest = (bank.interest || 0) + interest;
  }
  return interest;
}

class TownScene {
  constructor(game) {
    this.game = game;
    if (!game.player.bank) {
      game.player.bank = {
        deposit: 0,
        interest: 0,
        totalInvested: 0,
        milestones: [],
      };
    }
  }

  mount(container) {
    container.innerHTML = this._buildHTML();
    this._bindEvents();
    this.render();
    window._townScene = this;
  }

  _buildHTML() {
    return `
<div class="town-header">
  <h2 id="townHeaderTitle">🏘 평화의 마을</h2>
  <span id="townGold">💰 0 G</span>
</div>
<div class="town-body">
  <div class="town-map">
    <img class="town-bg" id="townBgImg" src="images/공사중 건물 사람 없는이미지.png" alt="마을"/>
    <div class="town-locations">
      <button class="location-btn" id="tn-dungeon">🗡 던전</button>
      <button class="location-btn" id="tn-abyss">👹 심연</button>
      <button class="location-btn" id="tn-city" style="border-color:#88aaff;color:#88aaff;">🏙 도시 탐험</button>
      <button class="location-btn" id="tn-party">🍺 동료 모집</button>
      <button class="location-btn" id="tn-quest">📜 퀘스트</button>
      <button class="location-btn" id="tn-skill">🌟 스킬</button>
      <button class="location-btn" id="tn-smith">🔨 대장간</button>
      <button class="location-btn" id="tn-inn">🏨 여관</button>
      <button class="location-btn" id="tn-bank" style="border-color:#FFD700;color:#FFD700;">🏦 은행</button>
      <button class="location-btn" id="tn-bond">💞 유대 이벤트</button>
      <button class="location-btn" id="tn-save" style="border-color:#88aaff;color:#88aaff;">💾 저장/불러오기</button>
    </div>
  </div>
  <div class="town-sidebar">
    <div class="sidebar-section">
      <h3>⚔ 장착 장비</h3>
      <div class="equip-slot">무기: <span id="tnWeapon">없음</span></div>
      <div class="equip-slot">투구: <span id="tnHelmet">없음</span></div>
      <div class="equip-slot">갑옷: <span id="tnArmor">없음</span></div>
    </div>
    <div class="sidebar-section" id="tnCompEquip" style="display:none;">
      <h3 id="tnCompEquipName">⚔ 동료 장착</h3>
      <div class="equip-slot">무기: <span id="tnCompWeapon">없음</span></div>
      <div class="equip-slot">투구: <span id="tnCompHelmet">없음</span></div>
      <div class="equip-slot">갑옷: <span id="tnCompArmor">없음</span></div>
    </div>
    <div class="sidebar-section">
      <h3>🏗 마을 현황</h3>
      <div id="tnTownStageName" style="font-size:.8rem;font-weight:700;color:var(--gold2);">폐허</div>
      <div id="tnTownInvested"  style="font-size:.68rem;color:var(--text-dim);">투자: 0G</div>
      <div id="tnTownNextGoal"  style="font-size:.65rem;color:var(--text-dim);"></div>
      <div class="quest-progress-bar" style="margin-top:4px;">
        <div id="tnTownBar" class="quest-progress-fill"></div>
      </div>
    </div>
    <div class="sidebar-section">
      <h3>🏦 은행</h3>
      <div id="tnSideDeposit"  style="font-size:.72rem;color:var(--gold2);">예금: 0G</div>
      <div id="tnSideInterest" style="font-size:.68rem;color:#55cc55;">이자: 0G</div>
    </div>
    <div class="sidebar-section">
      <h3>📜 현재 퀘스트</h3>
      <div id="tnQuestTitle"  style="font-size:.78rem;color:var(--gold2);">없음</div>
      <div id="tnQuestProg"   style="font-size:.7rem;color:var(--text-dim);"></div>
      <div id="tnQuestReward" style="font-size:.7rem;color:var(--text-dim);"></div>
    </div>
    <div class="sidebar-section">
      <h3>🛒 상점</h3>
      <div id="tnShop"></div>
    </div>
    <div class="sidebar-section">
      <h3>🎒 인벤토리</h3>
      <div id="tnInventory"></div>
    </div>
  </div>
</div>

<!-- ══ 은행 전용 화면 (풀스크린 오버레이) ══ -->
<div id="bankScreen" style="display:none;position:fixed;inset:0;z-index:500;
  background:url('images/BANK.png') center/cover no-repeat;
  flex-direction:column;overflow-y:auto;">
  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.72);z-index:0;pointer-events:none;"></div>

  <!-- 헤더 -->
  <div style="display:flex;align-items:center;justify-content:space-between;
    padding:16px 24px;border-bottom:2px solid #4a2e38;flex-shrink:0;position:relative;z-index:1;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:2rem;">🏦</span>
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);">왕국 은행</div>
        <div style="font-size:.7rem;color:var(--text-dim);">예금 · 마을 투자</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="text-align:right;">
        <div style="font-size:.65rem;color:var(--text-dim);">보유 골드</div>
        <div id="bankGoldDisplay" style="font-size:1rem;font-weight:700;color:var(--gold2);">0 G</div>
      </div>
      <button id="bankClose" style="background:transparent;border:1px solid #4a2e38;
        color:var(--text-dim);padding:8px 16px;cursor:pointer;font-family:inherit;
        font-size:.82rem;border-radius:4px;transition:.15s;"
        onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'"
        onmouseout="this.style.borderColor='#4a2e38';this.style.color='var(--text-dim)'">
        ← 마을로
      </button>
    </div>
  </div>

  <!-- 탭 -->
  <div style="display:flex;gap:0;border-bottom:1px solid #2e1e24;flex-shrink:0;position:relative;z-index:1;">
    <button id="bankTabDeposit" class="bank-tab bank-tab-active" onclick="window._townScene._switchBankTab('deposit')">
      💰 예금 · 출금
    </button>
    <button id="bankTabInvest" class="bank-tab" onclick="window._townScene._switchBankTab('invest')">
      🏗 마을 투자
    </button>
  </div>

  <!-- ─── 예금 탭 ─── -->
  <div id="bankDepositPane" style="padding:24px;max-width:700px;margin:0 auto;width:100%;position:relative;z-index:1;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
      <div class="bank-card">
        <div class="bank-card-label">현재 예금</div>
        <div id="bankDepositAmt" class="bank-card-value" style="color:var(--gold2);">0 G</div>
      </div>
      <div class="bank-card">
        <div class="bank-card-label">누적 이자 💹</div>
        <div id="bankInterestAmt" class="bank-card-value" style="color:#55cc55;">0 G</div>
        <div style="font-size:.62rem;color:var(--text-dim);margin-top:4px;">전투마다 예금의 5%</div>
      </div>
    </div>

    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;
      border-radius:6px;padding:16px;margin-bottom:20px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">💰 예금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" onclick="window._townScene._depositGold(100)">+100G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(500)">+500G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(1000)">+1000G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(5000)">+5000G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._depositAll()">전액 예금</button>
      </div>
    </div>

    <div style="background:rgba(255,255,255,.03);border:1px solid #1a3a2a;
      border-radius:6px;padding:16px;">
      <div style="font-size:.75rem;color:#55cc55;margin-bottom:10px;font-weight:700;">💸 출금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;"
          onclick="window._townScene._withdrawGold(100)">-100G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;"
          onclick="window._townScene._withdrawGold(500)">-500G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;"
          onclick="window._townScene._withdrawGold(1000)">-1000G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;"
          onclick="window._townScene._withdrawAll()">전액 출금</button>
      </div>
    </div>

    <div style="margin-top:16px;padding:12px;background:rgba(200,152,14,.06);
      border:1px solid rgba(200,152,14,.2);border-radius:4px;font-size:.7rem;
      color:var(--text-dim);line-height:1.8;">
      💡 <strong style="color:var(--gold);">이자 안내</strong><br>
      예금 잔고의 <span style="color:#55cc55;">5%</span>가 전투마다 자동으로 이자로 쌓입니다.<br>
      이자는 출금 시 먼저 지급됩니다.
    </div>
  </div>

  <!-- ─── 투자 탭 ─── -->
  <div id="bankInvestPane" style="display:none;padding:24px;max-width:700px;margin:0 auto;width:100%;position:relative;z-index:1;">

    <!-- 현재 단계 카드 -->
    <div id="bankCurrentStage" class="bank-card" style="margin-bottom:24px;
      border-color:var(--gold);background:rgba(200,152,14,.06);text-align:center;padding:20px;">
      <div id="bankStageIcon" style="font-size:2.5rem;margin-bottom:6px;">💀</div>
      <div id="bankStageName" style="font-size:1.3rem;font-weight:700;color:var(--gold2);">폐허</div>
      <div id="bankStageDesc" style="font-size:.75rem;color:var(--text-dim);margin-top:4px;"></div>
      <div style="margin-top:10px;font-size:.72rem;color:var(--text-dim);">
        총 투자액: <span id="bankTotalInvested" style="color:var(--gold);font-weight:700;">0G</span>
      </div>
    </div>

    <!-- 4단계 진행 바 -->
    <div style="margin-bottom:28px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:14px;font-weight:700;">
        📊 마을 발전 단계
      </div>
      <div id="bankStageList" style="display:flex;flex-direction:column;gap:14px;"></div>
    </div>

    <!-- 투자 버튼 -->
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;
      border-radius:6px;padding:16px;margin-bottom:16px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">🏗 투자하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._investTown(100)">100G 투자</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._investTown(500)">500G 투자</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._investTown(1000)">1000G 투자</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._investAll()">전액 투자</button>
      </div>
    </div>

    <div style="padding:12px;background:rgba(200,152,14,.06);
      border:1px solid rgba(200,152,14,.2);border-radius:4px;font-size:.7rem;
      color:var(--text-dim);line-height:1.8;">
      💡 <strong style="color:var(--gold);">투자 보상 안내</strong><br>
      공사중(500G): <span style="color:#88ddff;">공격력 +5</span><br>
      번화가(2000G): <span style="color:#88ddff;">공격력 +10, HP +50</span><br>
      번영(5000G): <span style="color:var(--gold2);">공격력 +20, HP +100</span>
    </div>
  </div>
</div>

<!-- 퀘스트 모달 -->
<div id="tnQuestModal" class="modal hidden">
  <div class="modal-content">
    <h2>📜 퀘스트 게시판</h2>
    <div id="tnQuestList"></div>
    <button id="tnCloseQuest">닫기</button>
  </div>
</div>

<!-- 스킬 모달 -->
<div id="tnSkillModal" class="skill-modal" style="display:none;">
  <div class="skill-box">
    <h2>🌟 스킬 트리</h2>
    <div style="color:var(--gold2);margin-bottom:8px;">SP : <span id="tnSP">0</span></div>
    <div class="skill-tabs">
      <button class="skill-tab active" id="tnTabActive">⚡ 액티브</button>
      <button class="skill-tab" id="tnTabPassive">🛡 패시브</button>
    </div>
    <div id="tnActiveSkills">
      <div class="skill-row">공격 강화 Lv.<span id="tnAtkLv">0</span><button id="tnLearnAtk">배우기 (SP1)</button></div>
      <div class="skill-row">체력 강화 Lv.<span id="tnHpLv">0</span><button id="tnLearnHp">배우기 (SP1)</button></div>
      <div class="skill-row">치명타 강화 Lv.<span id="tnCritLv">0</span><button id="tnLearnCrit">배우기 (SP1)</button></div>
      <div class="skill-row"><span id="tnJobSkillName">직업 스킬</span><button id="tnLearnJob">습득 (SP3)</button></div>
    </div>
    <div id="tnPassiveSkills" style="display:none;"></div>
    <button id="tnCloseSkill">닫기</button>
  </div>
</div>

<!-- 대장간 모달 -->
<div id="tnSmithModal" class="skill-modal" style="display:none;">
  <div class="skill-box">
    <h2>🔨 대장간</h2>
    <div style="color:var(--gold2);margin-bottom:6px;font-size:.82rem;">💰 <span id="tnSmithGold">0</span> G</div>
    <h3 style="font-size:.75rem;color:var(--gold);margin-bottom:8px;">무기 구매</h3>
    <div id="tnSmithBuy"></div>
    <h3 style="font-size:.75rem;color:var(--gold);margin:12px 0 8px;">강화</h3>
    <div id="tnSmithEnhance"></div>
    <h3 style="font-size:.75rem;color:var(--gold);margin:12px 0 8px;">판매</h3>
    <div id="tnSmithSell"></div>
    <button id="tnCloseSmith">닫기</button>
  </div>
</div>

<!-- 동료 모달 -->
<div id="tnPartyModal" class="skill-modal" style="display:none;">
  <div class="skill-box" style="max-width:680px;padding:0;overflow:hidden;border:2px solid var(--gold);">
    <div style="background:url('images/pub_night.png') center/cover no-repeat;padding:28px 28px 20px;position:relative;">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);"></div>
      <div style="position:relative;z-index:1;">
        <h2 style="color:var(--gold2);margin-bottom:16px;">🍺 황금 그리핀 — 동료 모집</h2>
    <div class="class-cards" id="tnPartyCards"></div>
    <button id="tnCloseParty" style="margin-top:12px;background:rgba(10,6,16,.9);border:1px solid var(--gold);color:var(--gold2);padding:8px 24px;cursor:pointer;font-family:inherit;font-size:.82rem;border-radius:4px;">닫기</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ 세이브/로드 모달 ══ -->
<div id="tnSaveModal" style="display:none;position:fixed;inset:0;z-index:600;
  background:rgba(0,0,0,0.88);align-items:center;justify-content:center;">
  <div style="background:#110d0f;border:2px solid #4a2e38;border-radius:10px;
    padding:28px 32px;width:min(640px,95vw);max-height:90vh;overflow-y:auto;
    font-family:'Noto Serif KR',serif;">
    <div style="display:flex;justify-content:space-between;align-items:center;
      margin-bottom:20px;border-bottom:1px solid #3a2428;padding-bottom:12px;">
      <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);">💾 저장 / 불러오기</div>
      <button id="tnCloseSave" style="background:transparent;border:1px solid #3a2428;
        color:var(--text-dim);padding:6px 14px;cursor:pointer;font-family:inherit;
        border-radius:4px;font-size:.82rem;">✕ 닫기</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:20px;">
      <button id="tnSaveTabSave" onclick="window._townScene._switchSaveTab('save')"
        style="flex:1;padding:10px;background:#1a1020;border:2px solid var(--gold);
        color:var(--gold2);cursor:pointer;font-family:inherit;font-size:.85rem;
        font-weight:700;border-radius:4px;">💾 저장하기</button>
      <button id="tnSaveTabLoad" onclick="window._townScene._switchSaveTab('load')"
        style="flex:1;padding:10px;background:transparent;border:2px solid #3a2428;
        color:var(--text-dim);cursor:pointer;font-family:inherit;font-size:.85rem;
        font-weight:700;border-radius:4px;">📂 불러오기</button>
    </div>
    <div id="tnSaveSlotList" style="display:flex;flex-direction:column;gap:10px;"></div>
  </div>
</div>

<style>
.bank-tab {
  padding:12px 28px;background:transparent;
  border:none;border-bottom:3px solid transparent;
  color:var(--text-dim);cursor:pointer;font-family:inherit;
  font-size:.85rem;font-weight:700;letter-spacing:.05em;
  transition:.15s;
}
.bank-tab:hover { color:var(--text); }
.bank-tab-active { color:var(--gold2)!important; border-bottom-color:var(--gold)!important; }
.bank-card {
  background:rgba(255,255,255,.04);border:1px solid #3a2428;
  border-radius:6px;padding:16px 20px;
}
.bank-card-label { font-size:.65rem;color:var(--text-dim);margin-bottom:6px;letter-spacing:.08em; }
.bank-card-value { font-size:1.4rem;font-weight:700; }
.bank-btn {
  background:rgba(20,10,30,.85);border:1px solid #4a2e38;
  color:var(--text);padding:9px 18px;cursor:pointer;
  font-family:inherit;font-size:.78rem;border-radius:4px;
  transition:.15s;font-weight:700;
}
.bank-btn:hover { filter:brightness(1.3); }
.invest-stage-row {
  background:rgba(255,255,255,.03);border:1px solid #2e1e24;
  border-radius:6px;padding:14px 16px;position:relative;overflow:hidden;
}
.invest-stage-row.achieved { border-color:#44aa44; }
.invest-stage-row.current  { border-color:var(--gold);box-shadow:0 0 12px rgba(200,152,14,.2); }
.invest-bar-track {
  height:10px;background:#180a0c;border-radius:5px;
  overflow:hidden;margin-top:8px;border:1px solid rgba(255,255,255,.06);
}
.invest-bar-fill {
  height:100%;border-radius:5px;transition:width .6s ease;
}
</style>
`;
  }

  _bindEvents() {
    const g = this.game;
    const q = (id) => document.getElementById(id);

    q("tn-dungeon")?.addEventListener("click", () => g.goToDungeon("normal"));
    q("tn-abyss")?.addEventListener("click", () => {
      if (!g.player.abyssUnlocked) {
        g.showNarrative("🔒 마왕을 처치하면 해금됩니다.", 3000);
        return;
      }
      g.goToDungeon("abyss");
    });
    q("tn-city")?.addEventListener("click", () => {
      const invested = g.player.bank?.totalInvested || 0;
      if (invested < 5000) {
        g.showNarrative(
          "🔒 도시 탐험은 마을이 번영 단계(투자 5000G)에 도달해야 해금됩니다.",
          3000,
        );
        return;
      }
      g.goToDungeon("city");
    });
    q("tn-party")?.addEventListener("click", () => this._openPartyModal());
    q("tn-quest")?.addEventListener("click", () => this._openQuestModal());
    q("tn-skill")?.addEventListener("click", () => this._openSkillModal());
    q("tn-smith")?.addEventListener("click", () => this._openSmithModal());
    q("tn-inn")?.addEventListener("click", () => g.restAtInn());
    q("tn-bond")?.addEventListener("click", () => g.showPartyStory());
    q("tn-save")?.addEventListener("click", () => this._openSaveModal());

    // 은행 버튼 → 확인 팝업 → 은행 화면
    q("tn-bank")?.addEventListener("click", () => this._confirmBank());

    q("bankClose")?.addEventListener("click", () => this._closeBankScreen());
    q("tnCloseQuest")?.addEventListener("click", () =>
      q("tnQuestModal")?.classList.add("hidden"),
    );
    q("tnCloseSkill")?.addEventListener(
      "click",
      () => q("tnSkillModal") && (q("tnSkillModal").style.display = "none"),
    );
    q("tnCloseSmith")?.addEventListener(
      "click",
      () => q("tnSmithModal") && (q("tnSmithModal").style.display = "none"),
    );
    q("tnCloseParty")?.addEventListener(
      "click",
      () => q("tnPartyModal") && (q("tnPartyModal").style.display = "none"),
    );
    q("tnCloseSave")?.addEventListener("click", () => this._closeSaveModal());

    q("tnTabActive")?.addEventListener("click", () =>
      this._switchSkillTab("active"),
    );
    q("tnTabPassive")?.addEventListener("click", () =>
      this._switchSkillTab("passive"),
    );

    q("tnLearnAtk")?.addEventListener("click", () => {
      this.game.learnSkill("attackBoost");
      this._refreshSkillModal();
    });
    q("tnLearnHp")?.addEventListener("click", () => {
      this.game.learnSkill("hpBoost");
      this._refreshSkillModal();
    });
    q("tnLearnCrit")?.addEventListener("click", () => {
      this.game.learnSkill("criticalBoost");
      this._refreshSkillModal();
    });
    q("tnLearnJob")?.addEventListener("click", () => {
      this.game.learnJobSkill();
      this._refreshSkillModal();
    });

    this._buildShop();
  }

  // ── 은행 진입 확인 팝업 ────────────────────────────
  _confirmBank() {
    const p = this.game.player;
    const stage = getTownStage(p.bank.totalInvested);
    this.game.showNarrative(
      `🏦 왕국 은행\n\n` +
        `현재 마을 단계: ${stage.icon} ${stage.name}\n` +
        `예금 잔고: ${p.bank.deposit}G\n` +
        `누적 이자: ${p.bank.interest}G\n\n` +
        `투자하시겠습니까?`,
      100, // 짧게 설정 후 바로 진입 버튼 표시
    );

    // 확인 다이얼로그
    const dlg = document.createElement("div");
    dlg.id = "bankConfirmDlg";
    dlg.style.cssText = `position:fixed;inset:0;z-index:400;
      background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;`;
    dlg.innerHTML = `
      <div style="background:#110d0f;border:2px solid var(--gold);border-radius:8px;
        padding:32px 40px;text-align:center;max-width:360px;font-family:'Noto Serif KR',serif;">
        <div style="font-size:2.5rem;margin-bottom:8px;">🏦</div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);margin-bottom:8px;">왕국 은행</div>
        <div style="font-size:.82rem;color:var(--text-dim);margin-bottom:6px;line-height:1.7;">
          마을 단계: <span style="color:var(--gold2);font-weight:700;">${stage.icon} ${stage.name}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;
          margin:14px 0;font-size:.78rem;">
          <div style="background:rgba(255,255,255,.04);padding:8px;border-radius:4px;">
            <div style="color:var(--text-dim);">예금</div>
            <div style="color:var(--gold2);font-weight:700;">${p.bank.deposit}G</div>
          </div>
          <div style="background:rgba(255,255,255,.04);padding:8px;border-radius:4px;">
            <div style="color:var(--text-dim);">이자</div>
            <div style="color:#55cc55;font-weight:700;">${p.bank.interest}G</div>
          </div>
        </div>
        <div style="font-size:.78rem;color:var(--text-dim);margin-bottom:20px;">
          은행에 들어가시겠습니까?
        </div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="bankConfirmYes" style="background:#1a1020;border:1px solid var(--gold);
            color:var(--gold2);padding:10px 28px;cursor:pointer;font-family:inherit;
            font-size:.88rem;border-radius:4px;font-weight:700;">✅ 입장</button>
          <button id="bankConfirmNo" style="background:transparent;border:1px solid #3a2428;
            color:var(--text-dim);padding:10px 24px;cursor:pointer;font-family:inherit;
            font-size:.82rem;border-radius:4px;">취소</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);

    document.getElementById("bankConfirmYes").onclick = () => {
      dlg.remove();
      this._openBankScreen();
    };
    document.getElementById("bankConfirmNo").onclick = () => dlg.remove();
  }

  // ── 은행 화면 열기/닫기 ─────────────────────────────
  _openBankScreen() {
    const el = document.getElementById("bankScreen");
    if (el) {
      el.style.display = "flex";
      this._switchBankTab("deposit");
      this._refreshBankScreen();
      // ★ 은행 BGM 전환
      if (window.audioMgr) audioMgr.playBgm("shop");
    }
  }

  _closeBankScreen() {
    const el = document.getElementById("bankScreen");
    if (el) el.style.display = "none";
    // ★ 마을 BGM 복귀
    if (window.audioMgr) audioMgr.playBgm("town");
    this.render();
  }

  _switchBankTab(tab) {
    const dPane = document.getElementById("bankDepositPane");
    const iPane = document.getElementById("bankInvestPane");
    const dBtn = document.getElementById("bankTabDeposit");
    const iBtn = document.getElementById("bankTabInvest");
    if (dPane) dPane.style.display = tab === "deposit" ? "block" : "none";
    if (iPane) iPane.style.display = tab === "invest" ? "block" : "none";
    dBtn?.classList.toggle("bank-tab-active", tab === "deposit");
    iBtn?.classList.toggle("bank-tab-active", tab === "invest");
    this._refreshBankScreen();
  }

  _refreshBankScreen() {
    const p = this.game.player;
    const bank = p.bank;
    const q = (id) => document.getElementById(id);
    const s = (id, v) => {
      const e = q(id);
      if (e) e.innerText = v;
    };

    s("bankGoldDisplay", `${p.money} G`);
    s("bankDepositAmt", `${bank.deposit} G`);
    s("bankInterestAmt", `${bank.interest} G`);

    // 투자 탭
    const stage = getTownStage(bank.totalInvested);
    s("bankStageIcon", stage.icon);
    s("bankStageName", stage.name);
    s("bankStageDesc", stage.desc);
    s("bankTotalInvested", `${bank.totalInvested}G`);

    // 현재 단계 카드 색상
    const stageCard = q("bankCurrentStage");
    if (stageCard) stageCard.style.borderColor = stage.color;

    // 단계별 진행 바 렌더
    const list = q("bankStageList");
    if (!list) return;
    list.innerHTML = "";

    TOWN_STAGES.forEach((s2, i) => {
      if (i === 0) return; // 폐허(0)는 시작점이므로 목표에서 제외
      const achieved = bank.totalInvested >= s2.minInvest;
      const isCurrent =
        stage.level === s2.level - 1 ||
        (!achieved &&
          bank.totalInvested < s2.minInvest &&
          (i === 1 || bank.totalInvested >= TOWN_STAGES[i - 1].minInvest));

      const prevMin = TOWN_STAGES[i - 1].minInvest;
      const rangeMax = s2.minInvest - prevMin;
      const rangeNow = Math.max(
        0,
        Math.min(bank.totalInvested - prevMin, rangeMax),
      );
      const pct = Math.floor((rangeNow / rangeMax) * 100);

      const row = document.createElement("div");
      row.className = `invest-stage-row${achieved ? " achieved" : ""}`;

      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">${s2.icon}</span>
            <div>
              <div style="font-size:.85rem;font-weight:700;color:${achieved ? s2.color : "var(--text)"};">${s2.name}</div>
              <div style="font-size:.65rem;color:var(--text-dim);">${s2.desc}</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            ${
              achieved
                ? `<span style="color:#44cc44;font-size:.8rem;font-weight:700;">✅ 달성!</span>`
                : `<span style="font-size:.72rem;color:var(--text-dim);">${bank.totalInvested} / ${s2.minInvest}G</span>`
            }
          </div>
        </div>
        <div class="invest-bar-track">
          <div class="invest-bar-fill" style="width:${achieved ? 100 : pct}%;
            background:${
              achieved
                ? `linear-gradient(90deg,${s2.color}88,${s2.color})`
                : `linear-gradient(90deg,#442200,${s2.color}88)`
            };"></div>
        </div>
        ${achieved ? `` : `<div style="font-size:.62rem;color:var(--text-dim);margin-top:4px;text-align:right;">${pct}%</div>`}
        <div style="font-size:.68rem;color:var(--text-dim);margin-top:6px;">
          보상: <span style="color:#88ddff;">${
            i === 1
              ? "공격력 +5"
              : i === 2
                ? "공격력 +10, HP +50"
                : "공격력 +20, HP +100"
          }</span>
        </div>`;
      list.appendChild(row);
    });
  }

  // ── 예금/출금 ──────────────────────────────────────
  _depositGold(amount) {
    const p = this.game.player;
    const actual = Math.min(amount, p.money);
    if (actual <= 0) {
      this.game.log("💰 골드가 부족합니다.");
      return;
    }
    p.money -= actual;
    p.bank.deposit += actual;
    this.game.log(`🏦 ${actual}G 예금! (잔고: ${p.bank.deposit}G)`);
    this._refreshBankScreen();
    this.render();
  }
  _depositAll() {
    this._depositGold(this.game.player.money);
  }

  _withdrawGold(amount) {
    const p = this.game.player;
    const bank = p.bank;
    const total = bank.deposit + bank.interest;
    const actual = Math.min(amount, total);
    if (actual <= 0) {
      this.game.log("🏦 출금할 잔고가 없습니다.");
      return;
    }
    const fromInterest = Math.min(actual, bank.interest);
    const fromDeposit = actual - fromInterest;
    bank.interest -= fromInterest;
    bank.deposit -= fromDeposit;
    p.money += actual;
    this.game.log(`🏦 ${actual}G 출금!`);
    this._refreshBankScreen();
    this.render();
  }
  _withdrawAll() {
    const b = this.game.player.bank;
    this._withdrawGold(b.deposit + b.interest);
  }

  // ── 마을 투자 ──────────────────────────────────────
  _investTown(amount) {
    const p = this.game.player;
    const bank = p.bank;
    const actual = Math.min(amount, p.money);
    if (actual <= 0) {
      this.game.log("💰 골드가 부족합니다.");
      return;
    }

    const prevStage = getTownStage(bank.totalInvested);
    p.money -= actual;
    bank.totalInvested += actual;
    const newStage = getTownStage(bank.totalInvested);

    this.game.log(`🏗 ${actual}G 투자! (누적: ${bank.totalInvested}G)`);

    // 단계 상승
    if (newStage.level > prevStage.level) {
      this._onTownLevelUp(newStage);
    }

    // 투자 보상
    INVEST_REWARDS.forEach((r) => {
      if (
        bank.totalInvested >= r.minInvest &&
        !bank.milestones.includes(r.minInvest)
      ) {
        bank.milestones.push(r.minInvest);
        if (r.atkBonus) p.bonusAttack = (p.bonusAttack || 0) + r.atkBonus;
        if (r.hpBonus) {
          p.maxHp += r.hpBonus;
          p.hp = Math.min(p.hp + r.hpBonus, p.maxHp + p.bonusHp);
        }
        this.game.log(`🎁 투자 보상! ${r.msg}`);
      }
    });

    this._refreshBankScreen();
    this._updateTownBg();
    this.render();
  }
  _investAll() {
    this._investTown(this.game.player.money);
  }

  _onTownLevelUp(stage) {
    // ★ 마을 단계 상승 효과음
    if (window.audioMgr) audioMgr.playSfx("levelup_party");

    // 번영(최고 단계) 달성 시 축제 이미지 오버레이 표시
    if (stage.level === 3) {
      this._showFestivalOverlay();
    }
    this.game.showNarrative(
      `🎉 마을이 발전했습니다!\n\n${stage.icon} ${stage.name}\n\n${stage.desc}`,
      stage.level === 3 ? 5000 : 4000,
    );
    // ★ 마을 배경 전환 연출 (깜빡임 없는 페이드)
    const bgEl = document.getElementById("townBgImg");
    if (bgEl) {
      // 1) 페이드 아웃
      bgEl.style.transition = "opacity 0.6s ease";
      bgEl.style.opacity = "0";
      setTimeout(() => {
        // 2) 이미지 교체 (transition 잠시 비활성화)
        bgEl.style.transition = "none";
        bgEl.src = stage.bg;
        // 3) 이미지 로드 완료 후 페이드 인
        bgEl.onload = () => {
          bgEl.style.transition = "opacity 0.6s ease";
          bgEl.style.opacity = "1";
          bgEl.onload = null;
        };
        // 혹시 onload 안 쏘는 경우 대비
        setTimeout(() => {
          bgEl.style.transition = "opacity 0.6s ease";
          bgEl.style.opacity = "1";
        }, 100);
      }, 650);
    }
    // 헤더 타이틀 갱신
    const header = document.getElementById("townHeaderTitle");
    if (header) header.innerText = `${stage.icon} ${stage.name} — 평화의 마을`;
  }

  _showFestivalOverlay() {
    const old = document.getElementById("festivalOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "festivalOverlay";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:9000",
      "background:url('images/festival_1.png') center/cover no-repeat",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
      "animation:cutinFadeIn .5s ease",
    ].join(";");

    const inner = document.createElement("div");
    inner.style.cssText = [
      "background:rgba(0,0,0,0.55)",
      "border:2px solid #FFD700",
      "border-radius:8px",
      "padding:32px 48px",
      "text-align:center",
      "font-family:'Noto Serif KR',serif",
    ].join(";");
    inner.innerHTML = `
      <div style="font-size:3rem;margin-bottom:8px;">🎉🌟🎊</div>
      <div style="font-size:1.8rem;font-weight:700;color:#FFD700;
        text-shadow:0 0 24px #FFD700,0 0 48px #FF8800;margin-bottom:10px;">
        마을 번영 달성!
      </div>
      <div style="font-size:.9rem;color:#d8c8b0;line-height:1.8;margin-bottom:20px;">
        용사의 투자로 마을이 왕국 최고의<br>
        번영을 이루었습니다!<br>
        <span style="color:#FFD700;">🎁 공격력 +20, HP +100 획득!</span>
      </div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.5);">클릭하여 닫기</div>`;

    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", () => {
      overlay.style.animation = "cutinFadeOut .4s ease forwards";
      setTimeout(() => overlay.remove(), 400);
    });

    // 8초 후 자동 닫힘
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.style.animation = "cutinFadeOut .4s ease forwards";
        setTimeout(() => overlay.remove(), 400);
      }
    }, 8000);
  }

  _updateTownBg() {
    const p = this.game.player;
    const stage = getTownStage(p.bank?.totalInvested || 0);
    const bgEl = document.getElementById("townBgImg");
    // ★ 이미 같은 이미지면 변경하지 않음 (깜빡임 방지)
    if (bgEl) {
      const newSrc = stage.bg;
      const curSrc = bgEl.src.split("/").slice(-2).join("/"); // 상대경로로 비교
      const newRel = newSrc.replace("images/", "");
      if (!bgEl.src.includes(newRel)) {
        bgEl.style.transition = "none"; // transition 제거 후 즉시 변경
        bgEl.src = newSrc;
      }
    }
    const header = document.getElementById("townHeaderTitle");
    if (header) header.innerText = `${stage.icon} ${stage.name} — 평화의 마을`;
  }

  // ── 사이드바 렌더 ──────────────────────────────────
  render() {
    const p = this.game.player;
    if (!p) return;
    const q = (id) => document.getElementById(id);
    const s = (id, v) => {
      const e = q(id);
      if (e) e.innerText = v;
    };

    s("townGold", `💰 ${p.money} G`);

    const gc = {
      normal: "#b8a888",
      uncommon: "#55cc55",
      rare: "#4898d8",
      epic: "#bb66ff",
      legend: "#d8a820",
    };
    const fmtEq = (it) =>
      it
        ? `<span style="color:${gc[it.class] || "#b8a888"}">+${it.enhance || 0} ${it.name}</span>`
        : `<span style="color:#504040;">없음</span>`;

    const we = q("tnWeapon");
    if (we) we.innerHTML = fmtEq(p.equipment.weapon);
    const he = q("tnHelmet");
    if (he) he.innerHTML = fmtEq(p.equipment.helmet);
    const ae = q("tnArmor");
    if (ae) ae.innerHTML = fmtEq(p.equipment.armor);

    const cs = q("tnCompEquip");
    if (cs) {
      if (p.party) {
        cs.style.display = "block";
        q("tnCompEquipName").textContent =
          `⚔ ${PARTY_MEMBERS[p.party]?.name} 장착`;
        q("tnCompWeapon").innerHTML = fmtEq(p.partyEquipment.weapon);
        q("tnCompHelmet").innerHTML = fmtEq(p.partyEquipment.helmet);
        q("tnCompArmor").innerHTML = fmtEq(p.partyEquipment.armor);
      } else cs.style.display = "none";
    }

    if (p.quest) {
      s("tnQuestTitle", p.quest.title);
      s("tnQuestProg", `${p.questProgress}/${p.quest.goal}마리`);
      s("tnQuestReward", `${p.quest.rewardGold}G / ${p.quest.rewardExp}EXP`);
    } else {
      s("tnQuestTitle", "없음");
      s("tnQuestProg", "");
      s("tnQuestReward", "");
    }

    const abyssBtn = q("tn-abyss");
    if (abyssBtn) {
      abyssBtn.style.opacity = p.abyssUnlocked ? "1" : "0.35";
      abyssBtn.textContent = p.abyssUnlocked ? "🌌 심연" : "🔒 심연";
      abyssBtn.style.borderColor = p.abyssUnlocked ? "#8844cc" : "";
    }
    const cityUnlocked = (p.bank?.totalInvested || 0) >= 5000;
    const cityBtn = q("tn-city");
    if (cityBtn) {
      cityBtn.style.opacity = cityUnlocked ? "1" : "0.35";
      cityBtn.textContent = cityUnlocked ? "🏙 도시 탐험" : "🔒 도시 탐험";
      cityBtn.style.borderColor = cityUnlocked ? "#88aaff" : "";
    }

    // 마을 투자 사이드바
    const bank = p.bank || { totalInvested: 0, deposit: 0, interest: 0 };
    const stage = getTownStage(bank.totalInvested);
    const next = getNextStage(bank.totalInvested);
    s("tnTownStageName", `${stage.icon} ${stage.name}`);
    s("tnTownInvested", `투자: ${bank.totalInvested}G`);
    if (next) {
      const need = next.minInvest - bank.totalInvested;
      s("tnTownNextGoal", `다음: ${next.name} (${need}G 남음)`);
      const prevMin = TOWN_STAGES[stage.level].minInvest;
      const pct = Math.floor(
        ((bank.totalInvested - prevMin) / (next.minInvest - prevMin)) * 100,
      );
      const bar = q("tnTownBar");
      if (bar) bar.style.width = `${pct}%`;
    } else {
      s("tnTownNextGoal", "✅ 최고 단계!");
      const bar = q("tnTownBar");
      if (bar) bar.style.width = "100%";
    }
    s("tnSideDeposit", `예금: ${bank.deposit}G`);
    s("tnSideInterest", `이자: ${bank.interest}G`);

    this._renderInventory();
    this._updateTownBg();
  }

  _renderInventory() {
    const p = this.game.player;
    const c = document.getElementById("tnInventory");
    if (!c) return;
    c.innerHTML = "";
    const grade = {
      normal: { color: "#b8a888" },
      uncommon: { color: "#55cc55" },
      rare: { color: "#4898d8" },
      epic: { color: "#bb66ff" },
      legend: { color: "#d8a820" },
    };
    if (!p.inventory.length) {
      c.innerHTML = `<div style="font-size:.7rem;color:var(--text-dim);padding:8px 0;">인벤토리 비어있음</div>`;
      return;
    }
    p.inventory.forEach((item, idx) => {
      const g = grade[item.class] || grade.normal;
      const row = document.createElement("div");
      row.className = "inv-row";
      row.style.borderColor = g.color + "55";
      const stat =
        item.type === "weapon"
          ? `ATK+${item.attack}`
          : item.type === "potion"
            ? `회복`
            : `DEF+${item.defense}`;
      row.innerHTML = `
        <span style="width:6px;height:6px;border-radius:50%;background:${g.color};flex-shrink:0;display:inline-block;"></span>
        <span class="inv-name" style="color:${g.color};flex:1;font-size:.66rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          +${item.enhance || 0} ${item.name} <span style="color:var(--text-dim);font-size:.6rem;">${stat}</span>
        </span>`;
      if (item.type !== "potion") {
        const eq = document.createElement("button");
        eq.className = "inv-btn";
        eq.textContent = "장착";
        eq.addEventListener("click", () => {
          this.game.itemManager.equip(this.game, idx, false);
          this.render();
        });
        row.appendChild(eq);
        if (p.party) {
          const eqC = document.createElement("button");
          eqC.className = "inv-btn";
          eqC.textContent = "동료";
          eqC.style.cssText = "border-color:#4444cc;color:#8888ff;";
          eqC.addEventListener("click", () => {
            this.game.itemManager.equip(this.game, idx, true);
            this.render();
          });
          row.appendChild(eqC);
        }
      }
      const del = document.createElement("button");
      del.className = "inv-btn del";
      del.textContent = "❌";
      del.addEventListener("click", () => {
        this.game.itemManager.remove(this.game, idx);
        this.render();
      });
      row.appendChild(del);
      c.appendChild(row);
    });
  }

  _buildShop() {
    const c = document.getElementById("tnShop");
    if (!c) return;
    c.innerHTML = "";
    SHOP_ITEMS.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.className = `shop-btn ${item.class}`;
      btn.innerHTML = `<span class="item-name">${item.name}</span><span class="item-cost">${item.cost}G</span>`;
      btn.addEventListener("click", () => {
        this.game.itemManager.buyShop(this.game, idx);
        this.render();
      });
      c.appendChild(btn);
    });
  }

  _openQuestModal() {
    const modal = document.getElementById("tnQuestModal");
    const list = document.getElementById("tnQuestList");
    if (!modal || !list) return;
    const p = this.game.player;
    const available = this.game.questManager.getAvailable(p);
    const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, 4);
    list.innerHTML = "";
    if (p.quest) {
      const pct = this.game.questManager.getProgressPct(p);
      list.innerHTML += `<div class="quest-card active-quest"><div class="quest-badge">진행 중</div><h3>${p.quest.title}</h3><p>📍 ${p.quest.target} ${p.questProgress}/${p.quest.goal}</p><div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div></div>`;
    }
    shuffled.forEach((q) => {
      const card = document.createElement("div");
      card.className = "quest-card";
      card.innerHTML = `<h3>${q.title}</h3><p>📍 ${q.target} ${q.goal}마리</p><p>🎁 ${q.rewardGold}G/${q.rewardExp}EXP</p><button class="quest-accept-btn">✅ 수락</button>`;
      card.querySelector("button").addEventListener("click", () => {
        if (this.game.questManager.accept(this.game, q.id)) {
          modal.classList.add("hidden");
          this.render();
          this.game.goToDungeon("normal");
        }
      });
      list.appendChild(card);
    });
    if (!shuffled.length && !p.quest)
      list.innerHTML += `<p style="color:var(--text-dim);text-align:center;font-size:.8rem;">조건에 맞는 퀘스트 없음</p>`;
    modal.classList.remove("hidden");
  }

  _openSkillModal() {
    const p = this.game.player;
    const q = (id) => document.getElementById(id);
    const s = (id, v) => {
      const e = q(id);
      if (e) e.innerText = v;
    };
    s("tnSP", p.skillPoints);
    s("tnAtkLv", p.skills.attackBoost);
    s("tnHpLv", p.skills.hpBoost);
    s("tnCritLv", p.skills.criticalBoost);
    s(
      "tnJobSkillName",
      { night: "⚔ 회전베기", mage: "🔮 매직볼", archer: "🏹 속사" }[p.type],
    );
    const modal = q("tnSkillModal");
    if (modal) modal.style.display = "flex";
    this._renderPassiveSkills();
    this._switchSkillTab("active");
  }

  _refreshSkillModal() {
    const p = this.game.player;
    const s = (id, v) => {
      const e = document.getElementById(id);
      if (e) e.innerText = v;
    };
    s("tnSP", p.skillPoints);
    s("tnAtkLv", p.skills.attackBoost);
    s("tnHpLv", p.skills.hpBoost);
    s("tnCritLv", p.skills.criticalBoost);
    this._renderPassiveSkills();
    this.render();
  }

  _switchSkillTab(tab) {
    const act = document.getElementById("tnActiveSkills");
    const pas = document.getElementById("tnPassiveSkills");
    const tA = document.getElementById("tnTabActive");
    const tP = document.getElementById("tnTabPassive");
    if (act) act.style.display = tab === "active" ? "block" : "none";
    if (pas) pas.style.display = tab === "passive" ? "block" : "none";
    tA?.classList.toggle("active", tab === "active");
    tP?.classList.toggle("active", tab === "passive");
  }

  _renderPassiveSkills() {
    const el = document.getElementById("tnPassiveSkills");
    if (!el) return;
    const p = this.game.player;
    const allPassives = {
      knight: [
        {
          id: "iron_body",
          name: "🛡 철갑 몸",
          desc: ["DEF+5", "DEF+12", "DEF+22"],
          spCost: [2, 3, 4],
        },
        {
          id: "war_cry",
          name: "📣 전쟁의 함성",
          desc: ["적ATK-10%", "적ATK-18%", "적ATK-28%"],
          spCost: [2, 3, 4],
        },
        {
          id: "berserker",
          name: "😤 광전사",
          desc: ["HP30%↓ATK+20%", "HP40%↓ATK+35%", "HP50%↓ATK+50%"],
          spCost: [3, 4, 5],
        },
      ],
      magician: [
        {
          id: "mana_surge",
          name: "💥 마나 폭발",
          desc: ["크리+20%", "+40%", "+65%"],
          spCost: [2, 3, 4],
        },
        {
          id: "spell_echo",
          name: "🔮 마법 반향",
          desc: ["25%추가15", "30%추가30", "40%추가50"],
          spCost: [2, 3, 4],
        },
        {
          id: "arcane_ward",
          name: "🌀 비전 보호막",
          desc: ["피해-8%", "-15%", "-22%"],
          spCost: [2, 3, 4],
        },
      ],
      archer: [
        {
          id: "eagle_eye",
          name: "🦅 매의 눈",
          desc: ["크리+8%", "+16%", "+26%"],
          spCost: [2, 3, 4],
        },
        {
          id: "swift_feet",
          name: "💨 신속",
          desc: ["피해-10%(20%)", "-15%(30%)", "-20%(40%)"],
          spCost: [2, 3, 4],
        },
        {
          id: "poison_tip",
          name: "☠ 독 화살촉",
          desc: ["독+1턴", "독+2턴", "독+3턴"],
          spCost: [2, 3, 4],
        },
      ],
    };
    const jobSkills = allPassives[p.type] || [];
    el.innerHTML = "";
    jobSkills.forEach((skill) => {
      const curLv = (p.passiveSkills || {})[skill.id] || 0;
      const maxLv = skill.spCost.length;
      const isMax = curLv >= maxLv;
      const cost = isMax ? 0 : skill.spCost[curLv];
      const canLearn = !isMax && p.skillPoints >= cost;
      const row = document.createElement("div");
      row.className = "passive-skill-row";
      row.innerHTML = `
        <div class="passive-header">
          <span class="passive-name">${skill.name}</span>
          <span class="passive-level" style="color:${isMax ? "var(--gold)" : "var(--text-dim)"}">Lv.${curLv}/${maxLv}</span>
        </div>
        <div class="passive-desc">${isMax ? "✨ MAX" : `다음: ${skill.desc[curLv]}`}</div>
        <button class="passive-learn-btn ${canLearn ? "" : "disabled"}" ${!canLearn ? "disabled" : ""}>
          ${isMax ? "MAX" : `습득 (SP${cost})`}
        </button>`;
      row.querySelector("button").addEventListener("click", () => {
        if (!canLearn) return;
        this.game.learnPassive(skill.id, jobSkills);
        this._refreshSkillModal();
      });
      el.appendChild(row);
    });
  }

  _openSmithModal() {
    const p = this.game.player;
    const q = (id) => document.getElementById(id);
    const gEl = q("tnSmithGold");
    if (gEl) gEl.innerText = p.money;
    const modal = q("tnSmithModal");
    if (modal) modal.style.display = "flex";
    const BLACKSMITH_WEAPONS = [
      {
        name: "기사의 검",
        type: "weapon",
        weaponClass: "sword",
        attack: 40,
        defense: 0,
        cost: 500,
        class: "rare",
        enhance: 0,
      },
      {
        name: "엘프의 활",
        type: "weapon",
        weaponClass: "bow",
        attack: 38,
        defense: 0,
        cost: 500,
        class: "rare",
        enhance: 0,
      },
      {
        name: "현자의 지팡이",
        type: "weapon",
        weaponClass: "staff",
        attack: 42,
        defense: 0,
        cost: 500,
        class: "rare",
        enhance: 0,
      },
    ];
    const buyEl = q("tnSmithBuy");
    if (buyEl) {
      buyEl.innerHTML = "";
      BLACKSMITH_WEAPONS.forEach((w) => {
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.textContent = `${w.name} ${w.cost}G`;
        btn.addEventListener("click", () => {
          if (p.money < w.cost) {
            this.game.log("💰 골드 부족");
            return;
          }
          p.money -= w.cost;
          this.game.itemManager.add(this.game, {
            ...w,
            itemId: createItemId(),
          });
          this.game.log(`🛒 ${w.name} 구매`);
          gEl.innerText = p.money;
          this.render();
        });
        buyEl.appendChild(btn);
      });
    }
    const enhEl = q("tnSmithEnhance");
    if (enhEl) {
      enhEl.innerHTML = "";
      p.inventory.forEach((item, idx) => {
        if (item.type === "potion") return;
        const cost = (item.enhance + 1) * 100;
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.textContent = `+${item.enhance} ${item.name} 강화 (${cost}G)`;
        btn.addEventListener("click", () => {
          this.game.itemManager.enhance(this.game, idx);
          this._openSmithModal();
        });
        enhEl.appendChild(btn);
      });
    }
    const sellEl = q("tnSmithSell");
    if (sellEl) {
      sellEl.innerHTML = "";
      p.inventory.forEach((item, idx) => {
        const price = 50 + (item.enhance || 0) * 20;
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.textContent = `${item.name} 판매 ${price}G`;
        btn.addEventListener("click", () => {
          this.game.itemManager.sellToBlacksmith(this.game, idx, price);
          this._openSmithModal();
          this.render();
        });
        sellEl.appendChild(btn);
      });
    }
  }

  // ══════════════════════════════════════════
  //  세이브 슬롯 시스템
  // ══════════════════════════════════════════

  // 포트레이트 이미지 경로
  _getPortrait(type) {
    const map = {
      knight: "images/portrait_Night.png",
      magician: "images/portrait_mage.png",
      archer: "images/portrait_archer.png",
    };
    return map[type] || map.night;
  }

  // 동료 포트레이트
  _getPartyPortrait(party) {
    const map = {
      healer: "images/portrait_healer.png",
      tanker: "images/portrait_tanker.png",
      dealer: "images/portrait_Night.png",
      mage_party: "images/portrait_mage.png",
      archer: "images/portrait_archer.png",
    };
    return map[party] || null;
  }

  // 동료 한글 이름
  _getPartyName(party) {
    const map = {
      healer: "리온 (힐러)",
      tanker: "카인 (탱커)",
      dealer: "카르나 (딜러)",
      mage_party: "엘린 (마법사)",
      archer: "아리아 (궁수)",
    };
    return map[party] || "동료 없음";
  }

  // 저장 시간 포맷
  _formatTime(ts) {
    if (!ts) return "알 수 없음";
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }

  _openSaveModal() {
    const modal = document.getElementById("tnSaveModal");
    if (modal) {
      modal.style.display = "flex";
      this._switchSaveTab("save");
    }
  }

  _closeSaveModal() {
    const modal = document.getElementById("tnSaveModal");
    if (modal) modal.style.display = "none";
  }

  _switchSaveTab(tab) {
    this._currentSaveTab = tab;
    const saveBtn = document.getElementById("tnSaveTabSave");
    const loadBtn = document.getElementById("tnSaveTabLoad");
    if (saveBtn) {
      saveBtn.style.background = tab === "save" ? "#1a1020" : "transparent";
      saveBtn.style.borderColor = tab === "save" ? "var(--gold)" : "#3a2428";
      saveBtn.style.color = tab === "save" ? "var(--gold2)" : "var(--text-dim)";
    }
    if (loadBtn) {
      loadBtn.style.background = tab === "load" ? "#1a1020" : "transparent";
      loadBtn.style.borderColor = tab === "load" ? "var(--gold)" : "#3a2428";
      loadBtn.style.color = tab === "load" ? "var(--gold2)" : "var(--text-dim)";
    }
    this._renderSaveSlots(tab);
  }

  _renderSaveSlots(tab) {
    const list = document.getElementById("tnSaveSlotList");
    if (!list) return;
    list.innerHTML = "";

    const slots = this.game.saveManager.getAllSlots();
    const p = this.game.player;

    slots.forEach((slot) => {
      const row = document.createElement("div");
      row.style.cssText = `
        display:flex;align-items:center;gap:14px;
        background:rgba(255,255,255,.04);
        border:1px solid ${slot.empty ? "#2a1e24" : "#4a3040"};
        border-radius:8px;padding:14px 16px;
        transition:.15s;cursor:default;
      `;

      if (!slot.empty && slot.data?.player) {
        const sp = slot.data.player;
        const classNames = { night: "기사", mage: "마법사", archer: "궁수" };

        // ── 주인공 포트레이트 ──
        const portrait = document.createElement("img");
        portrait.src = this._getPortrait(sp.type);
        portrait.style.cssText =
          "width:56px;height:56px;border-radius:6px;object-fit:cover;border:2px solid #4a2e38;flex-shrink:0;";
        portrait.onerror = () => {
          portrait.style.display = "none";
        };
        row.appendChild(portrait);

        // ── 동료 포트레이트 ──
        if (sp.party) {
          const cPortrait = document.createElement("img");
          cPortrait.src = this._getPartyPortrait(sp.party);
          cPortrait.style.cssText =
            "width:44px;height:44px;border-radius:6px;object-fit:cover;border:2px solid #3a2848;flex-shrink:0;margin-left:-24px;margin-top:12px;";
          cPortrait.onerror = () => {
            cPortrait.style.display = "none";
          };
          row.appendChild(cPortrait);
        }

        // ── 정보 텍스트 ──
        const info = document.createElement("div");
        info.style.cssText = "flex:1;min-width:0;";
        info.innerHTML = `
          <div style="font-size:.88rem;font-weight:700;color:var(--gold2);margin-bottom:3px;">
            슬롯 ${slot.index + 1}
            <span style="font-size:.7rem;color:var(--text-dim);font-weight:400;margin-left:8px;">
              ${this._formatTime(slot.data.savedAt)}
            </span>
          </div>
          <div style="font-size:.8rem;color:var(--text);margin-bottom:2px;">
            ${sp.name} (${classNames[sp.type] || sp.type})
            <span style="color:#ff77aa;font-size:.72rem;margin-left:6px;">
              ${sp.party ? this._getPartyName(sp.party) : "동료 없음"}
            </span>
          </div>
          <div style="font-size:.7rem;color:var(--text-dim);">
            Lv.${sp.level} &nbsp;|&nbsp; 💰${sp.money}G &nbsp;|&nbsp;
            HP ${sp.hp}/${sp.maxHp} &nbsp;|&nbsp;
            ${sp.abyssUnlocked ? "🌌 심연 해금" : "🗡 던전 진행중"}
          </div>`;
        row.appendChild(info);

        // ── 버튼 영역 ──
        const btns = document.createElement("div");
        btns.style.cssText =
          "display:flex;flex-direction:column;gap:6px;flex-shrink:0;";

        if (tab === "save") {
          // 저장 버튼
          const saveBtn = document.createElement("button");
          saveBtn.textContent = "💾 덮어쓰기";
          saveBtn.style.cssText = `
            background:#1a0e20;border:1px solid var(--gold);color:var(--gold2);
            padding:7px 14px;cursor:pointer;font-family:inherit;font-size:.75rem;
            border-radius:4px;font-weight:700;white-space:nowrap;`;
          saveBtn.onclick = () => this._doSave(slot.index);
          btns.appendChild(saveBtn);
        } else {
          // 불러오기 버튼
          const loadBtn = document.createElement("button");
          loadBtn.textContent = "📂 불러오기";
          loadBtn.style.cssText = `
            background:#0a1420;border:1px solid #4488cc;color:#88ccff;
            padding:7px 14px;cursor:pointer;font-family:inherit;font-size:.75rem;
            border-radius:4px;font-weight:700;white-space:nowrap;`;
          loadBtn.onclick = () => this._doLoad(slot.index);
          btns.appendChild(loadBtn);
        }

        // 삭제 버튼
        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑 삭제";
        delBtn.style.cssText = `
          background:transparent;border:1px solid #6a2020;color:#cc6666;
          padding:5px 14px;cursor:pointer;font-family:inherit;font-size:.72rem;
          border-radius:4px;`;
        delBtn.onclick = () => this._doDelete(slot.index);
        btns.appendChild(delBtn);

        row.appendChild(btns);
      } else {
        // 빈 슬롯
        row.style.opacity = "0.6";
        row.innerHTML = `
          <div style="width:56px;height:56px;border-radius:6px;background:#1a0e14;
            border:2px dashed #3a2428;display:flex;align-items:center;
            justify-content:center;font-size:1.5rem;flex-shrink:0;">📭</div>
          <div style="flex:1;color:var(--text-dim);font-size:.85rem;">
            슬롯 ${slot.index + 1} — 비어있음
          </div>`;

        if (tab === "save") {
          const saveBtn = document.createElement("button");
          saveBtn.textContent = "💾 여기에 저장";
          saveBtn.style.cssText = `
            background:#1a1020;border:1px solid var(--gold);color:var(--gold2);
            padding:8px 16px;cursor:pointer;font-family:inherit;font-size:.78rem;
            border-radius:4px;font-weight:700;flex-shrink:0;`;
          saveBtn.onclick = () => this._doSave(slot.index);
          row.appendChild(saveBtn);
        }
      }

      list.appendChild(row);
    });
  }

  _doSave(slotIndex) {
    const ok = this.game.saveManager.save(this.game, slotIndex);
    if (ok) {
      this.game.showNarrative(`💾 슬롯 ${slotIndex + 1}에 저장 완료!`, 2000);
      this._renderSaveSlots(this._currentSaveTab || "save");
    } else {
      this.game.showNarrative("⚠ 저장 실패", 2000);
    }
  }

  _doLoad(slotIndex) {
    const data = this.game.saveManager.load(slotIndex);
    if (!data) {
      this.game.showNarrative("⚠ 데이터 없음", 2000);
      return;
    }

    const player = this.game.saveManager.hydrate(data.player);
    if (!player) {
      this.game.showNarrative("⚠ 데이터 손상", 2000);
      return;
    }

    this.game.player = player;
    this._closeSaveModal();
    this.game._toTown();
    this.game.log(`💾 슬롯 ${slotIndex + 1} 불러오기 완료! Lv.${player.level}`);
  }

  _doDelete(slotIndex) {
    // 간단 확인 없이 바로 삭제 (confirm 대신 1초 내 재클릭 방식)
    this.game.saveManager.deleteSlot(slotIndex);
    this.game.log(`🗑 슬롯 ${slotIndex + 1} 삭제됨`);
    this._renderSaveSlots(this._currentSaveTab || "save");
  }

  _openPartyModal() {
    const modal = document.getElementById("tnPartyModal");
    const cards = document.getElementById("tnPartyCards");
    if (!modal || !cards) return;
    cards.innerHTML = "";
    Object.entries(PARTY_MEMBERS).forEach(([key, mem]) => {
      const btn = document.createElement("button");
      btn.className = "class-card";
      btn.innerHTML = `<div class="class-icon">${mem.icon}</div><div class="class-name">${mem.name} (${mem.className})</div><div class="class-desc">HP ${mem.hp} / ATK ${mem.attack} / DEF ${mem.defense}</div>`;
      btn.addEventListener("click", () => {
        this.game.selectParty(key);
        modal.style.display = "none";
        this.render();
      });
      cards.appendChild(btn);
    });
    modal.style.display = "flex";
  }
}

window.TownScene = TownScene;
window.getTownStage = getTownStage;
window.applyBattleInterest = applyBattleInterest;
