// ═══════════════════════════════════════════════════
//  game.js  — 메인 게임 컨트롤러
//  씬 전환: town ↔ dungeon ↔ battle
// ═══════════════════════════════════════════════════
"use strict";

class Game {
  constructor() {
    this.player         = null;
    this.currentMonster = null;

    // 매니저
    this.saveManager      = new SaveManager();
    this.itemManager      = new ItemManager();
    this.questManager     = new QuestManager();
    this.battleManager    = new BattleManager();
    this.attendanceManager = typeof AttendanceManager !== "undefined"
      ? new AttendanceManager() : null;

    // 동료 선택 세션 플래그 (마을 복귀 시 초기화)
    this._party2Selected  = false; // 일반 던전 2번째 동료
    this._party3Selected  = false; // 심연 던전 3번째 동료
    this._tutorialShown   = false; // 성 밖 사냥터 튜토리얼 안내
    this._attendanceChecked = false; // 출석 체크 (세션당 1회)

    // 씬
    this.townScene    = null;
    this.dungeonScene = null;
    this.battleScene  = null;

    // 현재 씬
    this.currentScene = "title";
    this.dungeonType  = "normal"; // "normal" | "abyss"

    // 복귀 정보 (전투 후 던전으로 돌아올 위치)
    this._returnAfterBattle = null;

    // 컨테이너
    this.containers = {
      title:   document.getElementById("titleScreen"),
      town:    document.getElementById("townScreen"),
      dungeon: document.getElementById("dungeonScreen"),
      battle:  document.getElementById("battleScreen"),
      victory: document.getElementById("victoryScreen"),
      defeat:  document.getElementById("defeatScreen"),
    };

    // [ARCH 03] SceneManager 연결 (scenes.js + scene-manager.js 로드 후 자동 활성화)
    // 씬 화면 DOM(#sceneScreen 등)이 있으면 비주얼 노벨 방식, 없으면 showNarrative 폴백
    this.sceneManager = typeof SceneManager !== "undefined"
      ? new SceneManager(this)
      : null;

    this._buildTitleScreen();
    this._showScreen("title");

    window.rpgGame = this;
  }

  // ─────────────────────────────────────────────────
  //  타이틀 화면
  // ─────────────────────────────────────────────────
  _buildTitleScreen() {
    const c = this.containers.title;
    if (!c) return;
    c.innerHTML = `
      <div class="bg-overlay"></div>
      <div class="title-content">
        <h1 class="game-title">마왕 토벌</h1>
        <p class="game-subtitle">― 어둠의 용사 ―</p>
        <div class="class-select">
          <h2>직업을 선택하세요</h2>
          <div class="class-cards">
            <button class="class-card" data-start="night"><div class="class-icon">⚔</div><div class="class-name">기사</div><div class="class-desc">강인한 체력과 방어력</div></button>
            <button class="class-card" data-start="mage">   <div class="class-icon">🔮</div><div class="class-name">마법사</div><div class="class-desc">강력한 마법 공격</div></button>
            <button class="class-card" data-start="archer"> <div class="class-icon">🏹</div><div class="class-name">궁수</div><div class="class-desc">원거리·회피의 달인</div></button>
          </div>
        </div>
        <button class="btn-load" id="mainLoadBtn">💾 저장 데이터 불러오기</button>
      </div>`;

    c.querySelectorAll("[data-start]").forEach(btn =>
      btn.addEventListener("click", () => this.start(btn.dataset.start))
    );
    document.getElementById("mainLoadBtn")?.addEventListener("click", () => this.loadGame());
  }

  // ─────────────────────────────────────────────────
  //  씬 전환
  // ─────────────────────────────────────────────────
  _showScreen(name) {
    Object.entries(this.containers).forEach(([k, el]) => {
      if (el) el.style.display = (k === name) ? "flex" : "none";
    });
    this.currentScene = name;

    // BGM
    if (window.audioMgr) {
      const bgmMap = { town:"town", dungeon:"dungeon", battle:"dungeon", title:"", victory:"", defeat:"" };
      const bgm = bgmMap[name];
      if (bgm) audioMgr.playBgm(bgm);
      else audioMgr.stopBgm();
    }
  }

  // ─────────────────────────────────────────────────
  //  시작
  // ─────────────────────────────────────────────────
  start(type) {
    this.player         = new Player(type);
    this.currentMonster = null;
    this._toTown();
    // [ARCH 03] 신규 게임 오프닝 씬 재생 (scenes.js가 로드된 경우)
    this.playScene("opening_1");
    if (!window.SCENE_MAP?.opening_1) {
      // scenes.js 없을 때 기존 내러티브 폴백
      this.showNarrative(`${this.player.name}이(가) 마을에 도착했다.\n마왕의 위협으로 마을 사람들은 두려움에 떨고 있다...`, 4000);
    }
  }

  loadGame() {
    const data = this.saveManager.load();
    if (!data) { alert("저장 데이터가 없습니다."); return; }
    this.player = this.saveManager.hydrate(data.player);
    if (!this.player) { alert("저장 데이터 손상"); return; }
    this.currentMonster = null;
    this._toTown();
    this.log(`💾 저장 데이터 불러오기 완료! Lv.${this.player.level}`);
  }

  save() {
    const ok = this.saveManager.save(this);
    this.log(ok ? "💾 저장 완료!" : "⚠ 저장 실패");
  }

