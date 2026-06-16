// ═══════════════════════════════════════════════════
//  battle-scene.js  — 전투 씬 UI (최종 완성본)
// ═══════════════════════════════════════════════════
"use strict";

// ★ player.type = "knight" | "mage" | "magician" | "archer"
// ─── 전투 배경 캐릭터 이미지 ─────────────────────────
const BACK_IMAGES = {
  knight:   "images/sd_knight.png",
  night:    "images/sd_knight.png",     // 구버전 호환
  warrior:  "images/sd_knight.png",     // 구버전 호환
  mage:     "images/sd_magician.png",
  magician: "images/sd_magician.png",
  archer:   "images/sd_archer.png",
};
// ─── 동료 배경 이미지 ────────────────────────────────
const COMPANION_BACK = {
  healer:     "images/sd_healer.png",
  tanker:     "images/SD_Tanker.png",
  warrior:    "images/SD_Tanker.png",    // 하위호환
  dealer:     "images/sd_knight.png",
  mage_party: "images/sd_magician.png",
  archer:     "images/sd_archer.png",
};

// ─── 주인공 컷인 이미지 ──────────────────────────────
const CUTIN_HERO = {
  knight:   "images/sd_knight_attack_1.png",
  night:    "images/sd_knight_attack_1.png",   // 구버전 호환
  warrior:  "images/sd_knight_attack_1.png",   // 구버전 호환
  mage:     "images/sd_magician_attack_1.png",
  magician: "images/sd_magician_attack_1.png",
  archer:   "images/sd_archer_attack_1.png",
};
const CUTIN_HERO_TITLE = {
  knight:   "⚔ 폭풍검술!",
  night:    "⚔ 폭풍검술!",   // 구버전 호환
  warrior:  "⚔ 폭풍검술!",   // 구버전 호환
  mage:     "🔮 대마법진!",
  magician: "🔮 대마법진!",
  archer:   "🏹 천격사격!",
};
// ─── 동료 컷인 이미지 ────────────────────────────────
const CUTIN_PARTY = {
  healer:     "images/SD_healer_attack_1.png",
  tanker:     "images/SD_Tanker_attack_2.png",   // attack_2: 블루 오라 궁극기 컷인
  warrior:    "images/SD_Tanker_attack_2.png",   // 하위호환
  mage_party: "images/sd_magician_attack_1.png",
  archer:     "images/sd_archer_attack_1.png",
  dealer:     "images/sd_knight_attack_1.png",
};
const CUTIN_PARTY_TITLE = {
  healer:     "✨ 천상의 기적",
  tanker:     "🛡 절대 수호",
  warrior:    "🛡 절대 수호",   // 하위호환
  mage_party: "☄ 아포칼립스",
  archer:     "🏹 폭풍 사격",
  dealer:     "⚔ 그림자 참격",
};

// ─── 궁극기 2단계: 풀화면 드라마틱 컷신 ─────────────
// Phase1: CUTIN_HERO / CUTIN_PARTY (치비 액션샷, 0.7s)
// Phase2: 아래 이미지 (풀화면 일러스트, 2.2s)
const CUTIN_HERO_FULLSCREEN = {
  knight:   "images/Knight_skill_cut.png",
  night:    "images/Knight_skill_cut.png",   // 구버전 호환
  warrior:  "images/Knight_skill_cut.png",   // 구버전 호환
  mage:     "images/sd_magician_attack_1.png",
  magician: "images/sd_magician_attack_1.png",
  archer:   "images/Elf_Archer_skill_cut.png",
};
const CUTIN_PARTY_FULLSCREEN = {
  healer:     "images/healer_skill_cut.png",
  tanker:     "images/tanker_skill_cut.png",
  warrior:    "images/tanker_skill_cut.png",   // 하위호환
  mage_party: "images/sd_magician_attack_1.png",
  archer:     "images/Elf_Archer_skill_cut.png",
  dealer:     "images/Knight_skill_cut.png",
};

class BattleScene {
  constructor(game) {
    this.game = game;
    this._logLines = [];
    this._attackFlashTimer = null; // 공격 이미지 복원 타이머
  }

  mount(container) {
    container.innerHTML = this._buildHTML();
    this._cacheEls(container);
    this._bindButtons();
  }

