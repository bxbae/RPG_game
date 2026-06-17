// ═══════════════════════════════════════════════════
//  town-scene.js  — 마을 화면
// ═══════════════════════════════════════════════════
"use strict";

// ── 마을 4단계 ───────────────────────────────────
const TOWN_STAGES = [
  { level:0, name:"폐허",   minInvest:0,    bg:"images/town_bustling.png",       color:"#8B4513", icon:"💀" },
  { level:1, name:"공사중", minInvest:500,  bg:"images/town_construction_2.png",  color:"#CD853F", icon:"🏗"  },
  { level:2, name:"번화가", minInvest:2000, bg:"images/town_construction_2.png",  color:"#4CAF50", icon:"🏘"  },
  { level:3, name:"번영",   minInvest:5000, bg:"images/festival_2.png",           color:"#FFD700", icon:"🌟" },
];
const INVEST_REWARDS = [
  { minInvest:500,  atkBonus:5,  hpBonus:0,   msg:"공격력 +5" },
  { minInvest:2000, atkBonus:10, hpBonus:50,  msg:"공격력 +10, HP +50" },
  { minInvest:5000, atkBonus:20, hpBonus:100, msg:"공격력 +20, HP +100" },
];
const INTEREST_RATE = 0.05;
function getTownStage(inv) { let s=TOWN_STAGES[0]; for(const t of TOWN_STAGES){if(inv>=t.minInvest)s=t;} return s; }
function getNextStage(inv) { return TOWN_STAGES.find(s=>s.minInvest>inv)||null; }
function applyBattleInterest(player) {
  const b=player.bank; if(!b||b.deposit<=0)return 0;
  const i=Math.floor(b.deposit*INTEREST_RATE); if(i>0)b.interest=(b.interest||0)+i; return i;
}


class TownScene {
  constructor(game) {
    this.game = game;
    if (!game.player.bank)
      game.player.bank = { deposit:0, interest:0, totalInvested:0, milestones:[] };
  }

  mount(container) {
    container.innerHTML = this._buildHTML();
    this._injectLayoutCSS();
    this._bindEvents();
    this.render();
    const fromBattle  = this.game._returnedFromBattle;
    const fromFlee    = this.game._returnedFromFlee;
    const levelDlg    = this.game._pendingLevelUpDialogue;
    const questDlg    = this.game._pendingQuestCompleteDlg;
    this.game._returnedFromBattle      = false;
    this.game._returnedFromFlee        = false;
    this.game._pendingLevelUpDialogue  = null;
    this.game._pendingQuestCompleteDlg = null;

    setTimeout(() => {
      // ── 첫 마을 입장 오프닝 스토리 체인 ──
      // 주인공 독백 → 상인 → 주인공 독백 → 공주 → 주인공 독백 → 동료 모집 자동 오픈
      if (!this.game.player.introChainDone && !fromBattle && !fromFlee) {
        this.game.player.introChainDone = true;
        this._playIntroChain();
        return;
      }

      // ① 상인 귀환 대사
      if (fromFlee)        this.showNpcDialogue("merchant_after_flee");
      else if (fromBattle) this.showNpcDialogue("merchant_after_battle");
      else                 this.showNpcDialogue("merchant");

      // ② 퀘스트 완료 → 의뢰인 보상 대사
      if (questDlg) {
        const waitMerchant = setInterval(() => {
          if (!document.getElementById("npcDialogueBox")) {
            clearInterval(waitMerchant);
            setTimeout(() => this.showNpcDialogue(questDlg), 500);
          }
        }, 400);
      }
      // ③ 레벨업 동료 반응 (퀘스트 완료 대화 이후)
      else if (levelDlg && this.game.player?.party) {
        const waitMerchant = setInterval(() => {
          if (!document.getElementById("npcDialogueBox")) {
            clearInterval(waitMerchant);
            const npcId = `${levelDlg}_${this.game.player.party}`;
            setTimeout(() => this.showNpcDialogue(npcId), 500);
          }
        }, 400);
      }
    }, 600);
  }

  // ── 첫 마을 입장 오프닝 스토리 체인 ──────────────────
  _playIntroChain() {
    const p = this.game.player;

    // ① 주인공 독백: 마을 상태를 보고 받은 첫 인상
    this._showSelfDialogue("self_intro_town", [
      "...성 안 내부가 공격을 받았나봐.",
      "여기저기 무너진 건물들과 불안에 떠는 사람들이 보이는군.",
      "일단 상황을 좀 알아봐야겠다.",
    ], () => {
      // ② 상인 대화 (기존 첫 입장 대사 재사용)
      this.showNpcDialogue("merchant");
      const waitMerchant = setInterval(() => {
        if (!document.getElementById("npcDialogueBox")) {
          clearInterval(waitMerchant);

          // ③ 주인공 독백: 상인 말에 대한 반응
          setTimeout(() => {
            this._showSelfDialogue("self_after_merchant", [
              "네, 알겠습니다. 그럼 공주님과 대화를 해볼게요!",
              "공주님이라면 이 마을의 사정을 더 잘 알고 계시겠지.",
            ], () => {
              // ④ 공주(이장) 첫 만남 대화
              p.metVillageChief = true;
              this.showNpcDialogue("village_chief");
              const waitPrincess = setInterval(() => {
                if (!document.getElementById("npcDialogueBox")) {
                  clearInterval(waitPrincess);

                  // ⑤ 주인공 독백: 동료 모집 결심
                  setTimeout(() => {
                    this._showSelfDialogue("self_before_party", [
                      "그럼... 함께할 동료를 구해볼까?",
                      "혼자서는 마왕에게 닿을 수 없으니까. 듬직한 동료가 필요해.",
                    ], () => {
                      // ⑥ 동료 모집 버튼 자동 클릭
                      p.introPendingEquipPrompt = true; // 합류 대화 종료 후 장비 안내 트리거
                      setTimeout(() => this._openPartyModal(), 400);
                    });
                  }, 400);
                }
              }, 300);
            });
          }, 500);
        }
      }, 300);
    });
  }

