// ═══════════════════════════════════════════════════
//  town-scene.js  — 마을 화면
// ═══════════════════════════════════════════════════
"use strict";

// ── 마을 4단계 ───────────────────────────────────
const TOWN_STAGES = [
  { level:0, name:"폐허",   minInvest:0,    bg:"images/공사중 건물 사람 없는이미지.png", color:"#8B4513", icon:"💀", desc:"마을이 황폐해 있다. 재건이 필요하다." },
  { level:1, name:"공사중", minInvest:500,  bg:"images/공사중 건물 사람 없는이미지.png", color:"#CD853F", icon:"🏗",  desc:"마을 재건이 시작됐다. 인부들이 바쁘게 움직인다." },
  { level:2, name:"번화가", minInvest:2000, bg:"images/공사중 건물 사람 없는이미지.png", color:"#4CAF50", icon:"🏘",  desc:"상점들이 들어서고 사람들이 모여들기 시작했다." },
  { level:3, name:"번영",   minInvest:5000, bg:"images/공사중 건물 사람 없는이미지.png", color:"#FFD700", icon:"🌟", desc:"마을이 크게 번창했다! 왕국 최고의 마을이 됐다." },
];
const INVEST_REWARDS = [
  { minInvest:500,  atkBonus:5,  hpBonus:0,   msg:"공격력 +5" },
  { minInvest:2000, atkBonus:10, hpBonus:50,  msg:"공격력 +10, HP +50" },
  { minInvest:5000, atkBonus:20, hpBonus:100, msg:"공격력 +20, HP +100" },
];
const INTEREST_RATE = 0.05;

function getTownStage(totalInvested) {
  let s = TOWN_STAGES[0];
  for (const t of TOWN_STAGES) { if (totalInvested >= t.minInvest) s = t; }
  return s;
}
function getNextStage(totalInvested) {
  return TOWN_STAGES.find(s => s.minInvest > totalInvested) || null;
}
// 전투 1회당 예금 이자 적립 (game.js onBattleVictory에서 호출)
function applyBattleInterest(player) {
  const b = player.bank;
  if (!b || b.deposit <= 0) return 0;
  const interest = Math.floor(b.deposit * INTEREST_RATE);
  if (interest > 0) b.interest = (b.interest || 0) + interest;
  return interest;
}


class TownScene {
  constructor(game) {
    this.game = game;
    // 은행 필드 초기화 (없을 경우 새로 생성)
    if (!game.player.bank)
      game.player.bank = { deposit:0, interest:0, totalInvested:0, milestones:[] };
  }

  mount(container) {
    container.innerHTML = this._buildHTML();
    this._bindEvents();
    this.render();
  }

