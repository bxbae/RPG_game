// ═══════════════════════════════════════════════════
//  card-game.js  — 주막 카드 게임 미니게임 (하이카드 승부)
//  동료와 3라운드 동안 카드를 뽑아 더 높은 카드를 낸 쪽이
//  해당 라운드를 가져가며, 3라운드 종료 후 승수를 비교한다.
// ═══════════════════════════════════════════════════
"use strict";

// ── 카드 덱 정의 ───────────────────────────────────
const CARD_RANKS = [
  { value:2,  label:"2"  }, { value:3,  label:"3"  }, { value:4,  label:"4"  },
  { value:5,  label:"5"  }, { value:6,  label:"6"  }, { value:7,  label:"7"  },
  { value:8,  label:"8"  }, { value:9,  label:"9"  }, { value:10, label:"10" },
  { value:11, label:"J"  }, { value:12, label:"Q"  }, { value:13, label:"K"  },
  { value:14, label:"A"  },
];
const CARD_SUITS = [
  { symbol:"♠", color:"black" },
  { symbol:"♥", color:"red"   },
  { symbol:"♦", color:"red"   },
  { symbol:"♣", color:"black" },
];

function cgDrawCard() {
  const rank = CARD_RANKS[Math.floor(Math.random() * CARD_RANKS.length)];
  const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
  return { value: rank.value, label: rank.label, suit: suit.symbol, color: suit.color };
}

// 동료별 초상화 (동료 모집 화면과 동일한 매핑 사용)
const CARD_GAME_PORTRAITS = {
  healer:     "images/portrait_healer.png",
  tanker:     "images/portrait_tanker.png",
  mage_party: "images/portrait_magician.png",
  archer:     "images/portrait_archer.png",
  dealer:     "images/portrait_Knight.png",
};

// ── 카드 게임 엔진 (순수 로직, DOM 의존 없음) ──────────
class CardMatch {
  constructor(maxRounds = 3) {
    this.maxRounds   = maxRounds;
    this.round       = 0;
    this.playerWins  = 0;
    this.oppWins     = 0;
    this.ties        = 0;
    this.finished    = false;
    this.gaveUp      = false;
  }

  playRound() {
    if (this.finished) return null;
    const playerCard = cgDrawCard();
    const oppCard    = cgDrawCard();
    this.round++;

    let outcome;
    if (playerCard.value > oppCard.value)      { this.playerWins++; outcome = "win";  }
    else if (playerCard.value < oppCard.value) { this.oppWins++;    outcome = "lose"; }
    else                                       { this.ties++;       outcome = "tie";  }

    if (this.round >= this.maxRounds) this.finished = true;
    return { playerCard, oppCard, outcome, round: this.round, finished: this.finished };
  }

  giveUp() {
    this.gaveUp   = true;
    this.finished = true;
  }

  // "win" | "draw" | "lose" | "giveup"
  matchResult() {
    if (this.gaveUp) return "giveup";
    if (this.playerWins > this.oppWins) return "win";
    if (this.playerWins === this.oppWins) return "draw";
    return "lose";
  }
}

window.CardMatch           = CardMatch;
window.cgDrawCard          = cgDrawCard;
window.CARD_GAME_PORTRAITS = CARD_GAME_PORTRAITS;