  // ─────────────────────────────────────────────────
  //  마을
  // ─────────────────────────────────────────────────
  _toTown() {
    const p = this.player;
    p.storyPhase       = "town";
    this.currentMonster = null;

    // [BALANCE 04] 동료 전투 불능 상태 → 마을 귀환 시 HP 30% 회복
    if (p._partyKnockedOut) {
      p.partyHp = Math.floor(p.partyMaxHp * 0.3);
      p._partyKnockedOut = false;
      this.log(`💊 ${PARTY_MEMBERS[p.party]?.name ?? "동료"}이(가) 의식을 되찾았다 (HP 30% 회복)`);
    }

    // 동료 2·3 해제 (전투 불능이면 회복 로그)
    const clearSlot = (field, hpF, maxF, koF, label) => {
      if (!p[field]) return;
      if (p[koF]) this.log(`💊 ${PARTY_MEMBERS[p[field]]?.name ?? label}이(가) 회복됐다`);
      p[field] = null; p[hpF] = 0; p[maxF] = 0; p[koF] = false;
    };
    clearSlot("party2", "party2Hp", "party2MaxHp", "_party2KnockedOut", "보조 동료");
    clearSlot("party3", "party3Hp", "party3MaxHp", "_party3KnockedOut", "3번째 동료");
    this._party2Selected = false;
    this._party3Selected = false;

    // 던전 씬 정리
    if (this.dungeonScene) { this.dungeonScene.destroy(); this.dungeonScene = null; }
    // 전투 씬 정리
    this.battleScene?.destroy?.();
    this.battleScene = null;

    this._showScreen("town");
    const c = this.containers.town;
    this.townScene = new TownScene(this);
    this.townScene.mount(c);

    // [ARCH 05] 마을 귀환 시 자동저장 (수동 저장과 별도 슬롯 rpg_autosave)
    this.saveManager.autoSave(this);

    // 출석 보상 — 세션 첫 마을 진입 때 하루 1회 지급
    if (!this._attendanceChecked && this.player && this.attendanceManager) {
      this._attendanceChecked = true;
      const attendanceResult = this.attendanceManager.check();
      if (attendanceResult) {
        this.attendanceManager.applyReward(this, attendanceResult.reward);
        this.saveManager.autoSave(this); // 보상 지급 후 즉시 저장
        setTimeout(() => this._showAttendanceModal(attendanceResult), 350);
      }
    }
  }

  // ─────────────────────────────────────────────────
  //  [ARCH 03] 씬 재생 — SceneManager 또는 showNarrative 폴백
  //
  //  전체 비주얼 노벨 씬을 사용하려면 index.html에 다음 DOM이 필요합니다:
  //    <div id="sceneScreen"> 내부에
  //      #sceneBg, #sceneSpeaker, #sceneText, #sceneTextBox,
  //      #sceneContinue, #sceneChoices, #sceneSkipBtn, #sceneProgress
  //  이 DOM이 없으면 story 씬의 첫 3줄을 showNarrative()로 표시합니다.
  // ─────────────────────────────────────────────────
  playScene(sceneId) {
    const scene = window.SCENE_MAP?.[sceneId];
    if (!scene) return;

    // SceneManager가 준비되어 있고 씬 화면 DOM도 존재하면 전체 비주얼 노벨 재생
    if (this.sceneManager?.el?.screen) {
      this.sceneManager.play(sceneId);
      return;
    }

    // 폴백: story 씬의 대사를 showNarrative로 간략하게 표시
    if (scene.type === "story" && scene.lines?.length) {
      const prefix = scene.speaker ? `[${scene.speaker}]\n` : "";
      this.showNarrative(prefix + scene.lines.slice(0, 3).join("\n"), 4500);
    }
  }

