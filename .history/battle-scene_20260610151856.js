// ═══════════════════════════════════════════════════
//  battle-scene.js  — 전투 씬 UI
// ═══════════════════════════════════════════════════
"use strict";

const BACK_IMAGES = {
  knight: "images/sd_knight.png",
  magician: "images/sd_magician.png",
  archer: "images/sd_archer.png",
};
const COMPANION_BACK = {
  healer: "images/sd_healer.png",
  tanker: "images/sd_tanker.png",
  warrior: "images/sd_tanker.png",
  dealer: "images/sd_knight.png",
  mage_party: "images/sd_magician.png",
  archer: "images/sd_archer.png",
};

// ── 컷신 이미지 (항상 먼저 표시) ──────────────────
const CUTIN_HERO = {
  knight: "images/Night_skill_cut.png",
  warrior: "images/Night_skill_cut.png",
  magician: "images/wizard_skill_cut.png",
  archer: "images/Elf_Archer_skill_cut.png",
};
const CUTIN_HERO_TITLE = {
  knight: "⚔ 폭풍검술!",
  warrior: "⚔ 폭풍검술!",
  magician: "🔮 대마법진!",
  archer: "🏹 천격사격!",
};
const CUTIN_PARTY = {
  healer: "images/healer_skill_cut.png",
  tanker: "images/tanker_skill_cut.png",
  warrior: "images/tanker_skill_cut.png",
  mage_party: "images/wizard_skill_cut.png",
  archer: "images/Elf_Archer_skill_cut.png",
  dealer: "images/Night_skill_cut.png",
};
const CUTIN_PARTY_TITLE = {
  healer: "✨ 천상의 기적",
  tanker: "🛡 절대 수호",
  warrior: "🛡 절대 수호",
  mage_party: "☄ 아포칼립스",
  archer: "🏹 폭풍 사격",
  dealer: "⚔ 그림자 참격",
};

// ── 컷신 영상 (호감도 50 이상 시 이미지 후 재생) ──
// video 폴더에 넣을 파일명:
//   knight_ultimate.mp4  ← A_knight_in_weathered... 파일명 변경
//   magician_ultimate.mp4   ← Wizard_Skills.mp4 파일명 변경
//   archer_ultimate.mp4 ← Forest_Elf_ultimate_skill.mp4 파일명 변경
//   healer_skill.mp4    ← healer_skill.mp4 그대로
const CUTIN_HERO_VIDEO = {
  knight: "video/knight_ultimate.mp4",
  warrior: "video/knight_ultimate.mp4",
  magician: "video/magician_ultimate.mp4",
  archer: "video/archer_ultimate.mp4",
};
const CUTIN_PARTY_VIDEO = {
  healer: "video/healer_skill.mp4",
  tanker: "video/knight_ultimate.mp4",
  warrior: "video/knight_ultimate.mp4",
  dealer: "video/knight_ultimate.mp4",
  mage_party: "video/magician_ultimate.mp4",
  archer: "video/archer_ultimate.mp4",
};

class BattleScene {
  constructor(game) {
    this.game = game;
    this._logLines = [];
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
    const q = (id) =>
      container.querySelector(`#${id}`) || document.getElementById(id);
    this.el = {
      field: q("battleField"),
      bg: q("battleBg"),
      monsterName: q("bMonsterName"),
      monsterHpBar: q("bMonsterHpBar"),
      monsterHpText: q("bMonsterHpText"),
      monsterAtk: q("bMonsterAtk"),
      monsterWrap: q("bMonsterWrap"),
      monsterImg: q("bMonsterImg"),
      playerName: q("bPlayerName"),
      playerClass: q("bPlayerClass"),
      gold: q("bGold"),
      playerHpBar: q("bPlayerHpBar"),
      playerHpVal: q("bPlayerHpVal"),
      playerMpBar: q("bPlayerMpBar"),
      playerMpVal: q("bPlayerMpVal"),
      level: q("bLevel"),
      exp: q("bExp"),
      nextExp: q("bNextExp"),
      sp: q("bSP"),
      playerWrap: q("bPlayerWrap"),
      playerImg: q("bPlayerImg"),
      companionHud: q("bCompanionHud"),
      compName: q("bCompName"),
      compClass: q("bCompClass"),
      compHpBar: q("bCompHpBar"),
      compHpVal: q("bCompHpVal"),
      compAffinity: q("bCompAffinity"),
      compWrap: q("bCompWrap"),
      compImg: q("bCompImg"),
      textLatest: q("bTextLatest"),
      btnAttack: q("bAttack"),
      btnHeal: q("bHeal"),
      btnJobSkill: q("bJobSkill"),
      btnHeroUlt: q("bHeroUlt"),
      btnPartyUlt: q("bPartyUlt"),
      btnFlee: q("bFlee"),
      monsterStatus: q("monsterStatusIcons"),
      playerStatus: q("playerStatusIcons"),
      bossWarning: q("bBossWarning"),
    };
  }