  _buildHTML() {
    return `
<div class="poke-field" id="battleField">
  <img class="battle-bg" id="battleBg" src="images/던전내부이미지1.png" alt="배경"/>
  <div class="poke-enemy-hud">
    <div class="poke-hud-name" id="bMonsterName">???</div>
    <div class="poke-hud-row">
      <div class="poke-hp-bar-wrap">
        <div class="poke-hp-label">HP</div>
        <div class="poke-hp-track"><div id="bMonsterHpBar" class="poke-hp-fill enemy-hp"></div></div>
      </div>
    </div>
    <div class="poke-hud-sub">
      <span id="bMonsterHpText" class="poke-hp-nums"></span>
      <span id="bMonsterAtk" class="poke-atk-badge"></span>
    </div>
    <div id="monsterStatusIcons" style="display:flex;gap:3px;margin-top:3px;"></div>
  </div>
  <div class="poke-enemy-sprite-wrap" id="bMonsterWrap">
    <img id="bMonsterImg" class="poke-enemy-sprite" src="" alt="몬스터"/>
    <div id="bMonsterFallback" style="display:none;position:absolute;inset:0;display:none;
      align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;
      color:#e8c060;text-shadow:0 0 20px #e8c06088;pointer-events:none;"></div>
  </div>
  <div class="poke-player-hud">
    <div class="poke-player-hud-inner">
      <div class="poke-hud-name" id="bPlayerName">용사</div>
      <div class="poke-hud-sub-name">
        <span id="bPlayerClass">전사</span>
        <span id="bGold" style="color:var(--gold2);font-size:.6rem;margin-left:6px;">💰 0G</span>
      </div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bPlayerHpBar" class="poke-hp-fill player-hp"></div></div>
        </div>
      </div>
      <div class="poke-hp-nums" id="bPlayerHpVal">160/160</div>
      <div class="poke-hud-row" style="margin-top:4px;">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label" style="color:var(--gold);">MP</div>
          <div class="poke-hp-track"><div id="bPlayerMpBar" class="poke-hp-fill player-mp"></div></div>
        </div>
      </div>
      <div class="poke-hp-nums" id="bPlayerMpVal" style="color:var(--gold);">0%</div>
    </div>
    <div class="poke-companion-hud" id="bCompanionHud" style="display:none;">
      <div class="poke-hud-name" id="bCompName">동료</div>
      <div class="poke-hud-sub-name" id="bCompClass">힐러</div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bCompHpBar" class="poke-hp-fill companion-hp"></div></div>
        </div>
      </div>
      <div class="poke-hp-nums" id="bCompHpVal">90/90</div>
      <div id="bCompAffinity" style="color:#ff77aa;font-size:.6rem;text-align:right;margin-top:2px;">❤ 0</div>
    </div>
  </div>
  <div class="player-level">Lv.<span id="bLevel">1</span></div>
  <div class="player-exp">EXP <span id="bExp">0</span>/<span id="bNextExp">100</span></div>
  <div class="player-skill">SP <span id="bSP">0</span></div>
  <div class="poke-player-sprite-wrap" id="bPlayerWrap">
    <img id="bPlayerImg" class="poke-player-sprite" src="" alt="플레이어"/>
  </div>
  <div class="poke-companion-sprite-wrap" id="bCompWrap" style="display:none;">
    <img id="bCompImg" class="poke-companion-sprite" src="" alt="동료"/>
  </div>
  <div id="bLog" style="display:none;"></div>
  <div id="playerStatusIcons" style="position:absolute;left:6%;bottom:calc(min(21%,200px)+10px);z-index:6;display:flex;gap:3px;"></div>
  <div id="bBossWarning" style="display:none;"></div>
</div>
<div class="poke-bottom">
  <div class="poke-textbox" id="bTextbox">
    <div class="poke-textbox-inner" id="bTextLatest">무엇을 할까?</div>
  </div>
  <div class="poke-commands">
    <button class="poke-cmd" id="bAttack"   type="button">⚔ 싸운다</button>
    <button class="poke-cmd" id="bHeal"     type="button">💚 회복</button>
    <button class="poke-cmd" id="bJobSkill" type="button">🌟 직업 스킬</button>
    <button class="poke-cmd hero-ult-cmd" id="bHeroUlt" type="button">⚡ 궁극기 0%</button>
    <button class="poke-cmd ult-cmd" id="bPartyUlt" type="button">💫 동료 궁극기</button>
    <button class="poke-cmd" id="bFlee"     type="button">🏃 도망</button>
  </div>
</div>`;
  }

