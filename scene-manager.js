// ─────────────────────────────────────────────
//  scene-manager.js  —  씬 진행 컨트롤러
//
//  [BUG FIX 04] ES Module import 제거 → 전역 스크립트 방식으로 통일
//  SCENE_MAP은 scenes.js가 window.SCENE_MAP으로 노출한 전역 변수 사용
//  index.html 로딩 순서: scenes.js → scene-manager.js → game.js
// ─────────────────────────────────────────────
"use strict";

class SceneManager {
  constructor(game) {
    this.game       = game;
    this.currentScene = null;
    this.lineIndex    = 0;
    this._typing      = false;
    this._fullText    = "";
    this._typingTimer = null;

    // DOM 요소 캐시
    this.el = {
      screen:      document.getElementById("sceneScreen"),
      bg:          document.getElementById("sceneBg"),
      speaker:     document.getElementById("sceneSpeaker"),
      textBox:     document.getElementById("sceneTextBox"),
      text:        document.getElementById("sceneText"),
      continueHint:document.getElementById("sceneContinue"),
      choices:     document.getElementById("sceneChoices"),
      skipBtn:     document.getElementById("sceneSkipBtn"),
      progressBar: document.getElementById("sceneProgress"),
    };

    // 클릭으로 다음 대사 / 스킵 타이핑
    this.el.textBox?.addEventListener("click", () => this._onTextClick());
    this.el.screen?.addEventListener("click",  () => this._onTextClick());
    this.el.skipBtn?.addEventListener("click",  e => { e.stopPropagation(); this._skipScene(); });
  }

  // ── 씬 시작 ─────────────────────────────
  play(sceneId) {
    const scene = SCENE_MAP[sceneId];
    if (!scene) { console.warn("씬 없음:", sceneId); return; }

    this.currentScene = scene;
    this.lineIndex    = 0;

    // 배경 이미지
    if (this.el.bg && scene.bg) {
      this.el.bg.style.backgroundImage = `url('${scene.bg}')`;
    }

    // [ARCH 03] 씬 화면 표시 — game.js(_showScreen) / rpg-game.js(ui.showScreen) 양쪽 지원
    this._showSceneScreen();

    if (scene.type === "story") {
      this._showStoryLine();
    } else if (scene.type === "interact") {
      this._showInteract();
    } else if (scene.type === "battle") {
      this._startBattle();
    } else if (scene.type === "victory") {
      this._showVictory();
    }
  }

  // [ARCH 03] game.js / rpg-game.js 양쪽 API 호환 헬퍼
  _showSceneScreen() {
    if (typeof this.game._showScreen === "function") {
      this.game._showScreen("scene");       // game.js 방식
    } else {
      this.game.ui?.showScreen?.("scene");  // rpg-game.js 방식
    }
  }

  // ── story 씬 ────────────────────────────
  _showStoryLine() {
    const scene = this.currentScene;
    if (!scene.lines) return;

    const line = scene.lines[this.lineIndex];
    if (line === undefined) {
      // 모든 대사 끝 → 다음 씬으로
      this._advance();
      return;
    }

    if (this.el.speaker) {
      this.el.speaker.innerText = scene.speaker || "";
      this.el.speaker.style.display = scene.speaker ? "block" : "none";
    }
    if (this.el.choices) this.el.choices.style.display = "none";
    if (this.el.continueHint) this.el.continueHint.style.display = "none";

    this._typeText(line, () => {
      if (this.el.continueHint) this.el.continueHint.style.display = "block";
    });

    // 진행도
    this._updateProgress(this.lineIndex, scene.lines.length);
  }

  _onTextClick() {
    if (!this.currentScene) return;
    if (this._typing) {
      // 타이핑 중이면 전체 텍스트 즉시 표시
      clearTimeout(this._typingTimer);
      this._typing = false;
      if (this.el.text) this.el.text.innerText = this._fullText;
      if (this.el.continueHint) this.el.continueHint.style.display = "block";
      return;
    }
    if (this.currentScene.type === "story") {
      this.lineIndex++;
      this._showStoryLine();
    }
  }

  // ── 타이핑 이펙트 ─────────────────────
  _typeText(text, onDone) {
    this._fullText = text;
    this._typing   = true;
    let i = 0;
    if (this.el.text) this.el.text.innerText = "";

    const tick = () => {
      if (!this._typing) return;
      if (this.el.text) this.el.text.innerText = text.slice(0, i + 1);
      i++;
      if (i < text.length) {
        this._typingTimer = setTimeout(tick, 28);
      } else {
        this._typing = false;
        onDone?.();
      }
    };
    tick();
  }

