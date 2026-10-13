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
};
const CUTIN_PARTY_TITLE = {
  healer:     "✨ 천상의 기적",
  tanker:     "🛡 절대 수호",
  warrior:    "🛡 절대 수호",   // 하위호환
  mage_party: "☄ 아포칼립스",
  archer:     "🏹 폭풍 사격",
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
};

// ─── 궁극기 컷신 직업별 색 (--c1 외곽/광채, --c2 하이라이트, ray 광선 rgb) ───
const ULT_THEME = {
  knight:   { c1:"#ff3b2f", c2:"#ffd36a", ray:"255,70,40"   },
  tanker:   { c1:"#3aa0ff", c2:"#c4e8ff", ray:"60,150,255"  },
  archer:   { c1:"#4fe06a", c2:"#eaffb8", ray:"90,230,110"  },
  mage:     { c1:"#b25cff", c2:"#f2d8ff", ray:"170,90,255"  },
  healer:   { c1:"#ffd84a", c2:"#ffffff", ray:"255,225,120" },
};
// ─── 캐릭터 크기 보정 ───────────────────────────────
//  그림마다 여백·비율이 달라 같은 칸에 넣어도 보이는 키가 제각각이다
//  (칸 폭 대비 실제 캐릭터 높이: 힐러 1.21 / 마법사·궁수 0.99 / 기사·탱커 0.88).
//  대기 이미지의 투명도 영역을 측정한 값(w: 이미지 폭, vh: 캐릭터가 차지하는 높이, px)으로
//  모든 캐릭터의 보이는 높이를 SPRITE_TARGET × 칸 폭으로 맞춘다.
const SPRITE_FIT = {
  "images/sd_knight.png":    { w: 390, vh: 348 },
  "images/SD_Tanker.png":    { w: 646, vh: 564 },
  "images/sd_magician.png":  { w: 500, vh: 495 },
  "images/sd_archer.png":    { w: 500, vh: 496 },
  "images/sd_healer.png":    { w: 598, vh: 726 },
};
const SPRITE_TARGET = 1.15;