  // ── 합류 직후 장비 안내 체인 ──────────────────────────
  _playEquipPromptChain() {
    this._showSelfDialogue("self_equip_prompt", [
      "이제 장비를 맞춘 다음, 성 밖에 마물부터 정리해보자.",
      "상점에서 쓸만한 무기와 방어구를 사서 미리 장착해두는 게 좋겠어.",
      "🛒 상점/인벤을 한번 둘러볼까.",
    ], () => {
      // 대화 종료 후 상점/인벤 오버레이 자동 오픈
      setTimeout(() => {
        const ov = document.getElementById("shopInvenOverlay");
        if (ov) {
          ov.style.display = "block";
          this._refreshShopOverlay();
          ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
          });
        }
      }, 300);
    });
  }

  _injectLayoutCSS() {
    if (document.getElementById("townNewLayoutCSS")) return;
    const s = document.createElement("style");
    s.id = "townNewLayoutCSS";
    const rules = [
      "#townRoot{display:flex;flex-direction:column;height:100%;min-height:100vh;background:#0a0508;overflow:hidden;}",
      "#townTopbar{display:flex;align-items:center;justify-content:space-between;padding:6px 16px;background:rgba(10,3,15,.95);border-bottom:1px solid #3a1828;flex-shrink:0;flex-wrap:wrap;gap:6px;}",
      ".tt-left{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}",
      ".tt-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}",
      ".tt-title{font-size:.9rem;font-weight:700;color:var(--gold2);letter-spacing:.08em;}",
      ".tt-gold{font-size:.82rem;color:#ffdd77;font-weight:700;}",
      ".tt-chip{font-size:.7rem;color:var(--text-dim);}",
      ".tt-chip span{color:var(--gold2);font-weight:700;}",
      "#townNavbar{display:flex;flex-wrap:wrap;gap:4px;padding:7px 12px;background:rgba(8,2,12,.9);border-bottom:1px solid #2a1020;flex-shrink:0;align-items:center;}",
      ".tn-navbtn{background:rgba(30,10,40,.7);border:1px solid #3a1830;color:var(--text);padding:5px 11px;cursor:pointer;font-family:inherit;font-size:.76rem;font-weight:600;border-radius:3px;transition:.15s;white-space:nowrap;}",
      ".tn-navbtn:hover{background:rgba(80,20,60,.8);border-color:#aa5566;color:#fff;}",
      ".tn-dungeon{border-color:#4a3020!important;color:#cc9966!important;}",
      ".tn-dungeon:hover{border-color:#cc7733!important;color:#ffcc88!important;}",
      ".tn-gold{border-color:#FFD700!important;color:#FFD700!important;}",
      ".tn-gold:hover{background:rgba(255,215,0,.12)!important;}",
      ".tn-blue{border-color:#88aaff!important;color:#88aaff!important;}",
      ".tn-blue:hover{background:rgba(100,130,255,.1)!important;}",
      ".tn-divider{width:1px;height:22px;background:#2a1020;margin:0 3px;flex-shrink:0;}",
      "#townMain{flex:1;position:relative;overflow:hidden;}",
      ".town-bg-full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;filter:brightness(.75);z-index:0;}",
      ".town-bg-grad{position:absolute;bottom:0;left:0;right:0;height:42%;background:linear-gradient(to top,rgba(5,2,10,.92) 0%,transparent 100%);z-index:1;pointer-events:none;}",
      "#townCharArea{position:fixed;bottom:0;left:0;right:0;z-index:8001;display:flex;align-items:flex-end;justify-content:center;gap:24px;padding:0 60px 160px;pointer-events:none;}",
      ".town-char-slot{flex:1;max-width:200px;min-height:200px;display:flex;align-items:flex-end;justify-content:center;position:relative;}",
      ".town-char-slot img{width:100%;object-fit:contain;filter:drop-shadow(0 4px 20px rgba(0,0,0,.8));}",
      "#townHiddenData{display:none!important;}",
      "#shopInvenOverlay{display:none;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.9);overflow-y:auto;padding:20px;}",
      ".shop-inven-inner{max-width:680px;margin:0 auto;}",
      ".shop-inven-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #3a2028;padding-bottom:12px;font-size:1rem;font-weight:700;color:var(--gold2);}",
    ];
    s.textContent = rules.join(" ");
    document.head.appendChild(s);
  }

  _buildHTML() {
    return `
<div id="townRoot">

  <!-- 상단 정보 바 -->
  <div id="townTopbar">
    <div class="tt-left">
      <span id="townHeaderTitle" class="tt-title">🏘 평화의 마을</span>
      <span id="townGold" class="tt-gold">💰 0 G</span>
    </div>
    <div class="tt-right">
      <span class="tt-chip">퀘스트: <span id="tnQuestTitle">없음</span></span>
      <span class="tt-chip">마을: <span id="tnTownStageName">폐허</span></span>
      <span class="tt-chip">예금: <span id="tnSideDeposit">0G</span></span>
      <span class="tt-chip">👸 호감도: <span id="tnPrincessAff">0</span></span>
    </div>
  </div>

  <!-- 버튼 네비 바 -->
  <div id="townNavbar">
    <button class="tn-navbtn tn-dungeon" id="tn-outside">🌿 성 밖</button>
    <button class="tn-navbtn tn-dungeon" id="tn-forest">🌲 숲 던전</button>
    <button class="tn-navbtn tn-dungeon" id="tn-dungeon">🗡 일반 던전</button>
    <button class="tn-navbtn tn-dungeon" id="tn-abyss">⚫ 심연 던전</button>
    <span class="tn-divider"></span>
    <button class="tn-navbtn" id="tn-party">🍺 동료 모집</button>
    <button class="tn-navbtn" id="tn-quest">📜 퀘스트</button>
    <button class="tn-navbtn" id="tn-skill">🌟 스킬</button>
    <button class="tn-navbtn" id="tn-smith">🔨 대장간</button>
    <button class="tn-navbtn" id="tn-inn">🏨 여관</button>
    <button class="tn-navbtn tn-gold" id="tn-bank">🏦 은행</button>
    <button class="tn-navbtn" id="tn-bond">💞 유대</button>
    <span class="tn-divider"></span>
    <button class="tn-navbtn" id="tn-shop-toggle">🛒 상점/인벤</button>
    <button class="tn-navbtn tn-blue" id="tn-save">💾 저장</button>
    <button class="tn-navbtn" id="tn-guide" style="border-color:#88ff88;color:#88ff88;">📋 공략 퀘스트</button>
    <button class="tn-navbtn" id="tn-princess" style="border-color:#ffaacc;color:#ffaacc;">👸 공주 알현</button>
  </div>

  <!-- 메인 배경 영역 -->
  <div id="townMain">
    <img id="townBgImg" src="images/town_bustling.png" alt="마을 배경" class="town-bg-full"/>
    <div class="town-bg-grad"></div>
    <!-- 하단 캐릭터 슬롯 -->
    <div id="townCharArea">
      <div id="townCharSlot1" class="town-char-slot"></div>
      <div id="townCharSlot2" class="town-char-slot"></div>
      <div id="townCharSlot3" class="town-char-slot"></div>
    </div>
  </div>

  <!-- 숨김 데이터 (기능 유지용) -->
  <div id="townHiddenData">
    <span id="tnQuestProg"></span>
    <span id="tnQuestReward"></span>
    <span id="tnTownInvested"></span>
    <span id="tnTownNextGoal"></span>
    <div><div id="tnTownBar"></div></div>
    <span id="tnSideInterest"></span>
    <span id="tnWeapon">없음</span>
    <span id="tnHelmet">없음</span>
    <span id="tnArmor">없음</span>
    <div id="tnCompEquip">
      <span id="tnCompEquipName"></span>
      <span id="tnCompWeapon">없음</span>
      <span id="tnCompHelmet">없음</span>
      <span id="tnCompArmor">없음</span>
    </div>
  </div>

  <!-- 상점/인벤토리 오버레이 -->
  <div id="shopInvenOverlay">
    <div class="shop-inven-inner">
      <div class="shop-inven-header">
        <span>🛒 상점 · 인벤토리</span>
        <button id="shopInvenClose" class="tn-navbtn">✕ 닫기</button>
      </div>
      <div style="padding:14px;background:rgba(255,255,255,.04);border:1px solid #2a1428;border-radius:6px;margin-bottom:16px;">
        <div style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:6px;">⚔ 장착 장비</div>
        <div style="font-size:.75rem;color:var(--text-dim);">
          무기: <span id="tnWeapon2">없음</span> &nbsp;|&nbsp; 투구: <span id="tnHelmet2">없음</span> &nbsp;|&nbsp; 갑옷: <span id="tnArmor2">없음</span>
        </div>
      </div>
      <div id="tnCompEquip2" style="display:none;padding:14px;background:rgba(255,255,255,.04);border:1px solid #2a1428;border-radius:6px;margin-bottom:16px;">
        <div id="tnCompEquipName2" style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:6px;"></div>
        <div style="font-size:.75rem;color:var(--text-dim);">
          무기: <span id="tnCompWeapon2">없음</span> &nbsp;|&nbsp; 갑옷: <span id="tnCompArmor2">없음</span>
        </div>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:8px;">🛒 상점</div>
        <div id="tnShop"></div>
      </div>
      <div>
        <div style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:8px;">🎒 인벤토리</div>
        <div id="tnInventory"></div>
      </div>
    </div>
  </div>

<!-- ══ 공략 퀘스트 모달 ══ -->
<div id="guideQuestModal" style="display:none;position:fixed;inset:0;z-index:600;
  background:rgba(0,0,0,.92);overflow-y:auto;padding:20px;font-family:inherit;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;
      margin-bottom:16px;border-bottom:2px solid #4a6a20;padding-bottom:12px;">
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:#88ff88;">📋 마왕 토벌 공략 퀘스트</div>
        <div style="font-size:.7rem;color:var(--text-dim);margin-top:3px;">공주 실비아의 마왕 토벌 준비 체크리스트</div>
      </div>
      <button id="guideQuestClose" style="background:transparent;border:1px solid #4a2e38;
        color:var(--text-dim);padding:6px 14px;cursor:pointer;font-family:inherit;border-radius:4px;">✕ 닫기</button>
    </div>
    <!-- 이장 한마디 -->
    <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;
      background:rgba(255,255,255,.04);border:1px solid #3a4a20;border-radius:6px;margin-bottom:20px;">
      <img src="images/Silvia_front.png" style="width:52px;height:52px;object-fit:contain;
        border:1px solid #4a6a20;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'"/>
      <div>
        <div style="font-size:.75rem;font-weight:700;color:#ffcc44;margin-bottom:4px;">공주 실비아</div>
        <div id="guideChiefMsg" style="font-size:.78rem;color:#e8d8b8;line-height:1.7;">
          마왕 다르카스를 쓰러뜨리려면 철저한 준비가 필요해요. 아래 항목을 하나씩 완료해 주세요!
        </div>
      </div>
    </div>
    <!-- 진행도 바 -->
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text-dim);margin-bottom:4px;">
        <span>전체 진행도</span>
        <span id="guideProgress">0/6 완료</span>
      </div>
      <div style="height:8px;background:#180a0c;border-radius:4px;overflow:hidden;">
        <div id="guideProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#44aa44,#88ff44);transition:width .4s;border-radius:4px;"></div>
      </div>
    </div>
    <!-- 퀘스트 목록 -->
    <div id="guideQuestList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;"></div>
    <!-- 완료 메시지 -->
    <div id="guideCompleteMsg" style="display:none;padding:16px;background:rgba(68,170,68,.12);
      border:1px solid #44aa44;border-radius:6px;text-align:center;">
      <div style="font-size:1.2rem;font-weight:700;color:#88ff88;margin-bottom:6px;">🎉 모든 준비 완료!</div>
      <div style="font-size:.82rem;color:#aaddaa;">심연 던전에 도전할 준비가 되었습니다. 마왕 다르카스를 물리쳐라!</div>
    </div>
    <!-- 일일 투자 퀘스트 -->
    <div style="margin-top:16px;padding:14px;background:rgba(255,200,14,.06);
      border:1px solid #4a4a10;border-radius:6px;">
      <div style="font-size:.75rem;font-weight:700;color:#ffcc44;margin-bottom:8px;">🌟 오늘의 일일 퀘스트</div>
      <div id="dailyQuestList" style="display:flex;flex-direction:column;gap:6px;"></div>
    </div>
  </div>
</div>

<!-- ══ 은행 화면 ══ -->
<div id="bankScreen" style="display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,0.92) url('images/BANK.png') center/cover no-repeat;
  flex-direction:column;overflow-y:auto;">
  <div style="display:flex;align-items:center;justify-content:space-between;
    padding:16px 24px;border-bottom:2px solid #4a2e38;flex-shrink:0;">
    <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);">🏦 왕국 은행</div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div id="bankGoldDisplay" style="font-size:1rem;font-weight:700;color:var(--gold2);">0 G</div>
      <button id="bankClose" style="background:transparent;border:1px solid #4a2e38;
        color:var(--text-dim);padding:8px 16px;cursor:pointer;font-family:inherit;
        font-size:.82rem;border-radius:4px;">← 마을로</button>
    </div>
  </div>
  <div style="display:flex;border-bottom:1px solid #2e1e24;flex-shrink:0;">
    <button id="bankTabDeposit" class="bank-tab bank-tab-active"
      onclick="window._townScene._switchBankTab('deposit')">💰 예금·출금</button>
    <button id="bankTabInvest"  class="bank-tab"
      onclick="window._townScene._switchBankTab('invest')">🏗 마을 투자</button>
  </div>
  <div id="bankDepositPane" style="padding:24px;max-width:700px;margin:0 auto;width:100%;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
      <div class="bank-card"><div class="bank-card-label">현재 예금</div>
        <div id="bankDepositAmt" class="bank-card-value" style="color:var(--gold2);">0 G</div></div>
      <div class="bank-card"><div class="bank-card-label">누적 이자 💹</div>
        <div id="bankInterestAmt" class="bank-card-value" style="color:#55cc55;">0 G</div>
        <div style="font-size:.62rem;color:var(--text-dim);margin-top:4px;">전투마다 예금의 5%</div></div>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;border-radius:6px;padding:16px;margin-bottom:12px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">💰 예금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" onclick="window._townScene._depositGold(100)">+100G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(500)">+500G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(1000)">+1000G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(5000)">+5000G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._depositAll()">전액</button>
      </div>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #1a3a2a;border-radius:6px;padding:16px;">
      <div style="font-size:.75rem;color:#55cc55;margin-bottom:10px;font-weight:700;">💸 출금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(100)">-100G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(500)">-500G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(1000)">-1000G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawAll()">전액</button>
      </div>
    </div>
  </div>
  <div id="bankInvestPane" style="display:none;padding:24px;max-width:700px;margin:0 auto;width:100%;">
    <div id="bankCurrentStage" class="bank-card" style="margin-bottom:24px;text-align:center;padding:20px;">
      <div id="bankStageIcon" style="font-size:2.5rem;margin-bottom:6px;">💀</div>
      <div id="bankStageName" style="font-size:1.3rem;font-weight:700;color:var(--gold2);">폐허</div>
      <div style="margin-top:10px;font-size:.72rem;color:var(--text-dim);">
        총 투자액: <span id="bankTotalInvested" style="color:var(--gold);font-weight:700;">0G</span>
      </div>
    </div>
    <div id="bankStageList" style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;"></div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;border-radius:6px;padding:16px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">🏗 투자하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(100)">100G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(500)">500G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(1000)">1000G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investAll()">전액</button>
      </div>
    </div>
  </div>
</div>
<style>
.bank-tab{padding:12px 28px;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--text-dim);cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:700;}
.bank-tab-active{color:var(--gold2)!important;border-bottom-color:var(--gold)!important;}
.bank-card{background:rgba(255,255,255,.04);border:1px solid #3a2428;border-radius:6px;padding:16px 20px;}
.bank-card-label{font-size:.65rem;color:var(--text-dim);margin-bottom:6px;}
.bank-card-value{font-size:1.4rem;font-weight:700;}
.bank-btn{background:rgba(20,10,30,.85);border:1px solid #4a2e38;color:var(--text);padding:9px 18px;cursor:pointer;font-family:inherit;font-size:.78rem;border-radius:4px;font-weight:700;}
.bank-btn:hover{filter:brightness(1.3);}
</style>

<!-- 저장/불러오기 화면 (간단 버전) -->
<div id="saveScreen" style="display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,0.95);flex-direction:column;overflow-y:auto;padding:20px;
  font-family:inherit;">
  <div style="max-width:600px;margin:0 auto;width:100%;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <span style="font-size:1.1rem;font-weight:700;color:var(--gold2);">💾 저장/불러오기</span>
      <div style="display:flex;gap:8px;">
        <button id="saveTabSave" class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._renderSaveSlots('save')">💾 저장</button>
        <button id="saveTabLoad" class="bank-btn"
          onclick="window._townScene._renderSaveSlots('load')">📂 불러오기</button>
        <button id="saveClose" class="bank-btn">✕ 닫기</button>
      </div>
    </div>
    <div id="saveSlotContainer" style="display:flex;flex-direction:column;gap:12px;"></div>
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

    q("tn-outside") ?.addEventListener("click", () => {
      const p = g.player;
      if (p && !p.introDepartureDone && p.introChainDone) {
        p.introDepartureDone = true;
        this._showSelfDialogue("self_departure", [
          "장비는 어느 정도 갖췄고... 동료도 옆에 있으니까.",
          "이제 출발하자!",
        ], () => g.goToDungeon("outside"));
      } else {
        g.goToDungeon("outside");
      }
    });
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
    q("tn-guide")  ?.addEventListener("click", () => this._openGuideQuestModal());
    q("tn-princess") ?.addEventListener("click", () => this._talkToPrincess());
    q("guideQuestClose")?.addEventListener("click", () => {
      document.getElementById("guideQuestModal").style.display = "none";
    });
    // 상점/인벤토리 오버레이
    q("tn-shop-toggle")?.addEventListener("click", () => {
      const ov = document.getElementById("shopInvenOverlay");
      if (ov) {
        ov.style.display = "block";
        this._refreshShopOverlay();
        // 캐릭터 슬롯이 아이템 목록을 가리지 않도록 숨김
        ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = "";
        });
      }
    });
    q("shopInvenClose")?.addEventListener("click", () => {
      const ov = document.getElementById("shopInvenOverlay");
      if (ov) ov.style.display = "none";
      // 닫을 때 캐릭터 슬롯 복원
      if (this._renderTownCharacters) this._renderTownCharacters();
    });
    q("tn-save")   ?.addEventListener("click", () => this._openSaveScreen());
    q("bankClose") ?.addEventListener("click", () => this._closeBankScreen());
    q("saveClose") ?.addEventListener("click", () => { const s=document.getElementById("saveScreen"); if(s)s.style.display="none"; });

    // 퀘스트 모달 닫기
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
  this._renderBankSidebar();
  this._updateTownBg();
  this._syncShopOverlay();
  this._renderTownCharacters();
}

  _syncShopOverlay() {
    const p = this.game.player;
    const setText = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    const eq = p.equipment || {};
    setText("tnWeapon2", eq.weapon?.name || "없음");
    setText("tnHelmet2", eq.helmet?.name || "없음");
    setText("tnArmor2",  eq.armor?.name  || "없음");
    const compEq2 = document.getElementById("tnCompEquip2");
    if (p.party && p.partyEquip) {
      if (compEq2) compEq2.style.display = "block";
      setText("tnCompEquipName2", "⚔ 동료 장착 장비");
      setText("tnCompWeapon2", p.partyEquip?.weapon?.name || "없음");
      setText("tnCompArmor2",  p.partyEquip?.armor?.name  || "없음");
    } else if (compEq2) compEq2.style.display = "none";
  }

  _refreshShopOverlay() {
    // tnShop/tnInventory가 오버레이 안에 있으므로 직접 빌드
    this._buildShop();
    this._renderInventory();
    this._syncShopOverlay();

    // 상단바 골드 표시 즉시 갱신 (판매/구매 시 반영 안 되던 버그 수정)
    const p = this.game.player;
    const goldEl = document.getElementById("townGold");
    if (goldEl && p) goldEl.innerText = `💰 ${p.money} G`;
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
        this._refreshShopOverlay?.() || this.render();
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
          this._refreshShopOverlay?.() || this.render();
        });
        row.appendChild(eqComp);
      }
    }

    // 판매 버튼
    const sellPrice = Math.max(1, Math.floor((item.price || 10) * 0.5 * (1 + (item.enhance || 0) * 0.2)));
    const sell = document.createElement("button");
    sell.className = "inv-btn";
    sell.textContent = `💰${sellPrice}G`;
    sell.title = `${sellPrice}G에 판매`;
    sell.style.cssText = "border-color:#cc9900;color:#ffcc44;font-size:.62rem;";
    sell.addEventListener("click", () => {
      this.game.itemManager.sellToBlacksmith(this.game, idx, sellPrice);
      this._refreshShopOverlay?.() || this.render();
    });
    row.appendChild(sell);

    // 삭제
    const del = document.createElement("button");
    del.className = "inv-btn del";
    del.textContent = "❌";
    del.addEventListener("click", () => {
      this.game.itemManager.remove(this.game, idx);
      this._refreshShopOverlay?.() || this.render();
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
      btn.addEventListener("click", () => {
        this.game.itemManager.buyShop(this.game, idx);
        this._refreshShopOverlay?.() || this.render();
      });
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
        ${q.giverPortrait ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <img src="${q.giverPortrait}" style="width:36px;height:36px;object-fit:contain;border:1px solid #3a2028;border-radius:2px;" onerror="this.style.display='none'"/>
          <span style="font-size:.7rem;color:${q.giverColor||'var(--text-dim)'};font-weight:700;">의뢰인: ${q.giver||"??"}</span>
        </div>` : ""}
        <h3>${q.title}</h3>
        <p>📍 ${q.target} ${q.goal}마리</p>
        <p>🎁 ${q.rewardGold}G / ${q.rewardExp}EXP</p>
        <button class="quest-accept-btn">✅ 수락</button>`;
      card.querySelector("button").addEventListener("click", () => {
        if (this.game.questManager.accept(this.game, q.id)) {
          modal.classList.add("hidden");
          this.render();
          // 의뢰인 수락 대화 표시 후 던전으로
          if (q.giverNpc && this.showNpcDialogue) {
            this.showNpcDialogue(q.giverNpc);
            const waitDlg = setInterval(() => {
              if (!document.getElementById("npcDialogueBox")) {
                clearInterval(waitDlg);
                setTimeout(() => this.game.goToDungeon("normal"), 400);
              }
            }, 300);
          } else {
            this.game.goToDungeon("normal");
          }
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

  // ── 동료 모달 ───────────────────────────────────
  _openPartyModal() {
    const modal = document.getElementById("tnPartyModal");
    const cards = document.getElementById("tnPartyCards");
    if (!modal || !cards) return;

    // 모달 열릴 때 캐릭터 슬롯 비우기 (공략 퀘스트와 동일)
    ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    // 닫기 버튼에 슬롯 복원 연결 (중복 방지)
    const closeBtn = document.getElementById("tnCloseParty");
    if (closeBtn && !closeBtn._slotRestored) {
      closeBtn._slotRestored = true;
      closeBtn.addEventListener("click", () => {
        if (this._renderTownCharacters) this._renderTownCharacters();
      });
    }

    // 파티원 초상화 맵
    const partyPortMap = {
      healer:     "images/portrait_healer.png",
      tanker:     "images/portrait_tanker.png",
      mage_party: "images/portrait_magician.png",
      archer:     "images/portrait_archer.png",
      dealer:     "images/portrait_Knight.png",
    };

    cards.innerHTML = "";
    Object.entries(PARTY_MEMBERS).forEach(([key, mem]) => {
      const btn = document.createElement("button");
      btn.className = "class-card";
      const portrait = partyPortMap[key] || "";
      btn.innerHTML = `
        ${portrait ? `<img src="${portrait}" style="width:56px;height:56px;object-fit:contain;border-radius:4px;margin-bottom:6px;" onerror="this.style.display='none'"/>` : `<div class="class-icon">${mem.icon}</div>`}
        <div class="class-name">${mem.name}</div>
        <div class="class-desc" style="color:var(--gold2);font-size:.72rem;margin-bottom:4px;">${mem.className}</div>
        <div class="class-desc">HP ${mem.hp} / ATK ${mem.attack} / DEF ${mem.defense}</div>`;
      btn.addEventListener("click", () => {
        this.game.selectParty(key);
        modal.style.display = "none";
        this.render();
        // selectParty 내부에서 합류 대화(join_xxx)가 즉시 표시되며,
        // 슬롯1=플레이어, 슬롯3=동료가 선택 즉시 함께 나타남
      });
      cards.appendChild(btn);
    });

    modal.style.display = "flex";
  }
}

// ─── 은행/투자 메서드 ─────────────────────────────────────────
TownScene.prototype._openBankScreen = function() {
  const el=document.getElementById("bankScreen"); if(!el)return;
  el.style.display="flex"; this._switchBankTab("deposit");
  this._refreshBankScreen(); window._townScene=this;
  // 캐릭터 슬롯이 은행 UI를 가리지 않도록 숨김
  ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
    const slotEl = document.getElementById(id);
    if (slotEl) slotEl.innerHTML = "";
  });
};
TownScene.prototype._closeBankScreen = function() {
  const el=document.getElementById("bankScreen"); if(el)el.style.display="none"; this.render();
};
TownScene.prototype._switchBankTab = function(tab) {
  const dP=document.getElementById("bankDepositPane"),iP=document.getElementById("bankInvestPane");
  const dB=document.getElementById("bankTabDeposit"),iB=document.getElementById("bankTabInvest");
  if(dP)dP.style.display=tab==="deposit"?"block":"none";
  if(iP)iP.style.display=tab==="invest"?"block":"none";
  dB?.classList.toggle("bank-tab-active",tab==="deposit");
  iB?.classList.toggle("bank-tab-active",tab==="invest");
  this._refreshBankScreen();
};
TownScene.prototype._refreshBankScreen = function() {
  const p=this.game.player;
  const b=p.bank||{deposit:0,interest:0,totalInvested:0,milestones:[]};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
  set("bankGoldDisplay",`${p.money} G`);
  set("bankDepositAmt",`${b.deposit} G`);
  set("bankInterestAmt",`${b.interest} G`);
  const stage=getTownStage(b.totalInvested);
  set("bankStageIcon",stage.icon); set("bankStageName",stage.name);
  set("bankTotalInvested",`${b.totalInvested}G`);
  const list=document.getElementById("bankStageList"); if(!list)return;
  list.innerHTML="";
  TOWN_STAGES.forEach((s2,i)=>{
    if(i===0)return;
    const achieved=b.totalInvested>=s2.minInvest;
    const prevMin=TOWN_STAGES[i-1].minInvest;
    const pct=achieved?100:Math.floor(Math.max(0,b.totalInvested-prevMin)/(s2.minInvest-prevMin)*100);
    const row=document.createElement("div");
    row.style.cssText=`background:rgba(255,255,255,.03);border:1px solid ${achieved?"#44aa44":"#2e1e24"};border-radius:6px;padding:12px 16px;margin-bottom:8px;`;
    row.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span>${s2.icon} <strong style="color:${achieved?s2.color:"var(--text)"}">${s2.name}</strong></span>
      ${achieved?"<span style='color:#44cc44;'>✅ 달성!</span>":`<span style='font-size:.72rem;color:var(--text-dim);'>${b.totalInvested}/${s2.minInvest}G</span>`}
    </div><div style="height:8px;background:#180a0c;border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${s2.color}88;"></div></div>`;
    list.appendChild(row);
  });
};
TownScene.prototype._depositGold = function(amt) {
  const p=this.game.player,a=Math.min(amt,p.money); if(a<=0)return;
  p.money-=a;p.bank.deposit+=a; this.game.log(`🏦 ${a}G 예금!`);
  this._refreshBankScreen();this.render();
};
TownScene.prototype._depositAll = function(){this._depositGold(this.game.player.money);};
TownScene.prototype._withdrawGold = function(amt) {
  const p=this.game.player,b=p.bank,total=b.deposit+b.interest,a=Math.min(amt,total);
  if(a<=0)return;
  const fi=Math.min(a,b.interest);b.interest-=fi;b.deposit-=(a-fi);p.money+=a;
  this.game.log(`🏦 ${a}G 출금!`); this._refreshBankScreen();this.render();
};
TownScene.prototype._withdrawAll = function(){this._withdrawGold(this.game.player.bank.deposit+this.game.player.bank.interest);};
TownScene.prototype._investTown = function(amt) {
  const p=this.game.player,b=p.bank,a=Math.min(amt,p.money); if(a<=0)return;
  const prev=getTownStage(b.totalInvested);
  p.money-=a;b.totalInvested+=a;
  // 일일 투자 추적
  const today = new Date().toLocaleDateString("ko-KR");
  if (p.guideDailyDate === today) {
    p.guideDailyInvest = (p.guideDailyInvest || 0) + a;
  }
  const next=getTownStage(b.totalInvested);
  this.game.log(`🏗 ${a}G 투자!`);

  // 투자액에 비례한 소량 호감도 상승 (100G당 +1, 최대 +5/회)
  const affGain = Math.min(5, Math.floor(a / 100));
  if (affGain > 0) {
    p.princessAffinity = Math.min(100, (p.princessAffinity||0) + affGain);
  }

  // ── 단계 상승 시 NPC 대화 트리거 ──
  if (next.level > prev.level) {
    this.game.showNarrative(`🎉 마을이 발전했습니다!\n\n${next.icon} ${next.name}`, 2500);

    setTimeout(() => {
      if (next.level === 1) {
        // 처음 투자 → 이장 감사 대사
        if (!p.chiefInvestStartDone) {
          p.chiefInvestStartDone = true;
          this.showNpcDialogue("village_chief_invest_start");
        }
      } else if (next.level === 2) {
        // 번화가 달성 → 이장 격려 대사
        if (!p.chiefInvestBustlingDone) {
          p.chiefInvestBustlingDone = true;
          this.showNpcDialogue("village_chief_invest_bustling");
        }
      } else if (next.level === 3) {
        // 번영 완료 → 이장 대사 후 왕 등장
        if (!p.chiefInvestCompleteDone) {
          p.chiefInvestCompleteDone = true;
          this.showNpcDialogue("village_chief_invest_complete");
          // 이장 대화 끝나면 왕 등장
          const waitKing = setInterval(() => {
            if (!document.getElementById("npcDialogueBox")) {
              clearInterval(waitKing);
              setTimeout(() => {
                this.showNpcDialogue("king");
                // 왕 대화 후 칭호 수여
                const waitTitle = setInterval(() => {
                  if (!document.getElementById("npcDialogueBox")) {
                    clearInterval(waitTitle);
                    if (!p.dukeTitle) {
                      p.dukeTitle = true;
                      this.game.log("👑 공작 작위를 수여받았습니다!");
                      this.game.showNarrative("👑 공작 작위 수여\n\n왕실의 인장으로 공작이 되었습니다!\n이제 왕국과 한 가족입니다.", 4000);
                    }
                  }
                }, 400);
              }, 800);
            }
          }, 400);
        }
      }
    }, 2600); // 발전 내러티브 후에 표시
  } else if (prev.level === 0 && !p.chiefInvestStartDone && b.totalInvested > 0) {
    // 레벨업 없어도 첫 투자면 이장 감사 대사
    p.chiefInvestStartDone = true;
    setTimeout(() => this.showNpcDialogue("village_chief_invest_start"), 600);
  }

  INVEST_REWARDS.forEach(r=>{
    if(b.totalInvested>=r.minInvest&&!(b.milestones||[]).includes(r.minInvest)){
      if(!b.milestones)b.milestones=[];b.milestones.push(r.minInvest);
      if(r.atkBonus)p.bonusAttack=(p.bonusAttack||0)+r.atkBonus;
      if(r.hpBonus){p.maxHp+=r.hpBonus;p.hp=Math.min(p.hp+r.hpBonus,p.maxHp);}
      this.game.log(`🎁 투자 보상! ${r.msg}`);
    }
  });
  this._refreshBankScreen();this._updateTownBg();this.render();
};
TownScene.prototype._investAll = function(){this._investTown(this.game.player.money);};
TownScene.prototype._updateTownBg = function() {
  const stage=getTownStage(this.game.player.bank?.totalInvested||0);
  const bg=document.getElementById("townBgImg"); if(bg)bg.src=stage.bg;
};
TownScene.prototype._renderBankSidebar = function() {
  const p=this.game.player,bank=p.bank||{totalInvested:0,deposit:0,interest:0};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
  const stage=getTownStage(bank.totalInvested),nxt=getNextStage(bank.totalInvested);
  set("tnTownStageName",`${stage.icon} ${stage.name}`);
  set("tnTownInvested",`투자: ${bank.totalInvested}G`);
  if(nxt){
    set("tnTownNextGoal",`다음: ${nxt.name} (${nxt.minInvest-bank.totalInvested}G 남음)`);
    const prevMin=TOWN_STAGES[stage.level].minInvest;
    const pct=Math.floor((bank.totalInvested-prevMin)/(nxt.minInvest-prevMin)*100);
    const bar=document.getElementById("tnTownBar"); if(bar)bar.style.width=`${pct}%`;
  } else {
    set("tnTownNextGoal","✅ 최고 단계!");
    const bar=document.getElementById("tnTownBar"); if(bar)bar.style.width="100%";
  }
  set("tnSideDeposit",`예금: ${bank.deposit}G`);
  set("tnSideInterest",`이자: ${bank.interest}G`);
  set("tnPrincessAff", p.princessAffinity || 0);
};

