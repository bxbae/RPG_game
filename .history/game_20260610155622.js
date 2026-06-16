// ═══════════════════════════════════════════════════
//  game.js  — 메인 게임 컨트롤러
// ═══════════════════════════════════════════════════
"use strict";

class Game {
  constructor() {
    this.player = null;
    this.currentMonster = null;

    this.saveManager = new SaveManager();
    this.itemManager = new ItemManager();
    this.questManager = new QuestManager();
    this.battleManager = new BattleManager();

    this.townScene = null;
    this.dungeonScene = null;
    this.battleScene = null;

    this.currentScene = "title";
    this.dungeonType = "normal";
    this._returnAfterBattle = null;

    this.containers = {
      title: document.getElementById("titleScreen"),
      town: document.getElementById("townScreen"),
      dungeon: document.getElementById("dungeonScreen"),
      battle: document.getElementById("battleScreen"),
      victory: document.getElementById("victoryScreen"),
      defeat: document.getElementById("defeatScreen"),
    };

    this._buildTitleScreen();
    this._showScreen("title");

    window.rpgGame = this;
  }

  _buildTitleScreen() {
    const c = this.containers.title;
    if (!c) return;

    // ══════════════════════════════════════
    //  오프닝 연출 + 직업 선택 HTML
    // ══════════════════════════════════════
    c.innerHTML = `
      <!-- 배경 -->
      <div class="bg-overlay"></div>
      <div id="openingBg" style="
        position:absolute;inset:0;z-index:0;
        background:url('images/forest_exploration_day.png') center/cover no-repeat;
        opacity:0;transition:opacity 1.5s ease;
      "></div>

      <!-- ── 오프닝 씬 ── -->
      <div id="openingScene" style="
        position:absolute;inset:0;z-index:2;
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        pointer-events:none;
      ">
        <!-- 상단 어두운 그라디언트 -->
        <div style="position:absolute;inset:0;
          background:linear-gradient(to bottom,
            rgba(0,0,0,0.55) 0%,
            rgba(0,0,0,0.15) 40%,
            rgba(0,0,0,0.65) 100%);
          pointer-events:none;"></div>

        <!-- 타이틀 로고 -->
        <div id="openingLogo" style="
          position:relative;z-index:1;
          text-align:center;margin-bottom:48px;
          opacity:0;transform:translateY(-20px);
          transition:opacity 1s ease,transform 1s ease;
        ">
          <h1 style="
            font-family:'Noto Serif KR',serif;
            font-size:clamp(2.4rem,6vw,4rem);
            font-weight:900;color:#FFD700;
            text-shadow:0 0 40px rgba(255,180,0,.7),0 4px 16px rgba(0,0,0,.9);
            letter-spacing:.15em;margin:0;
          ">마왕 토벌</h1>
          <p style="
            font-family:'Noto Serif KR',serif;
            font-size:clamp(.85rem,2vw,1.1rem);
            color:rgba(255,220,150,.75);
            letter-spacing:.4em;margin-top:10px;
          ">― 어둠의 용사 ―</p>
        </div>

        <!-- 스토리 텍스트 -->
        <div id="openingText" style="
          position:relative;z-index:1;
          text-align:center;max-width:560px;padding:0 24px;
        ">
          <p id="openingLine" style="
            font-family:'Noto Serif KR',serif;
            font-size:clamp(.95rem,2.2vw,1.15rem);
            color:rgba(255,240,210,0.92);
            line-height:2;letter-spacing:.06em;
            text-shadow:0 2px 12px rgba(0,0,0,.95);
            min-height:2.5em;
            opacity:0;transition:opacity .8s ease;
          "></p>
        </div>

        <!-- 건너뛰기 -->
        <button id="openingSkip" style="
          position:absolute;bottom:32px;right:32px;
          background:transparent;border:1px solid rgba(255,255,255,.3);
          color:rgba(255,255,255,.5);padding:6px 16px;
          cursor:pointer;font-family:inherit;font-size:.72rem;
          border-radius:4px;z-index:10;pointer-events:all;
          transition:.2s;
        " onmouseover="this.style.borderColor='rgba(255,255,255,.7)';this.style.color='rgba(255,255,255,.8)'"
           onmouseout="this.style.borderColor='rgba(255,255,255,.3)';this.style.color='rgba(255,255,255,.5)'">
          건너뛰기 ▶
        </button>
      </div>

      <!-- ── 직업 선택 씬 (처음엔 숨김) ── -->
      <div id="classSelectScene" style="
        position:relative;z-index:3;
        opacity:0;transition:opacity 1s ease;
        pointer-events:none;
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        width:100%;height:100%;
      ">
        <div class="title-content">
          <h2 style="
            font-family:'Noto Serif KR',serif;
            color:var(--gold2);font-size:1.1rem;
            letter-spacing:.2em;margin-bottom:24px;
            text-shadow:0 0 20px rgba(200,152,14,.5);
          ">직업을 선택하세요</h2>
          <div class="class-cards">
            <button class="class-card" data-start="knight">
              <div class="class-icon">⚔</div>
              <div class="class-name">기사</div>
              <div class="class-desc">강인한 체력과 방어력</div>
            </button>
            <button class="class-card" data-start="magician">
              <div class="class-icon">🔮</div>
              <div class="class-name">마법사</div>
              <div class="class-desc">강력한 마법 공격</div>
            </button>
            <button class="class-card" data-start="archer">
              <div class="class-icon">🏹</div>
              <div class="class-name">궁수</div>
              <div class="class-desc">원거리·회피의 달인</div>
            </button>
          </div>
          <button class="btn-load" id="mainLoadBtn" style="margin-top:16px;">
            💾 저장 데이터 불러오기
          </button>
        </div>
      </div>`;

    // ══════════════════════════════════════
    //  오프닝 연출 시퀀스
    // ══════════════════════════════════════
    const STORY_LINES = [
      "용사여, 마왕 다르카스가 강림했어요!",
      "마을을 망가뜨리고, 사람들은 공포에 떨고 있어요.",
      "우리 주변에 희망은 당신밖에 없어요...",
      "어서 일어나요.",
    ];

    const bg = document.getElementById("openingBg");
    const logo = document.getElementById("openingLogo");
    const lineEl = document.getElementById("openingLine");
    const skipBtn = document.getElementById("openingSkip");
    const classScene = document.getElementById("classSelectScene");

    let seq = null; // 타이머 핸들
    const showClassSelect = () => {
      if (seq) {
        seq.forEach((t) => clearTimeout(t));
        seq = null;
      }
      const opening = document.getElementById("openingScene");
      if (opening) {
        opening.style.opacity = "0";
        opening.style.transition = "opacity .6s";
      }
      setTimeout(() => {
        if (opening) opening.style.display = "none";
        classScene.style.opacity = "1";
        classScene.style.pointerEvents = "all";
      }, 650);
    };

    skipBtn?.addEventListener("click", showClassSelect);

    // 텍스트 타이핑 + 페이드 함수
    const showLine = (text, cb) => {
      lineEl.style.opacity = "0";
      lineEl.textContent = "";
      setTimeout(() => {
        lineEl.style.opacity = "1";
        let i = 0;
        const tick = () => {
          if (i < text.length) {
            lineEl.textContent += text[i++];
            setTimeout(tick, 45);
          } else if (cb) {
            setTimeout(cb, 1400);
          }
        };
        tick();
      }, 400);
    };

    // 연출 시작
    seq = [];
    // 0.3초 후 배경 페이드인
    seq.push(
      setTimeout(() => {
        bg.style.opacity = "1";
      }, 300),
    );
    // 1.2초 후 로고 등장
    seq.push(
      setTimeout(() => {
        logo.style.opacity = "1";
        logo.style.transform = "translateY(0)";
      }, 1200),
    );
    // 2.8초 후 첫 번째 대사
    let delay = 2800;
    STORY_LINES.forEach((line, i) => {
      seq.push(
        setTimeout(
          () =>
            showLine(
              line,
              i === STORY_LINES.length - 1
                ? () => {
                    // 마지막 대사 후 1.5초 뒤 직업 선택으로 전환
                    setTimeout(showClassSelect, 1500);
                  }
                : null,
            ),
          delay,
        ),
      );
      delay += line.length * 48 + 2600;
    });

    // 직업 선택 이벤트
    c.querySelectorAll("[data-start]").forEach((btn) =>
      btn.addEventListener("click", () => this.start(btn.dataset.start)),
    );
    document
      .getElementById("mainLoadBtn")
      ?.addEventListener("click", () => this.loadGame());
  }