// ── 카드 게임 전용 CSS 1회 주입 ────────────────────────
(function injectCardGameCSS() {
  if (document.getElementById("cardGameCSS")) return;
  const s = document.createElement("style");
  s.id = "cardGameCSS";
  s.textContent = `
    .cg-box{position:relative;max-width:380px;text-align:center;}
    .cg-close-x{position:absolute;top:8px;right:10px;width:auto!important;margin:0!important;
      background:transparent!important;border:none!important;color:var(--text-dim);font-size:1rem;
      cursor:pointer;padding:4px 8px!important;line-height:1;}
    .cg-close-x:hover{color:var(--gold2);border:none!important;}
    .cg-opponent{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;}
    .cg-opp-portrait{width:48px;height:48px;object-fit:contain;border-radius:6px;border:1px solid var(--border2);background:rgba(255,255,255,.04);}
    .cg-opp-name{font-size:.8rem;color:var(--gold2);}
    .cg-round-info{display:flex;justify-content:space-between;font-size:.7rem;
      color:var(--text-dim);margin-bottom:14px;padding:0 2px;}
    .cg-table{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:14px;}
    .cg-slot{display:flex;flex-direction:column;align-items:center;gap:6px;}
    .cg-slot-label{font-size:.66rem;color:var(--text-dim);}
    .cg-vs{font-size:.8rem;color:var(--text-dim);font-weight:700;}
    .cg-card{width:62px;height:90px;border-radius:6px;background:#f4ecd8;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.5);border:1px solid #c8b89a;
      transition:transform .15s;}
    .cg-card.black{color:#181818;}
    .cg-card.red{color:#b3261e;}
    .cg-card.cg-facedown{background:linear-gradient(135deg,#3a1830,#180a16);
      color:var(--gold);font-size:1.6rem;border:1px solid var(--border2);}
    .cg-card-rank{font-size:1.25rem;line-height:1.1;}
    .cg-card-suit{font-size:1rem;margin-top:2px;}
    .cg-result-msg{min-height:20px;font-size:.76rem;color:var(--text);margin-bottom:8px;}
    .cg-final-msg{margin:6px 0 14px;padding:12px;background:rgba(255,255,255,.04);
      border:1px solid var(--border2);border-radius:6px;}
    .cg-final-title{font-size:1.05rem;font-weight:700;color:var(--gold2);margin-bottom:4px;}
    .cg-final-sub{font-size:.72rem;color:var(--text-dim);margin-bottom:6px;}
    .cg-final-reward{font-size:.8rem;color:#ff9bb8;font-weight:700;}
    .cg-btn-row{display:flex;gap:8px;margin-top:4px;}
    .cg-btn{flex:1;background:#1a1020;border:1px solid var(--gold);color:var(--gold2);
      padding:10px 10px;cursor:pointer;font-family:inherit;font-size:.78rem;
      border-radius:4px;transition:.15s;width:auto;}
    .cg-btn:hover{background:#2a1830;}
    .cg-btn-danger{border-color:#a82020;color:#ff9999;}
    .cg-btn-danger:hover{background:rgba(168,32,32,.18);}
  `;
  document.head.appendChild(s);
})();

// ── TownScene 연동 ────────────────────────────────────

// 여관 모달 열기
TownScene.prototype._openInnModal = function () {
  const modal = document.getElementById("tnInnModal");
  if (!modal) return;
  const g = this.game, p = g.player;

  // 휴식 비용 미리보기 (restAtInn()과 동일한 산식)
  const restBtn = document.getElementById("tnInnRest");
  if (restBtn && p) {
    const maxHp = p.maxHp + p.bonusHp;
    const cost  = Math.max(50, Math.floor((maxHp - p.hp) * 2));
    restBtn.textContent = p.hp >= maxHp
      ? "🛏 휴식하기 (HP 가득 찼습니다)"
      : `🛏 휴식하기 (${cost}G, HP·동료 회복)`;
  }

  // 동료가 없으면 카드 게임 버튼 비활성화
  const cardBtn = document.getElementById("tnInnCardGame");
  if (cardBtn) {
    const enabled = !!(p && p.party);
    cardBtn.disabled   = !enabled;
    cardBtn.style.opacity = enabled ? "1" : "0.45";
    cardBtn.title = enabled ? "" : "동료를 먼저 모집해야 카드 게임을 할 수 있어요";
  }

  modal.style.display = "flex";
};

// 카드 게임 시작
TownScene.prototype._openCardGame = function () {
  const g = this.game, p = g.player;
  if (!p || !p.party) {
    g.showNarrative("🃏 동료가 있어야 카드 게임을 할 수 있어요.\n먼저 동료를 모집해보세요!", 2500);
    return;
  }

  const innModal = document.getElementById("tnInnModal");
  if (innModal) innModal.style.display = "none";

  const mem = PARTY_MEMBERS[p.party] || { name: "동료" };
  this._cgMatch = new CardMatch(3);

  const oppInfo = document.getElementById("cgOpponentInfo");
  if (oppInfo) {
    const portrait = CARD_GAME_PORTRAITS[p.party] || "";
    oppInfo.innerHTML = `
      ${portrait ? `<img src="${portrait}" class="cg-opp-portrait" onerror="this.style.display='none'"/>` : ""}
      <div class="cg-opp-name">${mem.name}와(과)의 한 판!</div>`;
  }
  const oppLabel = document.getElementById("cgOppLabel");
  if (oppLabel) oppLabel.textContent = mem.name;

  const finalMsg = document.getElementById("cgFinalMsg");
  if (finalMsg) finalMsg.style.display = "none";

  this._cgRenderRound(null);

  const modal = document.getElementById("cgModal");
  if (modal) modal.style.display = "flex";
};

