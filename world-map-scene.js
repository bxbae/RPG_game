// ═══════════════════════════════════════════════════
//  world-map-scene.js — WorldMapScene
//
//  RegionManager 의 데이터를 그대로 활용해 지역들을 카드로 보여준다.
//  각 카드: 아이콘 + 이름 + 설명 + 번영도(재건도) 막대 + 잠금/완료/현재 배지.
//  - 해금된 지역 카드: 클릭 가능(선택 → game._onRegionSelected 훅 호출).
//  - 잠긴 지역 카드: 흐릿하게, 해금 조건 안내 표시.
//
//  이 단계(2번)는 "보여주기 + 선택 가능 표시"까지가 목표.
//  실제 선택 확정/이동(3·4번)은 game 쪽 훅에서 이어 구현한다.
// ═══════════════════════════════════════════════════
"use strict";

class WorldMapScene {
  constructor(game) {
    this.game = game;
  }

  mount(container) {
    if (!container) return;
    const g  = this.game;
    const rm = g.regionManager;
    if (!rm) { container.innerHTML = `<div style="color:#fff;padding:40px;">RegionManager 없음</div>`; return; }

    rm.ensureState(g.player);
    this._injectCSS();
    container.innerHTML = this._buildHTML();
    this._bindEvents(container);
  }

  // 현재 플레이어 상태 기준으로 카드 목록 다시 그림
  refresh() {
    const c = this.game.containers?.worldmap;
    if (c) { c.innerHTML = this._buildHTML(); this._bindEvents(c); }
  }

  _buildHTML() {
    const g  = this.game;
    const rm = g.regionManager;
    const p  = g.player;
    const regions = rm.list(p);
    const kingdom = rm.kingdomProsperity(p);
    const done    = rm.completedCount(p);
    const total   = regions.filter(r => !r.excludeFromKingdomCalc).length;

    const cards = regions.map(r => this._regionCard(r)).join("");
    const goldBonusPct = Math.floor(kingdom * 0.2);

    return `
      <div class="wm-root">
        <header class="wm-header">
          <button class="wm-back" id="wmBack">← 마을로</button>
          <div class="wm-title-wrap">
            <h1 class="wm-title">왕국 지도</h1>
            <p class="wm-subtitle">다음으로 구할 곳을 선택하세요</p>
          </div>
          <div class="wm-kingdom">
            <div class="wm-kingdom-label">왕국 번영도</div>
            <div class="wm-kingdom-val">${kingdom}<span class="wm-kingdom-pct">%</span></div>
            <div class="wm-kingdom-sub">재건 완료 ${done}/${total}</div>
            ${goldBonusPct > 0 ? `<div class="wm-kingdom-bonus">💰 전투 골드 +${goldBonusPct}%</div>` : ""}
          </div>
        </header>

        <div class="wm-cards">
          ${cards}
        </div>
      </div>`;
  }

  _regionCard(r) {
    const locked    = !r.unlocked;
    const completed = r.completed;
    const current   = r.isCurrent;
    const prosp     = Math.max(0, Math.min(100, r.prosperity || 0));

    // 잠긴 지역: 해금 조건 안내
    let lockHint = "";
    if (locked && r.requires) {
      const req = this.game.regionManager.get(this.game.player, r.requires);
      lockHint = `<div class="wm-lock-hint">🔒 ${req?.name || r.requires} 재건 완료 시 해금</div>`;
    } else if (locked) {
      lockHint = `<div class="wm-lock-hint">🔒 아직 갈 수 없는 지역</div>`;
    }

    // 배지
    let badge = "";
    if (completed)    badge = `<span class="wm-badge wm-badge-done">재건 완료</span>`;
    else if (current) badge = `<span class="wm-badge wm-badge-current">현재 거점</span>`;
    else if (!locked) badge = `<span class="wm-badge wm-badge-active">재건 가능</span>`;

    // 번영도 막대 색: 완료=금색, 진행=청록, 0=회색
    const barClass = completed ? "wm-bar-done" : (prosp > 0 ? "wm-bar-progress" : "wm-bar-empty");

    const stateClass = locked ? "wm-card-locked" : (current ? "wm-card-current" : "wm-card-open");
    const clickable  = locked ? "" : `data-region="${r.id}" role="button" tabindex="0"`;
    const bgHTML = r.bgImage
      ? `<div class="wm-card-bg" style="background-image:url('${r.bgImage}');"></div>`
      : "";

    return `
      <div class="wm-card ${stateClass}" ${clickable}>
        ${bgHTML}
        <div class="wm-card-top">
          <span class="wm-icon">${r.icon || "📍"}</span>
          <div class="wm-name-wrap">
            <div class="wm-name">${r.name}</div>
            ${badge}
          </div>
        </div>
        <p class="wm-desc">${r.desc || ""}</p>
        ${lockHint}
        <div class="wm-prosp">
          <div class="wm-prosp-head">
            <span class="wm-prosp-label">재건도</span>
            <span class="wm-prosp-val">${prosp}%</span>
          </div>
          <div class="wm-prosp-track">
            <div class="wm-prosp-fill ${barClass}" style="width:${prosp}%;"></div>
          </div>
        </div>
        ${locked ? "" : `<div class="wm-card-cta">${current ? "이 거점 둘러보기 →" : "이 지역으로 →"}</div>`}
      </div>`;
  }