  _showScreen(name) {
    Object.entries(this.containers).forEach(([k, el]) => {
      if (el) el.style.display = k === name ? "flex" : "none";
    });
    this.currentScene = name;

    if (window.audioMgr) {
      // battle은 일반 던전 BGM, boss 전투는 startBattle에서 별도 전환
      const bgmMap = {
        town: "town",
        dungeon: "dungeon",
        battle: "dungeon",
        title: "",
        victory: "",
        defeat: "",
      };
      const bgm = bgmMap[name];
      if (bgm) audioMgr.playBgm(bgm);
      else audioMgr.stopBgm();
    }
  }

  start(type) {
    this.player = new Player(type);
    this.currentMonster = null;
    this._toTown();
    this.showNarrative(
      `${this.player.name}이(가) 마을에 도착했다.\n마왕의 위협으로 마을 사람들은 두려움에 떨고 있다...`,
      4000,
    );
  }

  loadGame(slotIndex = 0) {
    const data = this.saveManager.load(slotIndex);
    if (!data) {
      alert("저장 데이터가 없습니다.");
      return;
    }
    this.player = this.saveManager.hydrate(data.player);
    if (!this.player) {
      alert("저장 데이터 손상");
      return;
    }
    this.currentMonster = null;
    this._toTown();
    this.log(`💾 저장 데이터 불러오기 완료! Lv.${this.player.level}`);
  }

  save(slotIndex = 0) {
    const ok = this.saveManager.save(this, slotIndex);
    this.log(ok ? `💾 슬롯 ${slotIndex + 1} 저장 완료!` : "⚠ 저장 실패");
  }

