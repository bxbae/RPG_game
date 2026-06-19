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
  tanker:   "images/SD_Tanker.png",
  healer:   "images/sd_healer.png",
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
// ── 동료 공격 프레임 ──────────────────────────────────
const COMPANION_ATTACK = {
  healer:     ["images/SD_healer_attack_1.png",   "images/SD_healer_attack_1.png"],
  tanker:     ["images/SD_Tanker_attack_1.png",   "images/SD_Tanker_attack_2.png"],
  warrior:    ["images/SD_Tanker_attack_1.png",   "images/SD_Tanker_attack_2.png"],
  mage_party: ["images/sd_magician_attack_1.png", "images/sd_magician_attack_2.png"],
  archer:     ["images/sd_archer_attack_1.png",   "images/sd_archer_attack_2.png"],
  dealer:     ["images/sd_knight_attack_1.png",   "images/sd_knight_attack_2.png"],
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

// ── 공격 버튼 2프레임 시퀀스 (attack_1 → attack_2 → idle) ──
const ATTACK_FRAMES = {
  knight:   ["images/sd_knight_attack_1.png",   "images/sd_knight_attack_2.png"],
  night:    ["images/sd_knight_attack_1.png",   "images/sd_knight_attack_2.png"],
  warrior:  ["images/sd_knight_attack_1.png",   "images/sd_knight_attack_2.png"],
  mage:     ["images/sd_magician_attack_1.png", "images/sd_magician_attack_2.png"],
  magician: ["images/sd_magician_attack_1.png", "images/sd_magician_attack_2.png"],
  archer:   ["images/sd_archer_attack_1.png",   "images/sd_archer_attack_2.png"],
  tanker:   ["images/SD_Tanker_attack_1.png",   "images/SD_Tanker_attack_2.png"],
  healer:   ["images/SD_healer_attack_1.png",   "images/SD_healer_attack_1.png"],
};
const CUTIN_HERO_TITLE = {
  knight:   "⚔ 폭풍검술!",
  night:    "⚔ 폭풍검술!",
  warrior:  "⚔ 폭풍검술!",
  mage:     "🔮 대마법진!",
  magician: "🔮 대마법진!",
  archer:   "🏹 천격사격!",
  tanker:   "🛡 철벽 강타!",
  healer:   "✝ 신성 폭발!",
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

// ─── 궁극기 영상 (videos/ 폴더 MP4) ─────────────────
const ULTIMATE_VIDEOS = {
  knight:   "videos/knight_ultimate.mp4",
  night:    "videos/knight_ultimate.mp4",
  warrior:  "videos/tanker_ultimate.mp4",
  mage:     "videos/magician_ultimate.mp4",
  magician: "videos/magician_ultimate.mp4",
  archer:   "videos/archer_ultimate.mp4",
  tanker:   "videos/tanker_ultimate.mp4",
  healer:   "videos/healer_ultimate.mp4",
};
const ULTIMATE_PARTY_VIDEOS = {
  healer:     "videos/healer_ultimate.mp4",
  tanker:     "videos/tanker_ultimate.mp4",
  warrior:    "videos/tanker_ultimate.mp4",  // 하위호환
  mage_party: "videos/magician_ultimate.mp4",
  archer:     "videos/archer_ultimate.mp4",
  dealer:     "videos/knight_ultimate.mp4",
};

// ─── 궁극기 2단계: 풀화면 드라마틱 컷신 ─────────────
// Phase1: CUTIN_HERO / CUTIN_PARTY (치비 액션샷, 0.7s)
// Phase2: 아래 이미지 (풀화면 일러스트, 2.2s)
const CUTIN_HERO_FULLSCREEN = {
  knight:   "images/Night_skill_cut.png",
  night:    "images/Night_skill_cut.png",
  warrior:  "images/Night_skill_cut.png",
  mage:     "images/magician_skill_cut.png",
  magician: "images/magician_skill_cut.png",
  archer:   "images/Elf_Archer_skill_cut.png",
  tanker:   "images/tanker_skill_cut.png",
  healer:   "images/healer_skill_cut.png",
};
const CUTIN_PARTY_FULLSCREEN = {
  healer:     "images/healer_skill_cut.png",
  tanker:     "images/tanker_skill_cut.png",
  warrior:    "images/tanker_skill_cut.png",          // 하위호환
  mage_party: "images/magician_skill_cut.png",
  archer:     "images/Elf_Archer_skill_cut.png",
  dealer:     "images/Night_skill_cut.png",
};

class BattleScene {
  constructor(game) {
    this.game = game;
    this._logLines = [];
    this._attackFlashTimer  = null;
    this._attackFrame2Timer = null;
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
    <div class="poke-companion-hud" id="bCompanionHud2" style="display:none;">
      <div class="poke-hud-name" id="bComp2Name">동료2</div>
      <div class="poke-hud-sub-name" id="bComp2Class">탱커</div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bComp2HpBar" class="poke-hp-fill companion-hp"></div></div>
        </div>
      </div>
      <div class="poke-hp-nums" id="bComp2HpVal">90/90</div>
      <div id="bComp2Affinity" style="color:#ff77aa;font-size:.6rem;text-align:right;margin-top:2px;">❤ 0</div>
    </div>
  </div>
  <div class="player-level">Lv.<span id="bLevel">1</span></div>
  <div class="player-exp">EXP <span id="bExp">0</span>/<span id="bNextExp">100</span></div>
  <div class="player-skill">SP <span id="bSP">0</span></div>
  <div class="poke-player-sprite-wrap" id="bPlayerWrap">
    <img id="bPlayerImg" class="poke-player-sprite" src="" alt="플레이어"/>
    <!-- 공격 모션 오버레이 -->
    <img id="bAttackOverlay" src="" alt=""
      style="position:absolute;inset:0;width:100%;height:100%;
      object-fit:contain;opacity:0;pointer-events:none;
      transition:opacity 0.08s ease;z-index:5;"/>
  </div>
  <div class="poke-companion-sprite-wrap" id="bCompWrap" style="display:none;">
    <img id="bCompImg" class="poke-companion-sprite" src="" alt="동료"/>
  </div>
  <div class="poke-companion-sprite-wrap poke-companion2-sprite-wrap" id="bCompWrap2" style="display:none;">
    <img id="bCompImg2" class="poke-companion-sprite" src="" alt="동료2"/>
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
    <button class="poke-cmd ult-cmd" id="bParty2Ult" type="button" style="display:none;">💫 2번 동료 궁극기</button>
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
      attackOverlay: q("bAttackOverlay"),
      companionHud: q("bCompanionHud"), compName: q("bCompName"),
      compClass: q("bCompClass"), compHpBar: q("bCompHpBar"),
      compHpVal: q("bCompHpVal"), compAffinity: q("bCompAffinity"),
      compWrap: q("bCompWrap"), compImg: q("bCompImg"),
      companionHud2: q("bCompanionHud2"), comp2Name: q("bComp2Name"),
      comp2Class: q("bComp2Class"), comp2HpBar: q("bComp2HpBar"),
      comp2HpVal: q("bComp2HpVal"), comp2Affinity: q("bComp2Affinity"),
      compWrap2: q("bCompWrap2"), compImg2: q("bCompImg2"),
      textLatest: q("bTextLatest"),
      btnAttack: q("bAttack"), btnHeal: q("bHeal"), btnJobSkill: q("bJobSkill"),
      btnHeroUlt: q("bHeroUlt"), btnPartyUlt: q("bPartyUlt"), btnParty2Ult: q("bParty2Ult"), btnFlee: q("bFlee"),
      monsterStatus: q("monsterStatusIcons"), playerStatus: q("playerStatusIcons"),
      bossWarning: q("bBossWarning"),
    };
  }

  _bindButtons() {
    const g = this.game;

    // ⚔ 공격 버튼 — 클릭 즉시 공격 애니메이션 실행 후 battle-manager 호출
    this.el.btnAttack?.addEventListener("click", () => {
      this.showAttackFlash(g.player?.type);   // ← 즉시 이미지 교체
      g.battleManager.attack(g);
    });
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
    this.el.btnParty2Ult?.addEventListener("click", () => {
      const p = g.player;
      if (!p.party2) { g.log("❌ 2번 동료가 없습니다"); return; }
      const aff = p.affinity?.[p.party2] || 0;
      if (aff < 30) { g.log(`💔 호감도 부족 (현재 ${aff}/30)`); return; }
      if ((p.cooldowns?.party2Ultimate || 0) > 0) { g.log(`⏳ 쿨타임 ${p.cooldowns.party2Ultimate}턴`); return; }
      g.battleManager.party2Ultimate(g);
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
    clearTimeout(this._attackFlashTimer);   // 이전 공격 타이머 취소
    clearTimeout(this._attackFrame2Timer);
    this._attackFlashTimer  = null;
    this._attackFrame2Timer = null;

    // attackOverlay 초기화 (이전 공격 이미지 제거)
    if (this.el.attackOverlay) {
      this.el.attackOverlay.style.transition = "none";
      this.el.attackOverlay.style.opacity    = "0";
      this.el.attackOverlay.src              = "";
    }
    // idle 이미지 opacity 복원
    if (this.el.playerImg) {
      this.el.playerImg.style.transition = "none";
      this.el.playerImg.style.opacity    = "1";
    }

    if (this.el.textLatest) this.el.textLatest.innerHTML = "전투 시작!";

    if (monster.isFinal || monster.isBoss)
      this.el.bg.src = "images/Dungeon_BOSS_ROOM.png";
    else {
      const BATTLE_BG = {
        outside: "images/town_prosperity.png",
        forest:  "images/forest_exploration_night.png",
        normal:  "images/dungeon_interior.png",
        abyss:   "images/Abyss_Dungeon.png",
      };
      const dt = this.game?.dungeonType || "normal";
      this.el.bg.src = BATTLE_BG[dt] || BATTLE_BG.normal;
    }

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

    if (p?.party2 && p.party2Hp > 0) {
      const c2Src = COMPANION_BACK[p.party2] || "";
      console.log("[전투] 동료2 파티키:", p.party2, "뒷모습:", c2Src);
      if (c2Src && this.el.compImg2) this.el.compImg2.src = c2Src;
      if (this.el.compWrap2) this.el.compWrap2.style.display = "block";
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

    // 동료 궁극기 버튼 — 항상 표시, 상태만 변경
    if (this.el.btnPartyUlt) {
      const aff      = p.affinity?.[p.party] || 0;
      const cd       = p.cooldowns?.partyUltimate || 0;
      const hasParty = !!(p.party && p.partyHp > 0);

      this.el.btnPartyUlt.style.display = ""; // 항상 표시

      if (!p.party) {
        this.el.btnPartyUlt.disabled      = true;
        this.el.btnPartyUlt.textContent   = "💫 동료 궁극기";
        this.el.btnPartyUlt.style.opacity = "0.4";
        this.el.btnPartyUlt.style.color   = "";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (!hasParty) {
        this.el.btnPartyUlt.disabled      = true;
        this.el.btnPartyUlt.textContent   = "💫 동료 전투불능";
        this.el.btnPartyUlt.style.opacity = "0.4";
        this.el.btnPartyUlt.style.color   = "#cc4444";
        this.el.btnPartyUlt.style.borderColor = "#cc4444";
      } else if (aff < 30) {
        this.el.btnPartyUlt.disabled      = true;
        this.el.btnPartyUlt.textContent   = `💫 동료 궁극기 (❤${aff}/30)`;
        this.el.btnPartyUlt.style.opacity = "0.5";
        this.el.btnPartyUlt.style.color   = "#888";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (cd > 0) {
        this.el.btnPartyUlt.disabled      = true;
        this.el.btnPartyUlt.textContent   = `💫 동료 궁극기 (${cd}턴)`;
        this.el.btnPartyUlt.style.opacity = "0.6";
        this.el.btnPartyUlt.style.color   = "";
        this.el.btnPartyUlt.style.borderColor = "";
      } else if (aff >= 100) {
        this.el.btnPartyUlt.disabled      = false;
        this.el.btnPartyUlt.textContent   = "🌟 EX 궁극기 READY!";
        this.el.btnPartyUlt.style.opacity = "1";
        this.el.btnPartyUlt.style.color       = "#ffd700";
        this.el.btnPartyUlt.style.borderColor = "#ffd700";
      } else {
        this.el.btnPartyUlt.disabled      = false;
        this.el.btnPartyUlt.textContent   = `💫 동료 궁극기 READY (❤${aff})`;
        this.el.btnPartyUlt.style.opacity = "1";
        this.el.btnPartyUlt.style.color       = "#88ddff";
        this.el.btnPartyUlt.style.borderColor = "#88ddff";
      }
    }

    // 2번 동료 궁극기 버튼 — party2가 있을 때만 표시
    if (this.el.btnParty2Ult) {
      if (!p.party2) {
        this.el.btnParty2Ult.style.display = "none";
      } else {
        this.el.btnParty2Ult.style.display = "";
        const aff2      = p.affinity?.[p.party2] || 0;
        const cd2       = p.cooldowns?.party2Ultimate || 0;
        const hasParty2 = !!(p.party2 && p.party2Hp > 0);

        if (!hasParty2) {
          this.el.btnParty2Ult.disabled      = true;
          this.el.btnParty2Ult.textContent   = "💫 2번 동료 전투불능";
          this.el.btnParty2Ult.style.opacity = "0.4";
          this.el.btnParty2Ult.style.color   = "#cc4444";
          this.el.btnParty2Ult.style.borderColor = "#cc4444";
        } else if (aff2 < 30) {
          this.el.btnParty2Ult.disabled      = true;
          this.el.btnParty2Ult.textContent   = `💫 2번 동료 궁극기 (❤${aff2}/30)`;
          this.el.btnParty2Ult.style.opacity = "0.5";
          this.el.btnParty2Ult.style.color   = "#888";
          this.el.btnParty2Ult.style.borderColor = "";
        } else if (cd2 > 0) {
          this.el.btnParty2Ult.disabled      = true;
          this.el.btnParty2Ult.textContent   = `💫 2번 동료 궁극기 (${cd2}턴)`;
          this.el.btnParty2Ult.style.opacity = "0.6";
          this.el.btnParty2Ult.style.color   = "";
          this.el.btnParty2Ult.style.borderColor = "";
        } else if (aff2 >= 100) {
          this.el.btnParty2Ult.disabled      = false;
          this.el.btnParty2Ult.textContent   = "🌟 2번 EX 궁극기 READY!";
          this.el.btnParty2Ult.style.opacity = "1";
          this.el.btnParty2Ult.style.color       = "#ffd700";
          this.el.btnParty2Ult.style.borderColor = "#ffd700";
        } else {
          this.el.btnParty2Ult.disabled      = false;
          this.el.btnParty2Ult.textContent   = `💫 2번 동료 궁극기 READY (❤${aff2})`;
          this.el.btnParty2Ult.style.opacity = "1";
          this.el.btnParty2Ult.style.color       = "#88ddff";
          this.el.btnParty2Ult.style.borderColor = "#88ddff";
        }
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

    // 동료2 HUD
    const hasParty2 = !!(p.party2 && p.party2Hp > 0);
    if (this.el.companionHud2) this.el.companionHud2.style.display = hasParty2 ? "block" : "none";
    if (this.el.compWrap2)     this.el.compWrap2.style.display     = hasParty2 ? "block" : "none";
    if (hasParty2) {
      const mem2 = PARTY_MEMBERS[p.party2];
      this._text("comp2Name",     mem2?.name     || "동료2");
      this._text("comp2Class",    mem2?.className || "");
      this._bar ("comp2HpBar",    p.party2Hp, p.party2MaxHp);
      this._text("comp2HpVal",    `${p.party2Hp}/${p.party2MaxHp}`);
      this._text("comp2Affinity", `❤ ${p.affinity?.[p.party2] || 0}`);
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

  // ── 궁극기: 영상 재생 ─────────────────────────────
  showHeroUltimate(playerType) {
    clearTimeout(this._attackFlashTimer);
    clearTimeout(this._attackFrame2Timer);
    this._attackFlashTimer  = null;
    this._attackFrame2Timer = null;
    if (this.el?.attackOverlay) this.el.attackOverlay.style.opacity = "0";
    if (this.el?.playerImg)     this.el.playerImg.style.opacity     = "1";

    const cutImg = CUTIN_HERO_FULLSCREEN[playerType] || "";
    const vidSrc = ULTIMATE_VIDEOS[playerType]       || "";
    const title  = CUTIN_HERO_TITLE[playerType]      || "✨ 궁극기!";
    this._playUltimateCutThenVideo(cutImg, vidSrc, title);
  }

  showEXCutin() {
    const party = this.game.player?.party;
    if (!party) return;
    if (this.el?.attackOverlay) this.el.attackOverlay.style.opacity = "0";
    if (this.el?.playerImg)     this.el.playerImg.style.opacity     = "1";

    const cutImg = CUTIN_PARTY_FULLSCREEN[party] || "";
    const vidSrc = ULTIMATE_PARTY_VIDEOS[party]  || "";
    const title  = CUTIN_PARTY_TITLE[party]      || "✨ 궁극기";
    this._playUltimateCutThenVideo(cutImg, vidSrc, title);
  }

  // ── 궁극기: ① 컷신 이미지(2.5초) → ② MP4 영상 ──────
  _playUltimateCutThenVideo(cutImgSrc, vidSrc, title) {
    document.getElementById("ultimateScreen")?.remove();

    const screen = document.createElement("div");
    screen.id = "ultimateScreen";
    screen.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:#000;" +
      "display:flex;align-items:center;justify-content:center;";

    const label = document.createElement("div");
    label.style.cssText =
      "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);" +
      "color:#FFD700;font-size:2.6rem;font-weight:700;letter-spacing:.18em;" +
      "text-shadow:0 0 30px #FFD700,0 0 60px #FFD70088;" +
      "font-family:\'Noto Serif KR\',serif;text-align:center;z-index:10;" +
      "pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .4s;";
    label.textContent = title;
    screen.appendChild(label);

    const cutEl = document.createElement("img");
    cutEl.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;" +
      "object-fit:contain;opacity:0;transition:opacity .35s ease;z-index:5;";
    screen.appendChild(cutEl);

    const video = document.createElement("video");
    video.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;" +
      "object-fit:cover;opacity:0;transition:opacity .3s ease;z-index:6;";
    video.playsInline = true;
    video.controls    = false;
    video.preload     = "auto";
    screen.appendChild(video);
    document.body.appendChild(screen);

    let phase = 1;
    let phase1Timer = null;
    let fallbackTimer = null;

    const closeAll = () => {
      clearTimeout(phase1Timer);
      clearTimeout(fallbackTimer);
      video.pause();
      screen.style.transition = "opacity .3s ease";
      screen.style.opacity    = "0";
      setTimeout(() => screen.remove(), 320);
      document.removeEventListener("keydown", onKey);
    };

    const startPhase2 = () => {
      clearTimeout(phase1Timer);
      phase = 2;
      cutEl.style.opacity = "0";
      label.style.opacity = "0";
      if (!vidSrc) { closeAll(); return; }

      video.src = vidSrc;
      video.style.opacity = "1";

      let played = false;
      const tryPlay = () => {
        if (played) return;
        played = true;
        const p = video.play();
        if (p) p.catch(() => setTimeout(() => video.play().catch(closeAll), 300));
      };
      video.addEventListener("canplay", tryPlay, { once: true });
      setTimeout(tryPlay, 400); // file:// 환경 대응 강제 재생

      video.addEventListener("ended", closeAll, { once: true });
      video.addEventListener("error", closeAll, { once: true });
      fallbackTimer = setTimeout(closeAll, 15000);
      video.addEventListener("ended", () => clearTimeout(fallbackTimer), { once: true });
      video.load();
    };

    // 클릭: Phase 1 → Phase 2 스킵 / Phase 2 → 닫기
    screen.addEventListener("click", () => {
      if (phase === 1) startPhase2();
      else closeAll();
    });

    const onKey = e => {
      if (e.key === "Escape") closeAll();
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (phase === 1) startPhase2(); else closeAll(); }
    };
    document.addEventListener("keydown", onKey);

    if (!cutImgSrc) {
      startPhase2();
    } else {
      cutEl.src = cutImgSrc;
      const showCut = () => {
        cutEl.style.opacity = "1";
        label.style.opacity = "1";
        phase1Timer = setTimeout(() => {
          cutEl.style.opacity = "0";
          label.style.opacity = "0";
          setTimeout(startPhase2, 350);
        }, 2500);
      };
      cutEl.onload  = () => requestAnimationFrame(showCut);
      cutEl.onerror = () => startPhase2();
    }
  }

  // 하위호환
  _playUltimateVideo(src, title) { this._playUltimateCutThenVideo("", src, title); }

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
  //  attack_1(즉시) → attack_2(500ms후) → idle(500ms후)
  //  playerImg.src 를 직접 교체 — 오버레이 미사용
  // ─────────────────────────────────────────────────────
  showAttackFlash(playerType) {
    // ── 이전 타이머 모두 취소 ──
    clearTimeout(this._attackFlashTimer);
    clearTimeout(this._attackFrame2Timer);
    this._attackFlashTimer  = null;
    this._attackFrame2Timer = null;

    // ── img 요소 직접 조회 (el 캐시 + fallback) ──
    const img = this.el?.playerImg
             || document.getElementById("bPlayerImg");
    if (!img) return;

    // ── 직업별 이미지 경로 ──
    const type = playerType || this.game?.player?.type || "knight";

    const idle = {
      knight:   "images/sd_knight.png",
      night:    "images/sd_knight.png",
      warrior:  "images/sd_knight.png",
      mage:     "images/sd_magician.png",
      magician: "images/sd_magician.png",
      archer:   "images/sd_archer.png",
      tanker:   "images/SD_Tanker.png",
      healer:   "images/sd_healer.png",
    }[type] || "images/sd_knight.png";

    const atk1 = {
      knight:   "images/sd_knight_attack_1.png",
      night:    "images/sd_knight_attack_1.png",
      warrior:  "images/sd_knight_attack_1.png",
      mage:     "images/sd_magician_attack_1.png",
      magician: "images/sd_magician_attack_1.png",
      archer:   "images/sd_archer_attack_1.png",
      tanker:   "images/SD_Tanker_attack_1.png",
      healer:   "images/SD_healer_attack_1.png",
    }[type] || "images/sd_knight_attack_1.png";

    const atk2 = {
      knight:   "images/sd_knight_attack_2.png",
      night:    "images/sd_knight_attack_2.png",
      warrior:  "images/sd_knight_attack_2.png",
      mage:     "images/sd_magician_attack_2.png",
      magician: "images/sd_magician_attack_2.png",
      archer:   "images/sd_archer_attack_2.png",
      tanker:   "images/SD_Tanker_attack_2.png",
      healer:   "images/SD_healer_attack_1.png",  // healer attack_2 없으면 attack_1 재사용
    }[type] || atk1;

    // ① attack_1 즉시 표시
    img.src             = atk1;
    img.style.opacity   = "1";
    img.style.transition = "none";

    // ── 동료 공격 애니메이션 ──────────────────────────
    const party     = this.game?.player?.party;
    const compImg   = this.el?.compImg || document.getElementById("bCompImg");
    const compFrames = party ? (COMPANION_ATTACK[party] || []) : [];
    const compIdle   = party ? (COMPANION_BACK[party] || "") : "";
    const cAtk1 = compFrames[0] || "";
    const cAtk2 = compFrames[1] || cAtk1;

    if (compImg && cAtk1) {
      compImg.src = cAtk1;
      compImg.style.transition = "none";
      compImg.style.opacity    = "1";
    }

    // ── 2번 동료 공격 애니메이션 (party2) ──────────────
    const party2     = this.game?.player?.party2;
    const comp2Img   = this.el?.compImg2 || document.getElementById("bCompImg2");
    const comp2Frames = party2 ? (COMPANION_ATTACK[party2] || []) : [];
    const comp2Idle   = party2 ? (COMPANION_BACK[party2] || "") : "";
    const c2Atk1 = comp2Frames[0] || "";
    const c2Atk2 = comp2Frames[1] || c2Atk1;

    if (comp2Img && c2Atk1) {
      comp2Img.src = c2Atk1;
      comp2Img.style.transition = "none";
      comp2Img.style.opacity    = "1";
    }

    // ② 500ms 후 attack_2
    this._attackFrame2Timer = setTimeout(() => {
      img.src = atk2;
      if (compImg && cAtk2) compImg.src = cAtk2;
      if (comp2Img && c2Atk2) comp2Img.src = c2Atk2;

      // ③ 500ms 후 idle 복귀
      this._attackFlashTimer = setTimeout(() => {
        img.src = idle;
        if (compImg && compIdle) compImg.src = compIdle;
        if (comp2Img && comp2Idle) comp2Img.src = comp2Idle;
        this._attackFlashTimer  = null;
        this._attackFrame2Timer = null;
      }, 500);
    }, 500);
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