  _bindEvents(container) {
    container.querySelector("#wmBack")?.addEventListener("click", () => {
      this.game._fromWorldMapToTown?.() || this.game._toTown?.();
    });

    container.querySelectorAll("[data-region]").forEach(el => {
      const id = el.getAttribute("data-region");
      const handler = () => this._onSelect(id);
      el.addEventListener("click", handler);
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
      });
    });
  }

  // 카드 클릭 → 바로 확정하지 않고 "이 지역을 거점으로 정하시겠습니까?" 확인 패널을 띄운다 (3단계)
  _onSelect(id) {
    const g  = this.game;
    const rm = g.regionManager;
    const r  = rm.get(g.player, id);
    if (!r) return;
    if (!r.unlocked) { g.log?.(`🔒 아직 갈 수 없는 지역입니다`); return; }
    this._openConfirm(id);
  }

  _openConfirm(id) {
    const g  = this.game;
    const rm = g.regionManager;
    const r  = rm.get(g.player, id);
    if (!r) return;

    // 이미 떠 있으면 제거 후 다시
    document.getElementById("wmConfirm")?.remove();

    const isCurrent = r.isCurrent;
    const prosp = Math.max(0, Math.min(100, r.prosperity || 0));
    const actionLabel = isCurrent ? "이 거점 둘러보기" : "이 지역으로 이동";

    const overlay = document.createElement("div");
    overlay.id = "wmConfirm";
    overlay.className = "wm-confirm-overlay";
    overlay.innerHTML = `
      <div class="wm-confirm-card" role="dialog" aria-modal="true">
        <div class="wm-confirm-top">
          <span class="wm-confirm-icon">${r.icon || "📍"}</span>
          <div>
            <div class="wm-confirm-name">${r.name}</div>
            <div class="wm-confirm-state">${r.completed ? "재건 완료" : (isCurrent ? "현재 거점" : "재건 가능")} · 재건도 ${prosp}%</div>
          </div>
        </div>
        <p class="wm-confirm-desc">${r.desc || ""}</p>
        <div class="wm-confirm-q">${isCurrent ? "이 지역을 둘러보시겠어요?" : "이곳을 다음 거점으로 정하시겠어요?"}</div>
        <div class="wm-confirm-btns">
          <button class="wm-confirm-no" id="wmConfirmNo">취소</button>
          <button class="wm-confirm-yes" id="wmConfirmYes">${actionLabel} →</button>
        </div>
      </div>`;
    const screen = this.game.containers?.worldmap || document.body;
    screen.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.getElementById("wmConfirmNo")?.addEventListener("click", close);
    document.getElementById("wmConfirmYes")?.addEventListener("click", () => {
      close();
      this._confirmSelect(id);
    });
  }

  // 확인 패널에서 "예"를 누른 경우에만 실제 선택 확정
  _confirmSelect(id) {
    const g  = this.game;
    const rm = g.regionManager;
    const ok = rm.select(g.player, id);
    if (!ok) { g.log?.(`🔒 아직 갈 수 없는 지역입니다`); return; }

    // 현재 거점 배지 등 카드 상태 즉시 갱신
    this.refresh();

    const r = rm.get(g.player, id);
    g.log?.(`📍 ${r?.name || id}을(를) 거점으로 정했습니다`);

    // 게임 쪽에 선택 확정을 알림 — 실제 이동/진입은 4단계에서 이 훅에 붙인다
    if (typeof g._onRegionSelected === "function") {
      g._onRegionSelected(id);
    }
  }

  _injectCSS() {
    if (document.getElementById("worldMapCSS")) return;
    const style = document.createElement("style");
    style.id = "worldMapCSS";
    style.textContent = `
      .wm-root {
        width:100%; height:100%; overflow-y:auto;
        background:
          radial-gradient(1200px 500px at 50% -10%, rgba(80,40,90,.18), transparent 70%),
          linear-gradient(180deg, #07060e 0%, #0a0810 100%);
        color:var(--text, #d8c8b0); padding:18px 16px 40px;
        font-family:inherit; box-sizing:border-box;
      }
      .wm-header {
        display:flex; align-items:center; gap:14px;
        max-width:760px; margin:0 auto 22px; flex-wrap:wrap;
      }
      .wm-back {
        background:rgba(20,10,30,.85); border:1px solid #4a2e38;
        color:var(--text,#d8c8b0); padding:9px 14px; border-radius:8px;
        cursor:pointer; font-family:inherit; font-size:.78rem; font-weight:700;
        flex-shrink:0;
      }
      .wm-back:hover { filter:brightness(1.3); border-color:var(--gold,#c8980e); }
      .wm-title-wrap { flex:1; min-width:140px; }
      .wm-title {
        margin:0; font-size:1.5rem; font-weight:800; letter-spacing:.04em;
        color:var(--gold2,#e8b830);
        text-shadow:0 2px 12px rgba(232,184,48,.25);
      }
      .wm-subtitle { margin:2px 0 0; font-size:.74rem; color:var(--text-dim,#786050); }
      .wm-kingdom {
        text-align:right; padding:8px 14px; border-radius:10px;
        background:rgba(255,255,255,.03); border:1px solid #2a1828; flex-shrink:0;
      }
      .wm-kingdom-label { font-size:.6rem; color:var(--text-dim,#786050); letter-spacing:.05em; }
      .wm-kingdom-val   { font-size:1.5rem; font-weight:800; color:var(--gold2,#e8b830); line-height:1; }
      .wm-kingdom-pct   { font-size:.8rem; margin-left:1px; }
      .wm-kingdom-sub   { font-size:.62rem; color:var(--text-dim,#786050); margin-top:2px; }
      .wm-kingdom-bonus { font-size:.62rem; color:#6cd0a0; margin-top:4px; font-weight:700; }

      .wm-cards {
        max-width:760px; margin:0 auto;
        display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));
        gap:14px;
      }

      .wm-card {
        position:relative; overflow:hidden; border-radius:14px; padding:16px 16px 14px;
        background:linear-gradient(160deg, rgba(30,18,34,.92), rgba(16,10,20,.92));
        border:1px solid #2e1c34; transition:transform .15s, border-color .15s, box-shadow .15s;
        display:flex; flex-direction:column; gap:10px;
      }
      .wm-card-bg {
        position:absolute; inset:0; z-index:0;
        background-size:cover; background-position:center; opacity:.3;
        mask-image:linear-gradient(170deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.4) 55%, transparent 100%);
        -webkit-mask-image:linear-gradient(170deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.4) 55%, transparent 100%);
      }
      .wm-card-top, .wm-desc, .wm-lock-hint, .wm-prosp, .wm-card-cta { position:relative; z-index:1; }
      .wm-card-open, .wm-card-current { cursor:pointer; }
      .wm-card-open:hover, .wm-card-current:hover {
        transform:translateY(-3px);
        border-color:var(--gold,#c8980e);
        box-shadow:0 8px 24px rgba(0,0,0,.5), 0 0 0 1px rgba(232,184,48,.15);
      }
      .wm-card-open:focus-visible, .wm-card-current:focus-visible {
        outline:2px solid var(--gold2,#e8b830); outline-offset:2px;
      }
      .wm-card-current { border-color:#6a4a86; box-shadow:0 0 0 1px rgba(140,100,200,.25); }
      .wm-card-locked { opacity:.5; filter:grayscale(.6); }

      .wm-card-top { display:flex; align-items:center; gap:11px; }
      .wm-icon {
        font-size:1.9rem; width:48px; height:48px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.3); border-radius:10px; border:1px solid #38223e;
      }
      .wm-name-wrap { flex:1; min-width:0; }
      .wm-name { font-size:1rem; font-weight:800; color:#f0e2c4; }
      .wm-desc { margin:0; font-size:.72rem; line-height:1.5; color:var(--text-dim,#9a8270); min-height:2.1em; }

      .wm-badge {
        display:inline-block; margin-top:3px; font-size:.58rem; font-weight:700;
        padding:2px 7px; border-radius:20px; letter-spacing:.03em;
      }
      .wm-badge-done    { background:rgba(200,152,14,.18); color:var(--gold2,#e8b830); border:1px solid rgba(200,152,14,.4); }
      .wm-badge-current { background:rgba(140,100,200,.2); color:#c0a0e8; border:1px solid rgba(140,100,200,.45); }
      .wm-badge-active  { background:rgba(60,160,120,.16); color:#6cd0a0; border:1px solid rgba(60,160,120,.4); }

      .wm-lock-hint { font-size:.66rem; color:#a06868; font-weight:600; }

      .wm-prosp { margin-top:2px; }
      .wm-prosp-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; }
      .wm-prosp-label { font-size:.62rem; color:var(--text-dim,#786050); letter-spacing:.04em; }
      .wm-prosp-val   { font-size:.72rem; font-weight:700; color:#cbb890; }
      .wm-prosp-track { height:8px; border-radius:5px; background:rgba(0,0,0,.45); overflow:hidden; border:1px solid #2a1828; }
      .wm-prosp-fill  { height:100%; border-radius:5px; transition:width .5s ease; }
      .wm-bar-empty    { background:#3a2c34; }
      .wm-bar-progress { background:linear-gradient(90deg,#1a7a6a,#33c0a0); }
      .wm-bar-done     { background:linear-gradient(90deg,#a8780e,#e8b830); }

      .wm-card-cta {
        margin-top:2px; font-size:.72rem; font-weight:700; color:var(--gold2,#e8b830);
        text-align:right; opacity:.85;
      }

      @media (max-width:480px) {
        .wm-cards { grid-template-columns:1fr; }
        .wm-header { gap:10px; }
        .wm-title { font-size:1.25rem; }
        .wm-kingdom-val { font-size:1.25rem; }
      }
      @media (prefers-reduced-motion: reduce) {
        .wm-card, .wm-prosp-fill { transition:none; }
      }

      /* 지역 선택 확인 패널 */
      .wm-confirm-overlay {
        position:fixed; inset:0; z-index:50;
        background:rgba(4,3,8,.82);
        display:flex; align-items:center; justify-content:center; padding:20px;
      }
      .wm-confirm-card {
        width:100%; max-width:320px; border-radius:16px; padding:20px 18px 16px;
        background:linear-gradient(160deg, #1c1226, #110a18);
        border:1px solid #4a2e58; box-shadow:0 16px 48px rgba(0,0,0,.6);
      }
      .wm-confirm-top { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
      .wm-confirm-icon {
        font-size:1.8rem; width:50px; height:50px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.35); border-radius:11px; border:1px solid #4a2e58;
      }
      .wm-confirm-name { font-size:1.05rem; font-weight:800; color:#f0e2c4; }
      .wm-confirm-state { font-size:.66rem; color:var(--gold2,#e8b830); margin-top:2px; }
      .wm-confirm-desc { margin:0 0 14px; font-size:.74rem; line-height:1.55; color:var(--text-dim,#9a8270); }
      .wm-confirm-q { font-size:.82rem; font-weight:700; color:#e0d0b0; text-align:center; margin-bottom:16px; }
      .wm-confirm-btns { display:flex; gap:10px; }
      .wm-confirm-no, .wm-confirm-yes {
        flex:1; padding:11px 0; border-radius:9px; cursor:pointer;
        font-family:inherit; font-size:.8rem; font-weight:700;
      }
      .wm-confirm-no {
        background:#241526; color:#b09098; border:1px solid #4a3048;
      }
      .wm-confirm-no:hover { filter:brightness(1.25); }
      .wm-confirm-yes {
        background:linear-gradient(180deg, #7a4ca0, #5a2e80);
        color:#f4e8ff; border:1px solid #9a6ad0;
      }
      .wm-confirm-yes:hover { filter:brightness(1.15); }`;
    document.head.appendChild(style);
  }
}

window.WorldMapScene = WorldMapScene;
