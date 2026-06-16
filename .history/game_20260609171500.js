// ═══════════════════════════════════════════════════
//  game.js  — 메인 게임 컨트롤러
// ═══════════════════════════════════════════════════
"use strict";

class Game {
  constructor() {
    this.player         = null;
    this.currentMonster = null;

    this.saveManager   = new SaveManager();
    this.itemManager   = new ItemManager();
    this.questManager  = new QuestManager();
    this.battleManager = new BattleManager();

    this.townScene    = null;
    this.dungeonScene = null;
    this.battleScene  = null;

    this.currentScene = "title";
    this.dungeonType  = "normal";
    this._returnAfterBattle = null;

    this.containers = {
      title:   document.getElementById("titleScreen"),
      town:    document.getElementById("townScreen"),
      dungeon: document.getElementById("dungeonScreen"),
      battle:  document.getElementById("battleScreen"),
      victory: document.getElementById("victoryScreen"),
      defeat:  document.getElementById("defeatScreen"),
    };

    this._buildTitleScreen();
    this._showScreen("title");

    window.rpgGame = this;
  }

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
            <button class="class-card" data-start="mage"><div class="class-icon">🔮</div><div class="class-name">마법사</div><div class="class-desc">강력한 마법 공격</div></button>
            <button class="class-card" data-start="archer"><div class="class-icon">🏹</div><div class="class-name">궁수</div><div class="class-desc">원거리·회피의 달인</div></button>
          </div>
        </div>
        <button class="btn-load" id="mainLoadBtn">💾 저장 데이터 불러오기</button>
      </div>`;

    c.querySelectorAll("[data-start]").forEach(btn =>
      btn.addEventListener("click", () => this.start(btn.dataset.start))
    );
    document.getElementById("mainLoadBtn")?.addEventListener("click", () => this.loadGame());
  }

  _showScreen(name) {
    Object.entries(this.containers).forEach(([k, el]) => {
      if (el) el.style.display = (k === name) ? "flex" : "none";
    });
    this.currentScene = name;

    if (window.audioMgr) {
      const bgmMap = { town:"town", dungeon:"dungeon", battle:"dungeon", title:"", victory:"", defeat:"" };
      const bgm = bgmMap[name];
      if (bgm) audioMgr.playBgm(bgm);
      else audioMgr.stopBgm();
    }
  }

  start(type) {
    this.player         = new Player(type);
    this.currentMonster = null;
    this._toTown();
    this.showNarrative(`${this.player.name}이(가) 마을에 도착했다.\n마왕의 위협으로 마을 사람들은 두려움에 떨고 있다...`, 4000);
  }

  loadGame(slotIndex = 0) {
    const data = this.saveManager.load(slotIndex);
    if (!data) { alert("저장 데이터가 없습니다."); return; }
    this.player = this.saveManager.hydrate(data.player);
    if (!this.player) { alert("저장 데이터 손상"); return; }
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
    this.currentMonster    = null;

    // guardianKillCount 초기화 보장
    if (this.player.guardianKillCount === undefined) {
      this.player.guardianKillCount = 0;
    }

    // 은행 데이터 초기화 보장
    if (!this.player.bank) {
      this.player.bank = {
        deposit: 0, interest: 0,
        totalInvested: 0, milestones: [],
      };
    }

    if (this.dungeonScene) { this.dungeonScene.destroy(); this.dungeonScene = null; }
    this.battleScene = null;

    this._showScreen("town");
    const c = this.containers.town;
    this.townScene = new TownScene(this);
    this.townScene.mount(c);
  }

  returnToTown(reason = "") {
    // ★ 팝업류 강제 닫기 (퀘스트 완료 시 충돌 방지)
    ["explorationEvent","rewardPopup","cutinOverlay"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove ? el.remove() : el.classList.add("hidden");
    });

    if (reason === "quest") {
      this.showNarrative("🏆 퀘스트 완료!\n\n목표를 달성했다.\n마을로 돌아왔다.", 3000);
    } else if (reason === "exit") {
      this.showNarrative("던전에서 탈출했다.", 2000);
    } else if (reason === "flee") {
      this.showNarrative("도망쳤다...", 2000);
    }
    this._toTown();
  }

  goToDungeon(type = "normal", savedState = null) {
    this.dungeonType       = type;
    this.player.storyPhase = type === "abyss" ? "abyss" : "dungeon";
    // ★ 새 탐험 시작일 때만 killCount 리셋
    if (!savedState) this.player.killCount = 0;

    const c = this.containers.dungeon;
    c.innerHTML = this._buildDungeonUI();
    this._showScreen("dungeon");

    const canvas = document.getElementById("dungeonCanvas");
    this.dungeonScene = new DungeonScene(this);
    this.dungeonScene.init(canvas, type, savedState);

    this.dungeonHud = new DungeonHud(this);
    this.dungeonHud.render();

    if (savedState) {
      this.log("⚔ 전투 승리! 탐험을 계속한다...");
    } else {
      this.log("⚔ 던전 탐험 시작! 방향키/WASD로 이동");
      this.log("적에게 접근하면 전투가 시작됩니다");
    }
  }

  _buildDungeonUI() {
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
    this.currentMonster = createMonsterInstance(monsterId, diffMult);
    if (isBoss) {
      this.currentMonster.isBoss = true;
      if (monsterId === "demon") this.currentMonster.isFinal = true;
    }

    const c = this.containers.battle;
    this.battleScene = new BattleScene(this);
    this.battleScene.mount(c);
    this.battleScene.clearLog();
    this._showScreen("battle");

    this.battleScene.startBattle(this.currentMonster);
    this.log(`⚔ ${this.currentMonster.name}과(와) 전투!`);
  }

  // ★ 수정: 이자 적용 한 번만, 불필요한 문자 제거
  onBattleVictory() {
    const defeatedMonster = this.currentMonster;
    this.currentMonster = null;

    // 전투 후 은행 이자 자동 적립
    if (this.player?.bank && this.player.bank.deposit > 0) {
      const interest = Math.floor(this.player.bank.deposit * 0.05);
      if (interest > 0) this.player.bank.interest = (this.player.bank.interest || 0) + interest;
    }

    // ★ 마왕(demon) 처치 → 심연 해금 (최우선 체크)
    if (defeatedMonster?.isFinal ||
        defeatedMonster?.id === "demon" ||
        defeatedMonster?.name === "마왕 다르카스") {
      this.onFinalBossDefeated();
      return;
    }

    // ★ 수호자(guardian) 처치 카운트 — 5회 처치 시 마왕 전투 시작
    const isGuardian = defeatedMonster?.id === "guardian" ||
                       defeatedMonster?.name === "던전 수호자" ||
                       (defeatedMonster?.isBoss && !defeatedMonster?.isFinal &&
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
          3000
        );
        // 던전으로 복귀 (맵 유지)
        const ret2 = this._returnAfterBattle;
        this._returnAfterBattle = null;
        setTimeout(() => {
          if (ret2) this.goToDungeon(ret2.type || "normal", ret2.savedState || null);
          else this.goToDungeon("normal");
        }, 3100);
        return;
      } else {
        // 5회 달성 → 마왕 전투!
        this.player.guardianKillCount = 0; // 카운트 리셋
        this._returnAfterBattle = null;
        console.log("[수호자 5회] 마왕 전투 시작!");
        this.showNarrative(
          "💀 수호자 5회 처치!\n\n강력한 봉인이 해제됐다...\n\n👹 마왕 다르카스가 강림했다!",
          3500
        );
        setTimeout(() => {
          this.startBattle("demon", true);
        }, 3600);
        return;
      }
    }
    const ret = this._returnAfterBattle;
    this._returnAfterBattle = null;

    if (ret) {
      // ★ savedState 전달 → 기존 맵 이어서 탐험
      this.goToDungeon(ret.type || this.dungeonType || "normal", ret.savedState || null);
    } else if (this.dungeonType && this.player?.storyPhase === "dungeon") {
      this.goToDungeon(this.dungeonType);
    } else {
      this._toTown();
    }
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

    document.getElementById("victoryToTown") ?.addEventListener("click", () => this._toTown());
    document.getElementById("victoryRestart")?.addEventListener("click", () => this.restart());

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
      this.player.hp = Math.floor((this.player.maxHp + this.player.bonusHp) * 0.5);
      if (this.player.party) this.player.partyHp = this.player.partyMaxHp;
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
    if (p.party) p.partyHp = p.partyMaxHp;
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
    if (p.type === "mage")  p.activeSkills.magicBall  = true;
    if (p.type === "archer") p.activeSkills.rapidShot = true;
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
    s("dhGold",  `${p.money}G`);
    s("dhLevel", p.level);
    b("dhHpBar", p.hp, p.maxHp + p.bonusHp);
    s("dhHpVal", `${p.hp}/${p.maxHp + p.bonusHp}`);

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

    const questCard = document.getElementById("dhQuestCard");
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

document.addEventListener("DOMContentLoaded", () => {
  window.rpgGame = new Game();
});