// ─── 저장/불러오기 ──────────────────────────────────────────────
TownScene.prototype._openSaveScreen = function() {
  const sc=document.getElementById("saveScreen");
  if(sc){sc.style.display="flex";this._renderSaveSlots("save");}
  window._townScene=this;
};
TownScene.prototype._renderSaveSlots = function(mode) {
  const ct=document.getElementById("saveSlotContainer"); if(!ct)return;
  ct.innerHTML="";

  // 초상화 맵 (플레이어 + 파티원 공통)
  const portMap={
    knight:   "images/portrait_Knight.png",
    mage:     "images/portrait_magician.png",
    magician: "images/portrait_magician.png",
    archer:   "images/portrait_archer.png",
    tanker:   "images/portrait_tanker.png",
    healer:   "images/portrait_healer.png",
    healer_party: "images/portrait_healer.png",
    tanker_party: "images/portrait_tanker.png",
  };
  // 파티원 key → 초상화
  const partyPortMap={
    healer:     "images/portrait_healer.png",
    tanker:     "images/portrait_tanker.png",
    mage_party: "images/portrait_magician.png",
    archer:     "images/portrait_archer.png",
    dealer:     "images/portrait_Knight.png",
  };

  const imgTag = (src, size=60) =>
    `<img src="${src}" style="width:${size}px;height:${size}px;object-fit:contain;border:1px solid #4a2e38;border-radius:2px;flex-shrink:0;" onerror="this.style.display='none'"/>`;

  for(let i=0;i<3;i++){
    const key=`rpgSave_slot_${i}`;
    let sp=null; try{const r=localStorage.getItem(key);if(r)sp=JSON.parse(r);}catch(e){}

    const pl = sp?.player || null;
    const card=document.createElement("div");
    card.style.cssText="background:rgba(255,255,255,.04);border:1px solid #3a2428;border-radius:6px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px;";

    if(pl){
      const psrc = portMap[pl.type] || portMap.knight;
      const d = sp.savedAt ? new Date(sp.savedAt).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "";

      // 파티원 초상화 (최대 3명)
      const parties = [pl.party, pl.party2, pl.party3].filter(Boolean);
      const partyImgs = parties.map(p => {
        const psrc2 = partyPortMap[p] || "";
        return psrc2 ? imgTag(psrc2, 44) : "";
      }).join("");

      card.innerHTML=`
        <!-- 플레이어 초상화 -->
        ${imgTag(psrc, 64)}
        <!-- 정보 -->
        <div style="flex:1;min-width:0;">
          <div style="font-size:.85rem;font-weight:700;color:var(--gold2);margin-bottom:3px;">
            ${pl.name||"플레이어"} <span style="font-size:.72rem;color:var(--text-dim);">(${pl.type||"?"})</span>
          </div>
          <div style="font-size:.7rem;color:var(--text-dim);margin-bottom:6px;">Lv.${pl.level||1} &nbsp;${d}</div>
          <!-- 파티원 초상화 -->
          ${parties.length ? `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <span style="font-size:.62rem;color:var(--text-dim);">파티:</span>
            ${partyImgs}
          </div>` : ""}
        </div>
        <!-- 버튼 -->
        <div style="display:flex;gap:6px;flex-shrink:0;">
          ${mode==="save"?`<button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._doSave(${i})">덮어쓰기</button>`:""}
          ${mode==="load"?`<button class="bank-btn" style="border-color:#88aaff;color:#88aaff;" onclick="window._townScene._doLoad(${i})">불러오기</button>`:""}
          <button class="bank-btn" style="border-color:#aa4444;color:#cc6666;" onclick="window._townScene._doDelete(${i})">삭제</button>
        </div>`;
    } else {
      card.innerHTML=`
        <div style="width:64px;height:64px;border:1px dashed #3a2428;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:1.6rem;border-radius:2px;">?</div>
        <div style="flex:1;color:var(--text-dim);font-size:.82rem;">슬롯 ${i+1} — 빈 슬롯</div>
        ${mode==="save"?`<button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);flex-shrink:0;" onclick="window._townScene._doSave(${i})">💾 저장</button>`:""}`;
    }
    ct.appendChild(card);
  }
};
TownScene.prototype._doSave = function(idx) {
  const sm = this.game.saveManager;
  if (sm && sm.save(this.game, idx)) {
    this.game.log(`💾 슬롯 ${idx+1}에 저장 완료!`);
    this._renderSaveSlots("save");
  } else {
    this.game.log("❌ 저장 실패");
  }
};
TownScene.prototype._doLoad = function(idx) {
  const sm = this.game.saveManager;
  if (!sm) return;
  const data = sm.load(idx);
  if (data) {
    this.game.player = sm.hydrate(data.player);
    this.game._toTown();
    this.game.log(`📂 슬롯 ${idx+1} 불러오기 완료!`);
  } else {
    this.game.log("❌ 저장 데이터 없음");
  }
};
TownScene.prototype._doDelete = function(idx) {
  if (confirm(`슬롯 ${idx+1}을 삭제할까요?`)) {
    const sm = this.game.saveManager;
    if (sm) { sm.deleteSlot(idx); this._renderSaveSlots("save"); }
  }
};

// ─── NPC 대화 시스템 ─────────────────────────────────────────────
const NPC_DATA = {
  merchant:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["어서오세요, 용사님! 요즘 성 안 상황이 심상치 않습니다...","마왕 다르카스의 군세가 날이 갈수록 강해지고 있어요.","그러고 보니, 왕국의 실비아 공주님께서 용사님을 꼭 만나고 싶다 하셨어요!","공주님이 마왕 토벌에 대한 중요한 조언을 해주실 거예요. 📋 공략 퀘스트 버튼을 눌러보세요!"]},
  merchant_after_battle:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["수고하셨습니다, 용사님! 무사히 돌아오셨군요. 정말 다행이에요. 😊","다음 전투까지 푹 쉬세요! 저도 좋은 물건 준비해 두겠습니다. 💰"]},
  merchant_after_flee:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["잘 돌아오셨습니다, 용사님! 무사히 살아 돌아오셨으니 그것만으로도 다행이에요. 😅","서두를 필요 없어요. 여관에서 충분히 쉬시고, 장비도 정비해 두세요. 제가 도와드릴게요! 🛒","준비가 됐다 싶으면 다시 도전하시죠! 용사님이라면 반드시 해낼 수 있을 거예요. 💪"]},
  village_chief:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "당신이 전설의 용사군요. 저는 에드워드 왕국의 공주 실비아입니다.",
      "이 마을은 마왕의 침략으로 황폐해졌어요. 왕가로서 책임감을 느끼고 직접 이곳에 왔습니다.",
      "마왕 다르카스를 쓰러뜨리려면 철저한 준비가 필요해요. 제가 체크리스트를 만들었으니 참고해 주세요.",
      "📋 공략 퀘스트를 하나씩 완료하시면 반드시 마왕을 이길 수 있을 거예요. 저도 돕겠습니다!",
    ]},

  // ── 마을 투자 시작 시 ──
  village_chief_invest_start:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "정말요?! 마을에 투자해 주셨군요! 너무 감사해요, 용사님! 💕",
      "이제 사람들이 성 안 마을을 다시 일으킬 수 있게 됐어요. 덕분이에요, 정말!",
      "저도 함께 투자할게요. 우리 같이 이 마을을 되살려 봐요! 화이팅! 🏗",
    ]},

  // ── 마을 번화가 달성 시 ──
  village_chief_invest_bustling:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "오, 믿기지 않아요! 황폐했던 이 마을에 이렇게 사람들이 모여들다니! 🏘 너무 기뻐요!",
      "용사님 덕분에 상인들이 돌아오고 아이들 웃음소리가 들리기 시작했어요. 정말 대단하세요!",
      "저도 왕가의 자금을 더 지원할게요. 함께라면 이 마을을 완전히 되살릴 수 있어요! 💪",
    ]},

  // ── 마을 번영 완료 + 왕 등장 ──
  village_chief_invest_complete:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 눈물이 날 것 같아요. 이 마을이 이렇게 아름답게 빛나다니! 🌟",
      "용사님이 이 마을을 완전히 되살려 주셨어요. 황폐했던 땅이 왕국 최고의 도시가 됐어요!",
      "아버지께—아, 폐하께서 용사님의 공적을 들으시고 직접 행차하신다 하셨어요. 저도 소개해 드릴게요!",
    ]},

  king:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "짐이 직접 이곳에 오게 되다니... 이 마을의 놀라운 변화를 두 눈으로 확인하고 싶었소.",
      "용사여, 그대가 이 왕국의 성 안 마을을 황폐에서 번영으로 이끌었다는 소식을 들었소. 우리 성안의 문제와 도움을 줘서 진심으로 고맙네.",
      "이 은혜를 어찌 갚을까 생각했소. 그대에게 왕실의 인장으로 공작 작위를 내리지. 이제 우리는 한 가족이야! 👑",
      "그리고 내 딸 실비아가 그대를 신뢰한다 했소. 그것으로 이미 충분하오. 어서 마왕을 물리치고 이 왕국에 완전한 평화를 가져다 주기 바라오!",
    ]},
  healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["당신과 함께 여기까지 오다니 꿈만 같아요.","당신이 앞에 서 있으면 용기가 생겨요.","신성의 빛이 다하는 날까지 함께할게요.","마왕을 쓰러뜨리는 날 같이 맛집 가요! ✝"]},
  tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["네가 이렇게 강해질 줄 몰랐다.","이 방패가 버티는 한 칼날 못 건드린다.","마왕이고 뭐고 내 앞에서 다 처리해 준다.","같이 싸우는 게 나쁘지 않아. 🛡"]},
  mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["마왕의 핵심 마력은 심연 최심부에 있어요.","당신 곁이라면 더 빨리 성장할 수 있어요.","고대 서적에서 약점을 찾았어요. 🔮","두렵지만 설레기도 해요."]},
  archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["마왕 척후대가 이 근방까지 왔어요.","외로웠는데 이제 혼자가 아니네요.","제 화살이 닿지 않는 거리는 없어요. 🏹","앞으로도 잘 부탁드려요!"]},

  // ── 동료 합류 대화 ─────────────────────────────────
  join_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:[
      "저도... 마왕에게 잃은 게 있어요. 소중한 사람을 잃었거든요.",
      "혼자서는 마왕에게 닿을 수 없어요. 하지만 용사님이라면... 함께라면 할 수 있을 것 같아요.",
      "제 신성의 빛, 용사님을 위해 쓸게요. 끝까지 함께할게요. ✝",
    ]},
  join_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:[
      "......흥. 딱히 네가 마음에 들어서가 아냐. 오해하지 마.",
      "혼자 무모하게 들어갔다가 죽는 꼴 보기 싫어서 따라가는 거라고.",
      "이 방패가 버티는 한, 네 뒤는 내가 지킨다. 딱 그것뿐이야. 🛡",
    ]},
  join_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:[
      "오오! 드디어 만났군요! 저 고대 서적에서 마왕의 약점을 찾아냈어요! 🔮",
      "혼자 연구만 해서는 실전에 쓸 수가 없었거든요. 용사님과 함께라면 검증할 수 있어요!",
      "걱정 마세요. 마법 지원은 제가 맡을게요. 반드시 마왕을 쓰러뜨릴 수 있어요!",
    ]},
  join_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:[
      "...이 숲은 내가 평생 지켜온 곳이에요. 마왕의 부하들이 이곳까지 침범했어요.",
      "더 이상 지켜만 볼 수 없어요. 마왕을 직접 끝내야 해요.",
      "제 화살이 닿지 않는 곳은 없어요. 당신 뒤를 맡길게요. 🏹",
    ]},
  join_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:[
      "하하! 마침 나도 마왕한테 한 방 먹여주고 싶었거든? 타이밍 딱 맞네.",
      "뭐, 실력은 내가 더 좋을 수도 있어. 근데 혼자 가기엔 심연이 너무 깊어.",
      "자, 이제부터 우리 팀이야. 후회는 시키지 않을게! ⚔",
    ]},

  // ── 레벨업 동료 반응 대사 ─────────────────────────

  // Lv.5 ─────
  levelup_5_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.5 달성이에요! 당신이 성장하는 걸 보니 저도 덩달아 힘이 나요. ✝","계속 이렇게 강해지면... 마왕도 두렵지 않아요!"]},
  levelup_5_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["흐음... Lv.5 정도면 이제 겨우 시작이지. 아직 멀었어.","뭐, 나쁘지는 않군. 계속 그렇게 해봐. 🛡"]},
  levelup_5_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["오오! Lv.5 달성! 성장 속도가 제 예측치를 웃돌고 있어요! 🔮","이 추세라면 마왕 토벌도 충분히 가능해요!"]},
  levelup_5_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["...Lv.5. 예상보다 빠르네요. 🏹","당신이라면 믿을 수 있을 것 같아요."]},
  levelup_5_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["오, Lv.5! 제법인데? 아직 나한테는 멀었지만. ⚔","하하, 농담이야. 좋은 출발이야!"]},

  // Lv.10 ─────
  levelup_10_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.10이에요! 이제 당신의 빛이 눈에 보일 정도로 강해졌어요. ✨","저도 더 강한 치유 마법을 익혀야겠어요. 함께 성장해요!"]},
  levelup_10_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.10... 솔직히 말하면, 처음보다 많이 강해졌어.","이 정도면 어지간한 던전은 버틸 수 있겠어. 🛡"]},
  levelup_10_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.10 달성! 이제 진짜 모험가라고 할 수 있겠어요! 🔮","마력 수치도 눈에 띄게 올랐어요. 제 분석이 맞았어요!"]},
  levelup_10_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.10. 이제 숲 던전 몬스터들은 상대가 되지 않겠군요. 🏹","조금씩 당신을 믿게 되고 있어요."]},
  levelup_10_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["Lv.10이라고! 이야, 꽤 하는데? ⚔","인정해줄게. 이 정도면 같이 다닐 만해!"]},

  // Lv.15 ─────
  levelup_15_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.15... 당신 곁에 있으니까 저도 강해지는 것 같아요. ✝","심연 던전이 점점 현실이 돼가는 느낌이에요. 두렵지만 설레요."]},
  levelup_15_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.15이라... 이 방패를 믿어도 될 것 같다는 생각이 드는군.","한 가지만 말할게. 내가 앞에 있는 한, 넌 절대 안 죽어. 🛡"]},
  levelup_15_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.15! 이제 고급 마법 공략도 함께 쓸 수 있겠어요! 🔮","마왕의 약점 분석도 거의 완성됐어요. 조금만 더요!"]},
  levelup_15_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.15. 이제 심연 입구까지는 충분히 싸울 수 있어요. 🏹","...같이 여기까지 온 게, 사실 외롭지 않았어요."]},
  levelup_15_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["오오, Lv.15! 이 정도면 나랑 어깨를 나란히 할 만하잖아? ⚔","농담이 아니야. 진짜로 실력이 붙었어. 인정!"]},

  // Lv.20 ─────
  levelup_20_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.20... 드디어 이 날이 왔군요. 공주님 체크리스트, 클리어예요! ✅","이제 심연 던전에 도전할 수 있어요. 제가 끝까지 치료해 드릴게요. ✝"]},
  levelup_20_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.20. ......됐어. 이제 심연에 들어갈 자격이 생겼군.","각오해. 마왕 앞에서도 내 방패는 절대 무너지지 않아. 🛡"]},
  levelup_20_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.20 달성!! 공략 퀘스트 조건 충족이에요! 드디어예요! 🔮🎉","마왕 약점 분석 완료, 전략 준비 완료! 이제 심연에 갑시다!"]},
  levelup_20_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.20. 이걸 기다리고 있었어요. 🏹","이제 마왕을 끝낼 준비가 됐어요. 같이 가요."]},
  levelup_20_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["Lv.20! 드디어야! 이제 마왕이랑 제대로 붙어볼 수 있겠어! ⚔","솔직히 여기까지 같이 올 줄 몰랐어. 잘했어, 진짜로."]},

  // Lv.25 ─────
  levelup_25_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.25... 당신의 강함이 이제 저를 지켜주는 것 같아요. ✝","마왕과의 전투, 두렵지 않아요. 당신 곁이라면."]},
  levelup_25_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.25라... 처음 봤을 때랑 딴판이야. 🛡","마왕이 눈앞에 있어도 내가 막아줄 테니까. 걱정 마."]},
  levelup_25_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.25! 이 정도 성장이면 마왕에게도 충분히 유효한 데미지를 줄 수 있어요! 🔮","마지막 전략 점검 완료. 이제 마왕만 남았어요!"]},
  levelup_25_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.25. ...당신 덕분에 이 숲도, 나도 달라졌어요. 🏹","마지막까지 함께할게요."]},
  levelup_25_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["Lv.25! 이야! 거의 내 수준이잖아? ⚔","하하, 농담이야. 근데 진짜로 강해졌어. 마왕, 각오해라!"]},

  // MAX ─────
  levelup_max_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["최... 최고 레벨 달성이에요!! 정말 대단해요!!! ✨✝","이제 마왕은 우리 앞에 설 수 없어요. 함께 끝냅시다!"]},
  levelup_max_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["...최고 레벨. 솔직히 말할게.","처음부터 알아봤어. 넌 특별한 놈이야. 같이 마왕을 끝내자. 🛡"]},
  levelup_max_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["최고 레벨 달성!!! 제 연구 역사상 가장 위대한 순간이에요!!! 🔮🎉","마왕의 완전 공략 데이터 준비 완료! 이제 우리가 역사를 만들어요!"]},
  levelup_max_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["최고 레벨... 당신은 제가 본 가장 강한 사람이에요. 🏹","마지막 화살, 마왕의 심장을 향해 쏠게요."]},
  levelup_max_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["최고 레벨 달성!! 야, 너 진짜 미쳤다! ⚔","인정! 이제 진짜 최강 파티야. 마왕, 우리가 간다!!!"]},

  // ══ 퀘스트 수락 대화 ══════════════════════════════

  qaccept_q_slime:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:[
      "아이고, 용사님! 마침 잘 오셨어요. 사실 골치 아픈 일이 생겼어요. 😅",
      "저장창고에 슬라임들이 들어와서 물건을 다 녹여버리고 있거든요! 이러다 가게 망할 것 같아요!",
      "슬라임 5마리만 처치해 주시면 사례금을 드릴게요. 성 밖 사냥터에 많이 있답니다. 부탁드려요!",
    ]},

  qaccept_q_goblin:{name:"마을 주민 마르타",nameColor:"#ddbb88",portrait:"images/sd_merchant.png",
    dialogues:[
      "용사님! 저 마르타라고 해요. 제발 좀 도와주세요! 😢",
      "숲 근처 우리 밭에 고블린들이 떼로 몰려와서 작물을 다 망쳐놓고 있어요.",
      "올 겨울 식량이 다 거기 있었는데... 고블린 4마리만 쫓아내 주시면 정말 감사할게요!",
    ]},

  qaccept_q_skeleton:{name:"경비대장 가르",nameColor:"#aaaacc",portrait:"images/portrait_Knight.png",
    dialogues:[
      "용사여, 잠깐! 나는 이 마을 경비대장 가르다. 급한 부탁이 있소.",
      "일반 던전 깊은 곳에서 해골 기사들이 점점 늘어나고 있소. 내 부하들만으로는 버겁구려.",
      "해골 기사 3구만 격멸해 주시오. 왕국 안전을 위해 꼭 부탁드리오! 보상은 충분히 드리겠소. 🗡",
    ]},

  qaccept_q_orc:{name:"농부 티모",nameColor:"#99cc77",portrait:"images/sd_merchant.png",
    dialogues:[
      "헉헉... 용사님! 저 좀 도와주세요. 밭에서 달려왔어요. 🌾",
      "오크 전사들이 우리 농장을 짓밟고 있어요! 몇 달 동안 키운 농작물이 다 망가지고 있다고요!",
      "오크 3마리만 처치해 주시면 올해 수확물의 일부를 드릴게요. 제발 부탁드려요!",
    ]},

  qaccept_q_orc2:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 마침 찾고 있었어요. 왕국 안보에 관한 중요한 임무예요.",
      "오크 도발꾼들이 마을 경계에서 주민들을 위협하고 있어요. 일반 오크보다 훨씬 교활하고 강해요.",
      "2마리만 처단해 주시면 돼요. 위험하니까 꼭 조심하세요. 저도 걱정되거든요... 💕",
    ]},

  qaccept_q_guardian:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여, 짐이 직접 이 임무를 맡기노라. 왕국의 운명이 걸린 일이오.",
      "일반 던전 깊은 곳에 수호자가 도사리고 있소. 그놈을 처치해야 심연 던전의 봉인이 열린다오.",
      "심연 던전... 그곳에 마왕 다르카스가 있소. 수호자를 쓰러뜨려 길을 열어주시오. 왕국이 그대를 믿소! 👑",
    ]},

  // ══ 퀘스트 완료 대화 ══════════════════════════════

  qcomplete_q_slime:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:[
      "용사님!! 돌아오셨군요! 슬라임들을 다 없애주셨어요?! 정말요?! 😍",
      "창고에 가봤더니 깨끗해졌더라고요! 이제 안심이에요. 약속대로 사례금 드릴게요!",
      "또 도움이 필요하면 언제든 찾아와 주세요. 용사님 덕분에 가게가 살았어요! 💰",
    ]},

  qcomplete_q_goblin:{name:"마을 주민 마르타",nameColor:"#ddbb88",portrait:"images/sd_merchant.png",
    dialogues:[
      "용사님! 오셨군요! 밭에 가봤더니 고블린들이 하나도 없었어요! 🥹",
      "덕분에 남은 작물이라도 수확할 수 있었어요. 올 겨울은 버틸 수 있을 것 같아요.",
      "정말 감사해요, 용사님. 이 은혜 평생 잊지 못할 거예요!",
    ]},

  qcomplete_q_skeleton:{name:"경비대장 가르",nameColor:"#aaaacc",portrait:"images/portrait_Knight.png",
    dialogues:[
      "오, 돌아왔군. 임무 완수했는가? 해골 기사 3구 모두 격멸 확인!",
      "잘 해냈소. 덕분에 던전 주변 경비가 한결 수월해질 것이오. 🗡",
      "보상은 약속대로 드리겠소. 왕국을 위해 수고했소, 용사!",
    ]},

  qcomplete_q_orc:{name:"농부 티모",nameColor:"#99cc77",portrait:"images/sd_merchant.png",
    dialogues:[
      "용사님!! 오크들이 다 사라졌어요! 밭이 다시 조용해졌다고요! 🌾",
      "정말 감사해요. 수확물 일부를 사례금으로 준비했어요. 많이 드리지 못해서 죄송해요...",
      "내년에 풍년이 들면 꼭 더 사례할게요! 정말정말 감사합니다, 용사님!",
    ]},

  qcomplete_q_orc2:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님! 무사히 돌아오셨군요! 정말 걱정했어요. 😊",
      "오크 도발꾼들이 처단됐다는 보고 받았어요. 덕분에 마을 경계가 안전해졌어요!",
      "역시 믿을 수 있는 분이에요. 보상이에요. 앞으로도 잘 부탁드려요! 💕",
    ]},

  qcomplete_q_guardian:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여! 던전 수호자를 쓰러뜨렸다 들었소. 실로 대단한 무위로다! 👑",
      "이제 심연 던전의 봉인이 열렸소. 그 안에 마왕 다르카스가 기다리고 있을 것이오.",
      "마지막 전투가 남았소. 왕국의 모든 이가 그대를 응원하고 있소. 반드시 이겨주시오!",
    ]},

  // ══ 공주 알현 — 호감도 단계별 일상 대화 ══════════════

  princess_talk_0:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "오, 용사님. 무슨 일로 찾아오셨나요?",
      "아직 저희가 서로 잘 모르는 사이지만... 앞으로 친해질 수 있으면 좋겠어요.",
      "마을과 왕국을 위해 늘 애써주셔서 감사해요.",
    ]},

  princess_talk_25:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 오셨군요! 요즘 자주 뵈니까 좋네요. 😊",
      "사실 처음엔 좀 어려웠는데, 이제는 편하게 이야기할 수 있을 것 같아요.",
      "마을 일도, 모험도... 항상 응원하고 있어요!",
    ]},

  princess_talk_50:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님! 기다리고 있었어요. 오늘은 무슨 얘기를 해볼까요? 💕",
      "솔직히 말하면... 용사님이 찾아와 주시는 시간이 하루 중 제일 기다려져요.",
      "왕가의 공주로서가 아니라, 그냥 실비아로서 당신과 이야기하고 싶어요.",
    ]},

  princess_talk_75:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 와주셨네요. 당신이 오면 마음이 편안해져요. ☺",
      "마왕과의 싸움이 두렵지 않냐고요? 두려워요. 그래서 당신이 더 걱정돼요.",
      "꼭... 무사히 돌아오겠다고 약속해 주세요. 저한테는 그게 제일 중요해요.",
    ]},

  princess_talk_100:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님. 당신이 와주는 것만으로도 하루가 환해져요. ❤",
      "이제는... 왕가와 백성을 위해서가 아니라, 그냥 제가 당신을 응원하고 싶어요.",
      "마왕을 쓰러뜨리고 돌아오면... 하고 싶은 얘기가 있어요. 꼭 살아 돌아오세요. 약속해요.",
    ]},

  // ══ 공주 호감도 마일스톤 이벤트 ══════════════════════

  princess_milestone_25:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 잠시만요! 드리고 싶은 게 있어요.",
      "왕실 의사에게 부탁해서 만든 건강 부적이에요. 최대 체력이 늘어날 거예요.",
      "큰 건 아니지만... 받아주세요. 항상 건강하셔야 해요! 💊",
    ]},

  princess_milestone_50:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 이건... 제 개인 검이에요. 어릴 때부터 검술을 배웠거든요.",
      "왕실 대장간에서 특별히 제작한 거예요. 당신이 더 강해지는 데 도움이 될 거예요.",
      "부디 받아주세요. 당신이 다치지 않길 바라는 제 마음이에요. ⚔",
    ]},

  princess_milestone_75:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 이건 어머니께서 물려주신 부적이에요. 왕가의 보물이죠.",
      "원래는 함부로 줄 수 없는 물건이지만... 당신에게라면 드리고 싶어요.",
      "이게 당신을 지켜줄 거예요. 반드시... 무사히 돌아와 주세요. 🍀",
    ]},

  princess_milestone_100:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님. 더 이상 숨기지 않을게요. 저는... 당신을 진심으로 좋아하게 됐어요.",
      "왕실의 인장이에요. 이걸 가지고 있으면 왕국의 모든 힘이 당신과 함께할 거예요.",
      "마왕을 쓰러뜨리고 반드시 제게 돌아와 주세요. 저는... 여기서 당신을 기다리고 있을게요. ❤",
    ]},
};

(function(){
  if(document.getElementById("npcDialogueStyle"))return;
  const s=document.createElement("style");s.id="npcDialogueStyle";
  s.textContent=`#npcDialogueBox{position:fixed;bottom:0;left:0;right:0;z-index:8000;display:flex;justify-content:center;padding:0 0 18px;pointer-events:none;animation:npcFadeIn .35s ease}@keyframes npcFadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}.npc-wrap{pointer-events:all;width:min(740px,96vw);background:linear-gradient(170deg,#0d0808 80%,#1a0a10);border:2px solid #6b3a20;border-radius:4px;box-shadow:0 0 0 1px #3a1a0a,0 8px 40px rgba(0,0,0,.92);cursor:pointer}.npc-namebar{padding:7px 16px;background:rgba(0,0,0,.6);border-bottom:1px solid #4a2510;font-size:.83rem;font-weight:700;letter-spacing:.14em}.npc-body{display:flex;align-items:flex-start;gap:16px;padding:16px;min-height:108px}.npc-portrait{width:96px;height:96px;flex-shrink:0;object-fit:contain;border:1px solid #4a2510;background:#080404;border-radius:3px}.npc-textarea{flex:1;display:flex;flex-direction:column;justify-content:center}.npc-text{color:#e8d8b8;font-size:.92rem;line-height:1.85;letter-spacing:.03em;min-height:56px}.npc-footer{display:flex;justify-content:space-between;align-items:center;padding:7px 16px 10px;border-top:1px solid #2a1208}.npc-progress{font-size:.65rem;color:#6a4828}.npc-hint{font-size:.72rem;color:#aa7744;animation:npcBlink 1.1s infinite}@keyframes npcBlink{0%,100%{opacity:1}50%{opacity:.15}}.npc-closebtn{background:transparent;border:1px solid #4a2510;color:#aa7744;padding:4px 14px;cursor:pointer;font-size:.72rem;font-family:inherit;border-radius:2px}.npc-closebtn:hover{background:#2a1008;color:#ffcc66}`;
  document.head.appendChild(s);
})();
TownScene.prototype._showSelfDialogue = function(key, lines, onClose) {
  const p = this.game.player;
  const PLAYER_PORTRAIT = {
    knight:   "images/portrait_Knight.png",
    mage:     "images/portrait_magician.png",
    magician: "images/portrait_magician.png",
    archer:   "images/portrait_archer.png",
    tanker:   "images/portrait_tanker.png",
    healer:   "images/portrait_healer.png",
  };
  NPC_DATA[key] = {
    name: p?.name || "용사",
    nameColor: "#ffe9a8",
    portrait: PLAYER_PORTRAIT[p?.type] || PLAYER_PORTRAIT.knight,
    dialogues: lines,
  };
  this.showNpcDialogue(key);

  if (onClose) {
    const waitClose = setInterval(() => {
      if (!document.getElementById("npcDialogueBox")) {
        clearInterval(waitClose);
        onClose();
      }
    }, 300);
  }
};

TownScene.prototype.showNpcDialogue = function(npcId) {
  const npc=NPC_DATA[npcId]; if(!npc)return;
  document.getElementById("npcDialogueBox")?.remove();

  // ── NPC 전신 이미지 맵 (슬롯 표시용) ──
  const NPC_BODY = {
    merchant:                      "images/sd_merchant.png",
    merchant_after_battle:         "images/sd_merchant.png",
    village_chief:                 "images/Silvia_front.png",
    village_chief_invest_start:    "images/Silvia_front.png",
    village_chief_invest_bustling: "images/Silvia_front.png",
    village_chief_invest_complete: "images/Silvia_front.png",
    king:                          "images/King_Edward_III_SIDE.png",
    healer:                        "images/sd_healer.png",
    tanker:                        "images/SD_Tanker.png",
    mage_party:                    "images/sd_magician.png",
    archer:                        "images/sd_archer.png",
    dealer:                        "images/sd_knight.png",
    // 합류 대화용
    join_healer:     "images/sd_healer.png",
    join_tanker:     "images/SD_Tanker.png",
    join_mage_party: "images/sd_magician.png",
    join_archer:     "images/sd_archer.png",
    join_dealer:     "images/sd_knight.png",
    // 레벨업 반응용
    levelup_5_healer:      "images/sd_healer.png",
    levelup_10_healer:     "images/sd_healer.png",
    levelup_15_healer:     "images/sd_healer.png",
    levelup_20_healer:     "images/sd_healer.png",
    levelup_25_healer:     "images/sd_healer.png",
    levelup_max_healer:    "images/sd_healer.png",
    levelup_5_tanker:      "images/SD_Tanker.png",
    levelup_10_tanker:     "images/SD_Tanker.png",
    levelup_15_tanker:     "images/SD_Tanker.png",
    levelup_20_tanker:     "images/SD_Tanker.png",
    levelup_25_tanker:     "images/SD_Tanker.png",
    levelup_max_tanker:    "images/SD_Tanker.png",
    levelup_5_mage_party:  "images/sd_magician.png",
    levelup_10_mage_party: "images/sd_magician.png",
    levelup_15_mage_party: "images/sd_magician.png",
    levelup_20_mage_party: "images/sd_magician.png",
    levelup_25_mage_party: "images/sd_magician.png",
    levelup_max_mage_party:"images/sd_magician.png",
    levelup_5_archer:      "images/sd_archer.png",
    levelup_10_archer:     "images/sd_archer.png",
    levelup_15_archer:     "images/sd_archer.png",
    levelup_20_archer:     "images/sd_archer.png",
    levelup_25_archer:     "images/sd_archer.png",
    levelup_max_archer:    "images/sd_archer.png",
    levelup_5_dealer:      "images/sd_knight.png",
    levelup_10_dealer:     "images/sd_knight.png",
    levelup_15_dealer:     "images/sd_knight.png",
    levelup_20_dealer:     "images/sd_knight.png",
    levelup_25_dealer:     "images/sd_knight.png",
    levelup_max_dealer:    "images/sd_knight.png",
    // 퀘스트 의뢰인
    qaccept_q_slime:      "images/sd_merchant.png",
    qaccept_q_goblin:     "images/sd_merchant.png",
    qaccept_q_skeleton:   "images/portrait_Knight.png",
    qaccept_q_orc:        "images/sd_merchant.png",
    qaccept_q_orc2:       "images/Silvia_front.png",
    qaccept_q_guardian:   "images/King_Edward_III_SIDE.png",
    qcomplete_q_slime:    "images/sd_merchant.png",
    qcomplete_q_goblin:   "images/sd_merchant.png",
    qcomplete_q_skeleton: "images/portrait_Knight.png",
    qcomplete_q_orc:      "images/sd_merchant.png",
    qcomplete_q_orc2:     "images/Silvia_front.png",
    qcomplete_q_guardian: "images/King_Edward_III_SIDE.png",
    // 공주 알현/마일스톤
    princess_talk_0:        "images/Silvia_front.png",
    princess_talk_25:       "images/Silvia_front.png",
    princess_talk_50:       "images/Silvia_front.png",
    princess_talk_75:       "images/Silvia_front.png",
    princess_talk_100:      "images/Silvia_front.png",
    princess_milestone_25:  "images/Silvia_front.png",
    princess_milestone_50:  "images/Silvia_front.png",
    princess_milestone_75:  "images/Silvia_front.png",
    princess_milestone_100: "images/Silvia_front.png",
  };

  // ── 플레이어 이미지 맵 ──
  const PLAYER_BODY = {
    knight:   "images/sd_knight.png",
    mage:     "images/sd_magician.png",
    magician: "images/sd_magician.png",
    archer:   "images/sd_archer.png",
    tanker:   "images/SD_Tanker.png",
    healer:   "images/sd_healer.png",
  };
  const PLAYER_FALLBACK = {
    knight:   "images/sd_knight_walk_1.png",
    mage:     "images/sd_magician_walk_1.png",
    magician: "images/sd_magician_walk_1.png",
    archer:   "images/sd_archer_walk_1.png",
    tanker:   "images/sd_tanker_walk_1.png",
    healer:   "images/sd_healer_walk_1.png",
  };

  const p = this.game?.player;

  // ── 슬롯에 NPC + 플레이어 이미지 표시 ──
  const showSlotImg = (slotId, src, fallback, delayClass) => {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    if (!src) { slot.innerHTML = ""; return; }
    const img = document.createElement("img");
    img.className = `tc-img${delayClass ? " " + delayClass : ""}`;
    img.alt = ""; img.src = src;
    if (fallback) img.onerror = () => { img.src = fallback; img.onerror = null; };
    slot.innerHTML = "";
    slot.appendChild(img);
  };

  const npcBody    = (npcId.startsWith("self_") ? null : (NPC_BODY[npcId] || npc.portrait));
  const playerType = p?.type || "knight";
  const playerBody = PLAYER_BODY[playerType];
  const playerFb   = PLAYER_FALLBACK[playerType] || "images/sd_knight_walk_1.png";

  // 슬롯1: 플레이어(주인공), 슬롯2: 비어있음, 슬롯3: NPC 캐릭터
  showSlotImg("townCharSlot1", playerBody, playerFb, "");
  showSlotImg("townCharSlot2", null, null, "");
  showSlotImg("townCharSlot3", npcBody, null, "delay1");

  let lineIdx=0,charIdx=0,typeTimer=null;
  const box=document.createElement("div"); box.id="npcDialogueBox";
  box.innerHTML=`<div class="npc-wrap"><div class="npc-namebar" style="color:${npc.nameColor||'#44dd88'}">${npc.name}</div><div class="npc-body"><img class="npc-portrait" src="${npc.portrait}" onerror="this.style.display='none'" alt="${npc.name}"/><div class="npc-textarea"><div class="npc-text" id="npcText"></div></div></div><div class="npc-footer"><span class="npc-progress" id="npcProg"></span><span class="npc-hint" id="npcHint">▼ 클릭하여 계속</span><button class="npc-closebtn" id="npcClose">✕ 닫기</button></div></div>`;
  document.body.appendChild(box);
  const textEl=document.getElementById("npcText"),progEl=document.getElementById("npcProg"),hintEl=document.getElementById("npcHint");
  const lastLine=()=>lineIdx>=npc.dialogues.length-1;
  const updateUI=()=>{progEl.textContent=`${lineIdx+1}/${npc.dialogues.length}`;hintEl.textContent=lastLine()?"":"▼ 클릭하여 계속";document.getElementById("npcClose").textContent=lastLine()?"✕ 닫기 [Enter]":"✕ 닫기";};
  const typeLine=()=>{clearTimeout(typeTimer);charIdx=0;hintEl.textContent="";textEl.textContent="";updateUI();const line=npc.dialogues[lineIdx]||"";const tick=()=>{if(charIdx<line.length){textEl.textContent+=line[charIdx++];typeTimer=setTimeout(tick,26);}else {
      updateUI();
      // 공략 퀘스트 언급 시 버튼 반짝이기
      if (line.includes("공략 퀘스트")) {
        const btn = document.getElementById("tn-guide");
        if (btn) {
          // JS 직접 스타일 토글 (CSS @keyframes 미사용)
          let tick = 0;
          const iv = setInterval(() => {
            tick++;
            if (tick % 2 === 1) {
              btn.style.boxShadow  = "0 0 10px 5px rgba(136,255,136,.55)";
              btn.style.borderColor = "#ccffcc";
              btn.style.color       = "#ccffcc";
            } else {
              btn.style.boxShadow  = "none";
              btn.style.borderColor = "#88ff88";
              btn.style.color       = "#88ff88";
            }
          }, 500);
          setTimeout(() => {
            clearInterval(iv);
            btn.style.boxShadow  = "";
            btn.style.borderColor = "";
            btn.style.color       = "";
          }, 6000);
        }
      }
    }};tick();};
  const advance=()=>{const line=npc.dialogues[lineIdx]||"";if(charIdx<line.length){clearTimeout(typeTimer);textEl.textContent=line;charIdx=line.length;updateUI();return;}if(!lastLine()){lineIdx++;typeLine();}else closeBox();};

  // ── 닫기: 슬롯을 원래 플레이어/동료로 복원 ──
  const closeBox=()=>{
    clearTimeout(typeTimer);
    box.style.transition="opacity .25s";
    box.style.opacity="0";
    setTimeout(() => {
      box.remove();
      // 슬롯 복원
      if (this._renderTownCharacters) this._renderTownCharacters();
    }, 270);
    document.removeEventListener("keydown",onKey);
  };

  const onKey=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();advance();}if(e.key==="Escape")closeBox();};
  box.querySelector(".npc-wrap").addEventListener("click",advance);
  document.getElementById("npcClose").addEventListener("click",e=>{e.stopPropagation();closeBox();});
  document.addEventListener("keydown",onKey);
  typeLine();
};

