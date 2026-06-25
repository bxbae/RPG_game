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
    this.regionManager    = typeof RegionManager !== "undefined"
      ? new RegionManager() : null;
    this.attendanceManager = typeof AttendanceManager !== "undefined"
      ? new AttendanceManager() : null;
    this.achievementManager = typeof AchievementManager !== "undefined"
      ? new AchievementManager() : null;

    // 동료 선택 세션 플래그 (마을 복귀 시 초기화)
    this._party2Selected  = false; // 일반 던전 2번째 동료
    this._party3Selected  = false; // 심연 던전 3번째 동료
    this._activeRegion    = null;  // 현재 재건하러 들어간 지역 id (월드맵 이동 4단계)
    this._tutorialShown   = false; // 성 밖 사냥터 튜토리얼 안내
    this._attendanceChecked = false; // 출석 체크 (세션당 1회)

    // 컨티뉴 시스템 — 광고 시청 후 부활 (최대 3회/런)
    this._continueMax    = 3;
    this._continueUsed   = 0;
    this._continueActive = false; // 컨티뉴 화면 활성 중 중복 호출 방지
    this._gameOverTimer  = null;  // isGameOver() 중복 예약 방지

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
      worldmap: document.getElementById("worldMapScreen"),
      regionhub: document.getElementById("regionHubScreen"),
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
            <button class="class-card" data-start="knight"> <div class="class-icon">⚔</div> <div class="class-name">기사</div>  <div class="class-desc">강인한 체력과 방어력</div></button>
            <button class="class-card" data-start="mage">   <div class="class-icon">🔮</div><div class="class-name">마법사</div><div class="class-desc">강력한 마법 공격</div></button>
            <button class="class-card" data-start="archer">  <div class="class-icon">🏹</div><div class="class-name">궁수</div>  <div class="class-desc">원거리·회피의 달인</div></button>
            <button class="class-card" data-start="tanker">  <div class="class-icon">🛡</div> <div class="class-name">탱커</div>  <div class="class-desc">철벽 방어·도발의 수호자</div></button>
            <button class="class-card" data-start="healer">  <div class="class-icon">✝</div>  <div class="class-name">힐러</div>  <div class="class-desc">아군 회복·신성 마법</div></button>
          </div>
        </div>
        <button class="btn-load" id="mainLoadBtn">💾 저장 데이터 불러오기</button>
      </div>

      <!-- 타이틀 화면 불러오기 — 슬롯/파티 선택 모달 -->
      <div id="titleLoadModal" style="display:none;position:fixed;inset:0;z-index:600;
        background:rgba(0,0,0,0.95);flex-direction:column;overflow-y:auto;padding:20px;
        font-family:inherit;">
        <style>
          #titleLoadModal .bank-btn{background:rgba(20,10,30,.85);border:1px solid #4a2e38;color:var(--text);padding:9px 18px;cursor:pointer;font-family:inherit;font-size:.78rem;border-radius:4px;font-weight:700;}
          #titleLoadModal .bank-btn:hover{filter:brightness(1.3);}
        </style>
        <div style="max-width:600px;margin:0 auto;width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <span style="font-size:1.1rem;font-weight:700;color:var(--gold2);">📂 불러올 캐릭터 선택</span>
            <button id="titleLoadClose" class="bank-btn">✕ 닫기</button>
          </div>
          <div id="titleLoadSlotContainer" style="display:flex;flex-direction:column;gap:12px;"></div>
        </div>
      </div>`;

    c.querySelectorAll("[data-start]").forEach(btn =>
      btn.addEventListener("click", () => this.start(btn.dataset.start))
    );
    document.getElementById("mainLoadBtn")?.addEventListener("click", () => this._openTitleLoadModal());
    document.getElementById("titleLoadClose")?.addEventListener("click", () => {
      const m = document.getElementById("titleLoadModal");
      if (m) m.style.display = "none";
    });
  }

  // 타이틀 화면에서 "불러오기" 클릭 시 — 슬롯 0 으로 바로 불러오지 않고
  // 저장된 캐릭터(파티 구성 포함)를 보고 고를 수 있는 선택창을 띄운다
  _openTitleLoadModal() {
    const m = document.getElementById("titleLoadModal");
    if (!m) return;
    m.style.display = "flex";
    this._renderTitleLoadSlots();
  }

  _renderTitleLoadSlots() {
    const ct = document.getElementById("titleLoadSlotContainer");
    if (!ct) return;
    ct.innerHTML = "";

    const portMap = {
      knight:   "images/portrait_Knight.png",
      mage:     "images/portrait_magician.png",
      magician: "images/portrait_magician.png",
      archer:   "images/portrait_archer.png",
      tanker:   "images/portrait_tanker.png",
      healer:   "images/portrait_healer.png",
    };
    const partyPortMap = {
      healer:     "images/portrait_healer.png",
      tanker:     "images/portrait_tanker.png",
      mage_party: "images/portrait_magician.png",
      archer:     "images/portrait_archer.png",
      dealer:     "images/portrait_Knight.png",
    };
    const imgTag = (src, size=60) =>
      `<img src="${src}" style="width:${size}px;height:${size}px;object-fit:contain;border:1px solid #4a2e38;border-radius:2px;flex-shrink:0;" onerror="this.style.display='none'"/>`;

    let anySave = false;
    for (let i = 0; i < 3; i++) {
      const key = `rpgSave_slot_${i}`;
      let sp = null;
      try { const r = localStorage.getItem(key); if (r) sp = JSON.parse(r); } catch (e) {}

      const pl = sp?.player || null;
      const card = document.createElement("div");
      card.style.cssText = "background:rgba(255,255,255,.04);border:1px solid #3a2428;border-radius:6px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px;";

      if (pl) {
        anySave = true;
        const psrc = portMap[pl.type] || portMap.knight;
        const d = sp.savedAt ? new Date(sp.savedAt).toLocaleString("ko-KR", {month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"}) : "";
        const parties = [pl.party, pl.party2, pl.party3].filter(Boolean);
        const partyImgs = parties.map(p => {
          const psrc2 = partyPortMap[p] || "";
          return psrc2 ? imgTag(psrc2, 44) : "";
        }).join("");

        card.innerHTML = `
          ${imgTag(psrc, 64)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:.85rem;font-weight:700;color:var(--gold2);margin-bottom:3px;">
              ${pl.name||"플레이어"} <span style="font-size:.72rem;color:var(--text-dim);">(${pl.type||"?"})</span>
            </div>
            <div style="font-size:.7rem;color:var(--text-dim);margin-bottom:6px;">Lv.${pl.level||1} &nbsp;${d}</div>
            ${parties.length ? `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:.62rem;color:var(--text-dim);">파티:</span>
              ${partyImgs}
            </div>` : `<div style="font-size:.62rem;color:var(--text-dim);">파티 없음</div>`}
          </div>
          <button class="bank-btn" style="border-color:#88aaff;color:#88aaff;flex-shrink:0;" onclick="window.rpgGame._loadFromTitleSlot(${i})">불러오기</button>`;
      } else {
        card.innerHTML = `
          <div style="width:64px;height:64px;border:1px dashed #3a2428;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:1.6rem;border-radius:2px;">?</div>
          <div style="flex:1;color:var(--text-dim);font-size:.82rem;">슬롯 ${i+1} — 빈 슬롯</div>`;
      }
      ct.appendChild(card);
    }
    if (!anySave) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;color:var(--text-dim);font-size:.8rem;padding:20px;";
      empty.textContent = "저장된 캐릭터가 없습니다.";
      ct.appendChild(empty);
    }
  }

  _loadFromTitleSlot(idx) {
    const data = this.saveManager.load(idx);
    if (!data) { alert("저장 데이터가 없습니다."); return; }
    this.player = this.saveManager.hydrate(data.player);
    if (!this.player) { alert("저장 데이터 손상"); return; }
    this.regionManager?.ensureState(this.player);
    this.currentMonster = null;
    this._hadLoad = true;
    const m = document.getElementById("titleLoadModal");
    if (m) m.style.display = "none";
    this._toTown();
    this.log(`💾 슬롯 ${idx+1} 불러오기 완료! Lv.${this.player.level}`);
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
    this.regionManager?.ensureState(this.player);
    this.currentMonster = null;
    this._toTown();

    // 신규 게임 오프닝 시네마 — 마을 화면은 이미 뒤에 준비되어 있고,
    // 불투명한 오프닝 오버레이가 그 위를 덮은 채 재생되다가 끝나면 자연스럽게 사라진다.
    if (window.openingScene) {
      const PLAYER_CLASS_NAMES = { knight:"기사", mage:"마법사", archer:"궁수", tanker:"탱커", healer:"힐러" };
      const className = PLAYER_CLASS_NAMES[type] || "용사";
      this._openingActive = true;
      window.openingScene.play(className, () => {
        this._openingActive = false;
        this.achievementManager?.check?.(this); // 오프닝이 끝난 뒤 한 번 정식으로 확인
      });
    } else {
      this.showNarrative(`${this.player.name}이(가) 마을에 도착했다.\n마왕의 위협으로 마을 사람들은 두려움에 떨고 있다...`, 4000);
    }
  }

  loadGame() {
    const data = this.saveManager.load();
    if (!data) { alert("저장 데이터가 없습니다."); return; }
    this.player = this.saveManager.hydrate(data.player);
    if (!this.player) { alert("저장 데이터 손상"); return; }
    this.regionManager?.ensureState(this.player);
    this.currentMonster = null;
    this._hadLoad = true;
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

    // 업적 체크 — 마을로 돌아올 때마다 한 번씩 더 확인 (전투 외 조건들의 안전망)
    // 오프닝 시네마가 재생 중이면 건너뛴다 (아직 마을을 보지도 않은 상태이므로)
    if (!this._openingActive) this.achievementManager?.check?.(this);

    // 전투 후 귀환 여부 기록 (TownScene에서 NPC 대화 분기에 사용)
    this._returnedFromBattle = !!(this._hadBattle);
    this._returnedFromFlee   = !!(this._hadFlee);
    this._returnedFromLoad   = !!(this._hadLoad);
    this._hadBattle = false;
    this._hadFlee   = false;
    this._hadLoad   = false;

    // 레벨업 동료 반응 대사 예약 처리
    const pendingDlg     = this._pendingLevelUpDialogue;
    const pendingQuestDlg = this._pendingQuestCompleteDlg;
    this._pendingLevelUpDialogue   = null;
    this._pendingQuestCompleteDlg  = null;

    // [BALANCE 04] 동료 전투 불능 상태 → 마을 귀환 시 HP 30% 회복
    if (p._partyKnockedOut) {
      p.partyHp = Math.floor(p.partyMaxHp * 0.3);
      p._partyKnockedOut = false;
      this.log(`💊 ${PARTY_MEMBERS[p.party]?.name ?? "동료"}이(가) 의식을 되찾았다 (HP 30% 회복)`);
    }
    // 2번 동료도 1번 동료처럼 영구 유지 — 전투 불능이면 마을 귀환 시 HP 30% 회복
    if (p.party2 && p._party2KnockedOut) {
      p.party2Hp = Math.floor(p.party2MaxHp * 0.3);
      p._party2KnockedOut = false;
      this.log(`💊 ${PARTY_MEMBERS[p.party2]?.name ?? "2번 동료"}이(가) 의식을 되찾았다 (HP 30% 회복)`);
    }

    // 3번 동료(심연 전용 임시 동료)만 마을 귀환 시 해제
    const clearSlot = (field, hpF, maxF, koF, label) => {
      if (!p[field]) return;
      if (p[koF]) this.log(`💊 ${PARTY_MEMBERS[p[field]]?.name ?? label}이(가) 회복됐다`);
      p[field] = null; p[hpF] = 0; p[maxF] = 0; p[koF] = false;
    };
    clearSlot("party3", "party3Hp", "party3MaxHp", "_party3KnockedOut", "3번째 동료");
    this._party3Selected = false;
    // 던전을 떠나 마을로 왔으므로 활성 지역 태그 해제 (다음 던전 진입 시 재설정)
    this._activeRegion = null;

    // 던전 씬 정리
    if (this.dungeonScene) { this.dungeonScene.destroy(); this.dungeonScene = null; }
    // 전투 씬 정리
    this.battleScene?.destroy?.();
    this.battleScene = null;

    this._showScreen("town");
    const c = this.containers.town;

    // 이전 마을 화면의 대화 체인 타이머가 살아남아 새 화면에 대화가 겹쳐 뜨는 것을 방지
    if (this.townScene?.destroy) this.townScene.destroy();

    if (typeof TownScene !== "undefined") {
      this.townScene = new TownScene(this);
      this.townScene.mount(c);
    } else {
      // TownScene 미로드 시 긴급 인터페이스 — 4개 던전 버튼 최소 제공
      console.warn("[RPG] town-scene.js 미로드 — 긴급 마을 UI 사용");
      c.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
          height:100%;gap:14px;padding:40px;font-family:'Noto Serif KR',serif;">
          <div style="font-size:1.4rem;color:var(--gold2);margin-bottom:8px;">🏘 평화의 마을</div>
          <div style="color:var(--text-dim);font-size:.75rem;margin-bottom:12px;">
            ⚠ town-scene.js 파일을 index.html에 추가하세요
          </div>
          ${[
            ["outside","🌿 성 밖 사냥터","#446633"],
            ["normal", "🗡 일반 던전",   "#443322"],
            ["abyss",  "⚫ 심연 던전",   "#332244"],
          ].map(([t,label,bg]) => `
            <button onclick="window.game.goToDungeon('${t}')"
              style="background:${bg};border:1px solid var(--gold);color:var(--gold2);
              padding:12px 32px;font-size:1rem;font-family:inherit;cursor:pointer;
              border-radius:6px;width:220px;font-weight:700;">${label}</button>
          `).join("")}
        </div>`;
    }

    // [ARCH 05] 마을 귀환 시 자동저장 (수동 저장과 별도 슬롯 rpg_autosave)
    this.saveManager.autoSave(this);

    // 출석 보상 — 세션 첫 마을 진입 때 하루 1회 지급
    if (!this._attendanceChecked && this.player && this.attendanceManager) {
      this._attendanceChecked = true;
      const attendanceResult = this.attendanceManager.check();
      if (attendanceResult) {
        this.attendanceManager.applyReward(this, attendanceResult.reward);
        this.saveManager.autoSave(this); // 보상 지급 후 즉시 저장

        // 대화창(특히 인트로 체인·환영 대사 등)이 떠 있는 동안에는 출석 보상
        // 전체화면 오버레이가 그 위를 덮어 클릭을 가로채는 문제가 있었음 —
        // 대화 디스패치(600ms 지연)가 결정될 시간을 먼저 준 뒤, 인트로 체인이
        // 끝났고 대화창도 연속 4회(약 1.4초) 동안 계속 없을 때만 띄운다 —
        // 체인 단계 사이의 짧은 틈에 끼어드는 것을 방지
        setTimeout(() => {
          let clearTicks = 0;
          const waitDialogueClear = setInterval(() => {
            if (this.currentScene !== "town") { clearInterval(waitDialogueClear); return; } // 화면 전환 시 취소
            if (this._introChainActive || this._openingActive || document.getElementById("npcDialogueBox") || document.getElementById("openingOverlay")) {
              clearTicks = 0;
              return;
            }
            clearTicks++;
            if (clearTicks >= 4) {
              clearInterval(waitDialogueClear);
              this._showAttendanceModal(attendanceResult);
            }
          }, 350);
        }, 700);
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
  //  월드맵 (지역 선택 화면)
  // ─────────────────────────────────────────────────
  _openWorldMap() {
    const c = this.containers.worldmap;
    if (!c) { this.log?.("월드맵 화면을 찾을 수 없습니다"); return; }
    if (typeof WorldMapScene === "undefined") { this.log?.("world-map-scene.js 미로드"); return; }

    this.regionManager?.ensureState(this.player);
    this.worldMapScene = new WorldMapScene(this);
    this.worldMapScene.mount(c);
    this._showScreen("worldmap");
  }

  _fromWorldMapToTown() {
    this._toTown();
    return true;
  }

  // 월드맵에서 지역을 거점으로 확정했을 때 호출되는 훅 (3·4단계)
  //  - 거점을 currentRegion 으로 확정(이미 RegionManager.select 에서 처리됨)하고
  //  - 실제로 그 지역으로 "이동"한다:
  //      · 시작마을(완료된 홈 거점) → 마을 화면으로
  //      · 그 외 미완료 지역 → 해당 지역의 던전으로 진입(재건하러 감)
  //    던전 진입 시 _activeRegion 에 지역 id 를 기록해, 클리어 시 그 지역의
  //    재건도를 올릴 수 있게 한다(5단계 연동 지점).
  _onRegionSelected(id) {
    const rm = this.regionManager;
    const r  = rm?.get(this.player, id);
    if (!r) return;

    // 거점 확정 즉시 저장 (유실 방지)
    this.saveManager?.autoSave?.(this);

    // 홈 거점(시작마을)이거나 이미 재건 완료된 지역 → 마을로 이동
    if (id === "starterVillage" || r.completed) {
      this._activeRegion = id;
      this.showNarrative?.(`${r.icon || "📍"} ${r.name}\n으로 이동합니다.`, 1800);
      setTimeout(() => this._fromWorldMapToTown(), 700);
      return;
    }

    // 미완료 지역 → 그 지역의 거점 화면으로 먼저 이동 (NPC 인사·투자 시스템)
    // 거점 화면이 없는 지역(아직 미설정)은 곧바로 던전으로 진입
    this._activeRegion = id;
    const investCfg = this.regionManager.getInvestConfig(id);
    const briefKey = `_briefedFor_${id}`;

    // 처음 선택하는 지역이고 사전 설명이 설정돼 있으면, 마을에서 공주의 설명을 먼저 듣고 간다
    if (investCfg?.princessBriefId && !this.player[briefKey]) {
      this.player[briefKey] = true;
      this._pendingRegionBrief = { briefId: investCfg.princessBriefId, regionId: id };
      this._fromWorldMapToTown();
      return;
    }

    if (this.regionManager.hasInvestment(id) && typeof RegionHubScene !== "undefined") {
      this.showNarrative?.(`${r.icon || "📍"} ${r.name}\n으로 향합니다.`, 1600);
      setTimeout(() => this._openRegionHub(id), 700);
    } else {
      this.showNarrative?.(`${r.icon || "📍"} ${r.name}\n재건을 위해 출발합니다!`, 2000);
      setTimeout(() => {
        const dType = REGION_BY_ID?.[id]?.dungeonType || "normal";
        this.goToDungeon(dType, 1);
      }, 800);
    }
  }

  // ── 지역 거점 화면 (광산도시 등) ──────────────────────
  _openRegionHub(regionId) {
    const c = this.containers.regionhub;
    if (!c) { this.log?.("지역 거점 화면을 찾을 수 없습니다"); return; }
    if (typeof RegionHubScene === "undefined") { this.log?.("region-hub-scene.js 미로드"); return; }

    this.regionHubScene?.destroy?.();
    this.regionHubScene = new RegionHubScene(this, regionId);
    this.regionHubScene.mount(c);
    this._showScreen("regionhub");
  }

  _fromRegionHubToWorldMap() {
    this.regionHubScene?.destroy?.();
    this._openWorldMap();
  }

  // 거점 화면에서 "던전으로 출발" 클릭 시 — 그 지역의 재건 던전으로 진입
  _departFromRegionHub(regionId) {
    this.regionHubScene?.destroy?.();
    this._activeRegion = regionId;
    const dType = REGION_BY_ID?.[regionId]?.dungeonType || "normal";
    this.goToDungeon(dType, 1);
  }

  // ── 동료 개인 스토리 보상 적용 ─────────────────────────
  _applyCompanionStoryReward(partyKey) {
    const cfg = this.regionManager?.getCompanionStoryConfig(partyKey);
    if (!cfg) return;
    const r = cfg.reward;
    const p = this.player;

    if (r.type === "stat") {
      if (r.atkBonus) p.bonusAttack = (p.bonusAttack || 0) + r.atkBonus;
      if (r.hpBonus)  { p.maxHp += r.hpBonus; p.hp = Math.min(p.hp + r.hpBonus, p.maxHp + (p.bonusHp||0)); }
      this.log(`✨ ${cfg.companionName}의 사연 해결: ${r.desc}`);
    } else if (r.type === "passive" || r.type === "ultimate_upgrade") {
      // 전투 중 효과는 battle-manager.js / battle-scene.js 가 이 플래그를 직접 참조한다
      if (!p.companionPassives) p.companionPassives = {};
      p.companionPassives[partyKey] = { id: r.id, name: r.name, desc: r.desc, icon: r.icon };
      this.log(`✨ ${cfg.companionName}의 사연 해결: ${r.name} 획득`);
    }

    setTimeout(() => {
      this.showNarrative?.(`💞 ${cfg.companionName}\n\n${r.name}\n${r.desc}`, 3200);
    }, 400);
  }

  // ── 마왕군 간부 격파 — 지역 재난과 동료 사연을 하나로 묶는 마무리 대사 ──
  // 연동된 동료가 파티에 있을 때만 "비하인드"(개인적 진실)를 들려주고,
  // 없으면 지역 재난의 원인만 간단히 알려주는 일반 버전으로 진행한다.
  static GENERAL_TO_COMPANION = {
    general_gramos:   "tanker",
    general_barkan:   "dealer",
    general_lilith:   "archer",
    general_belzeron: "mage_party",
  };

  onGeneralDefeated(generalId) {
    const shownKey = `_generalRevealShown_${generalId}`;
    if (this.player[shownKey]) return; // 이미 한 번 본 폭로 대사는 다시 보여주지 않음
    this.player[shownKey] = true;

    const companionKey = Game.GENERAL_TO_COMPANION[generalId];
    const p = this.player;
    const hasCompanion = !!companionKey && (p.party === companionKey || p.party2 === companionKey);
    const dlgKey = `${generalId}_defeat_${hasCompanion ? "with_" + companionKey.replace("mage_party","mage") : "generic"}`;
    this._pendingGeneralReveal = dlgKey;
    this.saveManager?.autoSave?.(this);
  }

  // ── "봉인의 관리자" 컷신 전투 — 수도 재건 컷신의 마지막 단계 ──
  // 마을(수도) 컷신 도중 곧바로 발동하는 특수 전투. 던전 맥락이 전혀 없으므로
  // _storyOnlyBattle 플래그로 표시해, 승리 후 onBattleVictory가 던전이 아니라
  // 심연 개방 후속 대사로 이어지도록 한다.
  _startSealKeeperBattle() {
    this._storyOnlyBattle = "seal_keeper";
    this.dungeonScene = null; // 던전 맥락 없음 — 승리 후 dungeonScene 재개 분기를 타지 않게
    this.startBattle("seal_keeper", true);
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

  // ── 던전 탈출 확인 모달 ───────────────────────────────
  // "탈출하시겠습니까?"를 먼저 묻고, 예를 선택해야만 마을로 나간다.
  // onConfirm 콜백을 받아 다양한 탈출 경로(출구 타일·HUD 버튼)에서 재사용.
  _confirmExitDungeon(onConfirm) {
    // 이미 떠 있으면 중복 생성 방지
    if (document.getElementById("dungeonExitConfirm")) return;

    const overlay = document.createElement("div");
    overlay.id = "dungeonExitConfirm";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;" +
      "align-items:center;justify-content:center;z-index:10000;";
    overlay.innerHTML = `
      <div style="background:#0c0609;border:1px solid #5a1a30;border-radius:14px;
                  padding:24px 20px 20px;max-width:300px;width:90%;text-align:center;">
        <div style="font-size:30px;margin-bottom:10px;line-height:1;">🚪</div>
        <div style="font-size:16px;font-weight:bold;color:#e8c060;margin-bottom:8px;">던전 탈출</div>
        <div style="font-size:13px;color:#b09080;margin-bottom:20px;line-height:1.5;">
          정말 탈출하시겠습니까?<br>
          <span style="font-size:11px;color:#806070;">마을로 돌아갑니다.</span>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="dungeonExitNo"
            style="flex:1;background:#241018;color:#b09098;border:0.5px solid #5a3040;
                   padding:11px 0;border-radius:8px;cursor:pointer;font-size:13px;
                   font-weight:bold;font-family:inherit;">아니오</button>
          <button id="dungeonExitYes"
            style="flex:1;background:#5a1a30;color:#e8b080;border:0.5px solid #8a3050;
                   padding:11px 0;border-radius:8px;cursor:pointer;font-size:13px;
                   font-weight:bold;font-family:inherit;">예, 탈출</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); };
    document.getElementById("dungeonExitNo").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.getElementById("dungeonExitYes").addEventListener("click", () => {
      close();
      onConfirm();
    });
  }

  // ─────────────────────────────────────────────────
  //  던전 탐험
  // ─────────────────────────────────────────────────
  goToDungeon(type = "normal", startFloor = 1) {
    const p = this.player;
    // 일반/지역(광산·항구·숲·수도 등) 던전: 2번째 동료 선택 (아직 2번 동료가 없을 때만)
    const usesTwoCompanions = ["normal", "mine", "harbor", "elfForest", "capital"].includes(type);
    if (usesTwoCompanions && startFloor === 1 && !this._party2Selected && !p?.party2 && p?.party) {
      this._showPartySelectModal(2, [p.party], type, startFloor);
      return;
    }

    // 심연 진입 전 — 리온(힐러)의 개인 스토리 게이트 (복수와 용서 사이의 선택)
    // 아직 안 봤고, 호감도가 충분하고, 실제로 파티에 있다면 던전 진입을 잠시 막고 마을에서 재생
    if (type === "abyss" && startFloor === 1 && this.townScene && !this._pendingAbyssGateChecked) {
      const healerKey = [p.party, p.party2].find(k => k === "healer");
      if (healerKey && this.regionManager?.canTriggerAbyssGateStory?.(p, healerKey)) {
        this._pendingAbyssGateChecked = true; // 재진입 시 무한 반복 방지(체인 끝나면 false로 복귀)
        this._playHealerAbyssGate(type, startFloor);
        return;
      }
    }
    this._pendingAbyssGateChecked = false;

    // 심연 던전: 3번째 동료 선택 (첫 진입 시)
    if (type === "abyss" && startFloor === 1 && !this._party3Selected && p?.party) {
      this._showPartySelectModal(3, [p.party, p.party2].filter(Boolean), type, startFloor);
      return;
    }
    this._startDungeon(type, startFloor);
  }

  // 리온(힐러)의 심연 진입 전 개인 스토리(갈등 → 용서) 재생 후, 끝나면 원래 흐름(goToDungeon) 재시도
  async _playHealerAbyssGate(type, startFloor) {
    const ts = this.townScene;
    if (!ts?.showNpcDialogue) { this.goToDungeon(type, startFloor); return; }

    await new Promise(resolve => ts.showNpcDialogue("healer_story_conflict", resolve));
    await new Promise(resolve => setTimeout(resolve, 600));
    await new Promise(resolve => ts.showNpcDialogue("healer_story_resolution", resolve));

    this._applyCompanionStoryReward("healer");
    this.regionManager?.markCompanionStoryDone(this.player, "healer");
    this.saveManager?.autoSave?.(this);

    await new Promise(resolve => setTimeout(resolve, 500));
    this.goToDungeon(type, startFloor); // 스토리 종료 후 본래 진입 흐름 재시도(3번 동료 선택 등)
  }

  // 실제 던전 초기화 (goToDungeon의 이전 본문 — 모달 경유 후에도 동일 경로 사용)
  _startDungeon(type, startFloor) {
    this.dungeonType       = type;
    // 이 던전이 어느 지역 재건에 속하는지 기록 (월드맵 이동으로 진입했으면 그 지역,
    // 아니면 현재 거점). 5단계에서 클리어 시 이 지역의 재건도를 올리는 데 사용.
    if (!this._activeRegion) this._activeRegion = this.player?.currentRegion || "starterVillage";
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

    // ── 마왕 존재감 강화: 던전 진입 시 분위기 메시지 ──
    if (startFloor === 1) {
      const ATMOSPHERE_MSG = {
        normal: { text: "공기가 무겁다. 마왕의 그림자가 가까워지고 있다...", color: "#cc8866" },
        abyss:  { text: "심연 깊은 곳에서 거대한 마력이 맥동하고 있다...", color: "#dd4444" },
      };
      const msg = ATMOSPHERE_MSG[type];
      if (msg) setTimeout(() => this.dungeonHud?.flashMsg(msg.text, msg.color), 900);

      // 심연 던전 첫 진입 시 마왕의 짧은 위협 대사
      if (type === "abyss" && !this.player.abyssFirstEntryDone) {
        this.player.abyssFirstEntryDone = true;
        setTimeout(() => this._showDemonKingVoice(), 1800);
      }
    }
  }

  // ── 마왕의 목소리 (심연 던전 진입 시 1회) ──
  _showDemonKingVoice() {
    const lines = [
      "...이곳까지 왔는가, 인간.",
      "수많은 용사가 이 심연에서 사라졌다. 그대도 다르지 않을 것이다.",
      "원한다면 더 깊이 들어와 보아라... 내가 직접 끝을 내려줄 것이니.",
    ];
    this.showNarrative(`😈 ???\n\n${lines.join("\n\n")}`, 5000);
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
  //  지역 재건도 반영 (5단계)
  //  일반 던전의 최종 보스(수호자)를 처치할 때마다 호출됨 — guardianDefeated
  //  플래그(최초 1회용, 심연 해금과 연결)와는 별개로 매 클리어마다 반복 호출되어
  //  지역 재건도가 여러 번 던전을 돌며 누적 상승하도록 한다.
  // ─────────────────────────────────────────────────
  onRegionDungeonCleared() {
    const regionId = this._activeRegion || this.player?.currentRegion;
    if (!regionId || !this.regionManager) return;

    const RECONSTRUCTION_GAIN = 35; // 1회 클리어당 재건도 +35
    const result = this.regionManager.addProsperity(this.player, regionId, RECONSTRUCTION_GAIN);
    if (!result.region) return;

    this.log(`🏗 ${result.region.name} 재건도 +${RECONSTRUCTION_GAIN} (현재 ${result.region.prosperity}%)`);
    if (result.completed) {
      // 재건도 100% + 투자 최종 단계가 모두 갖춰졌으면, 통합 축제 이벤트로 대체한다
      // (이 지역에 축제 콘텐츠가 등록돼 있을 때만 — 아직 없는 지역은 기존 방식 유지)
      if (this.regionManager.canTriggerRegionFestival(this.player, regionId)) {
        this._pendingRegionFestival = regionId;
        setTimeout(() => {
          this.showNarrative?.(`🎉 ${result.region.icon || "📍"} ${result.region.name}\n완전히 되살아났습니다!`, 2400);
        }, 600);
        if (result.newlyUnlocked.length) {
          const names = result.newlyUnlocked
            .map(id => REGION_BY_ID?.[id]?.name || id)
            .join(", ");
          setTimeout(() => {
            this.showNarrative?.(`🗺 새로운 지역 발견!\n${names}이(가) 해금되었습니다.`, 2800);
          }, 3200);
        }
        this.saveManager.autoSave(this);
        return;
      }

      // 이 지역에 연결된 동료 스토리의 결말편이 가능한지 확인 (갈등편을 이미 본 경우만)
      const p = this.player;
      for (const key of [p.party, p.party2].filter(Boolean)) {
        if (this.regionManager.canTriggerCompanionResolution(p, key, regionId)) {
          this._pendingCompanionResolution = key;
          break;
        }
      }

      if (regionId === "capital") {
        // 수도 재건 완료 → 왕 구출·마왕 위치 발견·심연 개방 컷신을 다음 마을 진입 때 재생
        // (전투 보상 팝업 등 정상적인 전투 후 흐름을 가로채지 않도록 화면 전환은 강제하지 않음)
        this._pendingCapitalEnding = true;
        setTimeout(() => {
          this.showNarrative?.(`🎉 ${result.region.icon || "📍"} ${result.region.name}\n재건 완료!`, 2400);
        }, 600);
        this.saveManager.autoSave(this);
        return;
      }
      setTimeout(() => {
        this.showNarrative?.(`🎉 ${result.region.icon || "📍"} ${result.region.name}\n재건 완료!`, 2800);
      }, 600);
      if (result.newlyUnlocked.length) {
        const names = result.newlyUnlocked
          .map(id => REGION_BY_ID?.[id]?.name || id)
          .join(", ");
        setTimeout(() => {
          this.showNarrative?.(`🗺 새로운 지역 발견!\n${names}이(가) 해금되었습니다.`, 2800);
        }, 3600);
      }
    }
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
<div class="dungeon-layout" id="dungeonLayout">
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

    <!-- 인벤토리 -->
    <button class="location-btn" id="dhInvBtn" style="width:100%;margin-top:8px;">🎒 인벤토리</button>

    <!-- 마을 복귀 -->
    <button class="location-btn" id="dhReturnBtn" style="width:100%;margin-top:8px;">🏘 마을로</button>

    <!-- 메시지 -->
    <div id="dhFlashMsg" style="font-size:.75rem;color:var(--gold2);min-height:20px;text-align:center;margin-top:4px;"></div>
  </div>
</div>

<!-- 던전 내 인벤토리 모달 -->
<div id="dhInvModal" class="skill-modal" style="display:none;">
  <div class="skill-box" style="max-width:420px;">
    <h2>🎒 인벤토리</h2>
    <div id="dhInvEquipSummary" style="display:flex;flex-direction:column;gap:4px;font-size:.72rem;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border2);"></div>
    <div id="dhInvList" style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;"></div>
    <button id="dhInvClose">닫기</button>
  </div>
</div>`;
  }

  // ─────────────────────────────────────────────────
  //  전투 시작
  // ─────────────────────────────────────────────────
  startBattle(monsterId, isBoss) {
    // 새 전투 시작 — 이전 전투 승리 처리 중 걸렸던 잠금을 해제
    this._battleLocked = false;

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
    this._battleTurnCount = 0; // "수호의 맥동"(카인 사연 보상) 등 전투 초반 N턴 효과에 사용
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

    // 전투 시작 플래그 (마을 귀환 시 NPC 대화 분기용)
    this._hadBattle = true;

    // 전투 화면 구성 (던전 스프라이트 먼저 정리)
    if (this.dungeonScene) {
      // 걷기 타이머 중지 + 스프라이트 제거
      if (this.dungeonScene._walkTimer) {
        clearInterval(this.dungeonScene._walkTimer);
        this.dungeonScene._walkTimer = null;
      }
      document.getElementById("dungeonPlayerSprite")?.remove();
      document.getElementById("dungeonCompSprite")?.remove();
      document.getElementById("dungeonComp2Sprite")?.remove();
      document.getElementById("dungeonComp3Sprite")?.remove();
    }

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

    // 스토리 전용 전투(봉인의 관리자 등) 승리 — 던전 복귀 분기를 타지 않고
    // 곧바로 마을로 돌아가 다음 컷신(심연 개방)을 이어서 재생한다.
    if (this._storyOnlyBattle) {
      const which = this._storyOnlyBattle;
      this._storyOnlyBattle = null;
      if (which === "seal_keeper") {
        this._pendingSealKeeperVictory = true;
      }
      this.saveManager.autoSave?.(this);
      this._toTown();
      return;
    }

    // 전투 승리 시 예금 이자 적립
    if (this.player?.bank?.deposit > 0) {
      const interest = Math.floor(this.player.bank.deposit * 0.05);
      if (interest > 0) {
        this.player.bank.interest = (this.player.bank.interest || 0) + interest;
        this.log(`💹 예금 이자 +${interest}G 적립! (잔고: ${this.player.bank.deposit}G의 5%)`);
      }
    }

    // 일일 전투 카운트 증가
    const today = new Date().toLocaleDateString("ko-KR");
    if (this.player.guideDailyDate === today) {
      this.player.guideDailyBattle = (this.player.guideDailyBattle || 0) + 1;
    }

    // ── dungeonScene이 살아있으면 같은 맵 그대로 재개 ──
    if (ret && this.dungeonScene) {
      this._showScreen("dungeon");
      // 걷기 애니메이션 재시작 (전투 중 중지됐음)
      if (this.dungeonScene._startWalkAnim) {
        this.dungeonScene._startWalkAnim();
      }
      // 방금 격파한 게 보스였다면, 그 자리에 출구가 나타난다
      if (this.dungeonScene._bossExitPos) {
        this.dungeonScene.spawnExitAtBossPos();
        this.log("🚪 보스를 쓰러뜨리자 출구가 열렸다!");
      }
      this.dungeonScene.render?.();
      this.log("✅ 전투 승리! 탐험을 계속합니다.");
      // 자동저장
      this.saveManager.autoSave?.(this);
      return;
    }

    // dungeonScene이 없으면 해당 층 새로 시작
    // [진단용] 맵이 리셋되는 문제 추적 — 정상적으로는 위의 if 블록에서 return 됐어야 함.
    // 여기 도달했다는 건 ret이 없거나 dungeonScene이 사라졌다는 뜻이므로, 다음에 같은 현상이
    // 재발하면 이 로그를 보고 정확한 원인(ret 누락 vs dungeonScene 누락)을 알 수 있다.
    console.warn("[맵 리셋 진단] 정상 재개 경로를 타지 못해 새 맵을 생성합니다.",
      { hasRet: !!ret, hasDungeonScene: !!this.dungeonScene, ret, currentScene: this.currentScene });
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
    const penalty = Math.floor((p.maxHp + p.bonusHp) * 0.1);
    p.hp = Math.max(1, p.hp - penalty);
    this.log(`🏃 도망쳤다! HP -${penalty}`);
    this.currentMonster = null;
    this._hadFlee = true; // 도망 플래그

    setTimeout(() => {
      // 도망도 같은 맵 재개
      if (this.dungeonScene && this._returnAfterBattle) {
        this._returnAfterBattle = null;
        // 보스에게서 도망친 거라면 — 격파한 게 아니므로 보스를 그 자리에 되돌려놓는다
        // (출구는 격파해야만 열리므로, 도망쳤을 땐 출구를 띄우면 안 됨)
        const bp = this.dungeonScene._bossExitPos;
        if (bp) {
          this.dungeonScene._bossExitPos = null;
          this.dungeonScene.mapData.objects.set(`${bp.x},${bp.y}`, { type: window.TILE.BOSS });
        }
        this._showScreen("dungeon");
        this.dungeonScene._startWalkAnim?.();
        this.dungeonScene.render?.();
      } else if (this._returnAfterBattle) {
        console.warn("[맵 리셋 진단] 도망 후 정상 재개 경로를 타지 못해 새 맵을 생성합니다.",
          { hasDungeonScene: !!this.dungeonScene, returnAfterBattle: this._returnAfterBattle });
        const { type, floor } = this._returnAfterBattle;
        this._returnAfterBattle = null;
        this.goToDungeon(type, floor ?? 1);
      } else {
        this._toTown();
      }
    }, 600);
  }

  onFinalBossDefeated() {
    const defeatedId = this.currentMonster?.id;
    this.player.storyPhase = "victory";

    // ── 진짜 최종보스(네메시스) 격파 — 진엔딩 후일담 시작 ──
    if (defeatedId === "nemesis") {
      this.player.nemesisDefeated = true;
      const ds = this.dungeonScene;
      const chainNext = (key, next) => {
        if (ds?.showNpcDialogue) ds.showNpcDialogue(key, next);
        else next();
      };

      const reactionMap = {
        tanker: "ending_companion_tanker", dealer: "ending_companion_dealer",
        archer: "ending_companion_archer", mage_party: "ending_companion_mage",
        healer: "ending_companion_healer",
      };
      const careerMap = {
        tanker: "ending_career_tanker", dealer: "ending_career_dealer",
        archer: "ending_career_archer", mage_party: "ending_career_mage",
        healer: "ending_career_healer",
      };
      const inPartyKeys = [this.player.party, this.player.party2, this.player.party3].filter(Boolean);
      const inPartyReactions = inPartyKeys.map(k => reactionMap[k]).filter(Boolean);
      const inPartyCareers   = inPartyKeys.map(k => careerMap[k]).filter(Boolean);

      const playSequentially = (list, idx, onDone) => {
        if (idx >= list.length) { onDone(); return; }
        chainNext(list[idx], () => setTimeout(() => playSequentially(list, idx + 1, onDone), 350));
      };

      chainNext("nemesis_victory_epilogue", () => {
        setTimeout(() => playSequentially(inPartyReactions, 0, () => {
          setTimeout(() => playSequentially(inPartyCareers, 0, () => {
            setTimeout(() => chainNext("ending_return_resolve", () => {
              this.currentMonster = null;
              this._pendingTrueEnding = true;
              setTimeout(() => this._toTown(), 500);
            }), 500);
          }), 400);
        }), 400);
      });
      return;
    }

    // ── 다르카스 격파 — 일반엔딩(게임 클리어) 제시, 선택에 따라 더 깊은 탐험으로 ──
    this.player.darkasDefeated = true; // 일반엔딩 달성 플래그
    const ds = this.dungeonScene;

    const chainNext = (key, next) => {
      if (ds?.showNpcDialogue) ds.showNpcDialogue(key, next);
      else next();
    };

    chainNext("darkas_post_defeat", () => {
      setTimeout(() => this._showNormalEndingChoice(), 600);
    });
  }

  // ── 일반엔딩(게임 클리어) 화면 — 여기서 마무리할지, 더 깊은 곳으로 갈지 선택 ──
  _showNormalEndingChoice() {
    this.saveManager.save(this);

    const c = this.containers.victory;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/동료들과 함께 기뻐하는 모습.png') center/cover no-repeat;opacity:.35;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:var(--gold2);">🎉 마왕 토벌 성공!</div>
        <p class="overlay-desc">마왕 다르카스를 물리쳤다!<br>세계에 평화가 돌아온 것처럼 보인다...<br><br>
          <strong style="color:#ff8866;">하지만 그가 남긴 마지막 말이 마음에 걸린다.</strong></p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button class="overlay-btn primary" id="endingAccept">🏘 여기서 마무리하기</button>
          <button class="overlay-btn" id="endingExplore" style="border-color:#aa3030;color:#ff9988;">🌑 더 깊은 곳으로...</button>
        </div>
      </div>`;

    document.getElementById("endingAccept")?.addEventListener("click", () => {
      this.currentMonster = null;
      this._showScreen("victory");
      if (window.audioMgr) audioMgr.stopBgm();
      // 일반엔딩 확정 화면으로 교체 (마을로/처음부터)
      setTimeout(() => this._showNormalEndingFinal(), 50);
    });

    document.getElementById("endingExplore")?.addEventListener("click", () => {
      this._continueToNemesis();
    });

    this._showScreen("victory");
    if (window.audioMgr) audioMgr.stopBgm();
  }

  // 일반엔딩을 받아들였을 때의 최종 화면 (마을로/처음부터)
  _showNormalEndingFinal() {
    const c = this.containers.victory;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/동료들과 함께 기뻐하는 모습.png') center/cover no-repeat;opacity:.35;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:var(--gold2);">🎉 - 일반엔딩 -</div>
        <p class="overlay-desc">마왕 다르카스를 물리치고, 세계에 평화를 되찾았다.<br><br>
          <strong style="color:var(--gold);">게임 클리어!</strong></p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button class="overlay-btn primary" id="victoryToTown">🏘 마을로</button>
          <button class="overlay-btn" id="victoryRestart">🔄 처음부터</button>
        </div>
      </div>`;
    document.getElementById("victoryToTown")  ?.addEventListener("click", () => this._toTown());
    document.getElementById("victoryRestart") ?.addEventListener("click", () => this.restart());
  }

  // ── 진엔딩 최종 화면 — 왕의 진실 공개 + 왕국 완전재건 후 호출됨 ──
  _showTrueEndingScreen(isFullyRebuilt = false) {
    this.saveManager.save(this);
    this.currentMonster = null;

    const kingdomPct = this.regionManager?.kingdomProsperity?.(this.player) ?? 100;
    const rebuildLine = isFullyRebuilt
      ? "모든 지역이 완전히 재건되었다."
      : "아직 손길이 필요한 곳들이 남아있지만, 그래도 평화는 돌아왔다.";
    const protagonistLine = isFullyRebuilt
      ? `<strong style="color:var(--gold);">왕실 최고 훈장을 받고, 왕국의 재상으로 임명되었다.</strong>`
      : `<strong style="color:#ffcc88;">왕국의 영원한 영웅으로, 사람들의 마음속에 남게 되었다.</strong>`;

    const c = this.containers.victory;
    c.innerHTML = `
      <div class="overlay-bg" style="background:url('images/동료들과 함께 기뻐하는 모습.png') center/cover no-repeat;opacity:.4;position:absolute;inset:0;"></div>
      <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
        <div class="overlay-title" style="color:var(--gold2);">✨ - 진엔딩 - ✨</div>
        <p class="overlay-desc">공허의 군주 네메시스를 무찌르고, 봉인 너머의 진실까지 모두 밝혀냈다.<br>
          왕국 번영도 <strong style="color:var(--gold);">${kingdomPct}%</strong> — ${rebuildLine}<br><br>
          ${protagonistLine}</p>
      </div>`;

    this._showScreen("victory");
    if (window.audioMgr) audioMgr.stopBgm();

    // 잠시 음미할 시간을 준 뒤 자동으로 엔딩 크레딧으로 전환 (진엔딩에만)
    setTimeout(() => this._showEndingCredits(isFullyRebuilt), 4200);
  }

  // ── 엔딩 크레딧 — 진엔딩 전용. 자동 스크롤, 클릭하면 빠르게 넘어감 ──
  _showEndingCredits(isFullyRebuilt) {
    const p = this.player;
    const protagonistTitle = isFullyRebuilt ? "왕국의 재상" : "왕국의 영원한 영웅";

    const c = this.containers.victory;
    c.innerHTML = `
      <style>
        #endingCreditsRoot { position:absolute; inset:0; background:#05040a; overflow:hidden; z-index:2; }
        #endingCreditsScroll {
          position:absolute; left:0; right:0; top:100%; text-align:center;
          animation: endingCreditsScroll 38s linear forwards;
        }
        #endingCreditsRoot.fast #endingCreditsScroll { animation-duration: 6s; }
        @keyframes endingCreditsScroll { from { top:100%; } to { top:-220%; } }
        .ec-game-title { font-size:1.6rem; font-weight:800; color:var(--gold2,#e8b830); letter-spacing:.08em; margin-bottom:6px; }
        .ec-sub { font-size:.8rem; color:#cc99ff; margin-bottom:48px; letter-spacing:.16em; }
        .ec-section-title { font-size:1.05rem; color:var(--gold,#c8980e); margin:38px 0 14px; letter-spacing:.1em; }
        .ec-line { font-size:.85rem; color:#e8d8c0; line-height:2.1; }
        .ec-line b { color:#fff3d0; }
        .ec-line span { color:#8a7860; }
        .ec-final { margin-top:60px; font-size:1.3rem; color:var(--gold2,#e8b830); letter-spacing:.2em; }
        .ec-hint { position:absolute; bottom:14px; left:0; right:0; text-align:center; font-size:.66rem; color:#665544; }
      </style>
      <div id="endingCreditsRoot">
        <div id="endingCreditsScroll">
          <div class="ec-game-title">마왕 토벌 — 어둠의 용사</div>
          <div class="ec-sub">- 진 엔 딩 -</div>

          <div class="ec-section-title">주인공</div>
          <div class="ec-line"><b>${p?.name || "용사"}</b> <span>— ${protagonistTitle}</span></div>

          <div class="ec-section-title">함께한 동료들</div>
          <div class="ec-line"><b>카인</b> <span>— 광산도시 길드장</span></div>
          <div class="ec-line"><b>카르나</b> <span>— 왕국 기사단 재건</span></div>
          <div class="ec-line"><b>아리아</b> <span>— 인간-엘프 외교관</span></div>
          <div class="ec-line"><b>엘린</b> <span>— 왕립 마도원장</span></div>
          <div class="ec-line"><b>리온</b> <span>— 왕립 대치유사</span></div>

          <div class="ec-section-title">되살아난 왕국</div>
          <div class="ec-line"><span>시작마을 · 광산도시 · 항구도시 · 깊은 숲 · 수도</span></div>

          <div class="ec-section-title">마왕군 사천왕</div>
          <div class="ec-line"><span>그라모스 · 바르칸 · 릴리스 · 벨제론</span></div>

          <div class="ec-section-title">진실</div>
          <div class="ec-line"><span>마왕 다르카스는 봉인의 마지막 관리자였다.</span></div>
          <div class="ec-line"><span>공허의 군주 네메시스는 그 봉인 너머에 있었다.</span></div>
          <div class="ec-line"><span>그 모든 것을 끝낸 것은, 바로 당신이었다.</span></div>

          <div class="ec-final">- T H E &nbsp; E N D -</div>
        </div>
        <div class="ec-hint">화면을 클릭하면 빠르게 넘어갑니다</div>
      </div>`;

    const root = document.getElementById("endingCreditsRoot");
    root?.addEventListener("click", () => root.classList.add("fast"));

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallbackTimer);
      c.innerHTML = `
        <div class="overlay-bg" style="background:url('images/동료들과 함께 기뻐하는 모습.png') center/cover no-repeat;opacity:.4;position:absolute;inset:0;"></div>
        <div class="overlay-content" style="position:relative;z-index:1;text-align:center;">
          <div class="overlay-title" style="color:var(--gold2);">✨ 마왕 토벌 — 어둠의 용사 ✨</div>
          <p class="overlay-desc">플레이해주셔서 감사합니다.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
            <button class="overlay-btn primary" id="victoryToTown">🗺 왕국 지도로</button>
            <button class="overlay-btn" id="victoryRestart">🔄 처음부터</button>
          </div>
        </div>`;
      document.getElementById("victoryToTown")  ?.addEventListener("click", () => this._openWorldMap());
      document.getElementById("victoryRestart") ?.addEventListener("click", () => this.restart());
    };

    const scrollEl = document.getElementById("endingCreditsScroll");
    scrollEl?.addEventListener("animationend", finish);
    // 폴백: 어떤 이유로든 animationend가 안 잡히는 경우를 대비한 안전장치
    const fallbackTimer = setTimeout(finish, 39000);
  }

  // "더 깊은 곳으로" 선택 시 — 봉인 붕괴 → 네메시스 등장 → 다르카스 마지막 말 → 전투 계속
  _continueToNemesis() {
    this.currentMonster = null;
    this._showScreen("dungeon"); // 던전 화면으로 복귀해 컷신 이어감
    const ds = this.dungeonScene;
    const chainNext = (key, next) => {
      if (ds?.showNpcDialogue) ds.showNpcDialogue(key, next);
      else next();
    };

    setTimeout(() => chainNext("seal_collapse", () => {
      setTimeout(() => chainNext("nemesis_appearance", () => {
        setTimeout(() => chainNext("darkas_final_words", () => {
          // 다르카스의 마지막 힘 — 네메시스 전투 중 1회, 파티 대신 받아준다.
          this.player._darkasProtectionCharge = true;
          setTimeout(() => this.startBattle("nemesis", true), 300);
        }), 500);
      }), 500);
    }), 600);
  }

  onPlayerDefeated() {
    if (this._continueActive) return;          // 컨티뉴 화면 활성 중 중복 차단
    if (!this.player || this.player.hp > 0) return; // 이미 부활한 경우 무시

    const remaining = this._continueMax - this._continueUsed;
    if (remaining > 0 && this.currentMonster?.hp > 0) {
      // 기회 남아 있으면 컨티뉴 화면 표시
      this._continueActive = true;
      this._showContinueScreen(remaining);
    } else {
      this._doDefeat();
    }
  }

  // 실제 패배 화면 (컨티뉴 없을 때 또는 N 선택 시)
  _doDefeat() {
    this._continueActive = false;
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
      if (this.player.party) {
        this.player.partyHp = this.player.partyMaxHp;
        this.player._partyKnockedOut = false;
      }
      this.player.status = { poison:0, stun:0, burn:0 };
      this._toTown();
    });

    this._showScreen("defeat");
    if (window.audioMgr) audioMgr.stopBgm();
  }

  // ─────────────────────────────────────────────────
  //  컨티뉴 화면 (아케이드 스타일 카운트다운)
  // ─────────────────────────────────────────────────
  _showContinueScreen(remaining) {
    document.getElementById("continueOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "continueOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.93);display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;z-index:9999;";

    overlay.innerHTML = `
      <div style="font-size:11px;color:#504030;letter-spacing:4px;margin-bottom:6px">GAME OVER</div>
      <div style="font-size:34px;font-weight:bold;color:#e8c060;letter-spacing:8px;margin-bottom:8px;font-family:monospace">CONTINUE?</div>
      <div style="font-size:14px;color:#a09080;margin-bottom:28px">계속하시겠습니까?</div>

      <div id="cntNum"
        style="font-size:96px;font-weight:bold;color:#ffffff;min-width:120px;
               text-align:center;line-height:1;margin-bottom:20px;font-family:monospace;
               transition:color .3s">9</div>

      <div style="font-size:13px;color:#706050;margin-bottom:32px">
        남은 기회 <span style="color:#e8a060;font-weight:bold;font-size:16px">${remaining}</span>회
      </div>

      <div style="display:flex;gap:24px;margin-bottom:20px">
        <button id="cntY"
          style="background:#0a2a0a;color:#60e060;border:2px solid #4a9a4a;
                 padding:14px 40px;font-size:20px;font-family:monospace;
                 letter-spacing:6px;cursor:pointer;border-radius:6px;
                 transition:background .15s">
          Y
        </button>
        <button id="cntN"
          style="background:#2a0a0a;color:#e06060;border:2px solid #9a4a4a;
                 padding:14px 40px;font-size:20px;font-family:monospace;
                 letter-spacing:6px;cursor:pointer;border-radius:6px;
                 transition:background .15s">
          N
        </button>
      </div>

      <div style="font-size:11px;color:#504030">
        <kbd style="background:#222;border:1px solid #444;padding:1px 5px;border-radius:3px">Y</kbd>
        광고 시청 후 부활 &nbsp;·&nbsp;
        <kbd style="background:#222;border:1px solid #444;padding:1px 5px;border-radius:3px">N</kbd>
        마을로 귀환
      </div>`;

    document.body.appendChild(overlay);

    // 카운트다운 색상표 (9→0 순서)
    const COLORS = ["#ff0000","#ff1100","#ff4400","#ff8800","#ffcc00","#ffff00","#ccff00","#ffffff","#ffffff","#ffffff"];
    const numEl  = document.getElementById("cntNum");
    let count    = 9;
    let done     = false;

    const timer = setInterval(() => {
      count--;
      if (count < 0) {
        clearInterval(timer);
        if (!done) {
          done = true;
          overlay.remove();
          document.removeEventListener("keydown", keyHandler); // 리스너 누수 방지
          this._continueActive = false;
          this._doDefeat();
        }
        return;
      }
      numEl.textContent = count;
      numEl.style.color = COLORS[count] ?? "#ffffff";
    }, 1000);

    const choose = (yes) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      overlay.remove();
      document.removeEventListener("keydown", keyHandler);
      if (yes) {
        this._continueUsed++;
        this._showAdScreen(() => this._reviveAndContinue());
      } else {
        this._continueActive = false;
        this._doDefeat();
      }
    };

    document.getElementById("cntY")?.addEventListener("click",  () => choose(true));
    document.getElementById("cntN")?.addEventListener("click",  () => choose(false));

    const keyHandler = (e) => {
      if (e.key === "y" || e.key === "Y") choose(true);
      if (e.key === "n" || e.key === "N") choose(false);
    };
    document.addEventListener("keydown", keyHandler);
  }

  // ─────────────────────────────────────────────────
  //  모의 광고 화면 (5초 시청 → 건너뛰기 3초 후 활성)
  // ─────────────────────────────────────────────────
  _showAdScreen(onComplete) {
    const overlay = document.createElement("div");
    overlay.id = "adOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#000;display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;z-index:9999;";

    overlay.innerHTML = `
      <div style="font-size:10px;color:#555;letter-spacing:3px;margin-bottom:18px">AD · 광고</div>

      <div style="background:#111;border:1px solid #2a2a2a;width:300px;border-radius:10px;overflow:hidden;margin-bottom:18px">
        <div style="background:#14141e;padding:22px;text-align:center">
          <div style="font-size:52px;margin-bottom:8px">⚔</div>
          <div style="color:#e8c060;font-size:17px;font-weight:bold">마왕 토벌 RPG</div>
          <div style="color:#e8c060;font-size:11px;margin-top:2px;opacity:.6">4개 던전 · 동료 5명 · 무료 플레이</div>
        </div>
        <div style="padding:12px 16px;background:#0e0e0e">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="color:#f5a623;font-size:12px">★★★★☆</span>
            <span style="color:#555;font-size:11px">4.2 · 무료</span>
          </div>
          <div style="background:#222;border-radius:3px;height:3px;overflow:hidden">
            <div id="adBar" style="background:#e8c060;height:100%;width:0%;transition:width .08s"></div>
          </div>
        </div>
      </div>

      <div style="color:#666;font-size:13px;margin-bottom:14px">
        광고 시청 중... <span id="adSec" style="color:#aaa;font-weight:bold">5</span>초
      </div>
      <button id="adSkip"
        style="display:none;background:#1a1a1a;color:#888;border:1px solid #333;
               padding:7px 18px;font-size:12px;border-radius:4px;cursor:pointer">
        건너뛰기 ▶ (<span id="skipSec">3</span>)
      </button>`;

    document.body.appendChild(overlay);

    const barEl   = document.getElementById("adBar");
    const secEl   = document.getElementById("adSec");
    const skipBtn = document.getElementById("adSkip");
    let total = 5, skipCountdown = 3, skipShown = false, done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(adTimer);
      overlay.innerHTML = `
        <div style="color:#e8c060;font-size:20px;margin-bottom:8px">광고 시청 완료!</div>
        <div style="color:#a0a080;font-size:13px">잠시 후 부활합니다...</div>`;
      setTimeout(() => { overlay.remove(); onComplete(); }, 1000);
    };

    const adTimer = setInterval(() => {
      total--;
      skipCountdown--;
      if (barEl) barEl.style.width = ((5 - Math.max(0, total)) / 5 * 100) + "%";
      if (secEl) secEl.textContent = Math.max(0, total);
      // 건너뛰기 버튼: skipShown 플래그로 단 한 번만 처리 (parentElement null 크래시 방지)
      if (!skipShown && skipCountdown <= 0 && skipBtn) {
        skipShown = true;
        skipBtn.style.display = "block";
        skipBtn.textContent   = "건너뛰기 ▶";
      }
      if (total <= 0) { clearInterval(adTimer); finish(); }
    }, 1000);

    skipBtn?.addEventListener("click", finish);
  }

  // ─────────────────────────────────────────────────
  //  부활 처리 (HP 30% 회복 · 상태이상 초기화)
  // ─────────────────────────────────────────────────
  _reviveAndContinue() {
    const p = this.player;
    if (!p) return;

    // 플레이어 부활
    p.hp        = Math.max(1, Math.floor((p.maxHp + p.bonusHp) * 0.30));
    p.status    = { poison:0, stun:0, burn:0 };
    p.guardBuff = 0;

    // 전투 불능 동료 부활 (HP 20%)
    if (p._partyKnockedOut && p.partyMaxHp > 0) {
      p.partyHp = Math.max(1, Math.floor(p.partyMaxHp * 0.20));
      p._partyKnockedOut = false;
    }
    if (p._party2KnockedOut && p.party2MaxHp > 0) {
      p.party2Hp = Math.max(1, Math.floor(p.party2MaxHp * 0.20));
      p._party2KnockedOut = false;
    }
    if (p._party3KnockedOut && p.party3MaxHp > 0) {
      p.party3Hp = Math.max(1, Math.floor(p.party3MaxHp * 0.20));
      p._party3KnockedOut = false;
    }

    this._continueActive = false;
    clearTimeout(this._gameOverTimer); // 적체된 onPlayerDefeated 예약 취소
    this._gameOverTimer  = null;

    const left = this._continueMax - this._continueUsed;
    this.log(`\uD83D\uDCAB 부활! HP ${p.hp} 회복 · 남은 기회 ${left}회`);
    this.battleScene?.render?.();
    if (window.audioMgr) audioMgr.playBgm?.("dungeon");
  }

  restart() {
    if (this.dungeonScene) { this.dungeonScene.destroy(); this.dungeonScene = null; }
    clearTimeout(this._gameOverTimer); // 적체된 onPlayerDefeated 예약 취소
    this._gameOverTimer  = null;
    this.player         = null;
    this.currentMonster = null;
    this.battleScene    = null;
    this.townScene      = null;
    this._continueUsed  = 0;
    this._continueActive= false;
    this._showScreen("title");
    this._buildTitleScreen();
  }

  // ─────────────────────────────────────────────────
  //  공통 액션
  // ─────────────────────────────────────────────────
  isGameOver() {
    if (!this.player || this.player.hp <= 0) {
      // 단 하나의 onPlayerDefeated 예약만 허용 (버튼 연타 중복 방지)
      if (this.currentScene === "battle" && !this._gameOverTimer && !this._continueActive) {
        this._gameOverTimer = setTimeout(() => {
          this._gameOverTimer = null;
          this.onPlayerDefeated();
        }, 800);
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
    // 전투/던전 화면이 아니면(예: 마을 상점·인벤토리) 위 두 경로 모두 안 타서
    // 메시지가 콘솔에만 찍히고 화면에는 전혀 안 보이는 문제가 있었음.
    // 장착 성공/실패 메시지가 그 경우라 "동료 장착이 안 된다"처럼 보였던 것.
    // 항상 화면 어딘가에는 보이도록 전역 토스트로 보완.
    if (!this.battleScene && !this.dungeonHud) this._showGlobalToast(plain);
  }

  _showGlobalToast(text) {
    let el = document.getElementById("gameToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gameToast";
      el.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:9999;background:rgba(10,4,8,.95);border:1px solid var(--border2);border-radius:6px;padding:9px 20px;font-size:.78rem;color:var(--gold2);box-shadow:0 4px 18px rgba(0,0,0,.55);opacity:0;transition:opacity .25s ease,transform .25s ease;pointer-events:none;max-width:90vw;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(-8px)";
    }, 2200);
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

  // ─────────────────────────────────────────────────
  //  동료 호감도 공통 지급 — 전투 외 활동(카드 게임 등)에서 사용
  //  battle-manager.js의 전투 호감도 로직과는 별도로 동작하며,
  //  같은 호감도 임계치(25/30/50/75/100) 이벤트를 동일하게 처리한다.
  // ─────────────────────────────────────────────────
  grantPartyAffinity(amount) {
    const p = this.player;
    if (!p || !p.party || !amount || amount <= 0) return 0;
    if (!p.affinity) p.affinity = { archer:0, healer:0, tanker:0, dealer:0, mage_party:0 };
    if (!p.partyEvents) p.partyEvents = { affinity25:false, affinity50:false, affinity75:false, affinity100:false };

    const before = p.affinity[p.party] || 0;
    const after  = Math.min(100, before + amount);
    p.affinity[p.party] = after;
    const gained = after - before;
    if (gained <= 0) return 0;

    const memName = PARTY_MEMBERS[p.party]?.name || "동료";

    if (before < 25 && after >= 25 && !p.partyEvents.affinity25) {
      p.partyEvents.affinity25 = true;
      p.maxHp += 10;
      p.hp = Math.min(p.hp + 10, p.maxHp + p.bonusHp);
      this.log(`💬 ${memName}와(과) 처음 마음을 나눴다! 최대 HP +10`);
    }
    if (before < 30 && after >= 30 && !p.partyUltimateUnlocked) {
      p.partyUltimateUnlocked = true;
      this.log("✨ 동료 궁극기 해금!");
    }
    if (before < 50 && after >= 50 && !p.partyEvents.affinity50) {
      p.partyEvents.affinity50 = true;
      p.baseAttack += 10;
      this.log("💞 유대 강화! 공격력 +10");
    }
    if (before < 75 && after >= 75 && !p.partyEvents.affinity75) {
      p.partyEvents.affinity75 = true;
      p.partyStoryUnlocked = true;
      this.log("📖 개인 스토리 해금!");
    }
    if (before < 100 && after >= 100 && !p.partyEvents.affinity100) {
      p.partyEvents.affinity100 = true;
      p.partyBondMax    = true;
      p.partyUltimateEX = true;
      p.partyExAwakened = true;
      p.baseAttack += 30; p.maxHp += 100;
      p.hp = Math.min(p.hp + 100, p.maxHp + p.bonusHp);
      this.log("🌟 EX 궁극기 해금! 공격력+30 HP+100");
    }
    return gained;
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
    if (p.party2) {
      p.party2Hp = p.party2MaxHp;
      p._party2KnockedOut = false;
    }
    if (p.party3) {
      p.party3Hp = p.party3MaxHp;
      p._party3KnockedOut = false;
    }
    p.cooldowns = { jobSkill:0, partyUltimate:0, party2Ultimate:0, party3Ultimate:0, heal:0 };
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

    // 합류 대화 표시 (TownScene NPC 대화 시스템 사용) — 즉시 표시
    const npcId = `join_${key}`;
    if (this.townScene?.showNpcDialogue) {
      // 오프닝 스토리 체인 도중이면, 합류 대화 종료 후 장비 안내로 이어감
      const chainEquipPrompt = this.player.introPendingEquipPrompt;
      this.player.introPendingEquipPrompt = false;
      this.townScene.showNpcDialogue(npcId, chainEquipPrompt
        ? () => setTimeout(() => this.townScene._playEquipPromptChain?.(), 400)
        : undefined);
    } else {
      this.showNarrative(`${mem.name}이(가) 파티에 합류했다!`, 2500);
    }
  }

  // ── 동료 모집 화면에서 "어느 슬롯을 바꿀지" 고른 뒤 호출되는 범용 버전 ──
  // slotNum: 1/2/3. 이미 채워진 슬롯도 다른 동료로 교체할 수 있다.
  selectPartySlot(slotNum, key) {
    const mem = PARTY_MEMBERS[key];
    const p = this.player;
    if (!mem || !p) return;

    const FIELD = {
      1: { party:"party",  hp:"partyHp",  max:"partyMaxHp",  ko:"_partyKnockedOut"  },
      2: { party:"party2", hp:"party2Hp", max:"party2MaxHp", ko:"_party2KnockedOut" },
      3: { party:"party3", hp:"party3Hp", max:"party3MaxHp", ko:"_party3KnockedOut" },
    }[slotNum];
    if (!FIELD) return;

    p[FIELD.party] = key;
    p[FIELD.hp]    = mem.hp;
    p[FIELD.max]   = mem.hp;
    p[FIELD.ko]    = false;
    this.log(`🤝 ${mem.name}이(가) ${slotNum}번째 동료로 합류!`);

    const npcId = `join_${key}`;
    if (this.townScene?.showNpcDialogue) {
      this.townScene.showNpcDialogue(npcId);
    } else {
      this.showNarrative(`${mem.name}이(가) ${slotNum}번째 동료로 합류했다!`, 2500);
    }
    this.saveManager?.autoSave?.(this);
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
    if (p.type === "knight") p.activeSkills.whirlwind = true;
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

    // NPC 대화창으로 동료 대화 표시
    if (this.townScene?.showNpcDialogue) {
      this.townScene.showNpcDialogue(p.party);
    } else {
      const mem = PARTY_MEMBERS[p.party];
      this.showNarrative(
        `${mem.name}과의 이야기\n\n"함께 여기까지 오다니, 정말 대단해요."\n"당신과 함께라면 어디든 갈 수 있어요."\n\n❤ 호감도 ${p.affinity[p.party]}`,
        5000
      );
    }
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
    this._bindInventoryBtn();
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
      this.game._confirmExitDungeon(() => this.game.returnToTown("exit"));
    });
  }

  // ── 던전 내 인벤토리 모달 ─────────────────────────
  _bindInventoryBtn() {
    document.getElementById("dhInvBtn")?.addEventListener("click", () => this.openInventory());
    document.getElementById("dhInvClose")?.addEventListener("click", () => this.closeInventory());
  }

  openInventory() {
    const modal = document.getElementById("dhInvModal");
    if (!modal) return;
    modal.style.display = "flex";
    this.renderInventory();
  }

  closeInventory() {
    const modal = document.getElementById("dhInvModal");
    if (modal) modal.style.display = "none";
  }

  renderInventory() {
    const p = this.game.player;
    const summary = document.getElementById("dhInvEquipSummary");
    const list    = document.getElementById("dhInvList");
    if (!p || !summary || !list) return;

    const gColor = window.ITEM_GRADE_COLOR || {};
    const fmtEq = (item) => item
      ? wrapItemIconText(item, `<span style="color:${gColor[item.class]||"#b8a888"}">+${item.enhance||0} ${item.name}</span>`, 17)
      : `<span style="color:#504040;">없음</span>`;

    // ── 장착 중인 장비 요약 (주인공 + 동료) ──
    let summaryHTML = `
      <div style="color:var(--gold2);font-weight:700;margin-bottom:2px;">⚔ 주인공 장비</div>
      <div>무기 ${fmtEq(p.equipment?.weapon)} &nbsp; 투구 ${fmtEq(p.equipment?.helmet)} &nbsp; 갑옷 ${fmtEq(p.equipment?.armor)}</div>`;
    if (p.party) {
      const mem = (window.PARTY_MEMBERS || {})[p.party];
      summaryHTML += `
      <div style="color:var(--gold2);font-weight:700;margin-top:6px;margin-bottom:2px;">⚔ ${mem?.name || "동료"} 장비</div>
      <div>무기 ${fmtEq(p.partyEquipment?.weapon)} &nbsp; 투구 ${fmtEq(p.partyEquipment?.helmet)} &nbsp; 갑옷 ${fmtEq(p.partyEquipment?.armor)}</div>`;
    }
    summary.innerHTML = summaryHTML;

    // ── 인벤토리 목록 (장착/동료 장착만 — 판매는 마을 대장간에서) ──
    list.innerHTML = "";
    if (!p.inventory.length) {
      list.innerHTML = `<div style="font-size:.7rem;color:var(--text-dim);padding:8px 0;">인벤토리 비어있음</div>`;
      return;
    }
    p.inventory.forEach((item, idx) => {
      const color = gColor[item.class] || gColor.normal || "#b8a888";
      const stat = item.type === "weapon" ? `ATK+${item.attack}`
                 : item.type === "potion" ? `회복`
                 : item.type === "key"    ? `중요 아이템`
                 : `DEF+${item.defense}`;

      const row = document.createElement("div");
      row.className = "inv-row";
      row.style.borderColor = color + "55";
      row.innerHTML = `
        <span class="item-icon">${getItemIconSVG(item, 24)}</span>
        <span class="inv-name" style="color:${color};flex:1;font-size:.66rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          +${item.enhance||0} ${item.name}
          <span style="color:var(--text-dim);font-size:.6rem;">${stat}</span>
        </span>`;

      if (item.type === "key") {
        // 패시브 보관용 아이템 — 장착·사용 버튼 없이 그냥 보관만
      } else if (item.type === "potion") {
        const use = document.createElement("button");
        use.className = "inv-btn";
        use.textContent = "사용";
        use.title = "물약 사용 (HP 회복)";
        use.style.cssText = "border-color:#44aa44;color:#88ee88;";
        use.addEventListener("click", () => {
          this.game.itemManager.usePotion(this.game, idx);
          this.renderInventory();
        });
        row.appendChild(use);
      } else {
        const eq = document.createElement("button");
        eq.className = "inv-btn";
        eq.textContent = "장착";
        eq.title = "주인공 장착";
        eq.addEventListener("click", () => {
          this.game.itemManager.equip(this.game, idx, false);
          this.renderInventory();
        });
        row.appendChild(eq);

        if (p.party) {
          const eqComp = document.createElement("button");
          eqComp.className = "inv-btn";
          eqComp.textContent = "동료";
          eqComp.title = "1번 동료 장착";
          eqComp.style.cssText = "border-color:#4444cc;color:#8888ff;";
          eqComp.addEventListener("click", () => {
            this.game.itemManager.equip(this.game, idx, "party");
            this.renderInventory();
          });
          row.appendChild(eqComp);
        }

        if (p.party2) {
          const eqComp2 = document.createElement("button");
          eqComp2.className = "inv-btn";
          eqComp2.textContent = "동료2";
          eqComp2.title = "2번 동료 장착";
          eqComp2.style.cssText = "border-color:#9944cc;color:#cc88ff;";
          eqComp2.addEventListener("click", () => {
            this.game.itemManager.equip(this.game, idx, "party2");
            this.renderInventory();
          });
          row.appendChild(eqComp2);
        }
      }
      list.appendChild(row);
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
    s("dhClass", { knight:"기사", night:"기사", mage:"마법사", archer:"궁수" }[p.type] || "");
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

    // 퀘스트 카드 — 선언 후 사용
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

// ── 진입점 ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  window.rpgGame = new Game();
});