  _buildHTML() {
    return `
<div class="town-header">
  <h2>🏘 평화의 마을</h2>
  <span id="townGold">💰 0 G</span>
</div>
<div class="town-body">
  <!-- 마을 맵 -->
  <div class="town-map">
    <img class="town-bg" src="images/공사중 건물 사람 없는이미지.png" alt="마을"/>
    <div class="town-locations">
      <button class="location-btn" id="tn-outside">🌿 성 밖 사냥터</button>
      <button class="location-btn" id="tn-forest">🌲 숲 던전</button>
      <button class="location-btn" id="tn-dungeon">🗡 일반 던전</button>
      <button class="location-btn" id="tn-abyss">⚫ 심연 던전</button>
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
  <!-- 사이드바 -->
  <div class="town-sidebar">
   <div class="sidebar-section">
  <h3>⚔ 장착 장비</h3>
  <div class="equip-slot">무기: <span id="tnWeapon">없음</span></div>
  <div class="equip-slot">투구: <span id="tnHelmet">없음</span></div>
  <div class="equip-slot">갑옷: <span id="tnArmor">없음</span></div>
</div>

<!-- 동료 장비 (동적으로 표시/숨김) -->
<div class="sidebar-section" id="tnCompEquip" style="display:none;">
  <h3 id="tnCompEquipName">⚔ 동료 장착 장비</h3>
  <div class="equip-slot">무기: <span id="tnCompWeapon">없음</span></div>
  <div class="equip-slot">투구: <span id="tnCompHelmet">없음</span></div>
  <div class="equip-slot">갑옷: <span id="tnCompArmor">없음</span></div>
</div>
    <div class="sidebar-section">
      <h3>📜 현재 퀘스트</h3>
      <div id="tnQuestTitle" style="font-size:.78rem;color:var(--gold2);">없음</div>
      <div id="tnQuestProg"  style="font-size:.7rem;color:var(--text-dim);"></div>
      <div id="tnQuestReward"style="font-size:.7rem;color:var(--text-dim);"></div>
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
      <h3>🛒 상점</h3>
      <div id="tnShop"></div>
    </div>
    <div class="sidebar-section">
      <h3>🎒 인벤토리</h3>
      <div id="tnInventory"></div>
    </div>
  </div>
</div>

<!-- ══ 은행 화면 ══ -->
<div id="bankScreen" style="display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,0.92);flex-direction:column;overflow-y:auto;">
  <div style="display:flex;align-items:center;justify-content:space-between;
    padding:16px 24px;border-bottom:2px solid #4a2e38;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:2rem;">🏦</span>
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);">왕국 은행</div>
        <div style="font-size:.7rem;color:var(--text-dim);">예금 · 마을 투자</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div id="bankGoldDisplay" style="font-size:1rem;font-weight:700;color:var(--gold2);">0 G</div>
      <button id="bankClose" style="background:transparent;border:1px solid #4a2e38;
        color:var(--text-dim);padding:8px 16px;cursor:pointer;font-family:inherit;
        font-size:.82rem;border-radius:4px;">← 마을로</button>
    </div>
  </div>
  <div style="display:flex;border-bottom:1px solid #2e1e24;flex-shrink:0;">
    <button id="bankTabDeposit" class="bank-tab bank-tab-active"
      onclick="window._townScene._switchBankTab('deposit')">💰 예금 · 출금</button>
    <button id="bankTabInvest" class="bank-tab"
      onclick="window._townScene._switchBankTab('invest')">🏗 마을 투자</button>
  </div>
  <!-- 예금 탭 -->
  <div id="bankDepositPane" style="padding:24px;max-width:700px;margin:0 auto;width:100%;">
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
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;border-radius:6px;padding:16px;margin-bottom:16px;">
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
    <div style="background:rgba(255,255,255,.03);border:1px solid #1a3a2a;border-radius:6px;padding:16px;margin-bottom:16px;">
      <div style="font-size:.75rem;color:#55cc55;margin-bottom:10px;font-weight:700;">💸 출금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(100)">-100G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(500)">-500G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(1000)">-1000G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawAll()">전액 출금</button>
      </div>
    </div>
    <div style="padding:12px;background:rgba(200,152,14,.06);border:1px solid rgba(200,152,14,.2);border-radius:4px;font-size:.7rem;color:var(--text-dim);line-height:1.8;">
      💡 예금의 <span style="color:#55cc55;">5%</span>가 전투마다 자동으로 이자로 쌓입니다.
    </div>
  </div>
  <!-- 투자 탭 -->
  <div id="bankInvestPane" style="display:none;padding:24px;max-width:700px;margin:0 auto;width:100%;">
    <div id="bankCurrentStage" class="bank-card" style="margin-bottom:24px;border-color:var(--gold);
      background:rgba(200,152,14,.06);text-align:center;padding:20px;">
      <div id="bankStageIcon" style="font-size:2.5rem;margin-bottom:6px;">💀</div>
      <div id="bankStageName" style="font-size:1.3rem;font-weight:700;color:var(--gold2);">폐허</div>
      <div id="bankStageDesc" style="font-size:.75rem;color:var(--text-dim);margin-top:4px;"></div>
      <div style="margin-top:10px;font-size:.72rem;color:var(--text-dim);">
        총 투자액: <span id="bankTotalInvested" style="color:var(--gold);font-weight:700;">0G</span>
      </div>
    </div>
    <div style="margin-bottom:28px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:14px;font-weight:700;">📊 마을 발전 단계</div>
      <div id="bankStageList" style="display:flex;flex-direction:column;gap:14px;"></div>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;border-radius:6px;padding:16px;margin-bottom:16px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">🏗 투자하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(100)">100G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(500)">500G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(1000)">1000G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investAll()">전액 투자</button>
      </div>
    </div>
    <div style="padding:12px;background:rgba(200,152,14,.06);border:1px solid rgba(200,152,14,.2);border-radius:4px;font-size:.7rem;color:var(--text-dim);line-height:1.8;">
      💡 공사중(500G): 공격력 +5 · 번화가(2000G): 공격력 +10, HP +50 · 번영(5000G): 공격력 +20, HP +100
    </div>
  </div>
</div>

<style>
.bank-tab { padding:12px 28px;background:transparent;border:none;
  border-bottom:3px solid transparent;color:var(--text-dim);cursor:pointer;
  font-family:inherit;font-size:.85rem;font-weight:700;transition:.15s; }
.bank-tab:hover { color:var(--text); }
.bank-tab-active { color:var(--gold2)!important;border-bottom-color:var(--gold)!important; }
.bank-card { background:rgba(255,255,255,.04);border:1px solid #3a2428;border-radius:6px;padding:16px 20px; }
.bank-card-label { font-size:.65rem;color:var(--text-dim);margin-bottom:6px;letter-spacing:.08em; }
.bank-card-value { font-size:1.4rem;font-weight:700; }
.bank-btn { background:rgba(20,10,30,.85);border:1px solid #4a2e38;color:var(--text);
  padding:9px 18px;cursor:pointer;font-family:inherit;font-size:.78rem;
  border-radius:4px;transition:.15s;font-weight:700; }
.bank-btn:hover { filter:brightness(1.3); }
</style>

<!-- 퀘스트 모달 -->
<div id="tnQuestModal" class="modal hidden">
  <div class="modal-content">
    <h2>📜 퀘스트 게시판</h2>
    <div id="tnQuestList"></div>
    <button id="tnCloseQuest">닫기</button>
  </div>
</div>

<!-- 스킬 트리 모달 -->
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

<!-- 동료 선택 화면 -->
<div id="tnPartyModal" class="skill-modal" style="display:none;">
  <div class="skill-box" style="max-width:600px;">
    <h2>🍺 동료 모집</h2>
    <div class="class-cards" id="tnPartyCards"></div>
    <button id="tnCloseParty">닫기</button>
  </div>
</div>
`;
  }

  _bindEvents() {
    const g = this.game;
    const q = id => document.getElementById(id);

    q("tn-outside") ?.addEventListener("click", () => g.goToDungeon("outside"));
    q("tn-forest")  ?.addEventListener("click", () => g.goToDungeon("forest"));
    q("tn-dungeon") ?.addEventListener("click", () => g.goToDungeon("normal"));
    q("tn-abyss")   ?.addEventListener("click", () => {
      if (!g.player.abyssUnlocked) {
        g.showNarrative("🔒 일반 던전 수호자를 처치하면 해금됩니다.", 3000);
        return;
      }
      g.goToDungeon("abyss");
    });
    q("tn-party")  ?.addEventListener("click", () => this._openPartyModal());
    q("tn-quest")  ?.addEventListener("click", () => this._openQuestModal());
    q("tn-skill")  ?.addEventListener("click", () => this._openSkillModal());
    q("tn-smith")  ?.addEventListener("click", () => this._openSmithModal());
    q("tn-inn")    ?.addEventListener("click", () => g.restAtInn());
    q("tn-bank")   ?.addEventListener("click", () => this._openBankScreen());
    q("tn-bond")   ?.addEventListener("click", () => g.showPartyStory());
    q("tn-save")   ?.addEventListener("click", () => this._openSaveScreen());

    // 퀘스트 모달 닫기
    q("bankClose")    ?.addEventListener("click", () => this._closeBankScreen());
    q("tnCloseQuest") ?.addEventListener("click", () => q("tnQuestModal")  ?.classList.add("hidden"));
    q("tnCloseSkill") ?.addEventListener("click", () => q("tnSkillModal")  && (q("tnSkillModal").style.display="none"));
    q("tnCloseSmith") ?.addEventListener("click", () => q("tnSmithModal")  && (q("tnSmithModal").style.display="none"));
    q("tnCloseParty") ?.addEventListener("click", () => q("tnPartyModal")  && (q("tnPartyModal").style.display="none"));

    // 스킬 탭
    q("tnTabActive") ?.addEventListener("click", () => this._switchSkillTab("active"));
    q("tnTabPassive")?.addEventListener("click", () => this._switchSkillTab("passive"));

    // 스킬 배우기
    q("tnLearnAtk") ?.addEventListener("click", () => { g.learnSkill("attackBoost");  this._refreshSkillModal(); });
    q("tnLearnHp")  ?.addEventListener("click", () => { g.learnSkill("hpBoost");      this._refreshSkillModal(); });
    q("tnLearnCrit")?.addEventListener("click", () => { g.learnSkill("criticalBoost");this._refreshSkillModal(); });
    q("tnLearnJob") ?.addEventListener("click", () => { g.learnJobSkill();             this._refreshSkillModal(); });

    // 상점 빌드
    this._buildShop();
  }