// ─── 궁극기 영상에서 실제로 보여줄 구간 (초) ───
//  start/end: 움직임이 많은 구간만 재생 (앞뒤의 정지된 부분은 잘라냄)
//  hit: 타격(섬광) 순간 — 이때 화면 충격 효과를 맞춰 준다
//  (영상 길이에 따른 자동 배속은 구간 길이를 기준으로 계산)
const ULT_VIDEO_CLIP = {
  "videos/tanker_ultimate.mp4":   { start: 1.0, end: 5.0, hit: 3.7 },   // 1초 클로즈업 → 방패 타격 → 여운 (뒤 3초는 정지에 가까움)
  "videos/healer_ultimate.mp4":   { start: 0.0, end: 4.4 },
  "videos/knight_ultimate.mp4":   { start: 0.0, end: 5.2 },
};
const ULT_THEME_ALIAS = { night:"knight", warrior:"knight", magician:"mage", mage_party:"mage" };

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
    <div class="poke-hud-head">
      <span class="poke-hud-name" id="bMonsterName">???</span>
      <span id="bMonsterAtk" class="poke-atk-badge"></span>
    </div>
    <div class="poke-hud-row">
      <div class="poke-hp-bar-wrap">
        <div class="poke-hp-label">HP</div>
        <div class="poke-hp-track"><div id="bMonsterHpBar" class="poke-hp-fill enemy-hp"></div></div>
      </div>
      <span id="bMonsterHpText" class="poke-hp-nums"></span>
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
      <div class="poke-hud-head">
        <span class="poke-hud-name" id="bPlayerName">용사</span>
        <span class="poke-hud-sub-name" id="bPlayerClass">전사</span>
        <span id="bGold" class="poke-gold">💰 0G</span>
      </div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bPlayerHpBar" class="poke-hp-fill player-hp"></div></div>
        </div>
        <span class="poke-hp-nums" id="bPlayerHpVal">160/160</span>
      </div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label poke-mp-label">MP</div>
          <div class="poke-hp-track"><div id="bPlayerMpBar" class="poke-hp-fill player-mp"></div></div>
        </div>
        <span class="poke-hp-nums poke-mp-nums" id="bPlayerMpVal">0%</span>
      </div>
    </div>
    <div class="poke-companion-hud" id="bCompanionHud" style="display:none;">
      <div class="poke-hud-head">
        <span class="poke-hud-name" id="bCompName">동료</span>
        <span class="poke-hud-sub-name" id="bCompClass">힐러</span>
        <span class="poke-aff" id="bCompAffinity">❤ 0</span>
      </div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bCompHpBar" class="poke-hp-fill companion-hp"></div></div>
        </div>
        <span class="poke-hp-nums" id="bCompHpVal">90/90</span>
      </div>
    </div>
    <div class="poke-companion-hud" id="bCompanionHud2" style="display:none;">
      <div class="poke-hud-head">
        <span class="poke-hud-name" id="bComp2Name">동료2</span>
        <span class="poke-hud-sub-name" id="bComp2Class">탱커</span>
        <span class="poke-aff" id="bComp2Affinity">❤ 0</span>
      </div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bComp2HpBar" class="poke-hp-fill companion-hp"></div></div>
        </div>
        <span class="poke-hp-nums" id="bComp2HpVal">90/90</span>
      </div>
    </div>
    <div class="poke-companion-hud" id="bCompanionHud3" style="display:none;">
      <div class="poke-hud-head">
        <span class="poke-hud-name" id="bComp3Name">동료3</span>
        <span class="poke-hud-sub-name" id="bComp3Class">궁수</span>
        <span class="poke-aff" id="bComp3Affinity">❤ 0</span>
      </div>
      <div class="poke-hud-row">
        <div class="poke-hp-bar-wrap">
          <div class="poke-hp-label">HP</div>
          <div class="poke-hp-track"><div id="bComp3HpBar" class="poke-hp-fill companion-hp"></div></div>
        </div>
        <span class="poke-hp-nums" id="bComp3HpVal">90/90</span>
      </div>
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
    <div class="poke-passive-badge" id="bCompPassiveBadge" style="display:none;" title=""></div>
    <img id="bCompImg" class="poke-companion-sprite" src="" alt="동료"/>
  </div>
  <div class="poke-companion-sprite-wrap poke-companion2-sprite-wrap" id="bCompWrap2" style="display:none;">
    <div class="poke-passive-badge" id="bComp2PassiveBadge" style="display:none;" title=""></div>
    <img id="bCompImg2" class="poke-companion-sprite" src="" alt="동료2"/>
  </div>
  <div class="poke-companion-sprite-wrap poke-companion3-sprite-wrap" id="bCompWrap3" style="display:none;">
    <div class="poke-passive-badge" id="bComp3PassiveBadge" style="display:none;" title=""></div>
    <img id="bCompImg3" class="poke-companion-sprite" src="" alt="동료3"/>
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
    <button class="poke-cmd ult-cmd" id="bParty3Ult" type="button" style="display:none;">💫 3번 동료 궁극기</button>
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
      companionHud3: q("bCompanionHud3"), comp3Name: q("bComp3Name"),
      comp3Class: q("bComp3Class"), comp3HpBar: q("bComp3HpBar"),
      comp3HpVal: q("bComp3HpVal"), comp3Affinity: q("bComp3Affinity"),
      compWrap3: q("bCompWrap3"), compImg3: q("bCompImg3"),
      textLatest: q("bTextLatest"),
      btnAttack: q("bAttack"), btnHeal: q("bHeal"), btnJobSkill: q("bJobSkill"),
      btnHeroUlt: q("bHeroUlt"), btnPartyUlt: q("bPartyUlt"), btnParty2Ult: q("bParty2Ult"),
      btnParty3Ult: q("bParty3Ult"), btnFlee: q("bFlee"),
      monsterStatus: q("monsterStatusIcons"), playerStatus: q("playerStatusIcons"),
      bossWarning: q("bBossWarning"),
    };
  }

  _bindButtons() {
    const g = this.game;

    // ⚔ 공격 버튼 — 클릭 즉시 공격 애니메이션 실행 후 battle-manager 호출
    this.el.btnAttack?.parentElement?.addEventListener("click", () => { this._actionAt = performance.now(); }, true);
    this.el.btnAttack?.addEventListener("click", () => this._doAttack());
    this.el.btnHeal    ?.addEventListener("click", () => {
      if (this._busy(450)) return;
      this._playHealFx();
      g.battleManager.heal(g);
    });
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
    this.el.btnParty3Ult?.addEventListener("click", () => {
      const p = g.player;
      if (!p.party3) { g.log("❌ 3번 동료가 없습니다"); return; }
      const aff = p.affinity?.[p.party3] || 0;
      if (aff < 30) { g.log(`💔 호감도 부족 (현재 ${aff}/30)`); return; }
      if ((p.cooldowns?.party3Ultimate || 0) > 0) { g.log(`⏳ 쿨타임 ${p.cooldowns.party3Ultimate}턴`); return; }
      g.battleManager.party3Ultimate(g);
    });
    this.el.btnFlee?.addEventListener("click", () => g.onFlee());

    // 스페이스바 → 공격 단축키 (btnPartyUlt 콜백 바깥에 위치해야 함)
    this._keyHandler = (e) => {
      if ((e.code === "Space" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        if (g.battleScene === this) this._doAttack();
      }
    };
    document.addEventListener("keydown", this._keyHandler);
  }

  // 캐릭터 그림마다 다른 여백/비율을 보정해서 모든 캐릭터가 같은 키로 보이게 한다
  // (공격 프레임으로 바뀌어도 같은 배율이 유지된다 — 배율은 img 요소에 걸린다)
  _fitSprite(img, src) {
    const f = SPRITE_FIT[src];
    img.style.setProperty("--fit", f ? (SPRITE_TARGET * f.w / f.vh).toFixed(3) : "1");
  }

  // 연타로 연출이 겹치지 않도록 짧은 입력 잠금 (ms 동안 다음 행동 무시)
  _busy(ms) {
    const now = performance.now();
    if (now < (this._busyUntil || 0)) return true;
    this._busyUntil = now + ms;
    return false;
  }

  // ⚔ 싸운다 — 공격 액션 연출을 먼저 시작하고, 같은 프레임에 전투 로직을 실행한다
  _doAttack() {
    const g = this.game;
    if (this._busy(1150)) return;
    const type = g.player?.type;
    this.showAttackFlash(type);
    this._playAttackAction(type);
    g.battleManager.attack(g);
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
    this._ultActive = false; this._ultPending = [];
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
    const slots = Balance.partySlots(this.game?.dungeonType ?? "normal");   // 이 던전에서 함께 싸우는 동료 수
    const pSrc = BACK_IMAGES[p?.type] || "";
    console.log("[전투] 플레이어 타입:", p?.type, "뒷모습:", pSrc);
    if (pSrc && this.el.playerImg) {
      // 평상시(idle) 그림 파일이 없거나 깨졌을 때, 공격 모션 그림(있을 확률이 높음)으로
      // 한 번 더 시도 — 그래도 없으면 그제서야 완전히 비워둔다(무한 루프 방지).
      const fallbackSrc = CUTIN_HERO[p?.type] || "";
      this.el.playerImg.onerror = () => {
        this.el.playerImg.onerror = null;
        if (fallbackSrc && fallbackSrc !== pSrc) {
          console.warn(`[플레이어 그림 로드 실패] "${pSrc}" 를 images/ 폴더에서 찾을 수 없어, "${fallbackSrc}" 로 대신 표시합니다.`);
          this.el.playerImg.src = fallbackSrc;
        } else {
          console.warn(`[플레이어 그림 로드 실패] "${pSrc}" 파일을 images/ 폴더에서 찾을 수 없습니다.`);
        }
      };
      this.el.playerImg.src = pSrc;
      this._fitSprite(this.el.playerImg, pSrc);
      if (this.el.playerWrap) this.el.playerWrap.style.display = "block";
    }

    if (slots >= 1 && p?.party && p.partyHp > 0) {
      const cSrc = COMPANION_BACK[p.party] || "";
      console.log("[전투] 동료 파티키:", p.party, "뒷모습:", cSrc);
      if (cSrc && this.el.compImg) { this.el.compImg.src = cSrc; this._fitSprite(this.el.compImg, cSrc); }
      if (this.el.compWrap) this.el.compWrap.style.display = "block";
    }

    if (slots >= 2 && p?.party2 && p.party2Hp > 0) {
      const c2Src = COMPANION_BACK[p.party2] || "";
      console.log("[전투] 동료2 파티키:", p.party2, "뒷모습:", c2Src);
      if (c2Src && this.el.compImg2) { this.el.compImg2.src = c2Src; this._fitSprite(this.el.compImg2, c2Src); }
      if (this.el.compWrap2) this.el.compWrap2.style.display = "block";
    }

    if (slots >= 3 && p?.party3 && p.party3Hp > 0) {
      const c3Src = COMPANION_BACK[p.party3] || "";
      console.log("[전투] 동료3 파티키:", p.party3, "뒷모습:", c3Src);
      if (c3Src && this.el.compImg3) { this.el.compImg3.src = c3Src; this._fitSprite(this.el.compImg3, c3Src); }
      if (this.el.compWrap3) this.el.compWrap3.style.display = "block";
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
    const slots = Balance.partySlots(g.dungeonType ?? "normal");

    const realMaxHp = p.maxHp + p.bonusHp;
    this._text("playerName",  p.name);
    // ★ night/mage/archer 키로 직업명 표시
    this._text("playerClass", { knight:"기사", night:"기사", mage:"마법사", archer:"궁수", tanker:"탱커", healer:"힐러" }[p.type] || p.type);
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

      this.el.btnPartyUlt.style.display = slots >= 1 ? "" : "none";   // 동료가 함께하지 않는 던전(성 밖)에서는 숨김

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
      if (!p.party2 || slots < 2) {
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

    // 3번 동료 궁극기 버튼 — party3가 있을 때만 표시 (심연 전용)
    if (this.el.btnParty3Ult) {
      if (!p.party3 || slots < 3) {
        this.el.btnParty3Ult.style.display = "none";
      } else {
        this.el.btnParty3Ult.style.display = "";
        const aff3      = p.affinity?.[p.party3] || 0;
        const cd3       = p.cooldowns?.party3Ultimate || 0;
        const hasParty3 = !!(p.party3 && p.party3Hp > 0);

        if (!hasParty3) {
          this.el.btnParty3Ult.disabled      = true;
          this.el.btnParty3Ult.textContent   = "💫 3번 동료 전투불능";
          this.el.btnParty3Ult.style.opacity = "0.4";
          this.el.btnParty3Ult.style.color   = "#cc4444";
          this.el.btnParty3Ult.style.borderColor = "#cc4444";
        } else if (aff3 < 30) {
          this.el.btnParty3Ult.disabled      = true;
          this.el.btnParty3Ult.textContent   = `💫 3번 동료 궁극기 (❤${aff3}/30)`;
          this.el.btnParty3Ult.style.opacity = "0.5";
          this.el.btnParty3Ult.style.color   = "#888";
          this.el.btnParty3Ult.style.borderColor = "";
        } else if (cd3 > 0) {
          this.el.btnParty3Ult.disabled      = true;
          this.el.btnParty3Ult.textContent   = `💫 3번 동료 궁극기 (${cd3}턴)`;
          this.el.btnParty3Ult.style.opacity = "0.6";
          this.el.btnParty3Ult.style.color   = "";
          this.el.btnParty3Ult.style.borderColor = "";
        } else if (aff3 >= 100) {
          this.el.btnParty3Ult.disabled      = false;
          this.el.btnParty3Ult.textContent   = "🌟 3번 EX 궁극기 READY!";
          this.el.btnParty3Ult.style.opacity = "1";
          this.el.btnParty3Ult.style.color       = "#ffd700";
          this.el.btnParty3Ult.style.borderColor = "#ffd700";
        } else {
          this.el.btnParty3Ult.disabled      = false;
          this.el.btnParty3Ult.textContent   = `💫 3번 동료 궁극기 READY (❤${aff3})`;
          this.el.btnParty3Ult.style.opacity = "1";
          this.el.btnParty3Ult.style.color       = "#88ddff";
          this.el.btnParty3Ult.style.borderColor = "#88ddff";
        }
      }
    }

    // 동료 HUD
    const hasParty = !!(slots >= 1 && p.party && p.partyHp > 0);
    if (this.el.companionHud) this.el.companionHud.style.display = hasParty ? "block" : "none";
    if (this.el.compWrap)     this.el.compWrap.style.display     = hasParty ? "block" : "none";
    if (hasParty) {
      const mem = PARTY_MEMBERS[p.party];
      this._text("compName",     mem?.name     || "동료");
      this._text("compClass",    mem?.className || "");
      this._bar ("compHpBar",    p.partyHp, p.partyMaxHp);
      this._text("compHpVal",    `${p.partyHp}/${p.partyMaxHp}`);
      this._text("compAffinity", `❤ ${p.affinity?.[p.party] || 0}`);
      this._renderPassiveBadge("bCompPassiveBadge", p.companionPassives?.[p.party]);
    }

    // 동료2 HUD
    const hasParty2 = !!(slots >= 2 && p.party2 && p.party2Hp > 0);
    if (this.el.companionHud2) this.el.companionHud2.style.display = hasParty2 ? "block" : "none";
    if (this.el.compWrap2)     this.el.compWrap2.style.display     = hasParty2 ? "block" : "none";
    if (hasParty2) {
      const mem2 = PARTY_MEMBERS[p.party2];
      this._text("comp2Name",     mem2?.name     || "동료2");
      this._text("comp2Class",    mem2?.className || "");
      this._bar ("comp2HpBar",    p.party2Hp, p.party2MaxHp);
      this._text("comp2HpVal",    `${p.party2Hp}/${p.party2MaxHp}`);
      this._text("comp2Affinity", `❤ ${p.affinity?.[p.party2] || 0}`);
      this._renderPassiveBadge("bComp2PassiveBadge", p.companionPassives?.[p.party2]);
    }

    // 동료3 HUD (심연 전용)
    const hasParty3 = !!(slots >= 3 && p.party3 && p.party3Hp > 0);
    if (this.el.companionHud3) this.el.companionHud3.style.display = hasParty3 ? "block" : "none";
    if (this.el.compWrap3)     this.el.compWrap3.style.display     = hasParty3 ? "block" : "none";
    if (hasParty3) {
      const mem3 = PARTY_MEMBERS[p.party3];
      this._text("comp3Name",     mem3?.name     || "동료3");
      this._text("comp3Class",    mem3?.className || "");
      this._bar ("comp3HpBar",    p.party3Hp, p.party3MaxHp);
      this._text("comp3HpVal",    `${p.party3Hp}/${p.party3MaxHp}`);
      this._text("comp3Affinity", `❤ ${p.affinity?.[p.party3] || 0}`);
      this._renderPassiveBadge("bComp3PassiveBadge", p.companionPassives?.[p.party3]);
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
    const crit = target === "monster" && this._critPending;
    if (target === "monster") this._critPending = false;
    if (this._ultActive) { (this._ultPending ||= []).push({ amount, target }); return; }
    // 공격 연출 중이면 타격 순간(몬스터)·반격 순간(플레이어)에 맞춰 숫자를 띄운다
    const now = performance.now();
    const at  = target === "monster" ? this._impactAt : this._counterAt;
    const delay = Math.max(0, (at || 0) - now);
    // 내가 방금 행동한 직후의 피해(= 몬스터 반격)면, 숫자가 뜨기 직전에 몬스터가 돌진해 온다
    if (target === "player" && now - (this._actionAt || 0) < 1600) {
      setTimeout(() => this._enemyStrike(), Math.max(0, delay - 230));
    }
    setTimeout(() => this._spawnDamage(amount, target, crit), delay);
  }

  _spawnDamage(amount, target, crit) {
    const field = this.el.field;
    if (!field?.isConnected) return;
    const fr = field.getBoundingClientRect();
    const wrap = target === "monster" ? this.el.monsterWrap : this.el.playerWrap;
    const r = wrap.getBoundingClientRect();
    const x = r.left - fr.left + r.width * (target === "monster" ? .5 : .55) + (Math.random() - .5) * 40;
    const y = r.top  - fr.top  + r.height * .28;
    const n = this._fx(`damage ${target === "monster" ? "monster-dmg" : "player-dmg"}${crit ? " crit" : ""}`, x, y, {}, 1100);
    n.innerText = `${crit ? "💥" : ""}${amount}`;
    if (target === "monster") {
      this._triggerMonsterHit();
      this._impactBurst(x, r.top - fr.top + r.height * .5, crit);
      if (crit) this._shakeField();
    } else {
      this._enemyStrikeHit();
    }
  }

  // 필드 위에 떠다니는 이펙트 요소 생성 (field 기준 좌표)
  _fx(cls, x, y, css = {}, life = 600) {
    const d = document.createElement("div");
    d.className = `fx ${cls}`;
    d.style.left = `${x}px`; d.style.top = `${y}px`;
    Object.assign(d.style, css);
    this.el.field.appendChild(d);
    setTimeout(() => d.remove(), life);
    return d;
  }

  _impactBurst(x, y, big) {
    const colors = ["#fff4c0", "#ffcf6a", "#ff9040"];
    this._fx("fx-burst", x, y, { width: big ? "150px" : "100px", height: big ? "150px" : "100px" }, 420);
    const n = big ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = (big ? 70 : 48) + Math.random() * 60;
      const sp = this._fx("fx-spark", x, y, { background: colors[i % 3], color: colors[i % 3] }, 650);
      sp.animate([
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r + 14}px)) scale(.15)`, opacity: 0 },
      ], { duration: 380 + Math.random() * 220, easing: "cubic-bezier(.1,.8,.3,1)", fill: "forwards" });
    }
  }

  // ── ⚔ 공격 액션: 돌진 → 투사체/베기 → 타격 ─────────────────
  // 직업별: 기사·탱커 = 돌진 + X자 베기, 궁수 = 화살, 마법사 = 마력구, 힐러 = 성광
  _playAttackAction(type) {
    const field = this.el.field, pw = this.el.playerWrap, mw = this.el.monsterWrap;
    if (!field || !pw || !mw) return;
    const fr = field.getBoundingClientRect(), pr = pw.getBoundingClientRect(), mr = mw.getBoundingClientRect();
    const from = { x: pr.left - fr.left + pr.width * .75, y: pr.top - fr.top + pr.height * .45 };
    const to   = { x: mr.left - fr.left + mr.width * .5,  y: mr.top - fr.top + mr.height * .55 };
    const dx = to.x - from.x, dy = to.y - from.y;
    const kind = type === "archer" ? "arrow" : (type === "mage" || type === "magician") ? "orb" : type === "healer" ? "holy" : "slash";
    const now = performance.now();

    // 공격 버튼 눌림 → 즉시 반응하는 돌진/반동
    const lunge = (wrap, frac, dur, delay = 0) => {
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
    const recoil = (wrap, dur, delay = 0) => wrap.animate([
      { transform: "translate(0,0)" }, { transform: "translate(-26px,0) scale(.97)", offset: .35 }, { transform: "translate(0,0)" },
    ], { duration: dur, delay, easing: "ease-out" });

    let impactMs;
    if (kind === "slash") {
      lunge(pw, .72, 560);
      impactMs = 280;
      setTimeout(() => this._slashFx(to), impactMs - 20);
    } else {
      recoil(pw, 380);
      impactMs = kind === "arrow" ? 300 : kind === "orb" ? 360 : 260;
      setTimeout(() => this._projectileFx(kind, from, to, impactMs - 60), 60);
    }

    // 동료들도 한 박자씩 늦게 따라 공격
    [this.el.compWrap, this.el.compWrap2, this.el.compWrap3].forEach((w, i) => {
      if (!w || w.style.display === "none") return;
      lunge(w, .38, 520, 110 + i * 90);
    });

    this._impactAt  = now + impactMs;
    this._counterAt = this._impactAt + 520;       // 몬스터 반격은 내 공격이 끝난 뒤
    this.pulseButton(this.el.btnAttack);
  }

  _slashFx(to) {
    this._fx("fx-slash", to.x, to.y, { "--rot": "-38deg" }, 420);
    setTimeout(() => this._fx("fx-slash", to.x, to.y, { "--rot": "34deg" }, 420), 90);
  }

  _projectileFx(kind, from, to, flight) {
    const ang = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    const p = this._fx(kind === "arrow" ? "fx-arrow" : kind === "orb" ? "fx-orb" : "fx-holy", from.x, from.y, {}, flight + 500);
    if (kind === "holy") {                          // 성광: 적 머리 위에서 내리꽂는 빛기둥
      p.style.left = `${to.x}px`; p.style.top = `${to.y - 40}px`;
      return;
    }
    p.animate([
      { transform: `translate(-50%,-50%) rotate(${ang}deg) scale(.6)`, opacity: .2 },
      { transform: `translate(calc(-50% + ${(to.x - from.x) * .5}px), calc(-50% + ${(to.y - from.y) * .5}px)) rotate(${ang}deg) scale(1)`, opacity: 1, offset: .5 },
      { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) rotate(${ang}deg) scale(1.1)`, opacity: 1 },
    ], { duration: flight, easing: "ease-in", fill: "forwards" });
    setTimeout(() => p.remove(), flight + 30);
  }

  // 몬스터의 반격 연출: 플레이어 쪽으로 돌진
  _enemyStrike() {
    const mw = this.el.monsterWrap, pw = this.el.playerWrap, field = this.el.field;
    if (!mw?.isConnected || !pw || !field || !(this.game.currentMonster?.hp > 0)) return;
    const mr = mw.getBoundingClientRect(), pr = pw.getBoundingClientRect();
    const dx = (pr.left + pr.width * .5) - (mr.left + mr.width * .5);
    const dy = (pr.top + pr.height * .3) - (mr.top + mr.height * .5);
    mw.style.zIndex = "20";
    const a = mw.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(22px,-6px) scale(.97)", offset: .25 },
      { transform: `translate(${dx * .45}px,${dy * .45}px) scale(1.12)`, offset: .55 },
      { transform: "translate(0,0) scale(1)" },
    ], { duration: 460, easing: "cubic-bezier(.3,.7,.3,1)" });
    a.onfinish = a.oncancel = () => { mw.style.zIndex = ""; };
  }

  _enemyStrikeHit() {
    const pw = this.el.playerWrap, field = this.el.field;
    if (!pw || !field) return;
    this._shakeField();
    pw.animate([
      { transform: "translateX(0)", filter: "brightness(1)" },
      { transform: "translateX(-16px)", filter: "brightness(2.2) saturate(.3)", offset: .2 },
      { transform: "translateX(10px)", offset: .5 },
      { transform: "translateX(0)", filter: "brightness(1)" },
    ], { duration: 320 });
    const hurt = this._fx("fx-hurt", 0, 0, {}, 450);
    hurt.style.left = "0"; hurt.style.top = "0";
  }

  // 버튼 눌림 팝 효과
  pulseButton(btn) {
    if (!btn) return;
    btn.classList.remove("pressed"); void btn.offsetWidth; btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 220);
  }

  // 회복: 초록 빛이 올라가는 연출
  _playHealFx() {
    const field = this.el.field, pw = this.el.playerWrap;
    if (!field || !pw) return;
    const fr = field.getBoundingClientRect(), pr = pw.getBoundingClientRect();
    const cx = pr.left - fr.left + pr.width * .5, by = pr.top - fr.top + pr.height * .85;
    for (let i = 0; i < 9; i++) {
      const sp = this._fx("fx-plus", cx + (Math.random() - .5) * pr.width * .8, by, {}, 1100);
      sp.textContent = "✚";
      sp.animate([
        { transform: "translate(-50%,0) scale(.6)", opacity: 0 },
        { opacity: 1, offset: .25 },
        { transform: `translate(-50%,-${pr.height * (.6 + Math.random() * .3)}px) scale(1.1)`, opacity: 0 },
      ], { duration: 800 + Math.random() * 300, delay: i * 70, easing: "ease-out", fill: "backwards" });
    }
  }

  _triggerMonsterHit() {
    const w = this.el.monsterWrap;
    if (!w) return;
    w.classList.remove("hit"); void w.offsetWidth; w.classList.add("hit");
    setTimeout(() => w.classList.remove("hit"), 350);
    w.animate([                                       // 맞는 순간 뒤로 밀려나는 넉백
      { transform: "translate(0,0) rotate(0)" },
      { transform: "translate(18px,-5px) rotate(2.5deg)", offset: .3 },
      { transform: "translate(0,0) rotate(0)" },
    ], { duration: 320, easing: "ease-out" });
  }

  _shakeField() {
    const f = this.el.field;
    if (!f) return;
    f.classList.add("shake");
    setTimeout(() => f.classList.remove("shake"), 350);
  }

  hitFlash() { this._triggerMonsterHit(); }

  showBossWarning(msg) {
    if (msg === "CRITICAL!") this._critPending = true;   // 이어지는 몬스터 데미지 숫자를 치명타 스타일로
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
    this._playUltimateCutThenVideo(cutImg, vidSrc, title, playerType);
  }

  showEXCutin(partyKey) {
    const party = partyKey || this.game.player?.party;
    if (!party) return;
    if (this.el?.attackOverlay) this.el.attackOverlay.style.opacity = "0";
    if (this.el?.playerImg)     this.el.playerImg.style.opacity     = "1";

    const cutImg = CUTIN_PARTY_FULLSCREEN[party] || "";
    const vidSrc = ULTIMATE_PARTY_VIDEOS[party]  || "";
    const title  = CUTIN_PARTY_TITLE[party]      || "✨ 궁극기";
    this._playUltimateCutThenVideo(cutImg, vidSrc, title, party);
  }

  // ── 궁극기 컷신 ───────────────────────────────────────
  //  ① 충전(0.3s): 섬광 + 암전 + 시네마 바 + 전투 화면 확대
  //  ② 컷인(≈1.4s): 사선 와이프로 일러스트 등장, 광선·속도선, 스킬명이 쾅 하고 꽂힘
  //  ③ 영상(≈3s, 배속): 일러스트는 블러 배경으로 깔리고 스킬명은 좌하단 배너로
  //  ④ 타격(0.3s): 섬광 + 충격파 + 전투 화면 반동 → 데미지 숫자가 한꺼번에 터짐
  //  클릭/Enter: 다음 단계로 건너뛰기, Esc: 즉시 닫기
  _playUltimateCutThenVideo(cutImgSrc, vidSrc, title, themeKey = "knight") {
    document.getElementById("ultimateScreen")?.remove();
    this._ultActive  = true;       // 연출이 끝날 때까지 데미지 숫자를 붙잡아 둔다
    this._ultPending = [];

    const th = ULT_THEME[themeKey] || ULT_THEME[ULT_THEME_ALIAS[themeKey]] || ULT_THEME.knight;
    const m = String(title).match(/^(\S+)\s+(.+)$/);
    const icon = m && /[^\w가-힣!]/.test(m[1]) ? m[1] : "";
    const name = icon ? m[2] : String(title);

    const screen = document.createElement("div");
    screen.id = "ultimateScreen";
    screen.style.cssText = `--c1:${th.c1};--c2:${th.c2};--ray:${th.ray};`;
    screen.innerHTML = `
      <div class="ult-dim"></div>
      <div class="ult-rays"></div>
      <div class="ult-art"><img alt=""></div>
      <div class="ult-sweep"></div>
      <div class="ult-speed"></div>
      <div class="ult-video-wrap"><video playsinline muted preload="auto"></video></div>
      <div class="ult-vignette"></div>
      <div class="ult-bar top"></div><div class="ult-bar bottom"></div>
      <div class="ult-title"><span class="ult-sub"></span><span class="ult-name"></span><span class="ult-line"></span></div>
      <div class="ult-flash"></div>`;
    const q = sel => screen.querySelector(sel);
    const dim = q(".ult-dim"), rays = q(".ult-rays"), art = q(".ult-art"), artImg = art.querySelector("img"),
          sweep = q(".ult-sweep"), vwrap = q(".ult-video-wrap"), video = q("video"),
          barT = q(".ult-bar.top"), barB = q(".ult-bar.bottom"), titleEl = q(".ult-title"),
          nameEl = q(".ult-name"), subEl = q(".ult-sub"), lineEl = q(".ult-line"), flash = q(".ult-flash");
    nameEl.textContent = name;
    subEl.textContent  = `${icon ? icon + " " : ""}ULTIMATE`;
    document.body.appendChild(screen);

    const bs = document.getElementById("battleScreen");
    const zoom = bs?.animate([{ transform: "scale(1)" }, { transform: "scale(1.07)" }], { duration: 520, easing: "ease-in", fill: "forwards" });

    let dead = false, phase = 0;
    const timers = [];
    const at   = (ms, fn) => timers.push(setTimeout(() => { if (!dead) fn(); }, ms));
    const anim = (el, kf, opt) => el.animate(kf, { fill: "forwards", ...opt });
    const W = () => screen.clientWidth, H = () => screen.clientHeight;

    const ring = (x, y, scale = 14) => {
      const r = document.createElement("div");
      r.className = "ult-ring"; r.style.left = `${x}px`; r.style.top = `${y}px`;
      screen.appendChild(r);
      anim(r, [{ opacity: .95, transform: "translate(-50%,-50%) scale(1)" }, { opacity: 0, transform: `translate(-50%,-50%) scale(${scale})` }], { duration: 560, easing: "ease-out" }).onfinish = () => r.remove();
    };
    const sparks = (x, y, n) => {
      for (let i = 0; i < n; i++) {
        const sp = document.createElement("div");
        sp.className = "ult-spark"; sp.style.left = `${x}px`; sp.style.top = `${y}px`;
        screen.appendChild(sp);
        const ang = Math.random() * Math.PI * 2, d = 90 + Math.random() * 280;
        anim(sp, [
          { opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
          { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d - 50}px)) scale(.2)` },
        ], { duration: 500 + Math.random() * 600, easing: "cubic-bezier(.1,.8,.3,1)" }).onfinish = () => sp.remove();
      }
    };
    const shake = (amp = 8) => screen.animate([
      { transform: "translate(0,0)" }, { transform: `translate(${-amp}px,${amp / 2}px)` },
      { transform: `translate(${amp}px,${-amp / 2}px)` }, { transform: `translate(${-amp / 2}px,${amp / 3}px)` }, { transform: "translate(0,0)" },
    ], { duration: 280 });

    // 충격 연출 (영상 속 타격 순간, 그리고 마무리 때 공통)
    const impactFx = (strong = true) => {
      anim(flash, [{ opacity: strong ? .95 : .6 }, { opacity: 0 }], { duration: 340 });
      ring(W() / 2, H() / 2, 18);
      sparks(W() / 2, H() / 2, strong ? 22 : 14);
      shake(strong ? 10 : 6);
      bs?.classList.remove("ult-punch"); void bs?.offsetWidth; bs?.classList.add("ult-punch");
      setTimeout(() => bs?.classList.remove("ult-punch"), 460);
    };

    // ④ 마무리: 섬광 + 충격파 + 전투 화면 반동, 이어서 데미지 숫자
    const finish = (impact = true) => {
      if (dead) return;
      dead = true;
      timers.forEach(clearTimeout);
      document.removeEventListener("keydown", onKey);
      video.pause();
      zoom?.cancel();
      if (impact) impactFx(true);
      setTimeout(() => {
        anim(screen, [{ opacity: 1 }, { opacity: 0 }], { duration: 240 }).onfinish = () => screen.remove();
      }, impact ? 150 : 0);
      setTimeout(() => this._ultimateDone(), impact ? 190 : 40);
    };

    // ③ 영상
    const startVideo = () => {
      if (dead || phase >= 2) return;
      phase = 2;
      if (!vidSrc) { finish(true); return; }
      anim(flash, [{ opacity: .9 }, { opacity: 0 }], { duration: 280 });
      ring(W() / 2, H() / 2, 12);
      artImg.style.transition = "filter .4s ease";
      artImg.style.filter = "blur(16px) brightness(.55)";      // 세로 영상 양옆을 컷인 일러스트가 채운다
      titleEl.classList.add("small");
      let started = false;
      const go = () => {
        if (started || dead) return;
        started = true;
        const d = video.duration || 5;
        const clip  = ULT_VIDEO_CLIP[vidSrc] || {};
        const start = Math.min(clip.start || 0, Math.max(0, d - 1));
        const end   = Math.min(clip.end || d, d);
        const len   = Math.max(1, end - start);
        const rate  = Math.min(2.2, Math.max(1, len / 3));      // 보여줄 구간이 약 3초가 되도록 배속
        if (start > 0) video.currentTime = start;
        video.playbackRate = rate;
        vwrap.classList.toggle("portrait", video.videoWidth < video.videoHeight);
        anim(vwrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
        video.play().catch(() => finish(true));
        const wall = (len / rate) * 1000;                       // 구간 재생에 걸리는 실제 시간(ms)
        at(Math.min(4200, wall + 150), () => finish(true));
        if (clip.hit != null) at(Math.max(0, (clip.hit - start) / rate * 1000), () => impactFx(false));
      };
      video.addEventListener("loadedmetadata", go, { once: true });
      video.addEventListener("ended", () => finish(true), { once: true });
      video.addEventListener("error", () => finish(true), { once: true });
      video.src = vidSrc;
      video.load();
      at(2500, go);
    };

    // ① 충전
    anim(flash, [{ opacity: .85 }, { opacity: 0 }], { duration: 240 });
    anim(dim,   [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    anim(barT,  [{ height: "0" }, { height: "11vh" }], { duration: 260, easing: "cubic-bezier(.2,.9,.3,1)" });
    anim(barB,  [{ height: "0" }, { height: "11vh" }], { duration: 260, easing: "cubic-bezier(.2,.9,.3,1)" });
    at(100, () => anim(rays, [{ opacity: 0, scale: ".4" }, { opacity: 1, scale: "1" }], { duration: 380, easing: "ease-out" }));

    // ② 컷인
    let hasArt = !!cutImgSrc;
    const slam = () => {
      anim(titleEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 60 });
      anim(nameEl, [
        { transform: "skewX(-8deg) scale(3.2)", filter: "blur(14px)", opacity: 0 },
        { transform: "skewX(-8deg) scale(.94)", filter: "blur(0)", opacity: 1, offset: .7 },
        { transform: "skewX(-8deg) scale(1)",   filter: "blur(0)", opacity: 1 },
      ], { duration: 340, easing: "cubic-bezier(.2,1,.3,1)" });
      anim(subEl,  [{ opacity: 0, letterSpacing: "1.4em" }, { opacity: 1, letterSpacing: ".5em" }], { duration: 420, easing: "ease-out" });
      anim(lineEl, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 380, delay: 120, easing: "cubic-bezier(.2,.9,.3,1)" });
      shake(9);
      const ty = H() * .84 - 30;
      ring(W() / 2, ty, 16);
      sparks(W() / 2, ty, 18);
    };
    if (hasArt) {
      artImg.onerror = () => { hasArt = false; art.style.display = "none"; };
      artImg.src = cutImgSrc;                                  // 와이프 전에 미리 로드 시작
      at(260, () => {
        anim(art,   [{ clipPath: "polygon(0 0,0 0,-30% 100%,-30% 100%)" }, { clipPath: "polygon(0 0,130% 0,100% 100%,-30% 100%)" }], { duration: 440, easing: "cubic-bezier(.2,.8,.2,1)" });
        anim(sweep, [{ left: "-30%", opacity: 1 }, { left: "115%", opacity: 1 }], { duration: 440, easing: "cubic-bezier(.2,.8,.2,1)" });
        anim(artImg, [{ transform: "scale(1.22) translateX(2%)" }, { transform: "scale(1.04) translateX(-1%)" }], { duration: 2000, easing: "ease-out" });
      });
    }
    at(hasArt ? 420 : 200, slam);
    at(hasArt ? 900 : 200, () => sparks(W() * (.2 + Math.random() * .6), H() * .75, 14));
    at(hasArt ? 1700 : 650, () => { phase = 1; startVideo(); });

    // 건너뛰기
    screen.addEventListener("click", () => { if (phase < 2) startVideo(); else finish(true); });
    const onKey = e => {
      if (e.key === "Escape") { finish(false); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (phase < 2) startVideo(); else finish(true); }
    };
    document.addEventListener("keydown", onKey);
  }

  // 궁극기 연출이 끝나면, 붙잡아 둔 데미지 숫자를 한꺼번에 터뜨린다
  _ultimateDone() {
    this._ultActive = false;
    const list = this._ultPending || [];
    this._ultPending = [];
    list.forEach((d, i) => setTimeout(() => this._spawnDamage(d.amount, d.target, d.target === "monster"), i * 170));
    if (list.some(d => d.target === "monster")) this._shakeField();
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

  // 동료 개인 스토리 보상으로 얻은 패시브를 머리 위 배지로 상설 표시 (클릭하면 설명)
  _renderPassiveBadge(elId, passive) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!passive) { el.style.display = "none"; return; }
    el.style.display = "flex";
    el.textContent = passive.icon || "✨";
    el.title = `${passive.name} — ${passive.desc}`;
    if (!el._bound) {
      el._bound = true;
      el.addEventListener("click", e => {
        e.stopPropagation();
        const p = el._passive;
        if (p) this.game?.showNarrative?.(`${p.icon || "✨"} ${p.name}\n\n${p.desc}`, 2600);
      });
    }
    el._passive = passive;
  }

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