  _cacheEls(container) {
    const q = id => container.querySelector(`#${id}`) || document.getElementById(id);
    this.el = {
      field: q("battleField"), bg: q("battleBg"),
      monsterName: q("bMonsterName"), monsterHpBar: q("bMonsterHpBar"),
      monsterHpText: q("bMonsterHpText"), monsterAtk: q("bMonsterAtk"),
      monsterWrap: q("bMonsterWrap"), monsterImg: q("bMonsterImg"),
      playerName: q("bPlayerName"), playerClass: q("bPlayerClass"),
      gold: q("bGold"), playerHpBar: q("bPlayerHpBar"), playerHpVal: q("bPlayerHpVal"),
      playerMpBar: q("bPlayerMpBar"), playerMpVal: q("bPlayerMpVal"),
      level: q("bLevel"), exp: q("bExp"), nextExp: q("bNextExp"), sp: q("bSP"),
      playerWrap: q("bPlayerWrap"), playerImg: q("bPlayerImg"),
      companionHud: q("bCompanionHud"), compName: q("bCompName"),
      compClass: q("bCompClass"), compHpBar: q("bCompHpBar"),
      compHpVal: q("bCompHpVal"), compAffinity: q("bCompAffinity"),
      compWrap: q("bCompWrap"), compImg: q("bCompImg"),
      textLatest: q("bTextLatest"),
      btnAttack: q("bAttack"), btnHeal: q("bHeal"), btnJobSkill: q("bJobSkill"),
      btnHeroUlt: q("bHeroUlt"), btnPartyUlt: q("bPartyUlt"), btnFlee: q("bFlee"),
      monsterStatus: q("monsterStatusIcons"), playerStatus: q("playerStatusIcons"),
      bossWarning: q("bBossWarning"),
    };
  }