  // ── interact 씬 ─────────────────────────
  _showInteract() {
    const scene = this.currentScene;
    if (this.el.speaker) {
      this.el.speaker.innerText = scene.speaker || "";
      this.el.speaker.style.display = "block";
    }
    if (this.el.text) this.el.text.innerText = scene.prompt || "무엇을 하시겠습니까?";
    if (this.el.continueHint) this.el.continueHint.style.display = "none";

    // 선택지 버튼 생성
    if (this.el.choices) {
      this.el.choices.style.display = "flex";
      this.el.choices.innerHTML = "";
      (scene.choices || []).forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "scene-choice-btn";
        btn.innerText = choice.label;
        btn.addEventListener("click", () => this._handleChoice(choice));
        this.el.choices.appendChild(btn);
      });
    }
  }

  _handleChoice(choice) {
    if (choice.action === "goto" && choice.next) {
      this.play(choice.next);
    } else if (choice.action === "town") {
      this.game.ui.showScreen("town");
      this.currentScene = null;
    } else if (choice.action === "dungeon") {
      this.game.goToDungeon();
      this.currentScene = null;
    } else if (choice.action === "shop") {
      this.game.ui.showScreen("town");
      this.currentScene = null;
    } else if (choice.next) {
      this.play(choice.next);
    }
  }

  // ── battle 씬 ───────────────────────────
  // [ARCH 03] game.js(startBattle) / rpg-game.js(fightBoss) 양쪽 지원
  _startBattle() {
    const scene = this.currentScene;
    this.currentScene = null;
    if (scene.isFinalBoss) {
      if (typeof this.game.startBattle === "function") {
        this.game.startBattle("demon", true);  // game.js
      } else {
        this.game.fightBoss?.();               // rpg-game.js
      }
    } else {
      if (typeof this.game.startBattle === "function") {
        this.game.startBattle("guardian", true); // game.js
      } else {
        this.game.startDungeonBattle?.();        // rpg-game.js
      }
    }
  }

  // ── 다음 씬으로 ─────────────────────────
  // [ARCH 03] game.js(_toTown) / rpg-game.js(ui.showScreen) 양쪽 지원
  _advance() {
    const scene = this.currentScene;
    if (!scene) return;

    const goTown = () => {
      if (typeof this.game._toTown === "function") {
        this.game._toTown();                   // game.js
      } else {
        this.game.ui?.showScreen?.("town");    // rpg-game.js
        this.game.ui?.render?.(this.game);
      }
    };

    if (scene.next === "town_main") {
      goTown();
      this.currentScene = null;
    } else if (scene.next === "dungeon_main") {
      if (typeof this.game.goToDungeon === "function") this.game.goToDungeon();
      else this.game.ui?.showScreen?.("dungeon");
      this.currentScene = null;
    } else if (scene.next) {
      this.play(scene.next);
    } else {
      goTown();
      this.currentScene = null;
    }
  }

  _skipScene() {
    // 현재 씬 스킵 → 마을로
    if (typeof this.game._toTown === "function") {
      this.game._toTown();
    } else {
      this.game.ui?.showScreen?.("town");
    }
    this.currentScene = null;
  }
  _showVictory() {
    const scene = this.currentScene;
    if (this.el.speaker) {
      this.el.speaker.style.display = "none";
    }

    const isDefeat = scene.isDefeat;

    if (this.el.text) {
      this.el.text.innerHTML = `
        <div class="scene-victory-title" style="color:${isDefeat ? "#8888ff" : "var(--gold2)"}">
          ${scene.title || ""}
        </div>
        ${(scene.lines || []).map(l => `<div class="scene-victory-line">${l}</div>`).join("")}
      `;
    }

    if (this.el.continueHint) this.el.continueHint.style.display = "none";

    // 선택지 — 다시 시작
    if (this.el.choices) {
      this.el.choices.style.display = "flex";
      this.el.choices.innerHTML = "";
      const btn = document.createElement("button");
      btn.className = "scene-choice-btn primary-choice";
      btn.innerText = "🔄 처음부터 다시";
      btn.addEventListener("click", () => this.game.restart());
      this.el.choices.appendChild(btn);
    }
  }

  // ── 다음 씬으로 ─────────────────────────
  _advance() {
    const scene = this.currentScene;
    if (!scene) return;

    if (scene.next === "town_main") {
      this.game.ui.showScreen("town");
      this.game.ui.render(this.game);
      this.currentScene = null;
    } else if (scene.next === "dungeon_main") {
      this.game.goToDungeon();
      this.currentScene = null;
    } else if (scene.next) {
      this.play(scene.next);
    } else {
      // 다음 씬 없으면 마을로
      this.game.ui.showScreen("town");
      this.currentScene = null;
    }
  }

  _skipScene() {
    // 현재 씬 스킵 → 마을로
    this.game.ui.showScreen("town");
    this.currentScene = null;
  }

  _updateProgress(current, total) {
    if (!this.el.progressBar) return;
    const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
    this.el.progressBar.style.width = `${pct}%`;
  }
}

// 전역 노출
window.SceneManager = SceneManager;
