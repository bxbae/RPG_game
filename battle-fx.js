// ═══════════════════════════════════════════════════
//  battle-fx.js — 전투 연출 확장 (BattleScene 에 덧붙이는 믹스인)
//
//  battle-scene.js 가 "평타·궁극기" 연출을 맡고, 이 파일은 그 외 연출을 맡는다:
//   · 직업 스킬 모션 (기사 회전베기 / 탱커 방패 강타 / 마법사 매직볼 / 궁수 속사 / 힐러 성스러운 빛)
//   · 동료 궁극기 효과 (엘린 유성 / 아리아 화살비 / 카인 방어막 / 리온 치유의 빛)
//   · 회복 숫자, 상태이상(화상·중독·기절) 적용·지속 피해·기절로 건너뛴 턴, 방어 태세(방어막) 표시
//   · 연출 옵션: 빠르게 보기(⏩), 화면 효과 줄이기(🎞, 시스템의 '동작 줄이기' 설정을 기본값으로 따른다)
//  BattleManager 가 내보내는 이벤트(skillAction / heal / status / dot / stunSkip / guardHit)를 받아 그린다.
// ═══════════════════════════════════════════════════
"use strict";

(function () {
  const P = BattleScene.prototype;
  const OPT_KEY = "rpg_battle_fx";

  // ── 옵션 ─────────────────────────────────────────
  P._fxOpts = function () {
    if (this._opts) return this._opts;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(OPT_KEY) || "{}") || {}; } catch (e) { /* 저장소 사용 불가 */ }
    const sysReduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    this._opts = { fast: !!saved.fast, reduced: saved.reduced ?? sysReduced };
    return this._opts;
  };
  P._saveFxOpts = function () { try { localStorage.setItem(OPT_KEY, JSON.stringify(this._opts)); } catch (e) { /* 무시 */ } };
  P._t = function (ms) { return this._fxOpts().fast ? Math.round(ms * 0.6) : ms; };   // 연출 시간 배율
  P._reduced = function () { return this._fxOpts().reduced; };
  P._sfx = function (k) { try { window.audioMgr?.playSfx(k); } catch (e) { /* 무시 */ } };
  P._later = function (ms, fn) { return setTimeout(() => { if (this.el?.field?.isConnected) fn(); }, ms); };

  // 옵션 버튼(필드 우상단)
  const _mount = P.mount;
  P.mount = function (container) {
    _mount.call(this, container);
    const field = this.el?.field;
    if (!field) return;
    const box = document.createElement("div");
    box.className = "fx-opts";
    box.innerHTML =
      `<button type="button" data-k="fast" title="연출 빠르게 보기">⏩</button>` +
      `<button type="button" data-k="reduced" title="화면 효과 줄이기 (흔들림·번쩍임·입자)">🎞</button>`;
    field.appendChild(box);
    const sync = () => {
      const o = this._fxOpts();
      box.querySelector('[data-k="fast"]').classList.toggle("on", o.fast);
      box.querySelector('[data-k="reduced"]').classList.toggle("on", o.reduced);
      field.classList.toggle("fx-reduced", o.reduced);
    };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]"); if (!b) return;
      e.stopPropagation();
      const o = this._fxOpts(); o[b.dataset.k] = !o[b.dataset.k];
      this._saveFxOpts(); sync();
    });
    sync();
  };

  // 줄이기 모드에서는 흔들림·번쩍임을 생략한다
  const _shake = P._shakeField;
  P._shakeField = function () { if (this._reduced()) return; return _shake.apply(this, arguments); };
  const _flash = P.flashWhite;
  P.flashWhite = function () { if (this._reduced()) return; return _flash.apply(this, arguments); };
  const _burst = P._impactBurst;
  P._impactBurst = function (x, y, big) { if (this._reduced()) { this._fx("fx-burst", x, y, { width: "70px", height: "70px" }, 300); return; } return _burst.call(this, x, y, big); };

  // 상태/방어 표시를 화면 갱신 때마다 맞춘다
  const _render = P.render;
  P.render = function () { _render.apply(this, arguments); this._syncLooks(); };
  const _icons = P.updateStatusIcons;
  P.updateStatusIcons = function () { _icons.apply(this, arguments); this._syncLooks(); };
  P._syncLooks = function () {
    const p = this.game?.player, m = this.game?.currentMonster;
    const set = (el, cls, on) => el && el.classList.toggle(cls, !!on);
    for (const k of ["burn", "poison", "stun"]) {
      set(this.el.monsterWrap, "st-" + k, m?.status?.[k] > 0);
      set(this.el.playerWrap, "st-" + k, p?.status?.[k] > 0);
    }
    set(this.el.playerWrap, "guarded", p?.guardBuff > 0);
  };

  // ── 좌표 도우미 ──────────────────────────────────
  P._geo = function () {
    const field = this.el.field, pw = this.el.playerWrap, mw = this.el.monsterWrap;
    const fr = field.getBoundingClientRect(), pr = pw.getBoundingClientRect(), mr = mw.getBoundingClientRect();
    const from = { x: pr.left - fr.left + pr.width * .75, y: pr.top - fr.top + pr.height * .45 };
    const to   = { x: mr.left - fr.left + mr.width * .5,  y: mr.top - fr.top + mr.height * .55 };
    return { fr, pr, mr, from, to, dx: to.x - from.x, dy: to.y - from.y, pw, mw };
  };
  P._center = function (wrap, fr, fx = .5, fy = .5) {
    const r = wrap.getBoundingClientRect();
    return { x: r.left - fr.left + r.width * fx, y: r.top - fr.top + r.height * fy, w: r.width, h: r.height };
  };
  P._ring = function (x, y, color, size, life = 520, css = {}) {
    return this._fx("fx-ring", x, y, { "--c": color, "--d": life + "ms", width: size + "px", height: size + "px", ...css }, life + 40);
  };
  P._floatText = function (x, y, text, cls, life = 1000) {
    const n = this._fx("damage " + cls, x, y, {}, life);
    n.innerText = text;
    return n;
  };
  P._setImpact = function (impactMs, counterGap = 520) {
    const now = performance.now();
    this._actionAt = now;
    this._impactAt = now + impactMs;
    this._counterAt = this._impactAt + counterGap;
    this._busyUntil = now + this._t(1150);
  };
  P._lunge = function (wrap, dx, dy, frac, dur, delay = 0) {
    wrap.style.zIndex = "20";
    const a = wrap.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(-22px,2px) scale(.96)", offset: .22 },
      { transform: `translate(${dx * frac}px,${dy * frac * .6}px) scale(1.12)`, offset: .5 },
      { transform: `translate(${dx * frac * .85}px,${dy * frac * .5}px) scale(1.08)`, offset: .66 },
      { transform: "translate(0,0) scale(1)" },
    ], { duration: dur, delay, easing: "cubic-bezier(.3,.7,.3,1)" });
    a.onfinish = a.oncancel = () => { wrap.style.zIndex = ""; };
  };
  P._recoil = function (wrap, dur, delay = 0) {
    wrap.animate([{ transform: "translate(0,0)" }, { transform: "translate(-26px,0) scale(.97)", offset: .35 }, { transform: "translate(0,0)" }],
      { duration: dur, delay, easing: "ease-out" });
  };

  // ══ 직업 스킬 모션 ══════════════════════════════
  P.playSkillAction = function (ptype) {
    if (!this.el?.field || !this.el.playerWrap || !this.el.monsterWrap) return;
    const g = this._geo(), t = (ms) => this._t(ms), R = this._reduced();
    const heavy = (x, y) => { this._ring(x, y, "#fff4c0", 220, t(420)); };

    // 동료들도 한 박자 늦게 거든다
    const helpers = (frac = .38, dur = 520) => [this.el.compWrap, this.el.compWrap2, this.el.compWrap3].forEach((w, i) => {
      if (w && w.style.display !== "none") this._lunge(w, g.dx, g.dy, frac, t(dur), t(120 + i * 90));
    });

    if (ptype === "knight" || ptype === "warrior" || ptype === "night") {          // ⚔ 회전베기
      this._setImpact(t(340));
      this._sfx("whoosh");
      this._lunge(g.pw, g.dx, g.dy, .72, t(680));
      this._later(t(300), () => {
        this._fx("fx-whirl", g.to.x, g.to.y, {}, 700);
        [-60, 15, 80, 150].forEach((rot, i) => this._later(i * 50, () => this._fx("fx-slash", g.to.x, g.to.y, { "--rot": rot + "deg" }, 420)));
        heavy(g.to.x, g.to.y);
        this._sfx("sword");
      });
      helpers();
    } else if (ptype === "tanker") {                                              // 🛡 방패 강타
      this._setImpact(t(300));
      this._sfx("whoosh");
      this._lunge(g.pw, g.dx, g.dy, .62, t(640));
      this._later(t(280), () => {
        this._sfx("bash");
        this._ring(g.to.x, g.to.y, "#ffd27a", 300, t(520));
        this._ring(g.to.x, g.to.y, "#ffffff", 170, t(380));
        this._fx("fx-slash", g.to.x, g.to.y, { "--rot": "0deg", width: "300px", height: "26px" }, 420);
        const pc = this._center(g.pw, g.fr, .55, .5);
        this._later(t(120), () => { this._ring(pc.x, pc.y, "#9ad8ff", 160, t(520)); this._sfx("shield"); });
      });
      helpers();
    } else if (ptype === "mage" || ptype === "magician") {                         // 🔮 매직볼
      this._setImpact(t(720));
      this._recoil(g.pw, t(520));
      this._sfx("cast");
      const o = this._fx("fx-orb", g.from.x, g.from.y, { width: "30px", height: "30px" }, t(900));
      o.animate([
        { transform: "translate(-50%,-50%) scale(.2)", opacity: .3 },
        { transform: "translate(-50%,-50%) scale(2.2)", opacity: 1, offset: .38 },
        { transform: `translate(calc(-50% + ${g.dx}px), calc(-50% + ${g.dy}px)) scale(2.6)`, opacity: 1 },
      ], { duration: t(700), easing: "ease-in", fill: "forwards" });
      this._ring(g.from.x, g.from.y, "#c88aff", 150, t(380));
      this._later(t(700), () => {
        this._sfx("boom");
        this._ring(g.to.x, g.to.y, "#c88aff", 300, t(560));
        this._ring(g.to.x, g.to.y, "#ffffff", 180, t(380));
        this._impactBurst(g.to.x, g.to.y, true);
      });
      helpers(.3, 640);
    } else if (ptype === "archer") {                                              // 🏹 속사
      this._setImpact(t(330), 640);
      this._sfx("volley");
      this._recoil(g.pw, t(520));
      [0, 120, 240].forEach((d, i) => {
        this._later(t(40 + d), () => this._projectileFx("arrow", { x: g.from.x, y: g.from.y + (i - 1) * 14 }, { x: g.to.x, y: g.to.y + (i - 1) * 18 }, t(220)));
        this._later(t(260 + d), () => { this._impactBurst(g.to.x + (i - 1) * 14, g.to.y + (i - 1) * 18, false); this._sfx("hit"); });
      });
      helpers(.3, 560);
    } else if (ptype === "healer") {                                              // ✨ 성스러운 빛
      this._setImpact(t(380));
      this._sfx("holy");
      this._recoil(g.pw, t(420));
      this._later(t(200), () => {
        const col = this._fx("fx-holy", g.to.x, g.to.y - 40, { width: "180px", height: "440px" }, 700);
        this._ring(g.to.x, g.to.y + 50, "#fff6b0", 260, t(520));
      });
      this._later(t(380), () => { this._playHealFx(); this._sfx("chime"); });
      helpers(.3, 520);
    } else {
      this._setImpact(t(300)); this._lunge(g.pw, g.dx, g.dy, .6, t(560));
    }
  };

  // ══ 동료 궁극기 효과 (컷인 영상이 끝난 뒤 숫자가 터지기 직전에 재생) ═══════════
  // 반환값: 데미지/회복 숫자를 띄우기까지 기다릴 시간(ms)
  P._playPartyUltFx = function (key) {
    if (!this.el?.field || !this.el.playerWrap || !this.el.monsterWrap) return 0;
    const g = this._geo(), t = (ms) => this._t(ms), fr = g.fr;
    const wraps = [this.el.playerWrap, this.el.compWrap, this.el.compWrap2, this.el.compWrap3].filter(w => w && w.style.display !== "none");

    if (key === "mage_party") {                                                   // ☄ 엘린: 마법진 + 유성 낙하
      this._sfx("cast");
      this._ring(g.to.x, g.to.y + 40, "#b06cff", 340, t(700));
      this._ring(g.to.x, g.to.y + 40, "#e6c8ff", 220, t(560));
      const N = this._reduced() ? 2 : 5;
      for (let i = 0; i < N; i++) {
        const sx = g.to.x + 150 + i * 30, sy = -60, ex = g.to.x + (i - (N - 1) / 2) * 34, ey = g.to.y + (i % 2 ? 10 : -14);
        this._later(t(120 + i * 110), () => {
          const m = this._fx("fx-meteor", sx, sy, {}, t(700));
          m.animate([
            { transform: "translate(-50%,-50%) scale(.7)", opacity: .4 },
            { transform: `translate(calc(-50% + ${ex - sx}px), calc(-50% + ${ey - sy}px)) scale(1.3)`, opacity: 1 },
          ], { duration: t(330), easing: "ease-in", fill: "forwards" });
          this._later(t(330), () => { this._impactBurst(ex, ey, i === N - 1); this._sfx(i === N - 1 ? "boom" : "hit"); if (i === N - 1) this._ring(ex, ey, "#ffffff", 320, t(520)); });
        });
      }
      return t(120 + (N - 1) * 110 + 330);
    }
    if (key === "archer") {                                                       // 🏹 아리아: 화살비
      this._sfx("volley");
      const N = this._reduced() ? 4 : 10;
      for (let i = 0; i < N; i++) {
        const sx = g.to.x - 220 + i * 14, sy = -40 + (i % 3) * 18, ex = g.to.x + (i - N / 2) * 12, ey = g.to.y + ((i * 37) % 60 - 30);
        this._later(t(i * 60), () => {
          this._projectileFx("arrow", { x: sx, y: sy }, { x: ex, y: ey }, t(240));
          this._later(t(220), () => { if (i % 2 === 0) this._impactBurst(ex, ey, false); this._sfx("hit"); });
        });
      }
      return t((N - 1) * 60 + 260);
    }
    if (key === "tanker") {                                                       // 🛡 카인: 파티 전체에 방어막
      this._sfx("shield");
      wraps.forEach((w, i) => {
        const c = this._center(w, fr, .5, .55);
        this._later(t(i * 70), () => this._fx("fx-dome", c.x, c.y, { width: c.w * 1.5 + "px", height: c.h * 1.15 + "px" }, 1200));
      });
      return t(420);
    }
    if (key === "healer") {                                                       // ✚ 리온: 치유의 빛
      this._sfx("chime");
      wraps.forEach((w, i) => {
        const c = this._center(w, fr, .5, .6);
        this._later(t(i * 90), () => { this._ring(c.x, c.y + 30, "#8dffb5", c.w * 1.3, t(620)); this._healFxOn(w); });
      });
      return t(480);
    }
    return 0;
  };

  P._healFxOn = function (wrap) {
    const field = this.el.field; if (!field || !wrap) return;
    const fr = field.getBoundingClientRect(), pr = wrap.getBoundingClientRect();
    const cx = pr.left - fr.left + pr.width * .5, by = pr.top - fr.top + pr.height * .85;
    const n = this._reduced() ? 3 : 9;
    for (let i = 0; i < n; i++) {
      const sp = this._fx("fx-plus", cx + (Math.random() - .5) * pr.width * .8, by, {}, 1100);
      sp.textContent = "✚";
      sp.animate([
        { transform: "translate(-50%,0) scale(.6)", opacity: 0 },
        { opacity: 1, offset: .25 },
        { transform: `translate(-50%,-${pr.height * (.6 + Math.random() * .3)}px) scale(1.1)`, opacity: 0 },
      ], { duration: this._t(800 + Math.random() * 300), delay: this._t(i * 70), easing: "ease-out", fill: "backwards" });
    }
  };
  const _healFx = P._playHealFx;
  P._playHealFx = function () {
    _healFx.apply(this, arguments);
    const pw = this.el?.playerWrap; if (!pw || !this.el.field) return;
    const c = this._center(pw, this.el.field.getBoundingClientRect(), .5, .7);
    this._ring(c.x, c.y, "#8dffb5", c.w * 1.2, this._t(600));
  };

  // ══ 회복 숫자 ═══════════════════════════════════
  P.showHeal = function (amount) {
    if (!(amount > 0)) return;
    if (this._ultActive) { (this._ultPending ||= []).push({ amount, target: "heal" }); return; }
    const delay = Math.max(this._t(160), (this._impactAt || 0) - performance.now());
    this._later(delay, () => this._spawnHeal(amount));
  };
  P._spawnHeal = function (amount) {
    const pw = this.el?.playerWrap, field = this.el?.field;
    if (!pw?.isConnected || !field) return;
    const c = this._center(pw, field.getBoundingClientRect(), .5, .22);
    this._floatText(c.x + (Math.random() - .5) * 30, c.y, `+${amount}`, "heal-num", 1100);
  };

  // ══ 상태이상 ════════════════════════════════════
  const ICON = { burn: "🔥", poison: "🟢", stun: "💫" };
  P._wrapOf = function (target) { return target === "monster" ? this.el.monsterWrap : this.el.playerWrap; };
  P._timeFor = function (target) {
    const now = performance.now();
    return target === "monster" ? Math.max(0, (this._impactAt || 0) - now) + this._t(60) : Math.max(0, (this._counterAt || 0) - now) + this._t(80);
  };

  P.showStatusApplied = function (target, status) {
    if (!this.el?.field) return;
    this._later(this._timeFor(target), () => {
      const wrap = this._wrapOf(target); if (!wrap?.isConnected) return;
      const c = this._center(wrap, this.el.field.getBoundingClientRect(), .5, .5);
      const top = this._center(wrap, this.el.field.getBoundingClientRect(), .5, .08);
      const R = this._reduced();
      if (status === "stun") {
        this._sfx("stun");
        this._ring(top.x, top.y + 10, "#cfd0ff", 90, this._t(500));
        for (let i = 0; i < (R ? 1 : 3); i++) {                                        // 머리 위를 도는 별
          const s = this._fx("fx-orbit", top.x, top.y + 18, {}, this._t(1300));
          s.textContent = "💫";
          const kf = Array.from({ length: 13 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2 + i * 2.094;
            return { transform: `translate(calc(-50% + ${Math.cos(a) * 46}px), calc(-50% + ${Math.sin(a) * 13}px))`, opacity: 1 };
          });
          s.animate(kf, { duration: this._t(1000), iterations: 1, fill: "forwards" });
        }
        this._floatText(top.x, top.y - 14, "STUN!", "status-word stun-word", 1000);
      } else if (status === "burn" || status === "poison") {
        this._sfx(status);
        const col = status === "burn" ? "#ff8a3a" : "#6dff7a";
        this._ring(c.x, c.y, col, c.w * 1.1, this._t(560));
        const n = R ? 2 : 7;
        for (let i = 0; i < n; i++) {
          const p = this._fx("fx-orbit", c.x + (Math.random() - .5) * c.w * .7, c.y + c.h * .25, {}, this._t(1100));
          p.textContent = ICON[status];
          p.animate([
            { transform: "translate(-50%,0) scale(.6)", opacity: 0 }, { opacity: 1, offset: .25 },
            { transform: `translate(-50%,-${c.h * .6}px) scale(1.15)`, opacity: 0 },
          ], { duration: this._t(800 + Math.random() * 300), delay: this._t(i * 60), easing: "ease-out", fill: "backwards" });
        }
        this._floatText(top.x, top.y - 10, status === "burn" ? "화상!" : "중독!", "status-word " + status + "-word", 1000);
      }
    });
  };

  // 지속 피해(화상·중독) 숫자
  P.showDot = function (amount, target, status) {
    const delay = target === "monster" ? 0 : this._timeFor("player") + this._t(280);
    this._later(delay, () => {
      const wrap = this._wrapOf(target); if (!wrap?.isConnected) return;
      const c = this._center(wrap, this.el.field.getBoundingClientRect(), .5, .3);
      this._floatText(c.x + (Math.random() - .5) * 30, c.y, `${ICON[status]}${amount}`, "dot-num dot-" + status, 1000);
      this._sfx(status);
      if (target === "monster") this._triggerMonsterHit();
      else wrap.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.8) saturate(.5)", offset: .3 }, { filter: "brightness(1)" }], { duration: 300 });
    });
  };

  // 기절로 건너뛴 턴
  P.showStunSkip = function (target) {
    this._later(target === "monster" ? this._t(120) : 0, () => {
      const wrap = this._wrapOf(target); if (!wrap?.isConnected) return;
      const c = this._center(wrap, this.el.field.getBoundingClientRect(), .5, .12);
      this._floatText(c.x, c.y, target === "monster" ? "💫 기절! 행동 불가" : "💫 기절!", "status-word stun-word", 1100);
      this._sfx("stun");
      wrap.animate([{ transform: "rotate(0)" }, { transform: "rotate(-4deg)", offset: .25 }, { transform: "rotate(3deg)", offset: .55 }, { transform: "rotate(-2deg)", offset: .8 }, { transform: "rotate(0)" }], { duration: this._t(520) });
    });
  };

  // 방어 태세가 공격을 막는 순간
  P.showGuardHit = function () {
    this._later(this._timeFor("player") - this._t(40), () => {
      const pw = this.el.playerWrap; if (!pw?.isConnected) return;
      const c = this._center(pw, this.el.field.getBoundingClientRect(), .5, .5);
      this._ring(c.x, c.y, "#9ad8ff", c.w * 1.25, this._t(460));
      this._floatText(c.x, c.y - c.h * .35, "🛡 방어!", "status-word guard-word", 900);
      this._sfx("block");
    });
  };
})();