  _bindButtons() {
    const g = this.game;
    this.el.btnAttack?.addEventListener("click", () =>
      g.battleManager.attack(g),
    );
    this.el.btnHeal?.addEventListener("click", () => g.battleManager.heal(g));
    this.el.btnJobSkill?.addEventListener("click", () =>
      g.battleManager.jobSkill(g),
    );
    this.el.btnHeroUlt?.addEventListener("click", () =>
      g.battleManager.heroUltimate(g),
    );
    this.el.btnPartyUlt?.addEventListener("click", () => {
      const p = g.player;
      if (!p.party) {
        g.log("❌ 동료가 없습니다");
        return;
      }
      const aff = p.affinity?.[p.party] || 0;
      if (aff < 30) {
        g.log(`💔 호감도 부족 (현재 ${aff}/30)`);
        return;
      }
      if ((p.cooldowns?.partyUltimate || 0) > 0) {
        g.log(`⏳ 쿨타임 ${p.cooldowns.partyUltimate}턴`);
        return;
      }
      g.battleManager.partyUltimate(g);
    });
    this.el.btnFlee?.addEventListener("click", () => g.onFlee());
  }

  startBattle(monster) {
    this._logLines = [];
    if (this.el.textLatest) this.el.textLatest.innerHTML = "전투 시작!";

    if (this.el.bg) {
      // ★ 던전 타입 + 층수 + 보스 여부에 따른 배경 선택
      const dtype = this.game?.dungeonType || "normal";
      const dfloor = this.game?.dungeonFloor || 1;

      // 배경 매핑
      const BG_MAP = {
        // 일반 던전 - 층수별
        normal_1_enemy: "images/dungeon__MAP_1.png",
        normal_2_enemy: "images/dungeon_MAP_2.png",
        normal_3_enemy: "images/dungeon_MAP_3.png",
        normal_boss: "images/dungeon_MAP_3.png", // 보스방 = 3층 맵
        // 심연 던전
        abyss_enemy: "images/Abyss_map_png.png",
        abyss_boss: "images/Abyss_Dungeon.png", // 심연 군주 = 기존 Abyss 배경
        // 도시 탐험
        city_enemy: "images/TOWN_MAP.png",
        city_boss: "images/TOWN_MAP.png",
        // 마왕 (isFinal)
        final: "images/Abyss_Dungeon.png",
      };

      let bgKey;
      if (monster.isFinal) {
        bgKey = "final";
      } else if (monster.isBoss) {
        bgKey =
          dtype === "abyss"
            ? "abyss_boss"
            : dtype === "city"
              ? "city_boss"
              : "normal_boss";
      } else {
        bgKey =
          dtype === "abyss"
            ? "abyss_enemy"
            : dtype === "city"
              ? "city_enemy"
              : `normal_${dfloor}_enemy`;
      }

      const bgSrc = BG_MAP[bgKey] || BG_MAP["normal_1_enemy"];
      this.el.bg.src = bgSrc;
      this.el.bg.style.filter = monster.isFinal ? "brightness(0.7)" : "";
    }

    // 몬스터 이미지 즉시 설정
    if (this.el.monsterImg && monster.img) {
      this.el.monsterImg.src = monster.img;
      this.el.monsterImg.alt = monster.name;
      if (this.el.monsterWrap) {
        this.el.monsterWrap.style.display = "block";
        this.el.monsterWrap.classList.toggle(
          "is-final-boss",
          !!monster.isFinal,
        );
        this.el.monsterWrap.classList.toggle(
          "is-boss",
          !!monster.isBoss && !monster.isFinal,
        );
      }
    }

    // 플레이어 뒷모습
    const p = this.game.player;
    const pSrc = BACK_IMAGES[p?.type] || "";
    if (pSrc && this.el.playerImg) {
      this.el.playerImg.src = pSrc;
      if (this.el.playerWrap) this.el.playerWrap.style.display = "block";
    }

    // 동료 뒷모습
    if (p?.party && p.partyHp > 0) {
      const cSrc = COMPANION_BACK[p.party] || "";
      if (cSrc && this.el.compImg) this.el.compImg.src = cSrc;
      if (this.el.compWrap) this.el.compWrap.style.display = "block";
    }

    if (monster.isBoss) {
      this.showBossWarning(monster.isFinal ? "마왕 등장!" : "수호자 등장!");
      if (window.audioMgr) audioMgr.playSfx("monster");
    }
    this.render();
  }