TownScene.prototype._talkToPrincess = function() {
  const p = this.game.player;
  const today = new Date().toLocaleDateString("ko-KR");
  const aff = p.princessAffinity || 0;

  // 호감도 단계별 대화 ID 결정
  let npcId;
  if (aff >= 100)      npcId = "princess_talk_100";
  else if (aff >= 75)  npcId = "princess_talk_75";
  else if (aff >= 50)  npcId = "princess_talk_50";
  else if (aff >= 25)  npcId = "princess_talk_25";
  else                 npcId = "princess_talk_0";

  this.showNpcDialogue(npcId);

  // 하루 1회만 호감도 상승
  if (p.princessTalkDate !== today) {
    p.princessTalkDate = today;
    p.princessAffinity = Math.min(100, aff + 3);
    this.game.log(`👸 공주 호감도 +3 (현재 ${p.princessAffinity})`);

    // 마일스톤 이벤트 체크 (대화 종료 후)
    const waitClose = setInterval(() => {
      if (!document.getElementById("npcDialogueBox")) {
        clearInterval(waitClose);
        this._checkPrincessMilestone();
      }
    }, 300);
  }
};

TownScene.prototype._checkPrincessMilestone = function() {
  const p = this.game.player;
  const aff = p.princessAffinity || 0;
  const ev = p.princessEvents || (p.princessEvents = {});

  if (aff >= 25 && !ev.aff25) {
    ev.aff25 = true;
    p.maxHp += 15; p.hp = Math.min(p.hp + 15, p.maxHp + (p.bonusHp||0));
    this.game.log("👸 공주와 친밀해졌다! 최대 HP +15");
    setTimeout(() => this.showNpcDialogue("princess_milestone_25"), 400);
  } else if (aff >= 50 && !ev.aff50) {
    ev.aff50 = true;
    p.bonusAttack = (p.bonusAttack||0) + 8;
    this.game.log("👸 공주가 왕실 검을 빌려주었다! 공격력 +8");
    setTimeout(() => this.showNpcDialogue("princess_milestone_50"), 400);
  } else if (aff >= 75 && !ev.aff75) {
    ev.aff75 = true;
    p.bonusHp = (p.bonusHp||0) + 50;
    this.game.log("👸 공주의 부적 효과! 최대 HP +50");
    setTimeout(() => this.showNpcDialogue("princess_milestone_75"), 400);
  } else if (aff >= 100 && !ev.aff100) {
    ev.aff100 = true;
    p.bonusAttack = (p.bonusAttack||0) + 15;
    p.bonusHp     = (p.bonusHp||0) + 100;
    this.game.log("👸 공주의 진심! 왕실 인장 가호 — 공격력 +15, HP +100");
    setTimeout(() => this.showNpcDialogue("princess_milestone_100"), 400);
  }
};