  render() {
  const p = this.game.player;
  if (!p) return;
  const q = id => document.getElementById(id);
  const setText = (id, val) => { const e = q(id); if(e) e.innerText = val; };

  // 골드
  const goldEl = q("townGold");
  if (goldEl) goldEl.innerText = `💰 ${p.money} G`;

  // 장비 (등급 색상 적용)
  const gradeColor = {
    normal:"#b8a888", uncommon:"#55cc55",
    rare:"#4898d8", epic:"#bb66ff", legend:"#d8a820"
  };
  const fmtEq = (item) => item
    ? `<span style="color:${gradeColor[item.class]||"#b8a888"}">+${item.enhance||0} ${item.name}</span>`
    : `<span style="color:#504040;">없음</span>`;

  const weaponEl = q("tnWeapon");
  const helmetEl = q("tnHelmet");
  const armorEl  = q("tnArmor");
  if (weaponEl) weaponEl.innerHTML = fmtEq(p.equipment.weapon);
  if (helmetEl) helmetEl.innerHTML = fmtEq(p.equipment.helmet);
  if (armorEl)  armorEl.innerHTML  = fmtEq(p.equipment.armor);

  // 퀘스트 (set → setText로 수정)
  if (p.quest) {
    setText("tnQuestTitle",  p.quest.title);
    setText("tnQuestProg",   `${p.questProgress} / ${p.quest.goal}마리`);
    setText("tnQuestReward", `보상: ${p.quest.rewardGold}G / ${p.quest.rewardExp}EXP`);
  } else {
    setText("tnQuestTitle","없음");
    setText("tnQuestProg","");
    setText("tnQuestReward","");
  }

  // 심연 버튼
  const abyssBtn = q("tn-abyss");
  if (abyssBtn) {
    abyssBtn.style.opacity     = p.abyssUnlocked ? "1" : "0.4";
    abyssBtn.textContent       = p.abyssUnlocked ? "⚫ 심연 던전" : "🔒 심연 던전";
    abyssBtn.style.borderColor = p.abyssUnlocked ? "#8844cc" : "";
    abyssBtn.title             = p.abyssUnlocked ? "" : "일반 던전 수호자를 처치하면 해금됩니다";
  }

  // 인벤토리
  this._renderInventory();
  // 마을 현황 & 은행 사이드바
  this._renderBankSidebar();
  this._updateTownBg();
}