  render() {
    const g = this.game;
    const p = g.player;
    const m = g.currentMonster;
    if (!p) return;

    const realMaxHp = p.maxHp + p.bonusHp;
    this._text("playerName", p.name);
    this._text(
      "playerClass",
      { night: "기사", mage: "마법사", archer: "궁수" }[p.type] || p.type,
    );
    this._text("gold", `💰 ${p.money}G`);
    this._text("level", p.level);
    this._text("exp", p.exp);
    this._text("nextExp", p.nextExp);
    this._text("sp", p.skillPoints);
    this._bar("playerHpBar", p.hp, realMaxHp);
    this._text("playerHpVal", `${p.hp}/${realMaxHp}`);
    this._bar("playerMpBar", p.ultimateGauge, 100);
    this._text("playerMpVal", `${p.ultimateGauge}%`);

    if (this.el.btnHeroUlt) {
      const gauge = p.ultimateGauge || 0;
      const ready = gauge >= 100;
      this.el.btnHeroUlt.textContent = ready
        ? "⚡ 궁극기 READY!"
        : `⚡ 궁극기 ${gauge}%`;
      this.el.btnHeroUlt.style.color = ready ? "#ffdd00" : "";
      this.el.btnHeroUlt.style.borderColor = ready ? "#ffdd00" : "";
      this.el.btnHeroUlt.style.background = ready ? "#1a1400" : "";
      this.el.btnHeroUlt.style.animation = ready
        ? "status-pulse 1s ease-in-out infinite"
        : "";
    }

    if (this.el.btnPartyUlt) {
      const aff = p.affinity?.[p.party] || 0;
      const cd = p.cooldowns?.partyUltimate || 0;
      const hasParty = !!(p.party && p.partyHp > 0);
      this.el.btnPartyUlt.disabled = !hasParty || aff < 30 || cd > 0;
      if (!p.party) {
        this.el.btnPartyUlt.textContent = "💫 동료 궁극기";
        this.el.btnPartyUlt.style.color = "";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (aff < 30) {
        this.el.btnPartyUlt.textContent = `💫 동료 궁극기 (❤${aff}/30)`;
        this.el.btnPartyUlt.style.color = "#555";
      } else if (cd > 0) {
        this.el.btnPartyUlt.textContent = `💫 동료 궁극기 (${cd}턴)`;
        this.el.btnPartyUlt.style.color = "";
      } else if (aff >= 100) {
        this.el.btnPartyUlt.textContent = "🌟 EX 궁극기 READY!";
        this.el.btnPartyUlt.style.color = "#ffd700";
        this.el.btnPartyUlt.style.borderColor = "#ffd700";
      } else {
        this.el.btnPartyUlt.textContent = `💫 동료 궁극기 READY (❤${aff})`;
        this.el.btnPartyUlt.style.color = "#88ddff";
        this.el.btnPartyUlt.style.borderColor = "#88ddff";
      }
    }

    const hasParty = !!(p.party && p.partyHp > 0);
    if (this.el.companionHud)
      this.el.companionHud.style.display = hasParty ? "block" : "none";
    if (this.el.compWrap)
      this.el.compWrap.style.display = hasParty ? "block" : "none";
    if (hasParty) {
      const mem = PARTY_MEMBERS[p.party];
      this._text("compName", mem?.name || "동료");
      this._text("compClass", mem?.className || "");
      this._bar("compHpBar", p.partyHp, p.partyMaxHp);
      this._text("compHpVal", `${p.partyHp}/${p.partyMaxHp}`);
      this._text("compAffinity", `❤ ${p.affinity?.[p.party] || 0}`);
    }

    if (m) {
      this._text("monsterName", m.name);
      this._text("monsterAtk", `ATK ${m.attack}`);
      this._text("monsterHpText", `${Math.max(0, m.hp)} / ${m.maxHp}`);
      this._bar("monsterHpBar", Math.max(0, m.hp), m.maxHp);
      if (
        this.el.monsterImg &&
        m.img &&
        !this.el.monsterImg.src.includes(m.img.split("/").pop())
      ) {
        this.el.monsterImg.src = m.img;
        this.el.monsterImg.alt = m.name;
        if (this.el.monsterWrap) this.el.monsterWrap.style.display = "block";
      }
      if (m.isBoss && m.hp / m.maxHp < 0.5 && this.el.monsterHpBar)
        this.el.monsterHpBar.style.background =
          "linear-gradient(90deg,#550000,#ff2200)";
      if (this.el.monsterWrap) {
        this.el.monsterWrap.classList.toggle("is-final-boss", !!m.isFinal);
        this.el.monsterWrap.classList.toggle(
          "is-boss",
          !!m.isBoss && !m.isFinal,
        );
      }
    }

    const over = g.isGameOver();
    [this.el.btnAttack, this.el.btnHeal, this.el.btnJobSkill].forEach((b) => {
      if (b) b.disabled = over;
    });
  }

  updateStatusIcons() {
    const p = this.game.player;
    const m = this.game.currentMonster;
    const make = (status) =>
      Object.entries(status || {})
        .filter(([, v]) => v > 0)
        .map(
          ([k, v]) =>
            `<span class="status-icon ${k}">${{ poison: "🟢", stun: "💫", burn: "🔥" }[k]}<sub>${v}</sub></span>`,
        )
        .join("");
    if (this.el.playerStatus) this.el.playerStatus.innerHTML = make(p?.status);
    if (this.el.monsterStatus)
      this.el.monsterStatus.innerHTML = make(m?.status);
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
    w.classList.remove("hit");
    void w.offsetWidth;
    w.classList.add("hit");
    setTimeout(() => w.classList.remove("hit"), 350);
  }
  _shakeField() {
    const f = this.el.field;
    if (!f) return;
    f.classList.add("shake");
    setTimeout(() => f.classList.remove("shake"), 350);
  }
  hitFlash() {
    this._triggerMonsterHit();
  }

  showBossWarning(msg) {
    const el = this.el.bossWarning;
    if (!el) return;
    el.className = "boss-warning";
    el.innerText = msg;
    el.style.display = "block";
    setTimeout(() => {
      el.style.display = "none";
    }, 1400);
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
      ${lines.map((l) => `<div style="font-size:.9rem;color:#d8c8b0;margin:4px 0;">${l}</div>`).join("")}`;
    document.body.appendChild(pop);
    setTimeout(() => {
      pop.style.animation = "popupOut .3s ease forwards";
      setTimeout(() => pop.remove(), 300);
    }, 2200);
  }

  // ══════════════════════════════════════════════════
  //  컷신 시스템
  //  흐름: 이미지 1.2초 표시 → (호감도 50+) 영상 재생
  // ══════════════════════════════════════════════════

  // 주인공 궁극기 컷신
  showHeroUltimate(playerType) {
    const imgSrc = CUTIN_HERO[playerType] || "";
    const videoSrc = CUTIN_HERO_VIDEO[playerType] || "";
    const title = CUTIN_HERO_TITLE[playerType] || "✨ 궁극기!";
    // 주인공은 항상 영상 재생 (호감도 조건 없음)
    this._showCutinImageThenVideo(imgSrc, videoSrc, title);
  }

  // 동료 궁극기 컷신 (호감도 50 이상 시 영상)
  showEXCutin() {
    const p = this.game.player;
    const party = p?.party;
    if (!party) return;

    const imgSrc = CUTIN_PARTY[party] || "";
    const videoSrc = CUTIN_PARTY_VIDEO[party] || "";
    const title = CUTIN_PARTY_TITLE[party] || "✨ 궁극기";
    const aff = p.affinity?.[party] || 0;

    if (aff >= 50 && videoSrc) {
      // 호감도 50 이상: 이미지 → 영상
      this._showCutinImageThenVideo(imgSrc, videoSrc, title);
    } else {
      // 호감도 50 미만: 이미지만
      this._showCutinImage(imgSrc, title, 2500);
    }
  }

  // 이미지 1.2초 → 영상 재생 (풀스크린)
  _showCutinImageThenVideo(imgSrc, videoSrc, title) {
    const old = document.getElementById("cutinOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "cutinOverlay";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:999999",
      "background:#000",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
      "opacity:0",
      "transition:opacity .3s ease",
    ].join(";");

    const label = document.createElement("div");
    label.style.cssText = [
      "color:#FFD700",
      "font-size:2.4rem",
      "font-weight:700",
      "letter-spacing:.15em",
      "text-shadow:0 0 30px #FFD700,0 0 60px #FFD70088",
      "font-family:'Noto Serif KR',serif",
      "margin-top:20px",
      "text-align:center",
      "padding:0 20px",
    ].join(";");
    label.textContent = title;

    const close = () => {
      if (!overlay.parentNode) return;
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 300);
    };
    overlay.addEventListener("click", close);

    const showOverlay = () => {
      document.body.appendChild(overlay);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          overlay.style.opacity = "1";
        }),
      );
    };

    const playVideo = () => {
      // 오버레이 내용 교체: 영상으로
      overlay.innerHTML = "";

      const vLabel = document.createElement("div");
      vLabel.style.cssText = label.style.cssText;
      vLabel.textContent = title;

      const video = document.createElement("video");
      video.src = videoSrc;
      video.muted = false;
      video.playsInline = true;
      video.autoplay = true;
      video.style.cssText = [
        "max-width:100vw",
        "max-height:100vh",
        "width:100%",
        "height:100%",
        "object-fit:cover",
      ].join(";");

      // 영상 끝나면 자동 닫기
      video.onended = close;
      video.onerror = close;

      overlay.appendChild(vLabel);
      overlay.appendChild(video);

      video.play().catch(() => close());
    };

    if (imgSrc && videoSrc) {
      // 이미지 먼저 표시
      const img = document.createElement("img");
      img.style.cssText = [
        "max-width:92vw",
        "max-height:78vh",
        "object-fit:contain",
        "border-radius:8px",
        "box-shadow:0 0 80px rgba(255,215,0,0.35)",
      ].join(";");

      img.onload = () => {
        overlay.appendChild(img);
        overlay.appendChild(label);
        showOverlay();
        // 1.2초 후 영상으로 전환
        setTimeout(() => playVideo(), 1200);
      };
      img.onerror = () => {
        // 이미지 없으면 바로 영상
        showOverlay();
        playVideo();
      };
      img.src = imgSrc;
    } else if (imgSrc) {
      // 영상 없음: 이미지만 2.5초
      this._showCutinImage(imgSrc, title, 2500);
    } else if (videoSrc) {
      // 이미지 없음: 바로 영상
      showOverlay();
      playVideo();
    } else {
      // 둘 다 없음: 텍스트만
      this._showCutinImage("", title, 1800);
    }
  }

  // 이미지만 표시 (영상 없을 때)
  _showCutinImage(imgSrc, title, duration) {
    const old = document.getElementById("cutinOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "cutinOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .3s ease;";

    const label = document.createElement("div");
    label.style.cssText =
      "color:#FFD700;font-size:2.4rem;font-weight:700;letter-spacing:.15em;text-shadow:0 0 30px #FFD700,0 0 60px #FFD70088;font-family:'Noto Serif KR',serif;margin-top:20px;text-align:center;padding:0 20px;";
    label.textContent = title;

    let timer;
    const close = () => {
      if (!overlay.parentNode) return;
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 300);
      clearTimeout(timer);
    };
    overlay.addEventListener("click", close);

    const fadeIn = () => {
      document.body.appendChild(overlay);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          overlay.style.opacity = "1";
        }),
      );
      timer = setTimeout(close, duration);
    };

    if (imgSrc) {
      const img = document.createElement("img");
      img.style.cssText =
        "max-width:92vw;max-height:78vh;object-fit:contain;border-radius:8px;box-shadow:0 0 80px rgba(255,215,0,0.35);";
      img.onload = () => {
        overlay.appendChild(img);
        overlay.appendChild(label);
        fadeIn();
      };
      img.onerror = () => {
        label.style.fontSize = "3.5rem";
        label.style.marginTop = "0";
        overlay.appendChild(label);
        fadeIn();
      };
      img.src = imgSrc;
    } else {
      label.style.fontSize = "3.5rem";
      label.style.marginTop = "0";
      overlay.appendChild(label);
      fadeIn();
    }
  }

  log(msg) {
    const plain = msg.replace(/<[^>]+>/g, "");
    this._logLines.push(plain);
    if (this._logLines.length > 40) this._logLines.shift();
    if (this.el.textLatest)
      this.el.textLatest.innerHTML = this._logLines.slice(-3).join("<br>");
  }

  clearLog() {
    this._logLines = [];
    if (this.el.textLatest) this.el.textLatest.innerHTML = "무엇을 할까?";
  }

  _text(id, val) {
    const e = this.el[id];
    if (e) e.innerText = val;
  }
  _bar(id, cur, max) {
    const e = this.el[id];
    if (!e) return;
    const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    e.style.width = `${pct}%`;
    if (id === "playerHpBar") {
      e.style.background =
        pct > 50
          ? "linear-gradient(90deg,#005500,#33bb33)"
          : pct > 25
            ? "linear-gradient(90deg,#554400,#cc8800)"
            : "linear-gradient(90deg,#550000,#cc2200)";
    }
  }
}

window.BattleScene = BattleScene;