TownScene.prototype._openGuideQuestModal = function() {
  // 이장 미만남 → 이장 대화 먼저
  if (!this.game.player.metVillageChief) {
    this.game.player.metVillageChief = true;
    this.showNpcDialogue("village_chief");
    // 대화 후 모달 열기
    const orig = document.getElementById("npcDialogueBox");
    const waitClose = setInterval(() => {
      if (!document.getElementById("npcDialogueBox")) {
        clearInterval(waitClose);
        setTimeout(() => this._renderGuideQuestModal(), 400);
      }
    }, 300);
    return;
  }
  this._renderGuideQuestModal();
};

TownScene.prototype._renderGuideQuestModal = function() {
  const modal = document.getElementById("guideQuestModal");
  if (!modal) return;
  modal.style.display = "block";

  // 모달 열릴 때 캐릭터 슬롯 비우기
  ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // 모달 닫기 버튼에 슬롯 복원 연결 (중복 방지)
  const closeBtn = document.getElementById("guideQuestClose");
  if (closeBtn && !closeBtn._slotRestored) {
    closeBtn._slotRestored = true;
    closeBtn.addEventListener("click", () => {
      if (this._renderTownCharacters) this._renderTownCharacters();
    });
  }

  const p = this.game.player;
  const today = new Date().toLocaleDateString("ko-KR");

  // 일일 투자 리셋
  if (!p.guideDailyDate || p.guideDailyDate !== today) {
    p.guideDailyDate    = today;
    p.guideDailyInvest  = 0;
    p.guideDailyBattle  = 0;
    p.guideDailyPotion  = false;
  }

  // ── 공략 퀘스트 정의 ──
  const GUIDE_QUESTS = [
    { id:"lv20",    icon:"⚔", label:"Lv.20 달성",              desc:"심연 던전 입장 전 필수 레벨",     reward:"공격력 +10",   done: p.level >= 20 },
    { id:"invest",  icon:"🏗", label:"마을에 총 100G 이상 투자", desc:"마을 성장 → 능력치 보너스 획득",  reward:"마을 성장",    done: (p.bank?.totalInvested||0) >= 100 },
    { id:"party3",  icon:"👥", label:"동료 3명 모집",             desc:"전투 협력 체계 구축",            reward:"전투력 상승",  done: !!(p.party && p.party2 && p.party3) },
    { id:"bond75",  icon:"❤", label:"동료 호감도 75+ 달성",       desc:"유대 이벤트로 공격력 보너스",    reward:"공격력 +5",    done: Object.values(p.affinity||{}).some(v=>v>=75) },
    { id:"potions", icon:"💊", label:"회복 물약 3개 이상 보유",   desc:"장기전 생존 필수",               reward:"생존력 향상",  done: (p.inventory||[]).filter(i=>i.type==="potion").length >= 3 },
    { id:"abyss",   icon:"⚫", label:"심연 던전 해금 (수호자 처치)", desc:"일반 던전 3층 수호자 처치 필요", reward:"마왕 도전 가능", done: !!p.abyssUnlocked },
  ];

  // ── 일일 퀘스트 정의 ──
  const DAILY_QUESTS = [
    { id:"d_invest", icon:"💰", label:"오늘 100G 투자하기",   done: (p.guideDailyInvest||0) >= 100, cur: p.guideDailyInvest||0, target:100 },
    { id:"d_battle", icon:"⚔", label:"오늘 전투 3회 승리하기", done: (p.guideDailyBattle||0) >= 3,  cur: p.guideDailyBattle||0,  target:3   },
    { id:"d_potion", icon:"💊", label:"회복 물약 구매/보유 확인", done: (p.inventory||[]).some(i=>i.type==="potion"), cur:0, target:1 },
  ];

  const doneCount = GUIDE_QUESTS.filter(q=>q.done).length;
  const pct = Math.floor(doneCount / GUIDE_QUESTS.length * 100);

  // 진행도
  const bar  = document.getElementById("guideProgressBar");
  const prog = document.getElementById("guideProgress");
  if (bar)  bar.style.width  = `${pct}%`;
  if (prog) prog.textContent = `${doneCount}/${GUIDE_QUESTS.length} 완료`;

  // 이장 메시지
  const msg = document.getElementById("guideChiefMsg");
  if (msg) {
    if (doneCount === GUIDE_QUESTS.length)
      msg.textContent = "완벽해요! 모든 준비가 끝났어요. 이제 심연 던전에서 마왕을 쓰러뜨려 주세요! 🔥";
    else if (doneCount >= 4)
      msg.textContent = "거의 다 왔어요! 남은 항목만 완료하면 마왕과 맞설 수 있어요. 조금만 더 힘내요!";
    else
      msg.textContent = "마왕 다르카스를 쓰러뜨리려면 철저한 준비가 필요해요. 아래 항목을 하나씩 완료해 주세요!";
  }

  // 완료 메시지
  const completeMsg = document.getElementById("guideCompleteMsg");
  if (completeMsg) completeMsg.style.display = doneCount === GUIDE_QUESTS.length ? "block" : "none";

  // 공략 퀘스트 목록 렌더
  const list = document.getElementById("guideQuestList");
  if (list) {
    list.innerHTML = "";
    GUIDE_QUESTS.forEach(q => {
      const row = document.createElement("div");
      row.style.cssText = [
        "display:flex;align-items:center;gap:12px;padding:12px 14px;",
        "border-radius:6px;border:1px solid",
        q.done ? "#2a5a2a;background:rgba(68,170,68,.08);" : "#2a1828;background:rgba(255,255,255,.03);",
      ].join("");
      row.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0;">${q.done ? "✅" : "☐"}</span>
        <span style="font-size:1.2rem;flex-shrink:0;">${q.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;font-weight:700;color:${q.done?"#88ff88":"var(--text)"};margin-bottom:2px;">${q.label}</div>
          <div style="font-size:.68rem;color:var(--text-dim);">${q.desc}</div>
        </div>
        <div style="font-size:.65rem;color:#ffcc44;text-align:right;flex-shrink:0;">보상<br>${q.reward}</div>`;
      list.appendChild(row);
    });
  }

  // 일일 퀘스트 렌더
  const dlist = document.getElementById("dailyQuestList");
  if (dlist) {
    dlist.innerHTML = "";
    DAILY_QUESTS.forEach(q => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a1828;font-size:.78rem;";
      const progress = q.target > 1 ? ` (${q.cur}/${q.target})` : "";
      row.innerHTML = `
        <span style="font-size:1rem;">${q.done ? "✅" : "☐"}</span>
        <span>${q.icon}</span>
        <span style="flex:1;color:${q.done?"#88ff88":"var(--text)"};">${q.label}${progress}</span>
        <span style="font-size:.65rem;color:var(--text-dim);">${today}</span>`;
      dlist.appendChild(row);
    });
  }
};
TownScene.prototype._renderTownCharacters = function() {
  // 대화창 / 상점·인벤 오버레이 / 은행 화면이 열려있는 동안은 슬롯을 덮어쓰지 않음
  if (document.getElementById("npcDialogueBox")) return;
  const shopOv = document.getElementById("shopInvenOverlay");
  if (shopOv && shopOv.style.display !== "none") return;
  const bankSc = document.getElementById("bankScreen");
  if (bankSc && bankSc.style.display !== "none") return;

  const p = this.game.player;

  // GIF 우선, 없으면 walk_1 PNG
  const CHAR_IMG = {
    knight:   "images/sd_knight.png",
    night:    "images/sd_knight.png",
    warrior:  "images/SD_Tanker.png",
    mage:     "images/sd_magician.png",
    magician: "images/sd_magician.png",
    archer:   "images/sd_archer.png",
    tanker:   "images/SD_Tanker.png",
    healer:   "images/sd_healer.png",
  };
  const CHAR_FALLBACK = {
    knight:   "images/sd_knight_walk_1.png",
    night:    "images/sd_knight_walk_1.png",
    warrior:  "images/sd_tanker_walk_1.png",
    mage:     "images/sd_magician_walk_1.png",
    magician: "images/sd_magician_walk_1.png",
    archer:   "images/sd_archer_walk_1.png",
    tanker:   "images/sd_tanker_walk_1.png",
    healer:   "images/sd_healer_walk_1.png",
  };
  const COMP_IMG = {
    healer:     "images/sd_healer.png",
    tanker:     "images/SD_Tanker.png",
    mage_party: "images/sd_magician.png",
    archer:     "images/sd_archer.png",
    dealer:     "images/sd_knight.png",
  };
  const COMP_FALLBACK = {
    healer:     "images/sd_healer_walk_1.png",
    tanker:     "images/sd_tanker_walk_1.png",
    mage_party: "images/sd_magician_walk_1.png",
    archer:     "images/sd_archer_walk_1.png",
    dealer:     "images/sd_knight_walk_1.png",
  };

  // CSS 애니메이션 (최초 1회 주입)
  if (!document.getElementById("townCharCSS")) {
    const s = document.createElement("style");
    s.id = "townCharCSS";
    s.textContent = `
      .tc-img { width:100%; max-height:240px; object-fit:contain;
        filter:drop-shadow(0 6px 24px rgba(0,0,0,.85));
        animation:tcBob 3s ease-in-out infinite; }
      .tc-img.delay1 { animation-delay:.5s; }
      .tc-img.delay2 { animation-delay:1s; }
      @keyframes tcBob {
        0%,100% { transform:translateY(0); }
        50%      { transform:translateY(-10px); }
      }`;
    document.head.appendChild(s);
  }

  const setSlot = (slotId, gifSrc, fallback, delayClass) => {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    if (!gifSrc && !fallback) { slot.innerHTML = ""; return; }

    const ex = slot.querySelector("img");
    const target = gifSrc || fallback;
    if (ex && (ex.src.endsWith(gifSrc) || ex.src.endsWith(fallback))) return;

    const img = document.createElement("img");
    img.className = `tc-img${delayClass ? " " + delayClass : ""}`;
    img.alt = "";
    img.src = gifSrc || fallback;
    if (gifSrc && fallback) {
      img.onerror = () => { img.src = fallback; img.onerror = null; };
    }
    slot.innerHTML = "";
    slot.appendChild(img);
  };

  setSlot("townCharSlot1",
    CHAR_IMG[p.type],
    CHAR_FALLBACK[p.type] || CHAR_FALLBACK.knight,
    "");
  setSlot("townCharSlot2",
    p.party  ? COMP_IMG[p.party]  : null,
    p.party  ? COMP_FALLBACK[p.party]  : null,
    "delay1");
  const comp2 = p.party2 || p.party3;
  setSlot("townCharSlot3",
    comp2 ? COMP_IMG[comp2]  : null,
    comp2 ? COMP_FALLBACK[comp2] : null,
    "delay2");
};

window.TownScene = TownScene;
window.getTownStage = getTownStage;
window.applyBattleInterest = applyBattleInterest;
