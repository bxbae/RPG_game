// ═══════════════════════════════════════════════════
//  opening-scene.js  — 신규 게임 오프닝 시네마
//  직업 선택 직후, 마을 화면이 보이기 전에 재생되는
//  내레이션 전용 비주얼 노벨 시퀀스.
// ═══════════════════════════════════════════════════
"use strict";

// ── 오프닝 대본 ────────────────────────────────────
// 각 장면은 배경 이미지(없으면 그라데이션) + 순서대로 페이드인되는 내레이션 줄들로 구성.
const OPENING_SCRIPT = [
  {
    id: "darkness_descends",
    bgImage: "images/Heroes face looming dark god in cathedral.png",
    lines: [
      "오래전, 이 땅은 평화로웠다.",
      "그러나 그 평화는 영원하지 않았다.",
      "어둠 속에서, 마왕 다르카스가 강림했다.",
    ],
  },
  {
    id: "kingdom_falls",
    bgImage: "images/Chained in darkness under a tyrants gaze.png",
    lines: [
      "왕은 모습을 감췄고, 근위대는 무너졌다.",
      "광산도시, 항구도시, 깊은 숲... 마왕의 부하들이 왕국 곳곳을 짓밟았다.",
      "사람들은 두려움에 떨며, 그저 하루하루를 버텨낼 뿐이었다.",
    ],
  },
  {
    id: "legend_of_hope",
    bgImage: null, // 그라데이션만 — 차분한 희망의 어조
    lines: [
      "하지만 오래된 전설은 사라지지 않는 법.",
      "“어둠이 가장 깊어질 때, 예언된 용사가 깨어나리라.”",
      "그리고... 그날이 왔다.",
    ],
  },
  {
    id: "your_beginning",
    bgImage: null,
    lines: [
      "{className}이여, 일어나라.",
      "당신의 이야기가, 지금 이 순간부터 시작된다.",
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OpeningScene
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class OpeningScene {
  constructor() {
    this._sceneIdx = 0;
    this._lineIdx  = 0;
    this._timer    = null;
    this._typing   = false;
    this._onClose  = null;
    this._className = "";
  }

  // ── 오프닝 재생 시작 ──────────────────────────────
  // className: 플레이어가 고른 직업 이름(예: "기사") — 마지막 장면 대사에 삽입됨
  play(className, onClose = null) {
    this._className = className || "용사";
    this._onClose    = onClose;
    this._sceneIdx   = 0;
    this._lineIdx    = 0;
    this._closed     = false;

    this._buildUI();
    this._showScene();
  }

  // ── UI 골격 ───────────────────────────────────────
  _buildUI() {
    const old = document.getElementById("openingOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "openingOverlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:10000;
      background:#000;
      display:flex;align-items:center;justify-content:center;
      animation:cutinFadeIn .6s ease;
      overflow:hidden;
    `;

    overlay.innerHTML = `
      <div id="openingBg" style="
        position:absolute;inset:0;
        background-size:cover;background-position:center;
        opacity:0;transition:opacity 1.2s ease;
      "></div>
      <div style="
        position:absolute;inset:0;
        background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.25) 40%,rgba(0,0,0,.75) 100%);
      "></div>

      <div style="
        position:relative;z-index:1;
        width:min(720px,88vw);
        text-align:center;
        padding:0 20px;
      ">
        <p id="openingText" style="
          font-family:'Noto Serif KR',serif;
          font-size:clamp(1.05rem,2.2vw,1.4rem);
          color:#f0e6d8;line-height:2;
          letter-spacing:.03em;
          min-height:3.6em;
          text-shadow:0 2px 12px rgba(0,0,0,.9);
        "></p>
      </div>

      <button id="openingSkip" style="
        position:absolute;top:24px;right:28px;z-index:2;
        background:transparent;border:1px solid rgba(255,255,255,.3);
        color:rgba(255,255,255,.7);padding:7px 16px;
        font-family:inherit;font-size:.7rem;border-radius:4px;
        cursor:pointer;letter-spacing:.08em;transition:.15s;"
        onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold2)'"
        onmouseout="this.style.borderColor='rgba(255,255,255,.3)';this.style.color='rgba(255,255,255,.7)'">
        SKIP ▶
      </button>

      <div id="openingHint" style="
        position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
        z-index:2;font-size:.68rem;color:rgba(255,255,255,.45);
        font-family:inherit;letter-spacing:.06em;opacity:0;
        transition:opacity .4s ease;">
        ▼ 클릭하여 계속
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target.id === "openingSkip") return;
      this._onAdvance();
    });
    document.getElementById("openingSkip").addEventListener("click", (e) => {
      e.stopPropagation();
      this._close();
    });
  }

  // ── 장면 전환 (배경 페이드) ────────────────────────
  _showScene() {
    const scene = OPENING_SCRIPT[this._sceneIdx];
    if (!scene) { this._close(); return; }

    const bg = document.getElementById("openingBg");
    if (bg) {
      bg.style.opacity = "0";
      setTimeout(() => {
        if (scene.bgImage) {
          bg.style.backgroundImage = `url('${scene.bgImage}')`;
          bg.style.opacity = "0.55";
        } else {
          bg.style.backgroundImage = "none";
          bg.style.opacity = "1";
          bg.style.background = "radial-gradient(circle at 50% 40%, rgba(90,60,30,.25), #0a0608 70%)";
        }
      }, 350);
    }

    this._lineIdx = 0;
    this._showLine();
  }

  // ── 줄 단위 타이핑 ─────────────────────────────────
  _showLine() {
    const scene = OPENING_SCRIPT[this._sceneIdx];
    let line = scene.lines[this._lineIdx];
    if (line == null) { this._nextScene(); return; }

    line = line.replace("{className}", this._className);

    const textEl = document.getElementById("openingText");
    const hintEl = document.getElementById("openingHint");
    if (hintEl) hintEl.style.opacity = "0";
    this._typeText(line, textEl, () => {
      if (hintEl) hintEl.style.opacity = "1";
    });
  }

  _typeText(text, el, onDone) {
    if (!el) return;
    clearTimeout(this._timer);
    this._fullText = text;
    this._typing   = true;
    el.textContent = "";
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        this._timer = setTimeout(tick, 38);
      } else {
        this._typing = false;
        if (onDone) onDone();
      }
    };
    tick();
  }

  _onAdvance() {
    if (this._closed) return; // 이미 닫히는 중이면(페이드아웃 동안) 클릭 무시
    if (this._typing) {
      clearTimeout(this._timer);
      this._typing = false;
      const el = document.getElementById("openingText");
      if (el) el.textContent = this._fullText;
      const hintEl = document.getElementById("openingHint");
      if (hintEl) hintEl.style.opacity = "1";
      return;
    }
    this._lineIdx++;
    this._showLine();
  }

  _nextScene() {
    this._sceneIdx++;
    if (this._sceneIdx >= OPENING_SCRIPT.length) {
      this._close();
    } else {
      this._showScene();
    }
  }

  _close() {
    if (this._closed) return; // 중복 호출 방지
    this._closed = true;
    clearTimeout(this._timer);
    const overlay = document.getElementById("openingOverlay");
    if (overlay) {
      overlay.style.transition = "opacity .5s ease";
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none"; // 페이드아웃 동안 클릭 자체를 막음
      setTimeout(() => overlay.remove(), 520);
    }
    const cb = this._onClose;
    this._onClose = null;
    if (cb) cb();
  }
}

// ── 전역 인스턴스 ──────────────────────────────────
window.openingScene  = new OpeningScene();
window.OPENING_SCRIPT = OPENING_SCRIPT;
window.OpeningScene  = OpeningScene;