  // ─────────────────────────────────────────────────
  //  출석 보상 모달
  // ─────────────────────────────────────────────────
  _showAttendanceModal({ streak, totalDays, reward } = {}) {
    if (!reward) return; // Bug 4: reward 미정의 시 TypeError 방지
    document.getElementById("attendanceOverlay")?.remove();

    const REWARDS = AttendanceManager.REWARDS;

    const dayGrid = REWARDS.map(r => {
      const isPast = r.day < streak;
      const isCur  = r.day === streak;
      const bg     = isCur  ? "#3c1228" : "#0a0608";
      const border = isCur  ? "1.5px solid #e8c060"
                   : isPast ? "0.5px solid #3a2030"
                   :          "0.5px solid #1e1018";
      return `<div style="background:${bg};border:${border};border-radius:6px;padding:7px 2px 4px;text-align:center;position:relative;">
        <div style="font-size:15px;line-height:1">${r.icon}</div>
        <div style="font-size:9px;margin-top:3px;color:${isCur ? "#e8c060" : isPast ? "#705060" : "#4a3040"}">${r.day}일</div>
        ${isPast ? `<div style="position:absolute;top:2px;right:3px;font-size:9px;color:#4a8a5a">✓</div>` : ""}
        ${isCur  ? `<div style="font-size:7px;color:#e89040;font-weight:bold;margin-top:1px">TODAY</div>` : ""}
      </div>`;
    }).join("");

    const streakBadge = streak >= 7
      ? `<span style="font-size:10px;background:#5a3010;color:#e8b040;padding:1px 7px;border-radius:10px;border:0.5px solid #8a5020">🔥 7일 연속!</span>`
      : streak >= 3
      ? `<span style="font-size:10px;background:#1a2a40;color:#80b0e0;padding:1px 7px;border-radius:10px;border:0.5px solid #304060">✨ ${streak}일 연속</span>`
      : "";

    const overlay = document.createElement("div");
    overlay.id = "attendanceOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;" +
      "align-items:center;justify-content:center;z-index:9999;";

    overlay.innerHTML = `
      <div style="background:#0c0609;border:1px solid #5a1a30;border-radius:14px;
                  padding:22px 18px 18px;max-width:310px;width:90%;text-align:center;">
        <div style="font-size:10px;color:#806070;letter-spacing:2px;margin-bottom:4px">DAILY REWARD</div>
        <div style="font-size:19px;font-weight:bold;color:#e8c060;margin-bottom:8px">📅 출석 체크</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px">
          <span style="font-size:12px;color:#907080">누적 <span style="color:#c0a0e0">${totalDays}일</span></span>
          ${streakBadge}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:14px">${dayGrid}</div>
        <div style="background:#160a12;border:0.5px solid #4a1828;border-radius:8px;padding:14px 12px;margin-bottom:14px;">
          <div style="font-size:10px;color:#907080;margin-bottom:6px;letter-spacing:1px">TODAY'S REWARD</div>
          <div style="font-size:26px;margin-bottom:6px;line-height:1">${reward.icon}</div>
          <div style="font-size:15px;color:#e8d080;font-weight:bold">${reward.label}</div>
          ${reward.special ? `<div style="font-size:10px;color:#e8a040;margin-top:6px">✨ 주간 특별 보상!</div>` : ""}
        </div>
        <button id="attClaimBtn"
          style="background:#5a1a30;color:#e8b080;border:0.5px solid #8a3050;
                 padding:11px 0;width:100%;border-radius:8px;cursor:pointer;
                 font-size:13px;font-weight:bold;letter-spacing:1px;">
          받기 ✓
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.style.transition = "opacity .25s";
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.remove(); this.townScene?.render?.(); }, 260);
    };
    document.getElementById("attClaimBtn").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  }

  returnToTown(reason = "") {
    if (reason === "quest")   this.showNarrative("퀘스트 완료!\n마을로 돌아왔다.", 3000);
    else if (reason === "exit") this.showNarrative("던전에서 탈출했다.", 2000);
    else if (reason === "flee") this.showNarrative("도망쳤다...", 2000);
    this._toTown();
  }

  // ─────────────────────────────────────────────────
  //  던전 탐험
  // ─────────────────────────────────────────────────
  goToDungeon(type = "normal", startFloor = 1) {
    const p = this.player;
    // 일반 던전: 2번째 동료 선택 (첫 진입 시)
    if (type === "normal" && startFloor === 1 && !this._party2Selected && p?.party) {
      this._showPartySelectModal(2, [p.party], type, startFloor);
      return;
    }
    // 심연 던전: 3번째 동료 선택 (첫 진입 시)
    if (type === "abyss" && startFloor === 1 && !this._party3Selected && p?.party) {
      this._showPartySelectModal(3, [p.party, p.party2].filter(Boolean), type, startFloor);
      return;
    }
    this._startDungeon(type, startFloor);
  }

  // 실제 던전 초기화 (goToDungeon의 이전 본문 — 모달 경유 후에도 동일 경로 사용)
  _startDungeon(type, startFloor) {
    this.dungeonType       = type;
    this.player.storyPhase = (type === "abyss") ? "abyss" : "dungeon";
    this.player.killCount  = 0;

    const c = this.containers.dungeon;
    c.innerHTML = this._buildDungeonUI();
    this._showScreen("dungeon");

    const canvas = document.getElementById("dungeonCanvas");
    this.dungeonScene = new DungeonScene(this);
    this.dungeonScene.init(canvas, type, startFloor);

    this.dungeonHud = new DungeonHud(this);
    this.dungeonHud.render();

    const label = (window.DUNGEON_LABELS ?? {})[type] ?? "던전";
    this.log(`⚔ ${label} 탐험 시작! (${startFloor}/${this.dungeonScene.maxFloors}층)`);
    this.log("방향키/WASD 이동 · 적 접촉 시 전투");

    // 성 밖 사냥터: 첫 진입 시 튜토리얼 오버레이
    if (type === "outside" && !this._tutorialShown) {
      this._tutorialShown = true;
      setTimeout(() => this._showTutorialOverlay(), 600);
    }
  }

  // ─────────────────────────────────────────────────
  //  수호자 처치 → 심연 해금 (battle-manager.js에서 직접 호출)
  //  battle-manager의 _onMonsterDefeated가 player 필드를 직접 설정하므로
  //  이 메서드는 향후 추가 로직(컷씬 등)을 위한 확장 포인트로 남겨둠
  // ─────────────────────────────────────────────────
  onGuardianDefeated() {
    // battle-manager.js에서 guardianDefeated·abyssUnlocked 이미 설정됨
    // 필요 시 여기서 연출 추가 가능
    this.saveManager.autoSave(this);
  }

  // ─────────────────────────────────────────────────
  //  성 밖 사냥터 튜토리얼 오버레이
  // ─────────────────────────────────────────────────
  _showTutorialOverlay() {
    document.getElementById("tutorialOverlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "tutorialOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;" +
      "align-items:center;justify-content:center;z-index:9998;cursor:pointer;";

    overlay.innerHTML = `
      <div style="background:#0c0609;border:1px solid #5a3010;border-radius:14px;
                  padding:26px 22px;max-width:340px;width:92%;text-align:center;">
        <div style="font-size:10px;color:#a08060;letter-spacing:2px;margin-bottom:6px">TUTORIAL</div>
        <div style="font-size:18px;font-weight:bold;color:#e8c060;margin-bottom:14px">🌿 성 밖 사냥터</div>
        <div style="text-align:left;font-size:13px;line-height:2;color:#c0a880;">
          <div>⬆⬇⬅➡ &nbsp;<span style="color:#e8d080">방향키 / WASD</span> — 이동</div>
          <div>👺 &nbsp;<span style="color:#e8d080">적에게 접촉</span> — 전투 시작</div>
          <div>⎵ &nbsp;<span style="color:#e8d080">스페이스바</span> — 공격 (전투 중)</div>
          <div>🚪 &nbsp;<span style="color:#e8d080">출구 접촉</span> — 마을 귀환</div>
          <div>📦 &nbsp;<span style="color:#e8d080">상자 접촉</span> — 아이템 획득</div>
        </div>
        <div style="margin-top:16px;font-size:11px;color:#705040;border-top:0.5px solid #3a1a10;padding-top:10px">
          혼자 몬스터를 처치하고 마을로 돌아오세요!
        </div>
        <div style="margin-top:12px;font-size:11px;color:#a07050">화면 클릭 또는 아무 키나 눌러 닫기</div>
      </div>`;

    document.body.appendChild(overlay);
    const dismiss = () => overlay.remove();
    overlay.addEventListener("click", dismiss);
    document.addEventListener("keydown", dismiss, { once: true });
  }

  // ─────────────────────────────────────────────────
  //  심연 보조 동료 선택 모달
  // ─────────────────────────────────────────────────
  // 동료 선택 모달 (slotNum=2: 일반던전 2번째, slotNum=3: 심연 3번째)
  _showPartySelectModal(slotNum, excludeIds, type, startFloor) {
    const p = this.player;
    const overlayId = "partySelectOverlay";
    document.getElementById(overlayId)?.remove();

    // 제외할 ID 외 선택 가능 동료 목록
    const available = Object.entries(PARTY_MEMBERS)
      .filter(([id]) => !excludeIds.includes(id));

    const SLOT_INFO = {
      2: { field:"party2", hpField:"party2Hp", maxField:"party2MaxHp", koField:"_party2KnockedOut",
           flag:"_party2Selected", title:"두 번째 동료 선택",
           desc:"일반 던전에서 함께할 동료를 선택하세요", sub:"2번째 동료는 일반·심연 던전에서 참전합니다" },
      3: { field:"party3", hpField:"party3Hp", maxField:"party3MaxHp", koField:"_party3KnockedOut",
           flag:"_party3Selected", title:"세 번째 동료 선택",
           desc:"심연에서 함께할 마지막 동료를 선택하세요", sub:"3번째 동료는 심연 던전에서만 참전합니다" },
    };
    const info = SLOT_INFO[slotNum];

    const confirm = (id) => {
      const mem = id ? PARTY_MEMBERS[id] : null;
      if (mem) {
        p[info.field]   = id;
        p[info.maxField] = mem.hp;
        p[info.hpField]  = mem.hp;
        p[info.koField]  = false;
        this.log(`👥 ${mem.name}이(가) 합류했다!`);
      } else {
        p[info.field] = null; p[info.hpField] = 0; p[info.maxField] = 0;
      }
      this[info.flag] = true;
      document.getElementById(overlayId)?.remove();
      this._startDungeon(type, startFloor);
    };

    const cols = Math.min(available.length, 2);
    const memberCards = available.map(([id, mem]) => {
      const aff = p.affinity?.[id] || 0;
      return `<button onclick="window._partySelectCb('${id}')"
        style="background:#160a12;border:1px solid #3a1828;border-radius:10px;
               padding:12px 8px;cursor:pointer;text-align:center;width:100%;color:inherit;">
        <div style="font-size:22px;line-height:1;margin-bottom:5px">${mem.icon}</div>
        <div style="font-size:13px;font-weight:bold;color:#e8d080">${mem.name}</div>
        <div style="font-size:10px;color:#907080;margin-top:2px">${mem.className}</div>
        <div style="font-size:11px;color:#80b0e0;margin-top:5px">HP ${mem.hp}  ATK ${mem.attack}</div>
        <div style="font-size:10px;color:#c0a0e0;margin-top:2px">호감도 ${aff}</div>
      </button>`;
    }).join("");

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.87);display:flex;" +
      "align-items:center;justify-content:center;z-index:9999;";

    overlay.innerHTML = `
      <div style="background:#0c0609;border:1px solid #4a1040;border-radius:14px;
                  padding:24px 18px 18px;max-width:400px;width:92%;text-align:center;">
        <div style="font-size:10px;color:#806070;letter-spacing:2px;margin-bottom:4px">PARTY SELECT</div>
        <div style="font-size:18px;font-weight:bold;color:#e8c060;margin-bottom:6px">${info.title}</div>
        <div style="font-size:12px;color:#907080;line-height:1.6;margin-bottom:16px">
          ${info.desc}<br>
          <span style="color:#c08080;font-size:10px">${info.sub}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;margin-bottom:14px;">
          ${memberCards}
        </div>
        <button onclick="window._partySelectCb(null)"
          style="background:#1a0e18;color:#705060;border:0.5px solid #3a1828;
                 padding:10px 0;width:100%;border-radius:8px;cursor:pointer;font-size:12px;">
          선택 없이 진행
        </button>
      </div>`;

    window._partySelectCb = confirm;
    document.body.appendChild(overlay);
  }

  _buildDungeonUI() {
    return `
<div class="dungeon-layout">
  <!-- 탐험 캔버스 -->
  <div class="dungeon-canvas-wrap" id="dungeonCanvasWrap">
    <canvas id="dungeonCanvas" width="720" height="480"></canvas>
    <!-- 범프 애니메이션용 -->
  </div>

  <!-- 우측 패널 -->
  <div class="dungeon-right-panel">
    <!-- 플레이어 정보 -->
    <div class="dungeon-player-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div class="dp-name" id="dhName">용사</div>
        <div id="dhFloor" style="font-size:.7rem;font-weight:700;color:#88ddff;background:rgba(0,80,120,.35);padding:2px 8px;border-radius:10px;border:1px solid #2a5a80;">1층</div>
      </div>
      <div class="dp-class" id="dhClass">전사</div>
      <div class="dp-stat-row">
        <span>HP</span>
        <div class="dp-bar-track"><div id="dhHpBar" class="dp-bar-fill hp"></div></div>
        <span id="dhHpVal">160/160</span>
      </div>
      <div class="dp-stat-row">
        <span>💰</span><span id="dhGold">0G</span>
        <span>Lv.</span><span id="dhLevel">1</span>
      </div>
    </div>

    <!-- 동료 정보 -->
    <div class="dungeon-comp-card" id="dhCompCard" style="display:none;">
      <div class="dp-name" id="dhCompName">동료</div>
      <div class="dp-stat-row">
        <span>HP</span>
        <div class="dp-bar-track"><div id="dhCompHpBar" class="dp-bar-fill comp"></div></div>
        <span id="dhCompHpVal">0/0</span>
      </div>
      <div style="font-size:.6rem;color:#ff77aa;text-align:right;">❤ <span id="dhAff">0</span></div>
    </div>

    <!-- 심연 보조 동료 (party2) -->
    <div id="dhParty2Card" style="display:none;margin-top:4px;padding:7px 10px;
         background:#0d0814;border:0.5px solid #2a1840;border-radius:6px;">
      <div style="font-size:.55rem;color:#806090;letter-spacing:1px;margin-bottom:3px">⚫ 2번째 동료</div>
      <div class="dp-name" id="dhParty2Name">—</div>
      <div class="dp-stat-row">
        <span>HP</span>
        <div class="dp-bar-track"><div id="dhParty2HpBar" class="dp-bar-fill" style="background:#8060c0"></div></div>
        <span id="dhParty2HpVal">0/0</span>
      </div>
    </div>

    <!-- 심연 3번째 동료 (party3) -->
    <div id="dhParty3Card" style="display:none;margin-top:4px;padding:7px 10px;
         background:#0a0c14;border:0.5px solid #1a2840;border-radius:6px;">
      <div style="font-size:.55rem;color:#608090;letter-spacing:1px;margin-bottom:3px">⚫ 3번째 동료</div>
      <div class="dp-name" id="dhParty3Name">—</div>
      <div class="dp-stat-row">
        <span>HP</span>
        <div class="dp-bar-track"><div id="dhParty3HpBar" class="dp-bar-fill" style="background:#4080a0"></div></div>
        <span id="dhParty3HpVal">0/0</span>
      </div>
    </div>

    <!-- 퀘스트 정보 -->
    <div class="dungeon-quest-card" id="dhQuestCard" style="display:none;">
      <div class="dp-label">📜 퀘스트</div>
      <div id="dhQuestTitle" style="font-size:.72rem;color:var(--gold2);"></div>
      <div id="dhQuestProg"  style="font-size:.65rem;color:var(--text-dim);"></div>
      <div class="quest-progress-bar" style="margin-top:4px;"><div id="dhQuestBar" class="quest-progress-fill"></div></div>
    </div>

    <!-- 미니맵 -->
    <div class="dungeon-minimap-wrap">
      <div class="dp-label">🗺 미니맵</div>
      <canvas id="dungeonMinimap" style="border:1px solid var(--border2);image-rendering:pixelated;"></canvas>
    </div>

    <!-- 조작 안내 -->
    <div class="dungeon-controls">
      <div class="dp-label">조작</div>
      <div style="font-size:.62rem;color:var(--text-dim);line-height:1.8;">
        ↑↓←→ / WASD : 이동<br>
        👺 적에 접근 → 전투<br>
        📦 상자에 접근 → 획득<br>
        🚪 출구 → 마을 복귀
      </div>
    </div>

    <!-- D-Pad (모바일) -->
    <div class="dungeon-dpad">
      <button class="dpad-btn" id="dUp"   >▲</button>
      <div style="display:flex;gap:4px;">
        <button class="dpad-btn" id="dLeft" >◀</button>
        <div style="width:36px;"></div>
        <button class="dpad-btn" id="dRight">▶</button>
      </div>
      <button class="dpad-btn" id="dDown" >▼</button>
    </div>

    <!-- 마을 복귀 -->
    <button class="location-btn" id="dhReturnBtn" style="width:100%;margin-top:8px;">🏘 마을로</button>

    <!-- 메시지 -->
    <div id="dhFlashMsg" style="font-size:.75rem;color:var(--gold2);min-height:20px;text-align:center;margin-top:4px;"></div>
  </div>
</div>`;
  }

  // ─────────────────────────────────────────────────
  //  전투 시작
  // ─────────────────────────────────────────────────
  startBattle(monsterId, isBoss) {
    // 현재 던전 위치 저장
    this._returnAfterBattle = {
      type:  this.dungeonType,
      floor: this.dungeonScene?.floor ?? 1,
      x:     this.dungeonScene?.playerX,
      y:     this.dungeonScene?.playerY,
    };

    // 레벨 + 던전 유형 + 층 기반 난이도 배수
    const floor     = this.dungeonScene?.floor ?? 1;
    const diffTbl   = (window.FLOOR_DIFFICULTY ?? {})[this.dungeonType ?? "normal"]
                   ?? (window.FLOOR_DIFFICULTY?.normal ?? [1.0, 1.35, 1.7]);
    const floorMult = diffTbl[Math.min(floor - 1, diffTbl.length - 1)] ?? 1.0;
    const diffMult  = (1 + (this.player.level - 1) * 0.15) * floorMult;
    this.currentMonster = createMonsterInstance(monsterId, diffMult);
    if (isBoss) {
      this.currentMonster.isBoss = true;
      if (monsterId === "demon") this.currentMonster.isFinal = true;
    }

    // [ARCH 03] 최종 보스 진입 시 보스 스토리 씬 재생 (씬 종료 후 battle 화면 진입)
    if (monsterId === "demon" && window.SCENE_MAP?.boss_enter) {
      this.playScene("boss_enter");
      // SceneManager가 있으면 씬 종료 후 battle 화면으로 자동 전환됨
      // SceneManager 없는 폴백 환경에선 아래에서 즉시 battle 화면 진입
      if (this.sceneManager?.el?.screen) return;
    }

    // 전투 화면 구성
    const c = this.containers.battle;
    this.battleScene = new BattleScene(this);
    this.battleScene.mount(c);
    this.battleScene.clearLog();
    this._showScreen("battle");

    // 전투 시작
    this.battleScene.startBattle(this.currentMonster);
    this.log(`⚔ ${this.currentMonster.name}과(와) 전투!`);
  }

  // ─────────────────────────────────────────────────
  //  전투 결과
  // ─────────────────────────────────────────────────
  onBattleVictory() {
    this.currentMonster = null;
    const ret = this._returnAfterBattle;
    this._returnAfterBattle = null;

    if (ret) {
      this.goToDungeon(ret.type || this.dungeonType || "normal", ret.floor ?? 1);
    } else if (this.dungeonType && this.player?.storyPhase === "dungeon") {
      this.goToDungeon(this.dungeonType, 1);
    } else {
      this._toTown();
    }
  }

  onFlee() {
    if (!this.player) return;
    const p = this.player;
    // 도망 패널티: HP 10% 감소
    const penalty = Math.floor((p.maxHp + p.bonusHp) * 0.1);
    p.hp = Math.max(1, p.hp - penalty);
    this.log(`🏃 도망쳤다! HP -${penalty}`);
    this.currentMonster = null;

    setTimeout(() => {
      if (this._returnAfterBattle) {
        const { type, floor } = this._returnAfterBattle;
        this._returnAfterBattle = null;
        this.goToDungeon(type, floor ?? 1);
      } else {
        this._toTown();
      }
    }, 600);
  }

  onFinalBossDefeated() {
    this.player.abyssUnlocked = true;
    this.player.storyPhase    = "victory";
    this.saveManager.save(this);
    this.currentMonster = null;

    const c = this.containers.victory;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/동료들과 함께 기뻐하는 모습.png') center/cover no-repeat;opacity:.35;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:var(--gold2);">🎉 마왕 토벌 성공!</div>
        <p class="overlay-desc">마왕 다르카스를 물리쳤다!<br>세계에 평화가 찾아왔다.<br><br>
          <strong style="color:var(--gold);">🌌 심연 던전이 해금되었습니다!</strong></p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button class="overlay-btn primary" id="victoryToTown">🏘 마을로</button>
          <button class="overlay-btn" id="victoryRestart">🔄 처음부터</button>
        </div>
      </div>`;

    document.getElementById("victoryToTown")  ?.addEventListener("click", () => this._toTown());
    document.getElementById("victoryRestart") ?.addEventListener("click", () => this.restart());

    this._showScreen("victory");
    if (window.audioMgr) audioMgr.stopBgm();
  }