  _bindButtons() {
    const g = this.game;
    this.el.btnAttack  ?.addEventListener("click", () => g.battleManager.attack(g));
    this.el.btnHeal    ?.addEventListener("click", () => g.battleManager.heal(g));
    this.el.btnJobSkill?.addEventListener("click", () => g.battleManager.jobSkill(g));
    this.el.btnHeroUlt ?.addEventListener("click", () => g.battleManager.heroUltimate(g));
    this.el.btnPartyUlt?.addEventListener("click", () => {
      const p = g.player;
      if (!p.party) { g.log("❌ 동료가 없습니다"); return; }
      const aff = p.affinity?.[p.party] || 0;
      if (aff < 30) { g.log(`💔 호감도 부족 (현재 ${aff}/30)`); return; }
      if ((p.cooldowns?.partyUltimate || 0) > 0) { g.log(`⏳ 쿨타임 ${p.cooldowns.partyUltimate}턴`); return; }
      g.battleManager.partyUltimate(g);
    });
    this.el.btnFlee?.addEventListener("click", () => g.onFlee());

    // 스페이스바 → 공격 단축키 (btnPartyUlt 콜백 바깥에 위치해야 함)
    this._keyHandler = (e) => {
      if ((e.code === "Space" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        if (g.battleScene === this) g.battleManager.attack(g);
      }
    };
    document.addEventListener("keydown", this._keyHandler);
  }

  // game.js가 호출하는 메인 로그 메서드 — 이것이 없으면 모든 버튼이 오류로 멈춤
  log(msg) {
    this._logLines.push(msg);

    // 최신 메시지 표시
    if (this.el?.textLatest) {
      this.el.textLatest.innerHTML = msg;
    }

    // 스크롤 로그 영역 업데이트 (있을 때)
    const logEl = document.getElementById("battleLog");
    if (logEl) {
      const div = document.createElement("div");
      div.className = "log-line";
      div.innerHTML   = msg;
      logEl.insertBefore(div, logEl.firstChild);
      while (logEl.children.length > 25) logEl.removeChild(logEl.lastChild);
    }
  }

  // game.js에서 전투 초기화 시 호출 — 로그 초기화
  clearLog() {
    this._logLines = [];
    const logEl = document.getElementById("battleLog");
    if (logEl) logEl.innerHTML = "";
    if (this.el?.textLatest) this.el.textLatest.innerHTML = "";
  }

  startBattle(monster) {
    this._logLines = [];
    if (this.el.textLatest) this.el.textLatest.innerHTML = "전투 시작!";

    if (monster.isFinal || monster.isBoss)
      this.el.bg.src = "images/던전 내부 보스방 이미지.png";
    else
      this.el.bg.src = "images/던전내부이미지1.png";

    // ★ player.type (night/mage/archer) 으로 뒷모습 선택
    const p = this.game.player;
    const pSrc = BACK_IMAGES[p?.type] || "";
    console.log("[전투] 플레이어 타입:", p?.type, "뒷모습:", pSrc);
    if (pSrc && this.el.playerImg) {
      this.el.playerImg.src = pSrc;
      if (this.el.playerWrap) this.el.playerWrap.style.display = "block";
    }

    if (p?.party && p.partyHp > 0) {
      const cSrc = COMPANION_BACK[p.party] || "";
      console.log("[전투] 동료 파티키:", p.party, "뒷모습:", cSrc);
      if (cSrc && this.el.compImg) this.el.compImg.src = cSrc;
      if (this.el.compWrap) this.el.compWrap.style.display = "block";
    }

    if (monster.isBoss) {
      this.showBossWarning(monster.isFinal ? "마왕 등장!" : "수호자 등장!");
      if (window.audioMgr) audioMgr.playSfx("monster");
    }

    // ★ 몬스터 이미지 설정 (없으면 이름 텍스트 폴백)
    if (this.el.monsterImg) {
      const mSrc = monster.img || "";
      if (mSrc) {
        this.el.monsterImg.style.display = "block";
        this.el.monsterImg.src = mSrc;
        this.el.monsterImg.onerror = () => {
          // 이미지 파일 없을 때 → 이름 텍스트로 대체
          this.el.monsterImg.style.display = "none";
          const nameEl = document.getElementById("bMonsterFallback");
          if (nameEl) { nameEl.textContent = monster.name; nameEl.style.display = "block"; }
        };
        // 성공 시 폴백 숨김
        this.el.monsterImg.onload = () => {
          const nameEl = document.getElementById("bMonsterFallback");
          if (nameEl) nameEl.style.display = "none";
        };
      } else {
        this.el.monsterImg.style.display = "none";
        const nameEl = document.getElementById("bMonsterFallback");
        if (nameEl) { nameEl.textContent = monster.name; nameEl.style.display = "block"; }
      }
    }

    this.render();
  }

  render() {
    const g = this.game;
    const p = g.player;
    const m = g.currentMonster;
    if (!p) return;

    const realMaxHp = p.maxHp + p.bonusHp;
    this._text("playerName",  p.name);
    // ★ night/mage/archer 키로 직업명 표시
    this._text("playerClass", { knight:"기사", night:"기사", mage:"마법사", archer:"궁수" }[p.type] || p.type);
    this._text("gold",        `💰 ${p.money}G`);
    this._text("level",       p.level);
    this._text("exp",         p.exp);
    this._text("nextExp",     p.nextExp);
    this._text("sp",          p.skillPoints);
    this._bar("playerHpBar",  p.hp, realMaxHp);
    this._text("playerHpVal", `${p.hp}/${realMaxHp}`);
    this._bar("playerMpBar",  p.ultimateGauge, 100);
    this._text("playerMpVal", `${p.ultimateGauge}%`);

    // 주인공 궁극기 버튼
    if (this.el.btnHeroUlt) {
      const gauge = p.ultimateGauge || 0;
      const ready = gauge >= 100;
      if (ready) {
        this.el.btnHeroUlt.textContent       = "⚡ 궁극기 READY!";
        this.el.btnHeroUlt.style.color       = "#ffdd00";
        this.el.btnHeroUlt.style.borderColor = "#ffdd00";
        this.el.btnHeroUlt.style.background  = "#1a1400";
        this.el.btnHeroUlt.style.animation   = "status-pulse 1s ease-in-out infinite";
      } else {
        this.el.btnHeroUlt.textContent       = `⚡ 궁극기 ${gauge}%`;
        this.el.btnHeroUlt.style.color       = "";
        this.el.btnHeroUlt.style.borderColor = "";
        this.el.btnHeroUlt.style.background  = "";
        this.el.btnHeroUlt.style.animation   = "";
      }
    }

    // 동료 궁극기 버튼
    if (this.el.btnPartyUlt) {
      const aff      = p.affinity?.[p.party] || 0;
      const cd       = p.cooldowns?.partyUltimate || 0;
      const hasParty = !!(p.party && p.partyHp > 0);
      this.el.btnPartyUlt.disabled = !hasParty || aff < 30 || cd > 0;

      if (!p.party) {
        this.el.btnPartyUlt.textContent       = "💫 동료 궁극기";
        this.el.btnPartyUlt.style.color       = "";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (aff < 30) {
        this.el.btnPartyUlt.textContent       = `💫 동료 궁극기 (❤${aff}/30)`;
        this.el.btnPartyUlt.style.color       = "#555";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (cd > 0) {
        this.el.btnPartyUlt.textContent       = `💫 동료 궁극기 (${cd}턴)`;
        this.el.btnPartyUlt.style.color       = "";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (aff >= 100) {
        this.el.btnPartyUlt.textContent       = "🌟 EX 궁극기 READY!";
        this.el.btnPartyUlt.style.color       = "#ffd700";
        this.el.btnPartyUlt.style.borderColor = "#ffd700";
      } else {
        this.el.btnPartyUlt.textContent       = `💫 동료 궁극기 READY (❤${aff})`;
        this.el.btnPartyUlt.style.color       = "#88ddff";
        this.el.btnPartyUlt.style.borderColor = "#88ddff";
      }
    }

    // 동료 HUD
    const hasParty = !!(p.party && p.partyHp > 0);
    if (this.el.companionHud) this.el.companionHud.style.display = hasParty ? "block" : "none";
    if (this.el.compWrap)     this.el.compWrap.style.display     = hasParty ? "block" : "none";
    if (hasParty) {
      const mem = PARTY_MEMBERS[p.party];
      this._text("compName",     mem?.name     || "동료");
      this._text("compClass",    mem?.className || "");
      this._bar ("compHpBar",    p.partyHp, p.partyMaxHp);
      this._text("compHpVal",    `${p.partyHp}/${p.partyMaxHp}`);
      this._text("compAffinity", `❤ ${p.affinity?.[p.party] || 0}`);
    }

    // 몬스터 HUD
    if (m) {
      this._text("monsterName",   m.name);
      this._text("monsterAtk",    `ATK ${m.attack}`);
      this._text("monsterHpText", `${Math.max(0, m.hp)} / ${m.maxHp}`);
      this._bar ("monsterHpBar",  Math.max(0, m.hp), m.maxHp);
      if (m.isBoss && m.hp / m.maxHp < 0.5 && this.el.monsterHpBar)
        this.el.monsterHpBar.style.background = "linear-gradient(90deg,#550000,#ff2200)";
      if (this.el.monsterWrap) {
        this.el.monsterWrap.classList.toggle("is-final-boss", !!m.isFinal);
        this.el.monsterWrap.classList.toggle("is-boss",        !!m.isBoss && !m.isFinal);
      }
    }

    const over = g.isGameOver();
    [this.el.btnAttack, this.el.btnHeal, this.el.btnJobSkill].forEach(b => { if (b) b.disabled = over; });
  }

  updateStatusIcons() {
    const p = this.game.player;
    const m = this.game.currentMonster;
    const make = (status) => Object.entries(status || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<span class="status-icon ${k}">${{ poison:"🟢", stun:"💫", burn:"🔥" }[k]}<sub>${v}</sub></span>`)
      .join("");
    if (this.el.playerStatus)  this.el.playerStatus.innerHTML  = make(p?.status);
    if (this.el.monsterStatus) this.el.monsterStatus.innerHTML = make(m?.status);
  }

  showDamage(amount, target) {
    const field = this.el.field;
    if (!field) return;
    const n = document.createElement("div");
    n.className = `damage ${target === "monster" ? "monster-dmg" : "player-dmg"}`;
    n.innerText = `-${amount}`;
    field.appendChild(n);
    if (target === "monster") this._triggerMonsterHit();
    else this._shakeField();
    setTimeout(() => n.remove(), 900);
  }

  _triggerMonsterHit() {
    const w = this.el.monsterWrap;
    if (!w) return;
    w.classList.remove("hit"); void w.offsetWidth; w.classList.add("hit");
    setTimeout(() => w.classList.remove("hit"), 350);
  }

  _shakeField() {
    const f = this.el.field;
    if (!f) return;
    f.classList.add("shake");
    setTimeout(() => f.classList.remove("shake"), 350);
  }

  hitFlash() { this._triggerMonsterHit(); }

  showBossWarning(msg) {
    const el = this.el.bossWarning;
    if (!el) return;
    el.className = "boss-warning";
    el.innerText = msg;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 1400);
  }

  flashWhite() {
    const f = document.getElementById("flashWhite");
    if (!f) return;
    f.classList.add("active");
    setTimeout(() => f.classList.remove("active"), 500);
  }

  showRewardPopup({ title, lines, color = "#e8b830" }) {
    const old = document.getElementById("rewardPopup");
    if (old) old.remove();
    const pop = document.createElement("div");
    pop.id = "rewardPopup";
    pop.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:rgba(6,3,4,.96);border:2px solid ${color};border-radius:6px;
      padding:22px 36px;z-index:1000;text-align:center;min-width:240px;
      box-shadow:0 0 40px ${color}44;animation:popupIn .3s ease;
      font-family:'Noto Serif KR',serif;`;
    pop.innerHTML = `<div style="font-size:1.1rem;font-weight:700;color:${color};margin-bottom:12px;">${title}</div>
      ${lines.map(l => `<div style="font-size:.9rem;color:#d8c8b0;margin:4px 0;">${l}</div>`).join("")}`;
    document.body.appendChild(pop);
    setTimeout(() => {
      pop.style.animation = "popupOut .3s ease forwards";
      setTimeout(() => pop.remove(), 300);
    }, 2200);
  }

  // ── 컷신 ─────────────────────────────────────────
  showHeroUltimate(playerType) {
    // 공격 이미지 타이머 취소 후 idle 복원
    clearTimeout(this._attackFlashTimer);
    this._attackFlashTimer = null;
    if (this.el?.playerImg) {
      this.el.playerImg.src = BACK_IMAGES[playerType] || BACK_IMAGES.knight;
    }
    // Phase1: 치비 액션샷(CUTIN_HERO)  →  Phase2: 풀화면 컷신(CUTIN_HERO_FULLSCREEN)
    const action = CUTIN_HERO[playerType]           || "";
    const full   = CUTIN_HERO_FULLSCREEN[playerType] || action;
    const title  = CUTIN_HERO_TITLE[playerType]     || "✨ 궁극기!";
    this._showCutinSequence(action, full, title);
  }

  showEXCutin() {
    const party = this.game.player?.party;
    if (!party) return;
    // Phase1: 치비 액션샷(CUTIN_PARTY)  →  Phase2: 풀화면 컷신(CUTIN_PARTY_FULLSCREEN)
    const action = CUTIN_PARTY[party]           || "";
    const full   = CUTIN_PARTY_FULLSCREEN[party] || action;
    const title  = CUTIN_PARTY_TITLE[party]     || "✨ 궁극기";
    this._showCutinSequence(action, full, title);
  }

  // ─────────────────────────────────────────────────────
  //  2단계 컷신 시퀀스
  //  Phase1 (0.7s): 치비 액션샷 전체화면 표시
  //  ↓ 크로스페이드 (0.4s)
  //  Phase2 (2.2s): 풀화면 드라마틱 일러스트 + 스킬명
  // ─────────────────────────────────────────────────────
  _showCutinSequence(actionSrc, fullSrc, title) {
    document.getElementById("cutinOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "cutinOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:#000;" +
      "cursor:pointer;overflow:hidden;opacity:0;transition:opacity .25s ease;";
    document.body.appendChild(overlay);

    // 이미지 레이어
    const img = document.createElement("img");
    img.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;" +
      "object-fit:contain;opacity:0;transition:opacity .25s ease;z-index:1;";
    overlay.appendChild(img);

    // 스킬명 레이블 (Phase2에서만 표시)
    const label = document.createElement("div");
    label.style.cssText =
      "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);" +
      "color:#FFD700;font-size:2.4rem;font-weight:700;letter-spacing:.15em;" +
      "text-shadow:0 0 30px #FFD700,0 0 60px #FFD70088;" +
      "font-family:'Noto Serif KR',serif;text-align:center;z-index:2;" +
      "opacity:0;transition:opacity .4s ease;pointer-events:none;white-space:nowrap;";
    label.textContent = title;
    overlay.appendChild(label);

    let closed = false;
    const close = () => {
      if (closed || !overlay.parentNode) return;
      closed = true;
      overlay.style.transition = "opacity .35s ease";
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 400);
    };
    overlay.addEventListener("click", close);

    const P1_HOLD = 700;   // Phase1 유지 (ms)
    const P2_HOLD = 2200;  // Phase2 유지 (ms)

    const showPhase2 = () => {
      // Phase1 페이드아웃
      img.style.transition = "opacity .3s ease";
      img.style.opacity = "0";

      setTimeout(() => {
        const src2 = fullSrc || actionSrc;
        if (!src2) { close(); return; }
        // Phase2 이미지 교체 — 풀커버
        img.style.objectFit  = "cover";
        img.style.transition = "none";
        img.onload  = null;
        img.onerror = null;

        const applyPhase2 = () => {
          img.style.transition = "opacity .45s ease";
          img.style.opacity = "1";
          label.style.opacity = "1";
          setTimeout(close, P2_HOLD);
        };

        img.onload  = applyPhase2;
        img.onerror = () => { close(); };
        img.src = src2;

        // 캐시된 이미지는 onload가 발동하지 않으므로 complete 체크
        if (img.complete && img.naturalWidth > 0) {
          img.onload = null;
          applyPhase2();
        }
      }, 320);
    };

    const startPhase1 = () => {
      // 전체 오버레이 페이드인
      requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.style.opacity = "1";
      }));

      if (!actionSrc) { showPhase2(); return; }

      const applyPhase1 = () => {
        img.style.transition = "opacity .2s ease";
        img.style.opacity = "1";
        setTimeout(showPhase2, P1_HOLD);
      };

      // Phase1 이미지 로드
      img.onload  = applyPhase1;
      img.onerror = () => { showPhase2(); };
      img.src = actionSrc;

      // 캐시된 이미지는 onload가 발동하지 않으므로 complete 체크
      if (img.complete && img.naturalWidth > 0) {
        img.onload = null;
        applyPhase1();
      }
    };

    startPhase1();
  }

  // ─────────────────────────────────────────────────────
  //  공격 애니메이션
  //  playerImg를 idle → attack_1 으로 교체, 2초 후 idle 복원
  //  (전체화면 오버레이 없이 전투 화면 내 캐릭터 이미지만 바뀜)
  // ─────────────────────────────────────────────────────
  showAttackFlash(playerType) {
    if (!this.el?.playerImg) return;

    const idleSrc   = BACK_IMAGES[playerType] || BACK_IMAGES.knight || "";
    const attackSrc = CUTIN_HERO[playerType]  || ""; // sd_*_attack_1.png

    if (!attackSrc) return;

    // 진행 중인 복원 타이머 취소
    clearTimeout(this._attackFlashTimer);

    // 공격 이미지로 교체
    this.el.playerImg.src = attackSrc;

    // 2초 후 idle 이미지로 복원
    this._attackFlashTimer = setTimeout(() => {
      this._attackFlashTimer = null;
      if (this.el?.playerImg && idleSrc) {
        this.el.playerImg.src = idleSrc;
      }
    }, 2000);
  }

  _showCutinImage(src, title, duration) {
    // 하위호환 유지용 (직접 호출 시 fallback)
    this._showCutinSequence(src, src, title);
  }

  _text(id, val) { const e = this.el[id]; if (e) e.innerText = val; }

  _bar(id, cur, max) {
    const e = this.el[id];
    if (!e) return;
    const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    e.style.width = `${pct}%`;
    if (id === "playerHpBar") {
      e.style.background = pct > 50
        ? "linear-gradient(90deg,#005500,#33bb33)"
        : pct > 25
          ? "linear-gradient(90deg,#554400,#cc8800)"
          : "linear-gradient(90deg,#550000,#cc2200)";
    }
  }

  destroy() {
    clearTimeout(this._attackFlashTimer);
    this._attackFlashTimer = null;
    if (this._keyHandler) {
      document.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
  }
}

window.BattleScene = BattleScene;