 _renderInventory() {
  const p = this.game.player;
  const c = document.getElementById("tnInventory");
  if (!c) return;
  c.innerHTML = "";

  // ── 등급 색상 정의 ──
  const grade = {
    normal:   { color:"#b8a888" },
    uncommon: { color:"#55cc55" },
    rare:     { color:"#4898d8" },
    epic:     { color:"#bb66ff" },
    legend:   { color:"#d8a820" },
  };

  // ── fmtItem: 동료 장비 표시용 ──
  const fmtItem = (item) => item
    ? `<span style="color:${grade[item.class]?.color||"#b8a888"}">+${item.enhance||0} ${item.name}</span>`
    : `<span style="color:#504040;">없음</span>`;

  // ── 동료 장비 섹션 갱신 ──
  const compSection = document.getElementById("tnCompEquip");
  if (compSection) {
    if (p.party) {
      const mem = PARTY_MEMBERS[p.party];
      compSection.style.display = "block";
      document.getElementById("tnCompEquipName").textContent = `⚔ ${mem.name} 장착 장비`;
      document.getElementById("tnCompWeapon").innerHTML = fmtItem(p.partyEquipment.weapon);
      document.getElementById("tnCompHelmet").innerHTML = fmtItem(p.partyEquipment.helmet);
      document.getElementById("tnCompArmor").innerHTML  = fmtItem(p.partyEquipment.armor);
    } else {
      compSection.style.display = "none";
    }
  }

  // ── 인벤토리 비어있음 ──
  if (!p.inventory.length) {
    c.innerHTML = `<div style="font-size:.7rem;color:var(--text-dim);padding:8px 0;">인벤토리 비어있음</div>`;
    return;
  }

  // ── 인벤토리 목록 ──
  p.inventory.forEach((item, idx) => {
    const g   = grade[item.class] || grade.normal;
    const row = document.createElement("div");
    row.className = "inv-row";
    row.style.borderColor = g.color + "55";

    const stat = item.type === "weapon"
      ? `ATK+${item.attack}`
      : item.type === "potion"
        ? `회복`
        : `DEF+${item.defense}`;

    row.innerHTML = `
      <span style="width:6px;height:6px;border-radius:50%;background:${g.color};flex-shrink:0;display:inline-block;"></span>
      <span class="inv-name" style="color:${g.color};flex:1;font-size:.66rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        +${item.enhance||0} ${item.name}
        <span style="color:var(--text-dim);font-size:.6rem;">${stat}</span>
      </span>`;

    // 플레이어 장착
    if (item.type !== "potion") {
      const eq = document.createElement("button");
      eq.className = "inv-btn";
      eq.textContent = "장착";
      eq.title = "주인공 장착";
      eq.addEventListener("click", () => {
        this.game.itemManager.equip(this.game, idx, false);
        this.render();
      });
      row.appendChild(eq);

      // 동료 장착 (동료가 있을 때만)
      if (p.party) {
        const eqComp = document.createElement("button");
        eqComp.className = "inv-btn";
        eqComp.textContent = "동료";
        eqComp.title = "동료 장착";
        eqComp.style.cssText = "border-color:#4444cc;color:#8888ff;";
        eqComp.addEventListener("click", () => {
          this.game.itemManager.equip(this.game, idx, true);
          this.render();
        });
        row.appendChild(eqComp);
      }
    }

    // 삭제
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

    // 직업 전용 무기 라벨
    const CLASS_LABEL = { sword:"⚔ 기사 전용", staff:"🔮 마법사 전용", bow:"🏹 궁수 전용" };
    // 내 직업이 쓸 수 있는 weaponClass
    const myWeaponClass = { night:"sword", mage:"staff", archer:"bow" }[this.game.player?.type];

    SHOP_ITEMS.forEach((item, idx) => {
      const btn = document.createElement("button");

      // 직업 전용 무기이면서 내 직업과 안 맞으면 비활성화 스타일
      const isWrongClass = item.weaponClass && item.weaponClass !== myWeaponClass;
      btn.className = `shop-btn ${item.class}${isWrongClass ? " shop-btn-disabled" : ""}`;
      btn.title = isWrongClass ? `${CLASS_LABEL[item.weaponClass]} — 장착 불가` : "";

      // 스탯 미리보기
      const statStr = item.type === "weapon" ? `ATK+${item.attack}`
                    : item.type === "potion"  ? `HP+${item.heal}`
                    :                           `DEF+${item.defense}`;
      // 직업 배지 (전용 무기만 표시)
      const classBadge = item.weaponClass
        ? `<span class="shop-class-badge ${isWrongClass ? "wrong" : "ok"}">${CLASS_LABEL[item.weaponClass]}</span>`
        : "";

      btn.innerHTML = `
        <span class="item-name">${item.name}</span>
        ${classBadge}
        <span class="item-stat">${statStr}</span>
        <span class="item-cost">${item.cost}G</span>`;
      btn.addEventListener("click", () => { this.game.itemManager.buyShop(this.game, idx); this.render(); });
      c.appendChild(btn);
    });
  }

  // ── 퀘스트 게시판 ───────────────────────────────
  _openQuestModal() {
    const modal = document.getElementById("tnQuestModal");
    const list  = document.getElementById("tnQuestList");
    if (!modal || !list) return;

    const p = this.game.player;
    const available = this.game.questManager.getAvailable(p);
    const shuffled  = [...available].sort(() => Math.random() - 0.5).slice(0, 4);

    list.innerHTML = "";

    // 진행 중 퀘스트
    if (p.quest) {
      const pct = this.game.questManager.getProgressPct(p);
      list.innerHTML += `
        <div class="quest-card active-quest">
          <div class="quest-badge">진행 중</div>
          <h3>${p.quest.title}</h3>
          <p>📍 ${p.quest.target} ${p.questProgress}/${p.quest.goal}</p>
          <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        </div>`;
    }

    shuffled.forEach(q => {
      const card = document.createElement("div");
      card.className = "quest-card";
      card.innerHTML = `
        <h3>${q.title}</h3>
        <p>📍 ${q.target} ${q.goal}마리</p>
        <p>🎁 ${q.rewardGold}G / ${q.rewardExp}EXP</p>
        <button class="quest-accept-btn">✅ 수락</button>`;
      card.querySelector("button").addEventListener("click", () => {
        if (this.game.questManager.accept(this.game, q.id)) {
          modal.classList.add("hidden");
          this.render();
          this.game.goToDungeon("normal"); // 퀘스트 수락 후 바로 던전
        }
      });
      list.appendChild(card);
    });

    if (!shuffled.length && !p.quest)
      list.innerHTML += `<p style="color:var(--text-dim);text-align:center;font-size:.8rem;">조건에 맞는 퀘스트 없음</p>`;

    modal.classList.remove("hidden");
  }

  // ── 스킬 모달 ───────────────────────────────────
  _openSkillModal() {
    const p = this.game.player;
    const q = id => document.getElementById(id);
    const s = (id, v) => { const e = q(id); if(e) e.innerText = v; };

    s("tnSP",     p.skillPoints);
    s("tnAtkLv",  p.skills.attackBoost);
    s("tnHpLv",   p.skills.hpBoost);
    s("tnCritLv", p.skills.criticalBoost);
    s("tnJobSkillName", { warrior:"⚔ 회전베기", mage:"🔮 매직볼", archer:"🏹 속사" }[p.type]);

    const modal = q("tnSkillModal");
    if (modal) modal.style.display = "flex";

    this._renderPassiveSkills();
    this._switchSkillTab("active");
  }

  _refreshSkillModal() {
    const p = this.game.player;
    const s = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    s("tnSP", p.skillPoints); s("tnAtkLv", p.skills.attackBoost);
    s("tnHpLv", p.skills.hpBoost); s("tnCritLv", p.skills.criticalBoost);
    this._renderPassiveSkills();
    this.render();
  }

  _switchSkillTab(tab) {
    const act = document.getElementById("tnActiveSkills");
    const pas = document.getElementById("tnPassiveSkills");
    const tA  = document.getElementById("tnTabActive");
    const tP  = document.getElementById("tnTabPassive");
    if (act) act.style.display = tab === "active"  ? "block" : "none";
    if (pas) pas.style.display = tab === "passive" ? "block" : "none";
    tA?.classList.toggle("active", tab === "active");
    tP?.classList.toggle("active", tab === "passive");
  }

  _renderPassiveSkills() {
    const el = document.getElementById("tnPassiveSkills");
    if (!el) return;
    const p = this.game.player;
    const allPassives = {
      warrior: [
        { id:"iron_body", name:"🛡 철갑 몸",     desc:["DEF+5","DEF+12","DEF+22"],           spCost:[2,3,4] },
        { id:"war_cry",   name:"📣 전쟁의 함성", desc:["적ATK-10%","적ATK-18%","적ATK-28%"], spCost:[2,3,4] },
        { id:"berserker", name:"😤 광전사",       desc:["HP30%↓ATK+20%","HP40%↓ATK+35%","HP50%↓ATK+50%"], spCost:[3,4,5] },
      ],
      mage: [
        { id:"mana_surge",  name:"💥 마나 폭발",  desc:["크리DMG+20%","크리DMG+40%","크리DMG+65%"], spCost:[2,3,4] },
        { id:"spell_echo",  name:"🔮 마법 반향",  desc:["25%추가15","30%추가30","40%추가50"],       spCost:[2,3,4] },
        { id:"arcane_ward", name:"🌀 비전 보호막",desc:["받는피해-8%","-15%","-22%"],               spCost:[2,3,4] },
      ],
      archer: [
        { id:"eagle_eye",   name:"🦅 매의 눈",   desc:["크리+8%","+16%","+26%"],               spCost:[2,3,4] },
        { id:"swift_feet",  name:"💨 신속",       desc:["회피-10%(20%)","-15%(30%)","-20%(40%)"],spCost:[2,3,4] },
        { id:"poison_tip",  name:"☠ 독 화살촉",  desc:["독+1턴","독+2턴","독+3턴"],            spCost:[2,3,4] },
      ],
    };
    const jobSkills = allPassives[p.type] || [];
    el.innerHTML = "";
    jobSkills.forEach(skill => {
      const curLv  = (p.passiveSkills||{})[skill.id] || 0;
      const maxLv  = skill.spCost.length;
      const isMax  = curLv >= maxLv;
      const cost   = isMax ? 0 : skill.spCost[curLv];
      const canLearn = !isMax && p.skillPoints >= cost;

      const row = document.createElement("div");
      row.className = "passive-skill-row";
      row.innerHTML = `
        <div class="passive-header">
          <span class="passive-name">${skill.name}</span>
          <span class="passive-level" style="color:${isMax?"var(--gold)":"var(--text-dim)"}">Lv.${curLv}/${maxLv}</span>
        </div>
        <div class="passive-desc">${isMax?"✨ MAX":`다음: ${skill.desc[curLv]}`}</div>
        <button class="passive-learn-btn ${canLearn?"":"disabled"}" ${!canLearn?"disabled":""}>
          ${isMax?"MAX":`습득 (SP${cost})`}
        </button>`;
      row.querySelector("button").addEventListener("click", () => {
        if (!canLearn) return;
        this.game.learnPassive(skill.id, jobSkills);
        this._refreshSkillModal();
      });
      el.appendChild(row);
    });
  }

  // ── 대장간 모달 ─────────────────────────────────
  _openSmithModal() {
    const p = this.game.player;
    const q = id => document.getElementById(id);
    const gEl = q("tnSmithGold"); if (gEl) gEl.innerText = p.money;
    const modal = q("tnSmithModal");
    if (modal) modal.style.display = "flex";

    const BLACKSMITH_WEAPONS = [
      { name:"기사의 검",   type:"weapon", weaponClass:"sword", attack:40, defense:0, cost:500, class:"rare",  enhance:0 },
      { name:"엘프의 활",   type:"weapon", weaponClass:"bow",   attack:38, defense:0, cost:500, class:"rare",  enhance:0 },
      { name:"현자의 지팡이",type:"weapon",weaponClass:"staff", attack:42, defense:0, cost:500, class:"rare",  enhance:0 },
    ];

    const buyEl = q("tnSmithBuy");
    if (buyEl) {
      buyEl.innerHTML = "";
      BLACKSMITH_WEAPONS.forEach(w => {
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.textContent = `${w.name} ${w.cost}G`;
        btn.addEventListener("click", () => {
          if (p.money < w.cost) { this.game.log("💰 골드 부족"); return; }
          p.money -= w.cost;
          this.game.itemManager.add(this.game, { ...w, itemId: createItemId() });
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
          this._openSmithModal(); // 갱신
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

  // ╔══════════════════════════════════════════════════════════╗
  // ║            은행 / 투자 시스템                             ║
  // ╚══════════════════════════════════════════════════════════╝

  _openBankScreen() {
    const el = document.getElementById("bankScreen");
    if (!el) return;
    el.style.display = "flex";
    this._switchBankTab("deposit");
    this._refreshBankScreen();
    window._townScene = this;
    if (window.audioMgr) audioMgr.playBgm?.("shop");
  }

  _closeBankScreen() {
    const el = document.getElementById("bankScreen");
    if (el) el.style.display = "none";
    if (window.audioMgr) audioMgr.playBgm?.("town");
    this.render();
  }

  _switchBankTab(tab) {
    const dP = document.getElementById("bankDepositPane");
    const iP = document.getElementById("bankInvestPane");
    const dB = document.getElementById("bankTabDeposit");
    const iB = document.getElementById("bankTabInvest");
    if (dP) dP.style.display = tab === "deposit" ? "block" : "none";
    if (iP) iP.style.display = tab === "invest"  ? "block" : "none";
    dB?.classList.toggle("bank-tab-active", tab === "deposit");
    iB?.classList.toggle("bank-tab-active", tab === "invest");
    this._refreshBankScreen();
  }

  _refreshBankScreen() {
    const p = this.game.player;
    const b = p.bank || { deposit:0, interest:0, totalInvested:0, milestones:[] };
    const setText = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };

    setText("bankGoldDisplay",  `${p.money} G`);
    setText("bankDepositAmt",   `${b.deposit} G`);
    setText("bankInterestAmt",  `${b.interest} G`);

    // 투자 탭
    const stage = getTownStage(b.totalInvested);
    setText("bankStageIcon", stage.icon);
    setText("bankStageName", stage.name);
    setText("bankStageDesc", stage.desc);
    setText("bankTotalInvested", `${b.totalInvested}G`);
    const stageCard = document.getElementById("bankCurrentStage");
    if (stageCard) stageCard.style.borderColor = stage.color;

    // 단계별 진행 바
    const list = document.getElementById("bankStageList");
    if (!list) return;
    list.innerHTML = "";
    TOWN_STAGES.forEach((s2, i) => {
      if (i === 0) return;
      const achieved = b.totalInvested >= s2.minInvest;
      const prevMin  = TOWN_STAGES[i-1].minInvest;
      const pct = achieved ? 100 : Math.floor(Math.max(0, b.totalInvested - prevMin) / (s2.minInvest - prevMin) * 100);
      const row = document.createElement("div");
      row.style.cssText = `background:rgba(255,255,255,.03);border:1px solid ${achieved?"#44aa44":"#2e1e24"};border-radius:6px;padding:14px 16px;`;
      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">${s2.icon}</span>
            <div>
              <div style="font-size:.85rem;font-weight:700;color:${achieved?s2.color:"var(--text)"};">${s2.name}</div>
              <div style="font-size:.65rem;color:var(--text-dim);">${s2.desc}</div>
            </div>
          </div>
          ${achieved ? '<span style="color:#44cc44;font-size:.8rem;font-weight:700;">✅ 달성!</span>'
            : `<span style="font-size:.72rem;color:var(--text-dim);">${b.totalInvested}/${s2.minInvest}G</span>`}
        </div>
        <div style="height:10px;background:#180a0c;border-radius:5px;overflow:hidden;">
          <div style="height:100%;border-radius:5px;width:${pct}%;transition:width .6s;background:${
            achieved?`linear-gradient(90deg,${s2.color}88,${s2.color})`:`linear-gradient(90deg,#442200,${s2.color}88)`};"></div>
        </div>
        <div style="font-size:.68rem;color:var(--text-dim);margin-top:6px;">
          보상: <span style="color:#88ddff;">${i===1?"공격력 +5":i===2?"공격력 +10, HP +50":"공격력 +20, HP +100"}</span>
        </div>`;
      list.appendChild(row);
    });
  }

  // ── 예금 / 출금 ─────────────────────────────────
  _depositGold(amount) {
    const p = this.game.player;
    const actual = Math.min(amount, p.money);
    if (actual <= 0) { this.game.log("💰 골드가 부족합니다."); return; }
    p.money -= actual;
    p.bank.deposit += actual;
    this.game.log(`🏦 ${actual}G 예금! (잔고: ${p.bank.deposit}G)`);
    this._refreshBankScreen();
    this.render();
  }
  _depositAll() { this._depositGold(this.game.player.money); }

  _withdrawGold(amount) {
    const p = this.game.player, b = p.bank;
    const total  = b.deposit + b.interest;
    const actual = Math.min(amount, total);
    if (actual <= 0) { this.game.log("🏦 출금할 잔고가 없습니다."); return; }
    const fi = Math.min(actual, b.interest);
    b.interest -= fi;
    b.deposit  -= (actual - fi);
    p.money += actual;
    this.game.log(`🏦 ${actual}G 출금!`);
    this._refreshBankScreen();
    this.render();
  }
  _withdrawAll() {
    const b = this.game.player.bank;
    this._withdrawGold(b.deposit + b.interest);
  }

  // ── 마을 투자 ───────────────────────────────────
  _investTown(amount) {
    const p = this.game.player, b = p.bank;
    if (!b) return;
    const actual = Math.min(amount, p.money);
    if (actual <= 0) { this.game.log("💰 골드가 부족합니다."); return; }
    const prev = getTownStage(b.totalInvested);
    p.money -= actual;
    b.totalInvested += actual;
    const next = getTownStage(b.totalInvested);
    this.game.log(`🏗 ${actual}G 투자! (누적: ${b.totalInvested}G)`);

    if (next.level > prev.level) {
      this.game.showNarrative(`🎉 마을이 발전했습니다!\n\n${next.icon} ${next.name}\n\n${next.desc}`, 4000);
      if (window.audioMgr) audioMgr.playSfx?.("levelup");
    }

    INVEST_REWARDS.forEach(r => {
      if (b.totalInvested >= r.minInvest && !(b.milestones||[]).includes(r.minInvest)) {
        if (!b.milestones) b.milestones = [];
        b.milestones.push(r.minInvest);
        if (r.atkBonus) p.bonusAttack = (p.bonusAttack || 0) + r.atkBonus;
        if (r.hpBonus) {
          p.maxHp += r.hpBonus;
          p.hp = Math.min(p.hp + r.hpBonus, p.maxHp);
        }
        this.game.log(`🎁 투자 보상! ${r.msg}`);
      }
    });

    this._refreshBankScreen();
    this._updateTownBg();
    this.render();
  }
  _investAll() { this._investTown(this.game.player.money); }

  // ── 마을 배경 & 사이드바 업데이트 ──────────────
  _updateTownBg() {
    const stage = getTownStage(this.game.player.bank?.totalInvested || 0);
    const bgEl  = document.getElementById("townBgImg");
    if (bgEl && !bgEl.src.includes(stage.bg.split("/").pop())) bgEl.src = stage.bg;
    const header = document.getElementById("townHeaderTitle");
    if (header) header.innerText = `${stage.icon} ${stage.name} — 평화의 마을`;
  }

  _renderBankSidebar() {
    const p    = this.game.player;
    const bank = p.bank || { totalInvested:0, deposit:0, interest:0 };
    const setText = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    const stage = getTownStage(bank.totalInvested);
    const nxt   = getNextStage(bank.totalInvested);
    setText("tnTownStageName", `${stage.icon} ${stage.name}`);
    setText("tnTownInvested",  `투자: ${bank.totalInvested}G`);
    if (nxt) {
      setText("tnTownNextGoal", `다음: ${nxt.name} (${nxt.minInvest - bank.totalInvested}G 남음)`);
      const prevMin = TOWN_STAGES[stage.level].minInvest;
      const pct = Math.floor((bank.totalInvested - prevMin) / (nxt.minInvest - prevMin) * 100);
      const bar = document.getElementById("tnTownBar");
      if (bar) bar.style.width = `${pct}%`;
    } else {
      setText("tnTownNextGoal", "✅ 최고 단계!");
      const bar = document.getElementById("tnTownBar");
      if (bar) bar.style.width = "100%";
    }
    setText("tnSideDeposit",  `예금: ${bank.deposit}G`);
    setText("tnSideInterest", `이자: ${bank.interest}G`);
  }

  // ╔══════════════════════════════════════════════════════════╗
  // ║      JRPG 스타일 저장/불러오기 시스템                     ║
  // ╚══════════════════════════════════════════════════════════╝

  // 포트레이트 이미지 경로
  _getPortrait(type) {
    return {
      knight:   "images/portrait_Knight.png",
      night:    "images/portrait_Knight.png",
      warrior:  "images/portrait_Knight.png",
      mage:     "images/portrait_magician.png",
      magician: "images/portrait_magician.png",
      archer:   "images/portrait_archer.png",
    }[type] || "images/portrait_Knight.png";
  }

  _getPartyPortrait(party) {
    return {
      healer:     "images/sd_healer.png",
      tanker:     "images/portrait_tanker.png",
      mage_party: "images/portrait_magician.png",
      archer:     "images/portrait_archer.png",
    }[party] || null;
  }

  _formatSaveTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  _getProgressLabel(sp) {
    if (!sp) return "";
    if (sp.abyssUnlocked) return "⚫ 심연 해금";
    if (sp.guardianDefeated) return "🏆 수호자 처치";
    return `🗡 Lv.${sp.level || 1}`;
  }

  _getClassLabel(type) {
    return { knight:"기사", night:"기사", warrior:"기사", mage:"마법사", magician:"마법사", archer:"궁수" }[type] || type;
  }

  _getClassIcon(type) {
    return { knight:"⚔", night:"⚔", warrior:"⚔", mage:"🔮", magician:"🔮", archer:"🏹" }[type] || "⚔";
  }

  // ── 저장 화면 열기 ────────────────────────────────
  _openSaveScreen() {
    // 기존 화면 제거
    document.getElementById("rpgSaveScreen")?.remove();

    const screen = document.createElement("div");
    screen.id = "rpgSaveScreen";
    screen.style.cssText = `
      position:fixed;inset:0;z-index:800;
      background:rgba(0,0,0,0.92);
      display:flex;flex-direction:column;align-items:center;
      font-family:'Noto Serif KR',serif;overflow-y:auto;`;

    screen.innerHTML = `
      <!-- 헤더 -->
      <div style="width:100%;max-width:640px;display:flex;align-items:center;
        justify-content:space-between;padding:18px 20px;
        border-bottom:2px solid #4a3a2a;flex-shrink:0;">
        <div style="font-size:1rem;font-weight:700;color:#d8c8b0;letter-spacing:.08em;">
          ⚙ 데이터를 선택하십시오.
        </div>
        <button id="rpgSaveClose" style="background:transparent;border:1px solid #5a4a3a;
          color:#9a8a7a;padding:6px 16px;cursor:pointer;font-family:inherit;
          font-size:.82rem;border-radius:3px;">✕ 닫기</button>
      </div>

      <!-- 탭 -->
      <div style="width:100%;max-width:640px;display:flex;gap:0;
        border-bottom:1px solid #3a2a1a;flex-shrink:0;">
        <button id="rpgTabSave" style="flex:1;padding:12px;background:#1a1410;
          border:none;border-bottom:3px solid #c8a830;color:#d8c830;
          cursor:pointer;font-family:inherit;font-size:.88rem;font-weight:700;">
          💾 저장하기
        </button>
        <button id="rpgTabLoad" style="flex:1;padding:12px;background:transparent;
          border:none;border-bottom:3px solid transparent;color:#6a5a4a;
          cursor:pointer;font-family:inherit;font-size:.88rem;font-weight:700;">
          📂 불러오기
        </button>
      </div>

      <!-- 슬롯 목록 -->
      <div id="rpgSaveSlots" style="width:100%;max-width:640px;padding:16px 12px;
        display:flex;flex-direction:column;gap:8px;"></div>
    `;

    document.body.appendChild(screen);
    window._saveScreenMode = "save";

    screen.querySelector("#rpgSaveClose").onclick = () => screen.remove();
    screen.querySelector("#rpgTabSave").onclick  = () => this._switchSaveScreenTab("save", screen);
    screen.querySelector("#rpgTabLoad").onclick  = () => this._switchSaveScreenTab("load", screen);

    this._renderSaveScreenSlots("save", screen);
  }

  _switchSaveScreenTab(mode, screen) {
    window._saveScreenMode = mode;
    const tS = screen.querySelector("#rpgTabSave");
    const tL = screen.querySelector("#rpgTabLoad");
    if (tS) {
      tS.style.background      = mode === "save" ? "#1a1410" : "transparent";
      tS.style.borderBottomColor= mode === "save" ? "#c8a830" : "transparent";
      tS.style.color            = mode === "save" ? "#d8c830" : "#6a5a4a";
    }
    if (tL) {
      tL.style.background      = mode === "load" ? "#1a1410" : "transparent";
      tL.style.borderBottomColor= mode === "load" ? "#88aaff" : "transparent";
      tL.style.color            = mode === "load" ? "#88ccff" : "#6a5a4a";
    }
    this._renderSaveScreenSlots(mode, screen);
  }

  _renderSaveScreenSlots(mode, screen) {
    const container = screen.querySelector("#rpgSaveSlots");
    if (!container) return;
    container.innerHTML = "";

    const sm    = this.game.saveManager;
    const slots = sm.getAllSlots ? sm.getAllSlots() : [];

    slots.forEach((slot, i) => {
      const card = document.createElement("div");

      if (!slot.empty && slot.data?.player) {
        // ── 데이터 있는 슬롯 ──────────────────────────
        const sp   = slot.data.player;
        const isAbyss  = sp.abyssUnlocked;
        const isBoss   = sp.guardianDefeated;
        const bgColor  = isAbyss ? "#0a0a1a" : isBoss ? "#0a1a0a" : "#0e0c1a";
        const borderColor = isAbyss ? "#8844cc" : isBoss ? "#44aa44" : "#4a3a5a";
        const statusColor = isAbyss ? "#cc88ff" : isBoss ? "#88cc88" : "#aaaaff";
        const statusIcon  = isAbyss ? "🌌" : isBoss ? "✅" : "⚔";
        const statusText  = isAbyss ? "심연 해금 완료" : isBoss ? "수호자 처치 완료" : "진행 중";

        card.style.cssText = `
          background:${bgColor};border:1px solid ${borderColor};border-radius:4px;
          padding:0;overflow:hidden;transition:.15s;cursor:default;`;

        const portraitSrc     = this._getPortrait(sp.type);
        const partyPortrait   = sp.party ? this._getPartyPortrait(sp.party) : null;
        const classLabel      = this._getClassLabel(sp.type);
        const classIcon       = this._getClassIcon(sp.type);
        const partyMem        = sp.party && typeof PARTY_MEMBERS !== "undefined"
                                  ? PARTY_MEMBERS[sp.party] : null;
        const partyName       = partyMem ? partyMem.name : "";

        card.innerHTML = `
          <!-- 슬롯 번호 바 -->
          <div style="background:${borderColor}22;padding:4px 12px;
            display:flex;justify-content:space-between;align-items:center;
            border-bottom:1px solid ${borderColor}44;">
            <span style="font-size:.72rem;color:${statusColor};font-weight:700;">
              📁 저장 슬롯 ${i + 1}
            </span>
            <span style="font-size:.68rem;color:#6a6a8a;">${this._formatSaveTime(slot.data.savedAt)}</span>
          </div>

          <!-- 메인 콘텐츠 -->
          <div style="display:flex;align-items:center;gap:0;min-height:88px;">

            <!-- 왼쪽: 상태 아이콘 -->
            <div style="width:52px;display:flex;flex-direction:column;align-items:center;
              justify-content:center;padding:10px 6px;gap:4px;flex-shrink:0;
              border-right:1px solid ${borderColor}44;height:88px;">
              <div style="font-size:1.6rem;">${statusIcon}</div>
              <div style="font-size:.55rem;color:${statusColor};text-align:center;line-height:1.3;">${statusText}</div>
            </div>

            <!-- 중앙: 캐릭터 정보 -->
            <div style="flex:1;padding:10px 12px;">
              <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
                <span style="font-size:1.1rem;">${classIcon}</span>
                <span style="font-size:.95rem;font-weight:700;color:#e8d8b0;">${sp.name || classLabel}</span>
                <span style="font-size:.7rem;color:#8a7a6a;margin-left:2px;">(${classLabel})</span>
              </div>
              <div style="display:flex;gap:14px;margin-bottom:5px;">
                <span style="font-size:.78rem;color:#c8b880;font-weight:700;">Lv.${sp.level || 1}</span>
                <span style="font-size:.75rem;color:#88bb88;">💰 ${sp.money || 0}G</span>
                <span style="font-size:.75rem;color:#8888cc;">❤ ${sp.hp}/${sp.maxHp}</span>
              </div>
              ${partyName ? `<div style="font-size:.68rem;color:#9988cc;">👥 ${partyName} 동행중</div>` : ""}
            </div>

            <!-- 오른쪽: 포트레이트 -->
            <div style="display:flex;align-items:flex-end;gap:-8px;padding:6px 10px;flex-shrink:0;">
              <img src="${portraitSrc}"
                style="width:60px;height:70px;object-fit:cover;border-radius:4px;
                border:2px solid ${borderColor};image-rendering:auto;"
                onerror="this.style.display='none'"/>
              ${partyPortrait ? `
                <img src="${partyPortrait}"
                  style="width:44px;height:52px;object-fit:cover;border-radius:4px;
                  border:2px solid #3a2a4a;margin-left:-10px;margin-bottom:-6px;
                  image-rendering:auto;"
                  onerror="this.style.display='none'"/>` : ""}
            </div>
          </div>

          <!-- 버튼 바 -->
          <div style="display:flex;gap:0;border-top:1px solid ${borderColor}44;">
            ${mode === "save" ? `
              <button class="_saveSlotBtn" data-idx="${i}"
                style="flex:1;padding:8px;background:rgba(200,168,48,.08);border:none;
                border-right:1px solid ${borderColor}44;color:#c8a830;cursor:pointer;
                font-family:inherit;font-size:.78rem;font-weight:700;transition:.15s;"
                onmouseover="this.style.background='rgba(200,168,48,.18)'"
                onmouseout="this.style.background='rgba(200,168,48,.08)'">
                💾 덮어쓰기
              </button>
            ` : `
              <button class="_loadSlotBtn" data-idx="${i}"
                style="flex:1;padding:8px;background:rgba(100,150,255,.08);border:none;
                border-right:1px solid ${borderColor}44;color:#88aaff;cursor:pointer;
                font-family:inherit;font-size:.78rem;font-weight:700;transition:.15s;"
                onmouseover="this.style.background='rgba(100,150,255,.18)'"
                onmouseout="this.style.background='rgba(100,150,255,.08)'">
                📂 불러오기
              </button>
            `}
            <button class="_deleteSlotBtn" data-idx="${i}"
              style="padding:8px 16px;background:transparent;border:none;
              color:#8a4a4a;cursor:pointer;font-family:inherit;font-size:.75rem;
              transition:.15s;"
              onmouseover="this.style.color='#cc6666'"
              onmouseout="this.style.color='#8a4a4a'">
              🗑
            </button>
          </div>`;

      } else {
        // ── 빈 슬롯 ─────────────────────────────────
        card.style.cssText = `
          background:#0c0a10;border:1px dashed #3a2a4a;border-radius:4px;
          min-height:96px;display:flex;align-items:center;justify-content:space-between;
          padding:16px 20px;transition:.15s;`;

        card.innerHTML = `
          <div>
            <div style="font-size:.8rem;color:#4a3a6a;font-weight:700;margin-bottom:6px;">
              📁 저장 슬롯 ${i + 1}
            </div>
            <div style="font-size:.7rem;color:#3a2a5a;">— 비어있음 —</div>
          </div>
          ${mode === "save" ? `
            <button class="_saveSlotBtn" data-idx="${i}"
              style="background:#1a1020;border:1px solid #c8a830;color:#d8b830;
              padding:10px 20px;cursor:pointer;font-family:inherit;font-size:.82rem;
              border-radius:3px;font-weight:700;flex-shrink:0;transition:.15s;"
              onmouseover="this.style.background='#2a2030'"
              onmouseout="this.style.background='#1a1020'">
              💾 새로 저장
            </button>` : `
            <div style="font-size:.7rem;color:#3a2a5a;padding:8px 16px;">저장 없음</div>`}
        `;
      }

      container.appendChild(card);
    });

    // 버튼 이벤트 바인딩
    container.querySelectorAll("._saveSlotBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        this._doSaveSlot(idx, screen);
      });
    });
    container.querySelectorAll("._loadSlotBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        this._doLoadSlot(idx, screen);
      });
    });
    container.querySelectorAll("._deleteSlotBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        this._doDeleteSlot(idx, mode, screen);
      });
    });
  }

  _doSaveSlot(slotIndex, screen) {
    const ok = this.game.saveManager.save(this.game, slotIndex);
    if (ok) {
      this._flashMsg(screen, `✅ 슬롯 ${slotIndex + 1}에 저장 완료!`, "#44cc44");
      setTimeout(() => {
        this._renderSaveScreenSlots(window._saveScreenMode || "save", screen);
      }, 600);
    } else {
      this._flashMsg(screen, "⚠ 저장 실패", "#cc4444");
    }
  }

  _doLoadSlot(slotIndex, screen) {
    const data = this.game.saveManager.load(slotIndex);
    if (!data) { this._flashMsg(screen, "⚠ 데이터 없음", "#cc4444"); return; }
    const player = this.game.saveManager.hydrate(data.player);
    if (!player) { this._flashMsg(screen, "⚠ 데이터 손상", "#cc4444"); return; }
    this.game.player = player;
    screen.remove();
    this.game._toTown();
    this.game.log(`💾 슬롯 ${slotIndex + 1} 불러오기 완료! Lv.${player.level}`);
  }

  _doDeleteSlot(slotIndex, mode, screen) {
    this.game.saveManager.deleteSlot(slotIndex);
    this._flashMsg(screen, `🗑 슬롯 ${slotIndex + 1} 삭제됨`, "#aa8866");
    setTimeout(() => {
      this._renderSaveScreenSlots(mode, screen);
    }, 600);
  }

  _flashMsg(screen, msg, color = "#d8c830") {
    const old = screen.querySelector(".rpgFlashMsg");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "rpgFlashMsg";
    el.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      background:#0c0a10;border:1px solid ${color};border-radius:6px;
      padding:10px 24px;color:${color};font-size:.85rem;font-weight:700;
      font-family:'Noto Serif KR',serif;z-index:900;pointer-events:none;
      animation:saveFlash .3s ease;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  _openPartyModal() {
    const modal = document.getElementById("tnPartyModal");
    const cards = document.getElementById("tnPartyCards");
    if (!modal || !cards) return;

    cards.innerHTML = "";
    Object.entries(PARTY_MEMBERS).forEach(([key, mem]) => {
      const btn = document.createElement("button");
      btn.className = "class-card";
      btn.innerHTML = `
        <div class="class-icon">${mem.icon}</div>
        <div class="class-name">${mem.name} (${mem.className})</div>
        <div class="class-desc">HP ${mem.hp} / ATK ${mem.attack} / DEF ${mem.defense}</div>`;
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