// 라운드 결과를 화면에 반영 (lastRound === null 이면 초기 상태)
TownScene.prototype._cgRenderRound = function (lastRound) {
  const match = this._cgMatch;
  if (!match) return;
  const q = id => document.getElementById(id);

  const roundLabel = q("cgRoundLabel");
  if (roundLabel) {
    const shown = Math.min(match.round + (match.finished ? 0 : 1), match.maxRounds);
    roundLabel.textContent = `라운드 ${shown} / ${match.maxRounds}`;
  }
  const scoreLabel = q("cgScoreLabel");
  if (scoreLabel) scoreLabel.textContent = `승 ${match.playerWins} · 무 ${match.ties} · 패 ${match.oppWins}`;

  const renderCard = (el, card) => {
    if (!el) return;
    if (!card) { el.className = "cg-card cg-facedown"; el.textContent = "🂠"; return; }
    el.className = `cg-card ${card.color}`;
    el.innerHTML = `<span class="cg-card-rank">${card.label}</span><span class="cg-card-suit">${card.suit}</span>`;
  };

  if (lastRound) {
    renderCard(q("cgPlayerCard"), lastRound.playerCard);
    renderCard(q("cgOppCard"),    lastRound.oppCard);
    const msgMap = { win: "✅ 이번 라운드 승리!", lose: "❌ 이번 라운드 패배...", tie: "➖ 이번 라운드 무승부" };
    const resultMsg = q("cgResultMsg");
    if (resultMsg) resultMsg.textContent = `라운드 ${lastRound.round}: ${msgMap[lastRound.outcome]}`;
  } else {
    renderCard(q("cgPlayerCard"), null);
    renderCard(q("cgOppCard"), null);
    const resultMsg = q("cgResultMsg");
    if (resultMsg) resultMsg.textContent = "카드를 뽑아 승부를 시작하세요!";
  }

  const activeBtns   = q("cgActiveButtons");
  const finishedBtns = q("cgFinishedButtons");
  if (activeBtns)   activeBtns.style.display   = match.finished ? "none" : "flex";
  if (finishedBtns) finishedBtns.style.display = match.finished ? "flex" : "none";
};

// 카드 뽑기 버튼
TownScene.prototype._cgDrawRound = function () {
  const match = this._cgMatch;
  if (!match || match.finished) return;
  const result = match.playRound();
  this._cgRenderRound(result);
  if (match.finished) this._cgFinishMatch();
};

// 포기 버튼
TownScene.prototype._cgGiveUp = function () {
  const match = this._cgMatch;
  if (!match || match.finished) return;
  match.giveUp();

  const resultMsg = document.getElementById("cgResultMsg");
  if (resultMsg) resultMsg.textContent = "🚪 승부를 포기했습니다...";
  const activeBtns   = document.getElementById("cgActiveButtons");
  const finishedBtns = document.getElementById("cgFinishedButtons");
  if (activeBtns)   activeBtns.style.display   = "none";
  if (finishedBtns) finishedBtns.style.display = "flex";

  this._cgFinishMatch();
};

// 매치 종료 처리 — 호감도 지급, 업적 카운터 갱신
TownScene.prototype._cgFinishMatch = function () {
  const g = this.game, p = g.player;
  const match = this._cgMatch;
  if (!match || !p) return;

  const result = match.matchResult(); // win | draw | lose | giveup
  const AFFINITY_REWARD = { win: 5, draw: 2, lose: 1, giveup: 1 };
  const RESULT_TITLE = {
    win:    "🏆 승리!",
    draw:   "🤝 무승부",
    lose:   "💔 패배",
    giveup: "🚪 포기",
  };

  const wantAff = AFFINITY_REWARD[result] || 0;
  const gained  = (typeof g.grantPartyAffinity === "function")
    ? g.grantPartyAffinity(wantAff)
    : 0;

  // ── 미니게임 업적 카운터 (achievement-system.js의 카드 게임 업적과 연동) ──
  if (result === "win") {
    p._cardWins   = (p._cardWins || 0) + 1;
    p._cardStreak = (p._cardStreak || 0) + 1;
  } else {
    p._cardStreak = 0;
  }
  g.achievementManager?.check?.(g);
  g.save?.();

  const finalMsg = document.getElementById("cgFinalMsg");
  if (finalMsg) {
    finalMsg.style.display = "block";
    finalMsg.innerHTML = `
      <div class="cg-final-title">${RESULT_TITLE[result] || ""}</div>
      <div class="cg-final-sub">${match.playerWins}승 ${match.ties}무 ${match.oppWins}패</div>
      <div class="cg-final-reward">${gained > 0 ? `❤ 호감도 +${gained}` : "함께한 시간만으로도 의미가 있었어요"}</div>`;
  }

  this.render();
};

// 다시 하기
TownScene.prototype._cgPlayAgain = function () {
  const g = this.game, p = g.player;
  if (!p || !p.party) { this._closeCardGameModal(); return; }
  this._cgMatch = new CardMatch(3);

  const finalMsg = document.getElementById("cgFinalMsg");
  if (finalMsg) finalMsg.style.display = "none";

  this._cgRenderRound(null);
};

// 카드 게임 모달 닫기
TownScene.prototype._closeCardGameModal = function () {
  const modal = document.getElementById("cgModal");
  if (modal) modal.style.display = "none";
  this._cgMatch = null;
};