  onPlayerDefeated() {
    const c = this.containers.defeat;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/던전 패배 이미지.png') center/cover no-repeat;opacity:.35;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:#8888ff;">💀 패배...</div>
        <p class="overlay-desc">어둠 속에서 쓰러진 용사...<br>이야기는 끝나지 않았다.</p>
        <button class="overlay-btn primary" id="defeatRetry">🔄 다시 도전</button>
      </div>`;

    document.getElementById("defeatRetry")?.addEventListener("click", () => {
      // HP 회복 후 마을로
      this.player.hp = Math.floor((this.player.maxHp + this.player.bonusHp) * 0.5);
      if (this.player.party) {
        this.player.partyHp = this.player.partyMaxHp;
        this.player._partyKnockedOut = false; // [BALANCE 04] 패배 재도전 시 동료 회복
      }
      this.player.status = { poison:0, stun:0, burn:0 };
      this._toTown();
    });

    this._showScreen("defeat");
    if (window.audioMgr) audioMgr.stopBgm();
  }

  restart() {
    if (this.dungeonScene) { this.dungeonScene.destroy(); this.dungeonScene = null; }
    this.player         = null;
    this.currentMonster = null;
    this.battleScene    = null;
    this.townScene      = null;
    this._showScreen("title");
    this._buildTitleScreen();
  }

  // ─────────────────────────────────────────────────
  //  공통 액션
  // ─────────────────────────────────────────────────
  isGameOver() {
    if (!this.player || this.player.hp <= 0) {
      // 게임오버 체크
      if (this.currentScene === "battle") {
        setTimeout(() => this.onPlayerDefeated(), 800);
      }
      return true;
    }
    return false;
  }

  log(msg) {
    const plain = msg.replace(/<[^>]+>/g, "");
    console.log("[RPG]", plain);
    if (this.battleScene) this.battleScene.log(msg);
    if (this.dungeonHud)  this.dungeonHud.flashMsg(plain);
  }

  showNarrative(text, duration = 3000) {
    let box = document.getElementById("narrativeBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "narrativeBox";
      box.style.cssText = "display:none;position:fixed;inset:0;z-index:60;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.6);";
      const inner = document.createElement("div");
      inner.id = "narrativeText";
      inner.style.cssText = "background:rgba(8,4,6,.96);border:1px solid #4a2e38;color:var(--gold);padding:20px 40px;font-size:1rem;text-align:center;line-height:1.9;white-space:pre-line;max-width:480px;";
      box.appendChild(inner);
      document.body.appendChild(box);
    }
    document.getElementById("narrativeText").innerText = text;
    box.style.display = "flex";
    clearTimeout(this._narrTimer);
    this._narrTimer = setTimeout(() => { box.style.display = "none"; }, duration);
  }

  restAtInn() {
    const p = this.player;
    const maxHp = p.maxHp + p.bonusHp;
    const cost  = Math.max(50, Math.floor((maxHp - p.hp) * 2));
    if (p.money < cost) { this.showNarrative(`여관 비용이 부족합니다.\n(${cost}G 필요 / 보유 ${p.money}G)`, 2500); return; }
    p.money -= cost;
    p.hp      = maxHp;
    if (p.party) {
      p.partyHp = p.partyMaxHp;
      p._partyKnockedOut = false; // [BALANCE 04] 여관 숙박 = 동료 완전 회복
    }
    p.cooldowns = { jobSkill:0, partyUltimate:0, heal:0 };
    this.save();
    this.showNarrative(`🏨 여관에서 쉬었다!\nHP 완전 회복 (-${cost}G)\n💾 저장 완료`, 3000);
    this.townScene?.render();
  }

  selectParty(key) {
    const mem = PARTY_MEMBERS[key];
    if (!mem || !this.player) return;
    this.player.party      = key;
    this.player.partyHp    = mem.hp;
    this.player.partyMaxHp = mem.hp;
    this.log(`🤝 ${mem.name} 합류!`);
    this.showNarrative(`${mem.name}이(가) 파티에 합류했다!`, 2500);
  }

  // ─────────────────────────────────────────────────
  //  스킬 시스템
  // ─────────────────────────────────────────────────
  learnSkill(skillName) {
    const p = this.player;
    if (!p || p.skillPoints <= 0) { this.log("❌ SP 부족"); return; }
    if ((p.skills[skillName]||0) >= 10) { this.log("⚠ 최대 레벨"); return; }
    p.skillPoints--;
    p.skills[skillName] = (p.skills[skillName]||0) + 1;
    if (skillName === "hpBoost") {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 20);
    }
    this.log(`🌟 ${skillName} Lv.${p.skills[skillName]}`);
  }

  learnJobSkill() {
    const p = this.player;
    if (!p) return;
    if (p.skillPoints < 3) { this.log("❌ SP 3 필요"); return; }
    const has = p.activeSkills.whirlwind || p.activeSkills.magicBall || p.activeSkills.rapidShot;
    if (has) { this.log("⚠ 이미 습득"); return; }
    p.skillPoints -= 3;
    if (p.type === "night") p.activeSkills.whirlwind = true;
    if (p.type === "mage")    p.activeSkills.magicBall  = true;
    if (p.type === "archer")  p.activeSkills.rapidShot  = true;
    this.log("✨ 직업 스킬 습득!");
  }

  learnPassive(skillId, skillDefs) {
    const p = this.player;
    if (!p) return;
    const def = skillDefs.find(s => s.id === skillId);
    if (!def) return;
    if (!p.passiveSkills) p.passiveSkills = {};
    const curLv = p.passiveSkills[skillId] || 0;
    const maxLv = def.spCost.length;
    if (curLv >= maxLv) { this.log("⚠ 최대 레벨"); return; }
    const cost = def.spCost[curLv];
    if (p.skillPoints < cost) { this.log(`❌ SP ${cost} 필요`); return; }
    p.skillPoints -= cost;
    p.passiveSkills[skillId] = curLv + 1;
    this.log(`✨ ${def.name} Lv.${curLv+1} 습득!`);
  }

  // ─────────────────────────────────────────────────
  //  동료 스토리 (간략)
  // ─────────────────────────────────────────────────
  showPartyStory() {
    const p = this.player;
    if (!p?.party) { this.showNarrative("동료가 없습니다.", 2000); return; }
    if (!p.partyStoryUnlocked) { this.showNarrative("호감도 75 이상 시 해금됩니다.", 2000); return; }
    const mem = PARTY_MEMBERS[p.party];
    this.showNarrative(
      `${mem.name}과의 이야기\n\n"함께 여기까지 오다니, 정말 대단해요."\n"당신과 함께라면 어디든 갈 수 있어요."\n\n❤ 호감도 ${p.affinity[p.party]}`,
      5000
    );
    p.baseAttack += 5;
    this.log("📖 유대 이벤트! 공격력 +5");
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DungeonHud — 던전 화면 HUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class DungeonHud {
  constructor(game) {
    this.game = game;
    this._flashTimer = null;
    this._bindDpad();
    this._bindReturnBtn();
  }

  _bindDpad() {
    const ds = this.game.dungeonScene;
    if (!ds) return;
    ["Up","Down","Left","Right"].forEach(dir => {
      const btn = document.getElementById(`d${dir}`);
      btn?.addEventListener("click", () => ds.onDpadPress(dir.toLowerCase()));
    });
  }

  _bindReturnBtn() {
    document.getElementById("dhReturnBtn")?.addEventListener("click", () => {
      this.game.returnToTown("exit");
    });
  }

  render() {
    const p = this.game.player;
    if (!p) return;
    const s = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    const b = (id, cur, max) => {
      const e = document.getElementById(id);
      if (!e) return;
      e.style.width = `${Math.max(0, Math.min(100, max>0?(cur/max)*100:0))}%`;
    };

    s("dhName",  p.name);
    s("dhClass", { night:"기사", mage:"마법사", archer:"궁수" }[p.type] || "");
    // 골드 상한 및 레벨 MAX 표시
    s("dhGold",  typeof formatGold === "function" ? formatGold(p.money) : `${p.money}G`);
    s("dhLevel", p.level >= MAX_LEVEL ? `${p.level} ✦MAX` : p.level);

    // 현재 층 표시
    const floor    = this.game.dungeonScene?.floor ?? 1;
    const maxFloor = this.game.dungeonScene?.maxFloors ?? 3;
    const floorEl  = document.getElementById("dhFloor");
    if (floorEl) {
      floorEl.textContent = `${floor}/${maxFloor}층`;
      // 보스 층이면 강조색
      floorEl.style.color  = floor >= maxFloor ? "#ff8888" : "#88ddff";
      floorEl.style.borderColor = floor >= maxFloor ? "#802020" : "#2a5a80";
    }
    b("dhHpBar", p.hp, p.maxHp + p.bonusHp);
    s("dhHpVal", `${p.hp}/${p.maxHp + p.bonusHp}`);

    // 동료
    const hasParty = p.party && p.partyHp > 0;
    const compCard = document.getElementById("dhCompCard");
    if (compCard) compCard.style.display = hasParty ? "block" : "none";
    if (hasParty) {
      const mem = PARTY_MEMBERS[p.party];
      s("dhCompName", mem?.name || "동료");
      s("dhAff",      p.affinity?.[p.party] || 0);
      b("dhCompHpBar",p.partyHp, p.partyMaxHp);
      s("dhCompHpVal",`${p.partyHp}/${p.partyMaxHp}`);
    }

    // 심연 보조 동료 (party2)
    const party2Card = document.getElementById("dhParty2Card");
    if (party2Card) {
      const hasParty2 = p.party2 && p.party2MaxHp > 0;
      party2Card.style.display = hasParty2 ? "block" : "none";
      if (hasParty2) {
        const mem2 = PARTY_MEMBERS[p.party2];
        s("dhParty2Name", `${mem2?.icon ?? ""} ${mem2?.name ?? "보조"}`);
        b("dhParty2HpBar", p.party2Hp, p.party2MaxHp);
        s("dhParty2HpVal", `${p.party2Hp}/${p.party2MaxHp}`);
        // 전투 불능이면 보라색 → 회색
        const bar2 = document.getElementById("dhParty2HpBar");
        if (bar2) bar2.style.background = p._party2KnockedOut ? "#4a2a4a" : "#8060c0";
      }
    }

    // 3번째 동료 (party3 — 심연 전용)
    const party3Card = document.getElementById("dhParty3Card");
    if (party3Card) {
      const hasParty3 = p.party3 && p.party3MaxHp > 0;
      party3Card.style.display = hasParty3 ? "block" : "none";
      if (hasParty3) {
        const mem3 = PARTY_MEMBERS[p.party3];
        s("dhParty3Name", `${mem3?.icon ?? ""} ${mem3?.name ?? "3번째"}`);
        b("dhParty3HpBar", p.party3Hp, p.party3MaxHp);
        s("dhParty3HpVal", `${p.party3Hp}/${p.party3MaxHp}`);
        const bar3 = document.getElementById("dhParty3HpBar");
        if (bar3) bar3.style.background = p._party3KnockedOut ? "#2a3a4a" : "#4080a0";
      }
    }
    if (questCard) questCard.style.display = p.quest ? "block" : "none";
    if (p.quest) {
      s("dhQuestTitle", p.quest.title);
      s("dhQuestProg",  `${p.questProgress}/${p.quest.goal}마리`);
      const pct = Math.floor((p.questProgress / p.quest.goal) * 100);
      const bar = document.getElementById("dhQuestBar");
      if (bar) bar.style.width = `${pct}%`;
    }
  }

  flashMsg(msg, color = "#d8c8b0") {
    const el = document.getElementById("dhFlashMsg");
    if (!el) return;
    el.textContent = msg;
    el.style.color = color;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => { el.textContent = ""; }, 2500);
  }
}

window.Game       = Game;
window.DungeonHud = DungeonHud;

// ── 진입점 ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  window.rpgGame = new Game();
});