  _toTown() {
    this.player.storyPhase = "town";
    this.currentMonster = null;

    // guardianKillCount 초기화 보장
    if (this.player.guardianKillCount === undefined) {
      this.player.guardianKillCount = 0;
    }

    // 은행 데이터 초기화 보장
    if (!this.player.bank) {
      this.player.bank = {
        deposit: 0,
        interest: 0,
        totalInvested: 0,
        milestones: [],
      };
    }

    if (this.dungeonScene) {
      this.dungeonScene.destroy();
      this.dungeonScene = null;
    }
    this.battleScene = null;

    this._showScreen("town");
    const c = this.containers.town;
    this.townScene = new TownScene(this);
    this.townScene.mount(c);
  }

  returnToTown(reason = "") {
    // ★ 팝업류 강제 닫기 (퀘스트 완료 시 충돌 방지)
    ["explorationEvent", "rewardPopup", "cutinOverlay"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove ? el.remove() : el.classList.add("hidden");
    });

    if (reason === "quest") {
      this.showNarrative(
        "🏆 퀘스트 완료!\n\n목표를 달성했다.\n마을로 돌아왔다.",
        3000,
      );
    } else if (reason === "exit") {
      this.showNarrative("던전에서 탈출했다.", 2000);
    } else if (reason === "flee") {
      this.showNarrative("도망쳤다...", 2000);
    }
    this._toTown();
  }

  goToDungeon(type = "normal", savedState = null, floor = null) {
    this.dungeonType = type;
    // ★ 층수 설정
    if (floor !== null) this.dungeonFloor = floor;
    if (!savedState && floor === null) this.dungeonFloor = 1; // 새 탐험은 1층부터

    this.player.storyPhase =
      type === "abyss" || type === "city" ? type : "dungeon";
    if (!savedState) this.player.killCount = 0;

    // ★ 층수 설정 가져오기 (DUNGEON_FLOORS 미로드 시 폴백)
    const _DF = window.DUNGEON_FLOORS || {};
    const floors = _DF[type] ||
      _DF["normal"] || [
        {
          floor: 1,
          name: "던전",
          label: "",
          enemies: ["slime", "goblin"],
          boss: "guardian",
          mapW: 25,
          mapH: 18,
        },
      ];
    const floorIdx = Math.min(this.dungeonFloor - 1, floors.length - 1);
    const floorConfig = floors[Math.max(0, floorIdx)];

    const c = this.containers.dungeon;
    c.innerHTML = this._buildDungeonUI(floorConfig);
    this._showScreen("dungeon");

    const canvas = document.getElementById("dungeonCanvas");
    this.dungeonScene = new DungeonScene(this);
    this.dungeonScene.init(canvas, type, savedState, floorConfig);

    this.dungeonHud = new DungeonHud(this);
    this.dungeonHud.render();

    if (savedState) {
      this.log("⚔ 전투 승리! 탐험을 계속한다...");
    } else {
      const typeLabel =
        type === "city"
          ? "🏙 도시 탐험"
          : type === "abyss"
            ? "🌌 심연"
            : "⚔ 던전";
      this.log(
        `${typeLabel} ${floorConfig?.floor || ""}층 — ${floorConfig?.label || ""} 시작!`,
      );
      // ★ 최고 층수 기록 + 도시 탐험 기록
      if (this.player) {
        const fl = floorConfig?.floor || 1;
        if (fl > (this.player._maxFloor || 1)) this.player._maxFloor = fl;
        if (type === "city") this.player._cityEntered = true;
        this.achievementManager?.check(this);
      }
      this.log("방향키/WASD로 이동 | 적에게 접근하면 전투 시작");
    }
  }

  _buildDungeonUI(floorConfig = null) {
    const floorConfig2 = floorConfig;
    const dtype2 = this.dungeonType || "normal";
    const floorLabel = floorConfig2
      ? `${floorConfig2.name} — ${floorConfig2.label}`
      : "던전 탐험";
    const typeLabel =
      dtype2 === "city" ? "🏙" : dtype2 === "abyss" ? "🌌" : "🗡";

    // 층수 시각화 데이터
    const _DF2 = window.DUNGEON_FLOORS || {};
    const allFloors = _DF2[dtype2] || _DF2["normal"] || [];
    const curFloorNum = this.dungeonFloor || 1;
    const floorDots = allFloors
      .map((f, i) => {
        const isDone = i + 1 < curFloorNum;
        const isCurrent = i + 1 === curFloorNum;
        return `<div style="
        width:${isCurrent ? 28 : 22}px;
        height:${isCurrent ? 28 : 22}px;
        border-radius:50%;
        background:${isDone ? "#44cc44" : isCurrent ? "var(--gold)" : "#2a1a2a"};
        border:2px solid ${isDone ? "#33aa33" : isCurrent ? "#ffd700" : "#4a2e58"};
        display:flex;align-items:center;justify-content:center;
        font-size:${isCurrent ? ".72rem" : ".6rem"};
        font-weight:700;
        color:${isDone ? "#002200" : isCurrent ? "#1a0a00" : "#6a4a78"};
        box-shadow:${isCurrent ? "0 0 10px rgba(255,215,0,.6)" : "none"};
        transition:.3s;
        flex-shrink:0;
      ">${isDone ? "✓" : i + 1}</div>`;
      })
      .join(
        `<div style="width:18px;height:2px;background:#3a2a48;margin-top:12px;flex-shrink:0;"></div>`,
      );

    // 보스 카운트 표시 (수호자 카운트)
    const guardianCount = this.player?.guardianKillCount || 0;
    const guardianNeed = 5;
    const guardianDots = Array.from(
      { length: guardianNeed },
      (_, i) =>
        `<div style="
        width:10px;height:10px;border-radius:50%;
        background:${i < guardianCount ? "#ff6644" : "#2a1a2a"};
        border:1px solid ${i < guardianCount ? "#cc4422" : "#4a2e38"};
      "></div>`,
    ).join("");

    return `
<div class="dungeon-layout">
  <div class="dungeon-canvas-wrap" id="dungeonCanvasWrap">
    <canvas id="dungeonCanvas" width="720" height="480"></canvas>
  </div>
  <div class="dungeon-right-panel">
    <div class="dungeon-player-card">
      <div class="dp-name" id="dhName">용사</div>
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
    <div class="dungeon-comp-card" id="dhCompCard" style="display:none;">
      <div class="dp-name" id="dhCompName">동료</div>
      <div class="dp-stat-row">
        <span>HP</span>
        <div class="dp-bar-track"><div id="dhCompHpBar" class="dp-bar-fill comp"></div></div>
        <span id="dhCompHpVal">0/0</span>
      </div>
      <div style="font-size:.6rem;color:#ff77aa;text-align:right;">❤ <span id="dhAff">0</span></div>
    </div>
    <div class="dungeon-quest-card" id="dhQuestCard" style="display:none;">
      <div class="dp-label">📜 퀘스트</div>
      <div id="dhQuestTitle" style="font-size:.72rem;color:var(--gold2);"></div>
      <div id="dhQuestProg"  style="font-size:.65rem;color:var(--text-dim);"></div>
      <div class="quest-progress-bar" style="margin-top:4px;"><div id="dhQuestBar" class="quest-progress-fill"></div></div>
    </div>
    <div class="dungeon-minimap-wrap">
      <div class="dp-label">🗺 미니맵</div>
      <canvas id="dungeonMinimap" style="border:1px solid var(--border2);image-rendering:pixelated;"></canvas>
    </div>
    <div class="dungeon-controls">
      <div class="dp-label">조작</div>
      <div style="font-size:.62rem;color:var(--text-dim);line-height:1.8;">
        ↑↓←→ / WASD : 이동<br>
        👺 적에 접근 → 전투<br>
        📦 상자에 접근 → 획득<br>
        🚪 출구 → 마을 복귀
      </div>
    </div>
    <div class="dungeon-dpad">
      <button class="dpad-btn" id="dUp">▲</button>
      <div style="display:flex;gap:4px;">
        <button class="dpad-btn" id="dLeft">◀</button>
        <div style="width:36px;"></div>
        <button class="dpad-btn" id="dRight">▶</button>
      </div>
      <button class="dpad-btn" id="dDown">▼</button>
    </div>
    <button class="location-btn" id="dhReturnBtn" style="width:100%;margin-top:8px;">🏘 마을로</button>
    <!-- ★ 층수 시각화 패널 -->
    <div id="dhFloorPanel" style="
      background:rgba(0,0,0,0.5);
      border:1px solid #3a2448;
      border-radius:6px;
      padding:8px 10px;
      margin-bottom:6px;
    ">
      <div style="font-size:.6rem;color:var(--text-dim);margin-bottom:6px;letter-spacing:.08em;" id="dhFloorTypeLabel">🗡 진행도</div>
      <div id="dhFloorDots" style="display:flex;align-items:center;justify-content:center;gap:0;"></div>
      <div id="dhGuardianWrap" style="margin-top:8px;">
        <div style="font-size:.58rem;color:var(--text-dim);margin-bottom:4px;" id="dhGuardianLabel">수호자 처치 (0/5)</div>
        <div id="dhGuardianDots" style="display:flex;gap:4px;"></div>
      </div>
    </div>
    <div id="dhFloorLabel" style="font-size:.62rem;color:var(--text-dim);text-align:center;margin-top:2px;"></div>
  <div id="dhFlashMsg" style="font-size:.75rem;color:var(--gold2);min-height:20px;text-align:center;margin-top:4px;"></div>
  </div>
</div>`;
  }

  startBattle(monsterId, isBoss) {
    // ★ 전투 전 맵 상태 저장 → 전투 후 같은 맵으로 복귀
    this._returnAfterBattle = {
      type: this.dungeonType,
      x: this.dungeonScene?.playerX,
      y: this.dungeonScene?.playerY,
      savedState: this.dungeonScene?.saveState() || null,
    };

    const diffMult = 1 + (this.player.level - 1) * 0.15;
    const bossMult = this._bossMult || 1.0;
    this._bossMult = 1.0; // 리셋
    this.currentMonster = createMonsterInstance(monsterId, diffMult * bossMult);
    if (isBoss) {
      this.currentMonster.isBoss = true;
      if (monsterId === "demon") this.currentMonster.isFinal = true;
    }

    const c = this.containers.battle;
    this.battleScene = new BattleScene(this);
    this.battleScene.mount(c);
    this.battleScene.clearLog();

    // ★ 보스/마왕 전투 시 boss BGM으로 전환
    if (this.currentMonster.isBoss || this.currentMonster.isFinal) {
      if (window.audioMgr) audioMgr.playBgm("boss");
    }

    this._showScreen("battle");

    this.battleScene.startBattle(this.currentMonster);
    this.log(`⚔ ${this.currentMonster.name}과(와) 전투!`);
  }

  // ★ 수정: 이자 적용 한 번만, 불필요한 문자 제거
  onBattleVictory() {
    const defeatedMonster = this.currentMonster;
    this.currentMonster = null;

    // ★ 전투 승리 효과음
    if (window.audioMgr) audioMgr.playSfx("victory");
    // ★ 업적 체크
    this.achievementManager?.check(this);

    // 전투 후 은행 이자 자동 적립
    if (this.player?.bank && this.player.bank.deposit > 0) {
      const interest = Math.floor(this.player.bank.deposit * 0.05);
      if (interest > 0)
        this.player.bank.interest = (this.player.bank.interest || 0) + interest;
    }

    // ★ 마왕(demon) 처치 → 심연 해금 (최우선 체크)
    if (
      defeatedMonster?.isFinal ||
      defeatedMonster?.id === "demon" ||
      defeatedMonster?.name === "마왕 다르카스"
    ) {
      this.onFinalBossDefeated();
      return;
    }

    // ★ 수호자(guardian) 처치 카운트 — 5회 처치 시 마왕 전투 시작
    const isGuardian =
      defeatedMonster?.id === "guardian" ||
      defeatedMonster?.name === "던전 수호자" ||
      (defeatedMonster?.isBoss &&
        !defeatedMonster?.isFinal &&
        this.dungeonType === "normal");

    if (isGuardian && this.dungeonType === "normal") {
      // 카운트 증가
      this.player.guardianKillCount = (this.player.guardianKillCount || 0) + 1;
      const cnt = this.player.guardianKillCount;
      const need = 5;

      console.log(`[수호자] 처치 ${cnt}/${need}회`);

      if (cnt < need) {
        // 아직 5회 미달 — 현황 표시 후 던전 복귀
        this.showNarrative(
          `🏆 수호자 처치! (${cnt}/${need})\n\n아직 마왕의 봉인이 풀리지 않았다.\n${need - cnt}회 더 처치하면 마왕이 나타난다!`,
          3000,
        );
        // 던전으로 복귀 (맵 유지)
        const ret2 = this._returnAfterBattle;
        this._returnAfterBattle = null;
        setTimeout(() => {
          if (ret2)
            this.goToDungeon(ret2.type || "normal", ret2.savedState || null);
          else this.goToDungeon("normal");
        }, 3100);
        return;
      } else {
        // 5회 달성 → 다음 층 또는 마왕 전투
        this.player.guardianKillCount = 0;
        this._returnAfterBattle = null;
        const floors = (window.DUNGEON_FLOORS || {})["normal"] || [];
        const curFloor = this.dungeonFloor || 1;
        const nextFloor = curFloor + 1;
        const nextConfig = floors[nextFloor - 1];

        if (nextConfig && nextConfig.boss !== "demon") {
          // 다음 층이 있고 마왕이 아니면 → 다음 층 팝업
          this.showNarrative(
            `🏆 수호자 5회 처치!\n\n${curFloor}층 클리어!\n\n다음 층으로 진행하시겠습니까?`,
            500,
          );
          setTimeout(() => this._promptNextFloor("normal", curFloor), 600);
        } else {
          // 마지막 층 or 마왕 전투
          this.showNarrative(
            "💀 수호자 5회 처치!\n\n강력한 봉인이 해제됐다...\n\n👹 마왕 다르카스가 강림했다!",
            3500,
          );
          setTimeout(() => {
            this.startBattle("demon", true);
          }, 3600);
        }
        return;
      }
    }
    const ret = this._returnAfterBattle;
    this._returnAfterBattle = null;

    if (ret) {
      this.goToDungeon(
        ret.type || this.dungeonType || "normal",
        ret.savedState || null,
      );
    } else if (this.dungeonType && this.player?.storyPhase === "dungeon") {
      this.goToDungeon(this.dungeonType);
    } else {
      this._toTown();
    }
  }

  // ★ 보스 처치 후 다음 층 진행 팝업
  _promptNextFloor(dungeonType, currentFloor) {
    const floors =
      (window.DUNGEON_FLOORS || {})[dungeonType] ||
      (window.DUNGEON_FLOORS || {})["normal"] ||
      [];
    const nextFloor = currentFloor + 1;
    const nextConfig = floors[nextFloor - 1];

    const dlg = document.createElement("div");
    dlg.style.cssText = `position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.85);
      display:flex;align-items:center;justify-content:center;`;

    const hasNext = !!nextConfig;
    dlg.innerHTML = `
      <div style="background:#110d0f;border:2px solid var(--gold);border-radius:10px;
        padding:32px 40px;text-align:center;max-width:380px;font-family:'Noto Serif KR',serif;">
        <div style="font-size:2rem;margin-bottom:8px;">🏆</div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);margin-bottom:8px;">
          ${currentFloor}층 클리어!
        </div>
        ${
          hasNext
            ? `
          <div style="font-size:.82rem;color:var(--text-dim);margin-bottom:20px;line-height:1.7;">
            다음: <span style="color:var(--gold2);font-weight:700;">${nextConfig.name}</span><br>
            <span style="font-size:.72rem;">${nextConfig.label}</span>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button id="nextFloorYes" style="background:#1a1020;border:1px solid var(--gold);\n              color:var(--gold2);padding:10px 24px;cursor:pointer;font-family:inherit;\n              font-size:.88rem;border-radius:4px;font-weight:700;">⚔ 다음 층으로</button>
            <button id="nextFloorNo" style="background:transparent;border:1px solid #3a2428;\n              color:var(--text-dim);padding:10px 20px;cursor:pointer;font-family:inherit;\n              font-size:.82rem;border-radius:4px;">🏠 마을로</button>
          </div>`
            : `
          <div style="font-size:.82rem;color:var(--text-dim);margin-bottom:20px;">
            모든 층을 클리어했습니다!
          </div>
          <button id="nextFloorNo" style="background:#1a1020;border:1px solid var(--gold);\n            color:var(--gold2);padding:10px 28px;cursor:pointer;font-family:inherit;\n            font-size:.88rem;border-radius:4px;font-weight:700;">🏠 마을로 귀환</button>`
        }
      </div>`;
    document.body.appendChild(dlg);

    if (hasNext) {
      dlg.querySelector("#nextFloorYes").onclick = () => {
        dlg.remove();
        this.dungeonFloor = nextFloor;
        this.goToDungeon(dungeonType, null, nextFloor);
      };
    }
    dlg.querySelector("#nextFloorNo").onclick = () => {
      dlg.remove();
      this._toTown();
    };
  }

  onFlee() {
    if (!this.player) return;
    const p = this.player;
    const penalty = Math.floor((p.maxHp + p.bonusHp) * 0.1);
    p.hp = Math.max(1, p.hp - penalty);
    this.log(`🏃 도망쳤다! HP -${penalty}`);
    this.currentMonster = null;

    setTimeout(() => {
      if (this._returnAfterBattle) {
        const { type, savedState } = this._returnAfterBattle;
        this._returnAfterBattle = null;
        this.goToDungeon(type, savedState || null);
      } else {
        this._toTown();
      }
    }, 600);
  }

  onFinalBossDefeated() {
    this.player.abyssUnlocked = true;
    this.player.storyPhase = "victory";
    this.saveManager.save(this);
    this.currentMonster = null;

    const c = this.containers.victory;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/victory_with_colleagues.png') center/cover no-repeat;opacity:.35;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:var(--gold2);">🎉 마왕 토벌 성공!</div>
        <p class="overlay-desc">마왕 다르카스를 물리쳤다!<br>세계에 평화가 찾아왔다.<br><br>
          <strong style="color:var(--gold);">🌌 심연 던전이 해금되었습니다!</strong></p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button class="overlay-btn primary" id="victoryToTown">🏘 마을로</button>
          <button class="overlay-btn" id="victoryRestart">🔄 처음부터</button>
        </div>
      </div>`;

    document
      .getElementById("victoryToTown")
      ?.addEventListener("click", () => this._toTown());
    document
      .getElementById("victoryRestart")
      ?.addEventListener("click", () => this.restart());

    this._showScreen("victory");
    if (window.audioMgr) audioMgr.stopBgm();
  }

  onPlayerDefeated() {
    const c = this.containers.defeat;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/inability_to_fight.png') center/cover no-repeat;opacity:.35;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:#8888ff;">💀 패배...</div>
        <p class="overlay-desc">어둠 속에서 쓰러진 용사...<br>이야기는 끝나지 않았다.</p>
        <button class="overlay-btn primary" id="defeatRetry">🔄 다시 도전</button>
      </div>`;

    document.getElementById("defeatRetry")?.addEventListener("click", () => {
      this.player.hp = Math.floor(
        (this.player.maxHp + this.player.bonusHp) * 0.5,
      );
      if (this.player.party) this.player.partyHp = this.player.partyMaxHp;
      this.player.status = { poison: 0, stun: 0, burn: 0 };
      this._toTown();
    });

    this._showScreen("defeat");
    if (window.audioMgr) audioMgr.stopBgm();
  }

  restart() {
    if (this.dungeonScene) {
      this.dungeonScene.destroy();
      this.dungeonScene = null;
    }
    this.player = null;
    this.currentMonster = null;
    this.battleScene = null;
    this.townScene = null;
    this._showScreen("title");
    this._buildTitleScreen();
  }

  isGameOver() {
    if (!this.player || this.player.hp <= 0) {
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
    if (this.dungeonHud) this.dungeonHud.flashMsg(plain);
  }

  showNarrative(text, duration = 3000) {
    let box = document.getElementById("narrativeBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "narrativeBox";
      box.style.cssText =
        "display:none;position:fixed;inset:0;z-index:60;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.6);";
      const inner = document.createElement("div");
      inner.id = "narrativeText";
      inner.style.cssText =
        "background:rgba(8,4,6,.96);border:1px solid #4a2e38;color:var(--gold);padding:20px 40px;font-size:1rem;text-align:center;line-height:1.9;white-space:pre-line;max-width:480px;";
      box.appendChild(inner);
      document.body.appendChild(box);
    }
    document.getElementById("narrativeText").innerText = text;
    box.style.display = "flex";
    clearTimeout(this._narrTimer);
    this._narrTimer = setTimeout(() => {
      box.style.display = "none";
    }, duration);
  }

  restAtInn() {
    const p = this.player;
    const maxHp = p.maxHp + p.bonusHp;
    const cost = Math.max(50, Math.floor((maxHp - p.hp) * 2));
    if (p.money < cost) {
      this.showNarrative(
        `여관 비용이 부족합니다.\n(${cost}G 필요 / 보유 ${p.money}G)`,
        2500,
      );
      return;
    }
    p.money -= cost;
    p.hp = maxHp;
    if (p.party) p.partyHp = p.partyMaxHp;
    p.cooldowns = { jobSkill: 0, partyUltimate: 0, heal: 0 };
    this.save();
    this.showNarrative(
      `🏨 여관에서 쉬었다!\nHP 완전 회복 (-${cost}G)\n💾 저장 완료`,
      3000,
    );
    this.townScene?.render();
  }

  selectParty(key) {
    const mem = PARTY_MEMBERS[key];
    if (!mem || !this.player) return;
    this.player.party = key;
    this.player.partyHp = mem.hp;
    this.player.partyMaxHp = mem.hp;
    this.log(`🤝 ${mem.name} 합류!`);
    this.showNarrative(`${mem.name}이(가) 파티에 합류했다!`, 2500);
  }

  learnSkill(skillName) {
    const p = this.player;
    if (!p || p.skillPoints <= 0) {
      this.log("❌ SP 부족");
      return;
    }
    if ((p.skills[skillName] || 0) >= 10) {
      this.log("⚠ 최대 레벨");
      return;
    }
    p.skillPoints--;
    p.skills[skillName] = (p.skills[skillName] || 0) + 1;
    if (skillName === "hpBoost") {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 20);
    }
    this.log(`🌟 ${skillName} Lv.${p.skills[skillName]}`);
  }

  learnJobSkill() {
    const p = this.player;
    if (!p) return;
    if (p.skillPoints < 3) {
      this.log("❌ SP 3 필요");
      return;
    }
    const has =
      p.activeSkills.whirlwind ||
      p.activeSkills.magicBall ||
      p.activeSkills.rapidShot;
    if (has) {
      this.log("⚠ 이미 습득");
      return;
    }
    p.skillPoints -= 3;
    if (p.type === "knight") p.activeSkills.whirlwind = true;
    if (p.type === "magician") p.activeSkills.magicBall = true;
    if (p.type === "archer") p.activeSkills.rapidShot = true;
    this.log("✨ 직업 스킬 습득!");
  }

  learnPassive(skillId, skillDefs) {
    const p = this.player;
    if (!p) return;
    const def = skillDefs.find((s) => s.id === skillId);
    if (!def) return;
    if (!p.passiveSkills) p.passiveSkills = {};
    const curLv = p.passiveSkills[skillId] || 0;
    const maxLv = def.spCost.length;
    if (curLv >= maxLv) {
      this.log("⚠ 최대 레벨");
      return;
    }
    const cost = def.spCost[curLv];
    if (p.skillPoints < cost) {
      this.log(`❌ SP ${cost} 필요`);
      return;
    }
    p.skillPoints -= cost;
    p.passiveSkills[skillId] = curLv + 1;
    this.log(`✨ ${def.name} Lv.${curLv + 1} 습득!`);
  }

  showPartyStory() {
    const p = this.player;
    if (!p?.party) {
      this.showNarrative("동료가 없습니다.", 2000);
      return;
    }
    if (!p.partyStoryUnlocked) {
      this.showNarrative("호감도 75 이상 시 해금됩니다.", 2000);
      return;
    }
    const mem = PARTY_MEMBERS[p.party];
    this.showNarrative(
      `${mem.name}과의 이야기\n\n"함께 여기까지 오다니, 정말 대단해요."\n"당신과 함께라면 어디든 갈 수 있어요."\n\n❤ 호감도 ${p.affinity[p.party]}`,
      5000,
    );
    p.baseAttack += 5;
    this.log("📖 유대 이벤트! 공격력 +5");
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DungeonHud
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
    ["Up", "Down", "Left", "Right"].forEach((dir) => {
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
    // ★ 층수 시각화 패널 업데이트
    const game = this.game;
    const dtype = game.dungeonType || "normal";
    const curFloor = game.dungeonFloor || 1;
    const _DF = window.DUNGEON_FLOORS || {};
    const allFloors = _DF[dtype] || _DF["normal"] || [];
    const icon = dtype === "city" ? "🏙" : dtype === "abyss" ? "🌌" : "🗡";
    const fc = allFloors[Math.min(curFloor - 1, allFloors.length - 1)];

    // 층수 라벨
    const flLabel = document.getElementById("dhFloorLabel");
    if (flLabel)
      flLabel.textContent = fc ? `${icon} ${fc.name} — ${fc.label}` : "";

    // 타입 라벨
    const typeLabel = document.getElementById("dhFloorTypeLabel");
    if (typeLabel) typeLabel.textContent = `${icon} 진행도`;

    // 층수 도트 렌더
    const dotsEl = document.getElementById("dhFloorDots");
    if (dotsEl && allFloors.length > 0) {
      dotsEl.innerHTML = allFloors
        .map((f, i) => {
          const isDone = i + 1 < curFloor;
          const isCurrent = i + 1 === curFloor;
          const size = isCurrent ? 28 : 22;
          const bg = isDone ? "#44cc44" : isCurrent ? "var(--gold)" : "#2a1a2a";
          const bdr = isDone ? "#33aa33" : isCurrent ? "#ffd700" : "#4a2e58";
          const col = isDone ? "#002200" : isCurrent ? "#1a0a00" : "#6a4a78";
          const glow = isCurrent ? "0 0 10px rgba(255,215,0,.6)" : "none";
          const dot = `<div style="width:${size}px;height:${size}px;border-radius:50%;
          background:${bg};border:2px solid ${bdr};display:flex;align-items:center;
          justify-content:center;font-size:${isCurrent ? ".72" : ".6"}rem;font-weight:700;
          color:${col};box-shadow:${glow};transition:.3s;flex-shrink:0;">
          ${isDone ? "✓" : i + 1}</div>`;
          const line =
            i < allFloors.length - 1
              ? `<div style="width:16px;height:2px;background:${isDone ? "#44cc44" : "#3a2a48"};
              margin-top:${size / 2 - 1}px;flex-shrink:0;transition:.3s;"></div>`
              : "";
          return dot + line;
        })
        .join("");
    }

    // 수호자 도트 (일반 던전만)
    const guardianWrap = document.getElementById("dhGuardianWrap");
    if (guardianWrap)
      guardianWrap.style.display = dtype === "normal" ? "block" : "none";
    if (dtype === "normal") {
      const cnt = game.player?.guardianKillCount || 0;
      const gLabel = document.getElementById("dhGuardianLabel");
      if (gLabel) gLabel.textContent = `수호자 처치 (${cnt}/5)`;
      const gDots = document.getElementById("dhGuardianDots");
      if (gDots) {
        gDots.innerHTML = Array.from(
          { length: 5 },
          (_, i) =>
            `<div style="width:12px;height:12px;border-radius:50%;
            background:${i < cnt ? "#ff6644" : "#2a1a2a"};
            border:1px solid ${i < cnt ? "#cc4422" : "#4a2e38"};
            transition:.3s;"></div>`,
        ).join("");
      }
    }
    const s = (id, v) => {
      const e = document.getElementById(id);
      if (e) e.innerText = v;
    };
    const b = (id, cur, max) => {
      const e = document.getElementById(id);
      if (!e) return;
      e.style.width = `${Math.max(0, Math.min(100, max > 0 ? (cur / max) * 100 : 0))}%`;
    };

    s("dhName", p.name);
    s(
      "dhClass",
      { night: "기사", mage: "마법사", archer: "궁수" }[p.type] || "",
    );
    s("dhGold", `${p.money}G`);
    s("dhLevel", p.level);
    b("dhHpBar", p.hp, p.maxHp + p.bonusHp);
    s("dhHpVal", `${p.hp}/${p.maxHp + p.bonusHp}`);

    const hasParty = p.party && p.partyHp > 0;
    const compCard = document.getElementById("dhCompCard");
    if (compCard) compCard.style.display = hasParty ? "block" : "none";
    if (hasParty) {
      const mem = PARTY_MEMBERS[p.party];
      s("dhCompName", mem?.name || "동료");
      s("dhAff", p.affinity?.[p.party] || 0);
      b("dhCompHpBar", p.partyHp, p.partyMaxHp);
      s("dhCompHpVal", `${p.partyHp}/${p.partyMaxHp}`);
    }

    const questCard = document.getElementById("dhQuestCard");
    if (questCard) questCard.style.display = p.quest ? "block" : "none";
    if (p.quest) {
      s("dhQuestTitle", p.quest.title);
      s("dhQuestProg", `${p.questProgress}/${p.quest.goal}마리`);
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
    this._flashTimer = setTimeout(() => {
      el.textContent = "";
    }, 2500);
  }
}

window.Game = Game;
window.DungeonHud = DungeonHud;

document.addEventListener("DOMContentLoaded", () => {
  window.rpgGame = new Game();
});
