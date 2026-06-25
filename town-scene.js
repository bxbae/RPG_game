// ═══════════════════════════════════════════════════
//  town-scene.js  — 마을 화면
// ═══════════════════════════════════════════════════
"use strict";

// ── 마을 4단계 ───────────────────────────────────
const TOWN_STAGES = [
  { level:0, name:"폐허",   minInvest:0,    bg:"images/town_bustling.png",       color:"#8B4513", icon:"💀" },
  { level:1, name:"공사중", minInvest:500,  bg:"images/town_construction_2.png",  color:"#CD853F", icon:"🏗"  },
  { level:2, name:"번화가", minInvest:2000, bg:"images/town_construction_2.png",  color:"#4CAF50", icon:"🏘"  },
  { level:3, name:"번영",   minInvest:5000, bg:"images/festival_2.png",           color:"#FFD700", icon:"🌟" },
];
const INVEST_REWARDS = [
  { minInvest:500,  atkBonus:5,  hpBonus:0,   msg:"공격력 +5" },
  { minInvest:2000, atkBonus:10, hpBonus:50,  msg:"공격력 +10, HP +50" },
  { minInvest:5000, atkBonus:20, hpBonus:100, msg:"공격력 +20, HP +100" },
];
const INTEREST_RATE = 0.05;
function getTownStage(inv) { let s=TOWN_STAGES[0]; for(const t of TOWN_STAGES){if(inv>=t.minInvest)s=t;} return s; }
function getNextStage(inv) { return TOWN_STAGES.find(s=>s.minInvest>inv)||null; }
function applyBattleInterest(player) {
  const b=player.bank; if(!b||b.deposit<=0)return 0;
  const i=Math.floor(b.deposit*INTEREST_RATE); if(i>0)b.interest=(b.interest||0)+i; return i;
}


class TownScene {
  constructor(game) {
    this.game = game;
    this._destroyed = false;
    if (!game.player.bank)
      game.player.bank = { deposit:0, interest:0, totalInvested:0, milestones:[] };
  }

  // 새 TownScene이 만들어지기 전에 호출됨 — 이 인스턴스가 예약해둔 대화 체인 타이머가
  // 뒤늦게 발동해 새 마을 화면에 대화가 겹쳐 뜨는 것을 막기 위한 표시만 한다
  // (dungeonScene/battleScene처럼 DOM을 직접 정리할 필요는 없음 — mount()가 매번 새로 그림)
  destroy() {
    this._destroyed = true;
  }

  mount(container) {
    this._destroyed = false;
    container.innerHTML = this._buildHTML();
    this._injectLayoutCSS();
    this._bindEvents();
    this.render();
    const fromBattle  = this.game._returnedFromBattle;
    const fromFlee    = this.game._returnedFromFlee;
    const fromLoad    = this.game._returnedFromLoad;
    const levelDlg    = this.game._pendingLevelUpDialogue;
    const questDlg    = this.game._pendingQuestCompleteDlg;
    const regionBrief = this.game._pendingRegionBrief;
    const capitalEnding = this.game._pendingCapitalEnding;
    const companionResolution = this.game._pendingCompanionResolution;
    const generalReveal = this.game._pendingGeneralReveal;
    const sealKeeperVictory = this.game._pendingSealKeeperVictory;
    const trueEnding = this.game._pendingTrueEnding;
    const regionFestival = this.game._pendingRegionFestival;
    this.game._returnedFromBattle      = false;
    this.game._returnedFromFlee        = false;
    this.game._returnedFromLoad        = false;
    this.game._pendingLevelUpDialogue  = null;
    this.game._pendingQuestCompleteDlg = null;
    this.game._pendingRegionBrief      = null;
    this.game._pendingCapitalEnding    = null;
    this.game._pendingCompanionResolution = null;
    this.game._pendingGeneralReveal    = null;
    this.game._pendingSealKeeperVictory = null;
    this.game._pendingTrueEnding       = null;
    this.game._pendingRegionFestival   = null;

    setTimeout(() => {
      // 이 인스턴스가 이미 교체된 뒤라면(예: 대화 체인 대기 중 다른 세이브 불러오기 등)
      // 오래된 타이머가 뒤늦게 발동해 새 마을 화면에 대화가 겹쳐 뜨는 것을 방지
      if (this._destroyed) return;
      this._dispatchTownDialogue({ fromBattle, fromFlee, fromLoad, levelDlg, questDlg, regionBrief, capitalEnding, companionResolution, generalReveal, sealKeeperVictory, trueEnding, regionFestival });
    }, 600);

    // 진행 중인 대화 체인이 모두 끝나면 기본 대기 대사("이제 어디로 갈까?")를 표시
    this._watchIdleBubbleReady();
  }

  // ── 마을 진입 시 상황별 대사 분기 (async) ───────────────
  // 귀환 상황(전투/도망/불러오기)에 맞는 상인 대사를 띄우고, 이어서
  // 퀘스트 완료 보상 대사 / 레벨업 동료 반응 / 공주 깜짝 방문 중 하나를 연결한다.
  // 예전엔 각 단계를 setInterval 폴링으로 이었으나, 이제 await 로 순차 실행.
  async _dispatchTownDialogue({ fromBattle, fromFlee, fromLoad, levelDlg, questDlg, regionBrief, capitalEnding, companionResolution, generalReveal, sealKeeperVictory, trueEnding, regionFestival }) {
    // ── 지역 완전 재건 통합 축제 — 재건 100% + 투자 최종 단계가 모두 갖춰졌을 때 ──
    // 마왕군 간부 폭로(있다면) → 지역 분위기 전환(축제 소식) →
    // (가능하면) 동료 개인 결말편을 같은 장면 안에서 이어붙임 → 마무리.
    if (regionFestival) {
      // 같은 전투에서 간부 폭로도 함께 대기 중이면, 사라지지 않도록 먼저 재생
      if (generalReveal && NPC_DATA?.[generalReveal]) {
        await this.npcDialogueAsync(generalReveal);
        await this._delay(500);
        if (this._destroyed) return;
      }

      const rm  = this.game.regionManager;
      const cfg = rm.getFestivalConfig(regionFestival);
      if (cfg) {
        if (cfg.introNpcId) {
          await this.npcDialogueAsync(cfg.introNpcId);
          await this._delay(500);
          if (this._destroyed) return;
        }

        // 이 지역과 연결된 동료가 파티에 있고, 결말편을 볼 조건이 갖춰져 있으면 같은 장면에 이어붙인다
        const p = this.game.player;
        const companionKey = cfg.companionKey;
        const companionInParty = companionKey && (p.party === companionKey || p.party2 === companionKey);
        if (companionInParty && rm.canTriggerCompanionResolution(p, companionKey, regionFestival)) {
          const storyCfg = rm.getCompanionStoryConfig(companionKey);
          if (storyCfg) {
            await this.npcDialogueAsync(storyCfg.resolutionNpcId);
            const secondKey = `${storyCfg.resolutionNpcId}2`;
            if (NPC_DATA?.[secondKey]) {
              await this._delay(400);
              if (this._destroyed) return;
              await this.npcDialogueAsync(secondKey);
            }
            this.game._applyCompanionStoryReward?.(companionKey);
            rm.markCompanionStoryDone(p, companionKey);
            await this._delay(500);
            if (this._destroyed) return;
          }
        }

        if (cfg.interludeNpcId) {
          await this.npcDialogueAsync(cfg.interludeNpcId);
          await this._delay(450);
          if (this._destroyed) return;
        }

        if (cfg.outroNpcId) {
          await this.npcDialogueAsync(cfg.outroNpcId);
          await this._delay(400);
          if (this._destroyed) return;
        }

        if (cfg.itemReward) {
          this.game.itemManager?.add(this.game, {
            ...cfg.itemReward, enhance: 0, attack: 0, defense: 0,
          });
          this.game.log?.(`🎁 '${cfg.itemReward.name}'을(를) 손에 넣었습니다.`);
          this.game.showNarrative?.(`🎁 ${cfg.itemReward.name}\n${cfg.itemReward.desc}`, 3000);
          await this._delay(400);
          if (this._destroyed) return;
        }
      }

      rm.markRegionFestivalDone(this.game.player, regionFestival);
      this.game.saveManager?.autoSave?.(this.game);
      return;
    }

    // ── 진엔딩 — 네메시스 격파 후 마을로 돌아왔을 때: 왕의 진실 공개 → 왕국 완전재건 → 최종 화면 ──
    // 다른 무엇보다 먼저 재생되어야 하는 게임의 마지막 시퀀스라 최우선으로 처리.
    if (trueEnding) {
      await this.npcDialogueAsync("ending_king_truth1");
      await this._delay(500);
      if (this._destroyed) return;
      await this.npcDialogueAsync("ending_king_truth2");
      await this._delay(600);
      if (this._destroyed) return;
      await this.npcDialogueAsync("ending_kingdom_rebuilt");
      await this._delay(600);
      if (this._destroyed) return;

      // 주인공의 결말 — 왕국 번영도 100%(5개 도시 지역 전부 재건)일 때만 재상 등극
      const kingdomPct = this.game.regionManager?.kingdomProsperity?.(this.game.player) ?? 0;
      const isFullyRebuilt = kingdomPct >= 100;
      await this.npcDialogueAsync(isFullyRebuilt ? "ending_protagonist_chancellor" : "ending_protagonist_modest");
      if (isFullyRebuilt) this.game.player.chancellorTitle = true;
      await this._delay(500);
      if (this._destroyed) return;

      this.game._showTrueEndingScreen?.(isFullyRebuilt);
      return;
    }

    // ── "봉인의 관리자" 전투 승리 후 — 수도 스토리의 나머지 절반 ──
    // 재회 → 왕 구출(진실) → 마왕의 진실 → 동료 반응 → 주인공 결의 →
    // 작위 수여 → 심연의 열쇠 + 엔딩 떡밥 → 심연 개방.
    // 수도 재건 컷신의 마지막 단계. 다른 무엇보다 먼저 처리해 끊기지 않게 한다.
    if (sealKeeperVictory) {
      const p = this.game.player;

      await this.npcDialogueAsync("capital_ending_reunion");
      await this._delay(500);
      if (this._destroyed) return;
      await this.npcDialogueAsync("capital_ending_rescue");
      await this._delay(600);
      if (this._destroyed) return;
      await this.npcDialogueAsync("capital_ending_kingtruth");
      await this._delay(600);
      if (this._destroyed) return;

      // 동료 반응 — 파티에 있는 동료만 한 마디씩 (없으면 자연히 건너뜀)
      const reactionMap = { tanker:"capital_ending_companion_tanker", archer:"capital_ending_companion_archer", mage_party:"capital_ending_companion_mage" };
      for (const key of [p.party, p.party2].filter(Boolean)) {
        const dlgKey = reactionMap[key];
        if (dlgKey) {
          await this.npcDialogueAsync(dlgKey);
          await this._delay(350);
          if (this._destroyed) return;
        }
      }

      // 주인공의 결의 (독백)
      await this.selfDialogueAsync("capital_ending_resolve", ["...심연으로 가야 한다."]);
      await this._delay(500);
      if (this._destroyed) return;

      // 시민들이 광장에 모여듦 — 작위 수여식 직전 분위기
      await this.npcDialogueAsync("capital_ending_plaza");
      await this._delay(600);
      if (this._destroyed) return;

      // 작위 수여 — 왕국의 수호자
      await this.npcDialogueAsync("capital_ending_title");
      if (!p.guardianTitle) {
        p.guardianTitle = true;
        this.game.log("👑 '왕국의 수호자' 칭호를 받았습니다!");
      }
      await this._delay(500);
      if (this._destroyed) return;

      // 심연의 열쇠 + 엔딩 떡밥
      await this.npcDialogueAsync("capital_ending_key");
      if (!p._abyssKeyGiven) {
        p._abyssKeyGiven = true;
        this.game.itemManager?.add(this.game, {
          name: "심연의 열쇠", type: "key", class: "legend", enhance: 0,
          attack: 0, defense: 0,
          desc: "왕실의 인장이 새겨진 열쇠. 심연으로 가는 문을 연다.",
        });
        this.game.log("🗝 '심연의 열쇠'를 손에 넣었습니다.");
      }

      p.abyssUnlocked = true;
      this.game.log("⚫ 심연 던전의 문이 열렸다! 진짜 마왕을 찾아야 한다.");
      this.game.saveManager?.autoSave?.(this.game);
      await this._delay(400);
      if (this._destroyed) return;
      this.game.showNarrative?.("⚫ 심연 던전이 해금되었습니다!\n\n진짜 마왕 다르카스를 찾아 심연을 탐험하세요.", 3200);
      return;
    }

    // ── 동료 개인 스토리 결말편 — 지역 재건 완료 시점에 우선 재생 ──
    // (수도 재건과 동시에 발생할 수 있는 마법사 스토리는 컷신보다 먼저 보여줌)
    if (companionResolution) {
      const rm = this.game.regionManager;
      const cfg = rm.getCompanionStoryConfig(companionResolution);
      if (cfg) {
        await this.npcDialogueAsync(cfg.resolutionNpcId);
        const secondKey = `${cfg.resolutionNpcId}2`;
        if (NPC_DATA?.[secondKey]) {
          await this._delay(400);
          if (this._destroyed) return;
          await this.npcDialogueAsync(secondKey);
        }
        this.game._applyCompanionStoryReward?.(companionResolution);
        rm.markCompanionStoryDone(this.game.player, companionResolution);
        this.game.saveManager?.autoSave?.(this.game);
        await this._delay(400);
        if (this._destroyed) return;
      }
      // generalReveal·capitalEnding 이 함께 대기 중이면 이어서 재생 (return 하지 않고 계속 진행)
      if (!generalReveal && !capitalEnding) return;
    }

    // ── 마왕군 간부 격파 — 지역 재난·동료 사연을 하나로 묶는 폭로 대사 ──
    if (generalReveal) {
      if (NPC_DATA?.[generalReveal]) {
        await this.npcDialogueAsync(generalReveal);
        await this._delay(400);
        if (this._destroyed) return;
      }
      if (!capitalEnding) return;
    }

    // ── 수도 재건 완료 컷신 — 마왕 등장 → 충격적인 진실 → 봉인의 관리자 도발
    //    → (전투) → [전투 승리 후 절차는 위 sealKeeperVictory 블록에서 이어짐] ──
    // 다른 무엇보다 먼저 재생되어야 하는 핵심 스토리 분기라 최우선으로 처리.
    if (capitalEnding) {
      await this.npcDialogueAsync("capital_ending_appearance");
      await this._delay(500);
      if (this._destroyed) return;
      await this.npcDialogueAsync("capital_ending_truth");
      await this._delay(500);
      if (this._destroyed) return;
      await this.npcDialogueAsync("capital_ending_sealkeeper");
      await this._delay(600);
      if (this._destroyed) return;

      // 대화가 끝나면 곧바로 "봉인의 관리자"와의 컷신 전투로 진입
      this.game._startSealKeeperBattle?.();
      return;
    }

    // ── 첫 마을 입장 오프닝 스토리 체인 ──
    // fromLoad(세이브 불러오기)인 경우엔 절대 인트로를 재생하지 않는다.
    // 불러오기 했다는 건 이미 플레이한 적이 있다는 뜻이므로, 혹시 세이브에
    // introChainDone 이 빠져 있어도(구버전·인트로 도중 저장 등) 인트로가
    // 다시 나오지 않도록 막고, 동시에 플래그를 올바르게 보정해 저장해 둔다.
    if (fromLoad && !this.game.player.introChainDone) {
      this.game.player.introChainDone = true;
      this.game.player.metVillageChief = true;
      this.game.player.introDepartureDone = true;
      this.game.saveManager?.autoSave?.(this.game);
    }

    if (!this.game.player.introChainDone && !fromBattle && !fromFlee && !fromLoad) {
      this.game.player.introChainDone = true;
      // 인트로 시작 플래그를 즉시 저장 — 이렇게 안 하면 마을 진입 시점의
      // 자동저장(introChainDone=false)이 남아, 그 세이브를 불러올 때 인트로가 또 재생됨
      this.game.saveManager?.autoSave?.(this.game);
      this._playIntroChain();
      return;
    }

    // ⓪ 지역 출발 전 공주의 사전 설명 — 월드맵에서 지역을 처음 선택했을 때 우선 재생
    if (regionBrief) {
      await this.npcDialogueAsync(regionBrief.briefId);
      await this._delay(500);
      if (this._destroyed) return;
      this.game._openRegionHub?.(regionBrief.regionId);
      return;
    }

    // ① 상인 귀환 대사
    let greeting = "merchant";
    if (fromFlee)        greeting = "merchant_after_flee";
    else if (fromBattle) greeting = "merchant_after_battle";
    else if (fromLoad)   greeting = "merchant_welcome_back";
    await this.npcDialogueAsync(greeting);

    // ② 퀘스트 완료 → 의뢰인 보상 대사
    if (questDlg) {
      await this._delay(500);
      if (this._destroyed) return;
      await this.npcDialogueAsync(questDlg);
    }
    // ③ 레벨업 동료 반응 (퀘스트 완료가 없을 때)
    else if (levelDlg && this.game.player?.party) {
      await this._delay(500);
      if (this._destroyed) return;
      await this.npcDialogueAsync(`${levelDlg}_${this.game.player.party}`);
    }
    // ④ 그 외 평상시 귀환 — 첫 만남 이후부터 공주가 종종(약 35%) 들러 다정하게 다시 한번 당부
    else if (this.game.player?.metVillageChief && Math.random() < 0.35) {
      await this._delay(500);
      if (this._destroyed) return;
      this._showPrincessReminder();
    }
  }

  // ── 첫 마을 입장 오프닝 스토리 체인 ──────────────────
  async _playIntroChain() {
    const p = this.game.player;
    this.game._introChainActive = true; // 출석 보상 등이 체인 중간에 끼어들지 않도록 표시

    // ① 주인공 독백: 마을 상태를 보고 받은 첫 인상
    await this.selfDialogueAsync("self_intro_town", [
      "...성 안 내부가 공격을 받았나봐.",
      "여기저기 무너진 건물들과 불안에 떠는 사람들이 보이는군.",
      "일단 상황을 좀 알아봐야겠다.",
    ]);

    // ② 상인 대화 (기존 첫 입장 대사 재사용)
    await this.npcDialogueAsync("merchant");
    await this._delay(500);

    // ③ 주인공 독백: 상인 말에 대한 반응
    await this.selfDialogueAsync("self_after_merchant", [
      "네, 알겠습니다. 그럼 공주님과 대화를 해볼게요!",
      "공주님이라면 이 마을의 사정을 더 잘 알고 계시겠지.",
    ]);

    // ④ 공주(이장) 첫 만남 대화
    p.metVillageChief = true;
    await this.npcDialogueAsync("village_chief");
    await this._delay(400);
    // 공주까지 만난 시점의 진행상황을 저장 (이후 동료 모집창은 별도 흐름)
    this.game.saveManager?.autoSave?.(this.game);

    // ⑤ 주인공 독백: 동료 모집 결심
    await this.selfDialogueAsync("self_before_party", [
      "그럼... 함께할 동료를 구해볼까?",
      "혼자서는 마왕에게 닿을 수 없으니까. 듬직한 동료가 필요해.",
    ]);

    // ⑥ 동료 모집 모달 자동 오픈
    p.introPendingEquipPrompt = true; // 합류 대화 종료 후 장비 안내 트리거
    this.game._introChainActive = false;
    await this._delay(400);
    if (!this._destroyed) this._openPartyModal();
  }

  // ── 합류 직후 장비 안내 체인 ──────────────────────────
  async _playEquipPromptChain() {
    await this.selfDialogueAsync("self_equip_prompt", [
      "이제 장비를 맞춘 다음, 성 밖에 마물부터 정리해보자.",
      "상점에서 쓸만한 무기와 방어구를 사서 미리 장착해두는 게 좋겠어.",
      "🛒 상점/인벤을 한번 둘러볼까.",
    ]);
    // 대화 종료 후 상점/인벤 오버레이 자동 오픈
    await this._delay(300);
    if (this._destroyed) return;
    const ov = document.getElementById("shopInvenOverlay");
    if (ov) {
      ov.style.display = "block";
      this._refreshShopOverlay();
      ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
      });
    }
  }

  _injectLayoutCSS() {
    if (document.getElementById("townNewLayoutCSS")) return;
    const s = document.createElement("style");
    s.id = "townNewLayoutCSS";
    const rules = [
      "#townRoot{display:flex;flex-direction:column;height:100%;min-height:100vh;background:#0a0508;overflow:hidden;}",
      "#townTopbar{display:flex;align-items:center;justify-content:space-between;padding:6px 16px;background:rgba(10,3,15,.95);border-bottom:1px solid #3a1828;flex-shrink:0;flex-wrap:wrap;gap:6px;}",
      ".tt-left{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}",
      ".tt-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}",
      ".tt-title{font-size:.9rem;font-weight:700;color:var(--gold2);letter-spacing:.08em;}",
      ".tt-gold{font-size:.82rem;color:#ffdd77;font-weight:700;}",
      ".tt-chip{font-size:.7rem;color:var(--text-dim);}",
      ".tt-chip span{color:var(--gold2);font-weight:700;}",
      "#townNavbar{display:flex;flex-wrap:wrap;gap:4px;padding:7px 12px;background:rgba(8,2,12,.9);border-bottom:1px solid #2a1020;flex-shrink:0;align-items:center;}",
      ".tn-navbtn{background:rgba(30,10,40,.7);border:1px solid #3a1830;color:var(--text);padding:5px 11px;cursor:pointer;font-family:inherit;font-size:.76rem;font-weight:600;border-radius:3px;transition:.15s;white-space:nowrap;}",
      ".tn-navbtn:hover{background:rgba(80,20,60,.8);border-color:#aa5566;color:#fff;}",
      ".tn-dungeon{border-color:#4a3020!important;color:#cc9966!important;}",
      ".tn-dungeon:hover{border-color:#cc7733!important;color:#ffcc88!important;}",
      ".tn-gold{border-color:#FFD700!important;color:#FFD700!important;}",
      ".tn-gold:hover{background:rgba(255,215,0,.12)!important;}",
      ".tn-blue{border-color:#88aaff!important;color:#88aaff!important;}",
      ".tn-blue:hover{background:rgba(100,130,255,.1)!important;}",
      ".tn-divider{width:1px;height:22px;background:#2a1020;margin:0 3px;flex-shrink:0;}",
      "#townMain{flex:1;position:relative;overflow:hidden;}",
      ".town-bg-full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;filter:brightness(.75);z-index:0;}",
      ".town-bg-grad{position:absolute;bottom:0;left:0;right:0;height:42%;background:linear-gradient(to top,rgba(5,2,10,.92) 0%,transparent 100%);z-index:1;pointer-events:none;}",
      "#townCharArea{position:fixed;bottom:0;left:0;right:0;z-index:8001;display:flex;align-items:flex-end;justify-content:center;gap:24px;padding:0 60px 160px;pointer-events:none;}",
      ".town-char-slot{flex:1;max-width:200px;min-height:200px;display:flex;align-items:flex-end;justify-content:center;position:relative;}",
      ".town-char-slot img{width:100%;object-fit:contain;filter:drop-shadow(0 4px 20px rgba(0,0,0,.8));}",
      "#townHiddenData{display:none!important;}",
      "#shopInvenOverlay{display:none;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.9);overflow-y:auto;padding:20px;}",
      ".shop-inven-inner{max-width:680px;margin:0 auto;}",
      ".shop-inven-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #3a2028;padding-bottom:12px;font-size:1rem;font-weight:700;color:var(--gold2);}",
      "#townIdleBubble{position:fixed;left:50%;bottom:180px;transform:translateX(-50%) translateY(6px);z-index:40;background:rgba(10,4,8,.88);border:1px solid var(--border2);border-radius:20px;padding:10px 22px;font-size:.8rem;color:var(--gold2);white-space:nowrap;max-width:88vw;overflow:hidden;text-overflow:ellipsis;pointer-events:none;opacity:0;transition:opacity .25s ease,transform .25s ease;box-shadow:0 4px 16px rgba(0,0,0,.5);}",
      "#townIdleBubble.tib-show{opacity:1;transform:translateX(-50%) translateY(0);}",
    ];
    s.textContent = rules.join(" ");
    document.head.appendChild(s);
  }

  _buildHTML() {
    return `
<div id="townRoot">

  <!-- 상단 정보 바 -->
  <div id="townTopbar">
    <div class="tt-left">
      <span id="townHeaderTitle" class="tt-title">🏘 평화의 마을</span>
      <span id="townGold" class="tt-gold">💰 0 G</span>
    </div>
    <div class="tt-right">
      <span class="tt-chip">퀘스트: <span id="tnQuestTitle">없음</span></span>
      <span class="tt-chip">마을: <span id="tnTownStageName">폐허</span></span>
      <span class="tt-chip">예금: <span id="tnSideDeposit">0G</span></span>
      <span class="tt-chip">👸 호감도: <span id="tnPrincessAff">0</span></span>
      <span class="tt-chip" id="tnKingdomChip" style="border-color:#9a7ad0;color:#c0a0e8;">🗺 왕국 번영도: <span id="tnKingdomProsp">0</span>%</span>
    </div>
  </div>

  <!-- 버튼 네비 바 -->
  <div id="townNavbar">
    <button class="tn-navbtn tn-dungeon" id="tn-outside">🌿 성 밖</button>
    <button class="tn-navbtn tn-dungeon" id="tn-dungeon">🗡 일반 던전</button>
    <button class="tn-navbtn tn-dungeon" id="tn-abyss">⚫ 심연 던전</button>
    <button class="tn-navbtn" id="tn-worldmap" style="border-color:#9a7ad0;color:#c0a0e8;">🗺 왕국 지도</button>
    <span class="tn-divider"></span>
    <button class="tn-navbtn" id="tn-party">🍺 동료 모집</button>
    <button class="tn-navbtn" id="tn-quest">📜 퀘스트</button>
    <button class="tn-navbtn" id="tn-skill">🌟 스킬</button>
    <button class="tn-navbtn" id="tn-smith">🔨 대장간</button>
    <button class="tn-navbtn" id="tn-inn">🏨 여관</button>
    <button class="tn-navbtn tn-gold" id="tn-bank">🏦 은행</button>
    <button class="tn-navbtn" id="tn-bond">💞 유대</button>
    <button class="tn-navbtn" id="tn-achievement" style="border-color:#e8b830;color:#e8b830;">🏆 업적</button>
    <span class="tn-divider"></span>
    <button class="tn-navbtn" id="tn-shop-toggle">🛒 상점/인벤</button>
    <button class="tn-navbtn tn-blue" id="tn-save">💾 저장</button>
    <button class="tn-navbtn" id="tn-guide" style="border-color:#88ff88;color:#88ff88;">📋 공략 퀘스트</button>
    <button class="tn-navbtn" id="tn-princess" style="border-color:#ffaacc;color:#ffaacc;">👸 공주 알현</button>
  </div>

  <!-- 메인 배경 영역 -->
  <div id="townMain">
    <img id="townBgImg" src="images/town_bustling.png" alt="마을 배경" class="town-bg-full"/>
    <div class="town-bg-grad"></div>
    <!-- 하단 캐릭터 슬롯 -->
    <div id="townCharArea">
      <div id="townCharSlot1" class="town-char-slot"></div>
      <div id="townCharSlot2" class="town-char-slot"></div>
      <div id="townCharSlot3" class="town-char-slot"></div>
    </div>
  </div>

  <!-- 주인공 대기 대사 (말풍선) -->
  <div id="townIdleBubble">이제 어디로 갈까?</div>

  <!-- 숨김 데이터 (기능 유지용) -->
  <div id="townHiddenData">
    <span id="tnQuestProg"></span>
    <span id="tnQuestReward"></span>
    <span id="tnTownInvested"></span>
    <span id="tnTownNextGoal"></span>
    <div><div id="tnTownBar"></div></div>
    <span id="tnSideInterest"></span>
    <span id="tnWeapon">없음</span>
    <span id="tnHelmet">없음</span>
    <span id="tnArmor">없음</span>
    <div id="tnCompEquip">
      <span id="tnCompEquipName"></span>
      <span id="tnCompWeapon">없음</span>
      <span id="tnCompHelmet">없음</span>
      <span id="tnCompArmor">없음</span>
    </div>
  </div>

  <!-- 상점/인벤토리 오버레이 -->
  <div id="shopInvenOverlay">
    <div class="shop-inven-inner">
      <div class="shop-inven-header">
        <span>🛒 상점 · 인벤토리</span>
        <button id="shopInvenClose" class="tn-navbtn">✕ 닫기</button>
      </div>
      <div style="padding:14px;background:rgba(255,255,255,.04);border:1px solid #2a1428;border-radius:6px;margin-bottom:16px;">
        <div style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:6px;">⚔ 장착 장비</div>
        <div style="font-size:.75rem;color:var(--text-dim);">
          무기: <span id="tnWeapon2">없음</span> &nbsp;|&nbsp; 투구: <span id="tnHelmet2">없음</span> &nbsp;|&nbsp; 갑옷: <span id="tnArmor2">없음</span>
        </div>
      </div>
      <div id="tnCompEquip2" style="display:none;padding:14px;background:rgba(255,255,255,.04);border:1px solid #2a1428;border-radius:6px;margin-bottom:16px;">
        <div id="tnCompEquipName2" style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:6px;"></div>
        <div style="font-size:.75rem;color:var(--text-dim);">
          무기: <span id="tnCompWeapon2">없음</span> &nbsp;|&nbsp; 투구: <span id="tnCompHelmet2">없음</span> &nbsp;|&nbsp; 갑옷: <span id="tnCompArmor2">없음</span>
        </div>
      </div>
      <div id="tnComp2Equip2" style="display:none;padding:14px;background:rgba(255,255,255,.04);border:1px solid #3a1838;border-radius:6px;margin-bottom:16px;">
        <div id="tnComp2EquipName2" style="font-size:.78rem;color:#cc88ff;font-weight:700;margin-bottom:6px;"></div>
        <div style="font-size:.75rem;color:var(--text-dim);">
          무기: <span id="tnComp2Weapon2">없음</span> &nbsp;|&nbsp; 투구: <span id="tnComp2Helmet2">없음</span> &nbsp;|&nbsp; 갑옷: <span id="tnComp2Armor2">없음</span>
        </div>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:8px;">🛒 상점</div>
        <div id="tnShop"></div>
      </div>
      <div>
        <div style="font-size:.78rem;color:var(--gold);font-weight:700;margin-bottom:8px;">🎒 인벤토리</div>
        <div id="tnInventory"></div>
      </div>
    </div>
  </div>

<!-- ══ 공략 퀘스트 모달 ══ -->
<div id="guideQuestModal" style="display:none;position:fixed;inset:0;z-index:600;
  background:rgba(0,0,0,.92);overflow-y:auto;padding:20px;font-family:inherit;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;
      margin-bottom:16px;border-bottom:2px solid #4a6a20;padding-bottom:12px;">
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:#88ff88;">📋 마왕 토벌 공략 퀘스트</div>
        <div style="font-size:.7rem;color:var(--text-dim);margin-top:3px;">공주 실비아의 마왕 토벌 준비 체크리스트</div>
      </div>
      <button id="guideQuestClose" style="background:transparent;border:1px solid #4a2e38;
        color:var(--text-dim);padding:6px 14px;cursor:pointer;font-family:inherit;border-radius:4px;">✕ 닫기</button>
    </div>
    <!-- 이장 한마디 -->
    <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;
      background:rgba(255,255,255,.04);border:1px solid #3a4a20;border-radius:6px;margin-bottom:20px;">
      <img src="images/Silvia_front.png" style="width:52px;height:52px;object-fit:contain;
        border:1px solid #4a6a20;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'"/>
      <div>
        <div style="font-size:.75rem;font-weight:700;color:#ffcc44;margin-bottom:4px;">공주 실비아</div>
        <div id="guideChiefMsg" style="font-size:.78rem;color:#e8d8b8;line-height:1.7;">
          마왕 다르카스를 쓰러뜨리려면 철저한 준비가 필요해요. 아래 항목을 하나씩 완료해 주세요!
        </div>
      </div>
    </div>
    <!-- 진행도 바 -->
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text-dim);margin-bottom:4px;">
        <span>전체 진행도</span>
        <span id="guideProgress">0/6 완료</span>
      </div>
      <div style="height:8px;background:#180a0c;border-radius:4px;overflow:hidden;">
        <div id="guideProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#44aa44,#88ff44);transition:width .4s;border-radius:4px;"></div>
      </div>
    </div>
    <!-- 퀘스트 목록 -->
    <div id="guideQuestList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;"></div>
    <!-- 완료 메시지 -->
    <div id="guideCompleteMsg" style="display:none;padding:16px;background:rgba(68,170,68,.12);
      border:1px solid #44aa44;border-radius:6px;text-align:center;">
      <div style="font-size:1.2rem;font-weight:700;color:#88ff88;margin-bottom:6px;">🎉 모든 준비 완료!</div>
      <div style="font-size:.82rem;color:#aaddaa;">심연 던전에 도전할 준비가 되었습니다. 마왕 다르카스를 물리쳐라!</div>
    </div>
    <!-- 일일 투자 퀘스트 -->
    <div style="margin-top:16px;padding:14px;background:rgba(255,200,14,.06);
      border:1px solid #4a4a10;border-radius:6px;">
      <div style="font-size:.75rem;font-weight:700;color:#ffcc44;margin-bottom:8px;">🌟 오늘의 일일 퀘스트</div>
      <div id="dailyQuestList" style="display:flex;flex-direction:column;gap:6px;"></div>
    </div>
  </div>
</div>

<!-- ══ 은행 화면 ══ -->
<div id="bankScreen" style="display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,0.92) url('images/BANK.png') center/cover no-repeat;
  flex-direction:column;overflow-y:auto;">
  <div style="display:flex;align-items:center;justify-content:space-between;
    padding:16px 24px;border-bottom:2px solid #4a2e38;flex-shrink:0;">
    <div style="font-size:1.1rem;font-weight:700;color:var(--gold2);">🏦 왕국 은행</div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div id="bankGoldDisplay" style="font-size:1rem;font-weight:700;color:var(--gold2);">0 G</div>
      <button id="bankClose" style="background:transparent;border:1px solid #4a2e38;
        color:var(--text-dim);padding:8px 16px;cursor:pointer;font-family:inherit;
        font-size:.82rem;border-radius:4px;">← 마을로</button>
    </div>
  </div>
  <div style="display:flex;border-bottom:1px solid #2e1e24;flex-shrink:0;">
    <button id="bankTabDeposit" class="bank-tab bank-tab-active"
      onclick="window._townScene._switchBankTab('deposit')">💰 예금·출금</button>
    <button id="bankTabInvest"  class="bank-tab"
      onclick="window._townScene._switchBankTab('invest')">🏗 마을 투자</button>
  </div>
  <div id="bankDepositPane" style="padding:24px;max-width:700px;margin:0 auto;width:100%;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
      <div class="bank-card"><div class="bank-card-label">현재 예금</div>
        <div id="bankDepositAmt" class="bank-card-value" style="color:var(--gold2);">0 G</div></div>
      <div class="bank-card"><div class="bank-card-label">누적 이자 💹</div>
        <div id="bankInterestAmt" class="bank-card-value" style="color:#55cc55;">0 G</div>
        <div style="font-size:.62rem;color:var(--text-dim);margin-top:4px;">전투마다 예금의 5%</div></div>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;border-radius:6px;padding:16px;margin-bottom:12px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">💰 예금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" onclick="window._townScene._depositGold(100)">+100G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(500)">+500G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(1000)">+1000G</button>
        <button class="bank-btn" onclick="window._townScene._depositGold(5000)">+5000G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._depositAll()">전액</button>
      </div>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #1a3a2a;border-radius:6px;padding:16px;">
      <div style="font-size:.75rem;color:#55cc55;margin-bottom:10px;font-weight:700;">💸 출금하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(100)">-100G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(500)">-500G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawGold(1000)">-1000G</button>
        <button class="bank-btn" style="border-color:#3a6a4a;color:#55cc55;" onclick="window._townScene._withdrawAll()">전액</button>
      </div>
    </div>
  </div>
  <div id="bankInvestPane" style="display:none;padding:24px;max-width:700px;margin:0 auto;width:100%;">
    <div id="bankCurrentStage" class="bank-card" style="margin-bottom:24px;text-align:center;padding:20px;">
      <div id="bankStageIcon" style="font-size:2.5rem;margin-bottom:6px;">💀</div>
      <div id="bankStageName" style="font-size:1.3rem;font-weight:700;color:var(--gold2);">폐허</div>
      <div style="margin-top:10px;font-size:.72rem;color:var(--text-dim);">
        총 투자액: <span id="bankTotalInvested" style="color:var(--gold);font-weight:700;">0G</span>
      </div>
    </div>
    <div id="bankStageList" style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;"></div>
    <div style="background:rgba(255,255,255,.03);border:1px solid #3a2428;border-radius:6px;padding:16px;">
      <div style="font-size:.75rem;color:var(--gold);margin-bottom:10px;font-weight:700;">🏗 투자하기</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(100)">100G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(500)">500G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investTown(1000)">1000G</button>
        <button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._investAll()">전액</button>
      </div>
    </div>
  </div>
</div>
<style>
.bank-tab{padding:12px 28px;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--text-dim);cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:700;}
.bank-tab-active{color:var(--gold2)!important;border-bottom-color:var(--gold)!important;}
.bank-card{background:rgba(255,255,255,.04);border:1px solid #3a2428;border-radius:6px;padding:16px 20px;}
.bank-card-label{font-size:.65rem;color:var(--text-dim);margin-bottom:6px;}
.bank-card-value{font-size:1.4rem;font-weight:700;}
.bank-btn{background:rgba(20,10,30,.85);border:1px solid #4a2e38;color:var(--text);padding:9px 18px;cursor:pointer;font-family:inherit;font-size:.78rem;border-radius:4px;font-weight:700;}
.bank-btn:hover{filter:brightness(1.3);}
</style>

<!-- 저장/불러오기 화면 (간단 버전) -->
<div id="saveScreen" style="display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,0.95);flex-direction:column;overflow-y:auto;padding:20px;
  font-family:inherit;">
  <div style="max-width:600px;margin:0 auto;width:100%;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <span style="font-size:1.1rem;font-weight:700;color:var(--gold2);">💾 저장/불러오기</span>
      <div style="display:flex;gap:8px;">
        <button id="saveTabSave" class="bank-btn" style="border-color:var(--gold);color:var(--gold2);"
          onclick="window._townScene._renderSaveSlots('save')">💾 저장</button>
        <button id="saveTabLoad" class="bank-btn"
          onclick="window._townScene._renderSaveSlots('load')">📂 불러오기</button>
        <button id="saveClose" class="bank-btn">✕ 닫기</button>
      </div>
    </div>
    <div id="saveSlotContainer" style="display:flex;flex-direction:column;gap:12px;"></div>
  </div>
</div>

<!-- 퀘스트 모달 -->
<div id="tnQuestModal" class="modal hidden">
  <div class="modal-content">
    <h2>📜 퀘스트 게시판</h2>
    <div id="tnQuestList"></div>
    <button id="tnCloseQuest">닫기</button>
  </div>
</div>

<!-- 스킬 트리 모달 -->
<div id="tnSkillModal" class="skill-modal" style="display:none;">
  <div class="skill-box">
    <h2>🌟 스킬 트리</h2>
    <div style="color:var(--gold2);margin-bottom:8px;">SP : <span id="tnSP">0</span></div>
    <div class="skill-tabs">
      <button class="skill-tab active" id="tnTabActive">⚡ 액티브</button>
      <button class="skill-tab" id="tnTabPassive">🛡 패시브</button>
    </div>
    <div id="tnActiveSkills">
      <div class="skill-row">공격 강화 Lv.<span id="tnAtkLv">0</span><button id="tnLearnAtk">배우기 (SP1)</button></div>
      <div class="skill-row">체력 강화 Lv.<span id="tnHpLv">0</span><button id="tnLearnHp">배우기 (SP1)</button></div>
      <div class="skill-row">치명타 강화 Lv.<span id="tnCritLv">0</span><button id="tnLearnCrit">배우기 (SP1)</button></div>
      <div class="skill-row"><span id="tnJobSkillName">직업 스킬</span><button id="tnLearnJob">습득 (SP3)</button></div>
    </div>
    <div id="tnPassiveSkills" style="display:none;"></div>
    <button id="tnCloseSkill">닫기</button>
  </div>
</div>

<!-- 대장간 모달 -->
<div id="tnSmithModal" class="skill-modal" style="display:none;">
  <div class="skill-box">
    <h2>🔨 대장간</h2>
    <div style="color:var(--gold2);margin-bottom:6px;font-size:.82rem;">💰 <span id="tnSmithGold">0</span> G</div>
    <h3 style="font-size:.75rem;color:var(--gold);margin-bottom:8px;">무기 구매</h3>
    <div id="tnSmithBuy"></div>
    <h3 style="font-size:.75rem;color:var(--gold);margin:12px 0 8px;">강화</h3>
    <div id="tnSmithEnhance"></div>
    <h3 style="font-size:.75rem;color:var(--gold);margin:12px 0 8px;">판매</h3>
    <div id="tnSmithSell"></div>
    <button id="tnCloseSmith">닫기</button>
  </div>
</div>

<!-- 동료 선택 화면 -->
<div id="tnPartyModal" class="skill-modal" style="display:none;">
  <div class="skill-box" style="max-width:600px;">
    <h2>🍺 동료 모집</h2>
    <div class="class-cards" id="tnPartyCards"></div>
    <button id="tnCloseParty">닫기</button>
  </div>
</div>

<!-- 업적 모달 -->
<div id="tnAchievementModal" class="skill-modal" style="display:none;z-index:8100;">
  <div class="skill-box" style="max-width:520px;">
    <h2>🏆 업적</h2>
    <div id="tnAchievementList"></div>
    <button id="tnCloseAchievement">닫기</button>
  </div>
</div>

<!-- 여관 모달 -->
<div id="tnInnModal" class="skill-modal" style="display:none;">
  <div class="skill-box" style="max-width:380px;text-align:center;">
    <h2>🏨 여관</h2>
    <p style="font-size:.78rem;color:var(--text-dim);line-height:1.7;margin-bottom:18px;">
      따뜻한 침대와 술 한 잔이 기다리는 곳.<br/>푹 쉬어가거나, 동료와 카드 한 판 어떨까요?
    </p>
    <button id="tnInnRest">🛏 휴식하기 (HP·동료 회복)</button>
    <button id="tnInnCardGame">🃏 카드 게임</button>
    <button id="tnCloseInn">닫기</button>
  </div>
</div>

<!-- 카드 게임 모달 -->
<div id="cgModal" class="skill-modal" style="display:none;z-index:8200;">
  <div class="skill-box cg-box">
    <button id="cgCloseX" class="cg-close-x" title="닫기">✕</button>
    <h2>🃏 카드 게임 — 하이카드</h2>
    <div id="cgOpponentInfo" class="cg-opponent"></div>
    <div class="cg-round-info">
      <span id="cgRoundLabel">라운드 1 / 3</span>
      <span id="cgScoreLabel">승 0 · 무 0 · 패 0</span>
    </div>
    <div class="cg-table">
      <div class="cg-slot">
        <div class="cg-slot-label">나</div>
        <div id="cgPlayerCard" class="cg-card cg-facedown">🂠</div>
      </div>
      <div class="cg-vs">VS</div>
      <div class="cg-slot">
        <div class="cg-slot-label" id="cgOppLabel">동료</div>
        <div id="cgOppCard" class="cg-card cg-facedown">🂠</div>
      </div>
    </div>
    <div id="cgResultMsg" class="cg-result-msg">카드를 뽑아 승부를 시작하세요!</div>
    <div id="cgFinalMsg" class="cg-final-msg" style="display:none;"></div>
    <div id="cgActiveButtons" class="cg-btn-row">
      <button id="cgDrawBtn" class="cg-btn">🎴 카드 뽑기</button>
      <button id="cgGiveUpBtn" class="cg-btn cg-btn-danger">🚪 포기하기</button>
    </div>
    <div id="cgFinishedButtons" class="cg-btn-row" style="display:none;">
      <button id="cgPlayAgainBtn" class="cg-btn">🔄 다시 하기</button>
      <button id="cgCloseBtn" class="cg-btn">닫기</button>
    </div>
  </div>
</div>

`;
  }

  _bindEvents() {
    const g = this.game;
    const q = id => document.getElementById(id);

    q("tn-outside") ?.addEventListener("click", () => {
      const p = g.player;
      if (p && !p.introDepartureDone && p.introChainDone) {
        p.introDepartureDone = true;
        this._showSelfDialogue("self_departure", [
          "장비는 어느 정도 갖췄고... 동료도 옆에 있으니까.",
          "이제 출발하자!",
        ], () => g.goToDungeon("outside"));
      } else {
        this._confirmDeparture("outside");
      }
    });
    q("tn-dungeon") ?.addEventListener("click", () => this._confirmDeparture("normal"));
    q("tn-abyss")   ?.addEventListener("click", () => {
      if (!g.player.abyssUnlocked) {
        g.showNarrative("🔒 수도를 완전히 재건하면 해금됩니다.", 3000);
        return;
      }
      this._confirmDeparture("abyss");
    });
    q("tn-party")  ?.addEventListener("click", () => this._openPartyModal());
    q("tn-worldmap")?.addEventListener("click", () => this.game._openWorldMap());
    q("tn-quest")  ?.addEventListener("click", () => this._openQuestModal());
    q("tn-skill")  ?.addEventListener("click", () => this._openSkillModal());
    q("tn-smith")  ?.addEventListener("click", () => this._openSmithModal());
    q("tn-inn")    ?.addEventListener("click", () => this._openInnModal());
    q("tn-bank")   ?.addEventListener("click", () => this._openBankScreen());
    q("tn-bond")   ?.addEventListener("click", () => g.showPartyStory());
    q("tn-achievement") ?.addEventListener("click", () => this._openAchievementModal());
    q("tnCloseAchievement") ?.addEventListener("click", () => q("tnAchievementModal") && (q("tnAchievementModal").style.display = "none"));
    q("tn-guide")  ?.addEventListener("click", () => this._openGuideQuestModal());
    q("tn-princess") ?.addEventListener("click", () => this._talkToPrincess());
    q("guideQuestClose")?.addEventListener("click", () => {
      document.getElementById("guideQuestModal").style.display = "none";
    });
    // 상점/인벤토리 오버레이
    q("tn-shop-toggle")?.addEventListener("click", () => {
      const ov = document.getElementById("shopInvenOverlay");
      if (ov) {
        ov.style.display = "block";
        this._refreshShopOverlay();
        // 캐릭터 슬롯이 아이템 목록을 가리지 않도록 숨김
        ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = "";
        });
      }
    });
    q("shopInvenClose")?.addEventListener("click", () => {
      const ov = document.getElementById("shopInvenOverlay");
      if (ov) ov.style.display = "none";
      // 닫을 때 캐릭터 슬롯 복원
      if (this._renderTownCharacters) this._renderTownCharacters();
    });
    q("tn-save")   ?.addEventListener("click", () => this._openSaveScreen());
    q("bankClose") ?.addEventListener("click", () => this._closeBankScreen());
    q("saveClose") ?.addEventListener("click", () => { const s=document.getElementById("saveScreen"); if(s)s.style.display="none"; });

    // 퀘스트 모달 닫기
    q("tnCloseQuest") ?.addEventListener("click", () => q("tnQuestModal")  ?.classList.add("hidden"));
    q("tnCloseSkill") ?.addEventListener("click", () => q("tnSkillModal")  && (q("tnSkillModal").style.display="none"));
    q("tnCloseSmith") ?.addEventListener("click", () => q("tnSmithModal")  && (q("tnSmithModal").style.display="none"));
    q("tnCloseParty") ?.addEventListener("click", () => q("tnPartyModal")  && (q("tnPartyModal").style.display="none"));

    // 여관 모달
    q("tnInnRest")     ?.addEventListener("click", () => { q("tnInnModal").style.display = "none"; g.restAtInn(); });
    q("tnInnCardGame") ?.addEventListener("click", () => this._openCardGame());
    q("tnCloseInn")    ?.addEventListener("click", () => { q("tnInnModal").style.display = "none"; });

    // 카드 게임 모달
    q("cgDrawBtn")      ?.addEventListener("click", () => this._cgDrawRound());
    q("cgGiveUpBtn")    ?.addEventListener("click", () => this._cgGiveUp());
    q("cgPlayAgainBtn") ?.addEventListener("click", () => this._cgPlayAgain());
    q("cgCloseBtn")     ?.addEventListener("click", () => this._closeCardGameModal());
    q("cgCloseX")       ?.addEventListener("click", () => this._closeCardGameModal());

    // 스킬 탭
    q("tnTabActive") ?.addEventListener("click", () => this._switchSkillTab("active"));
    q("tnTabPassive")?.addEventListener("click", () => this._switchSkillTab("passive"));

    // 스킬 배우기
    q("tnLearnAtk") ?.addEventListener("click", () => { g.learnSkill("attackBoost");  this._refreshSkillModal(); });
    q("tnLearnHp")  ?.addEventListener("click", () => { g.learnSkill("hpBoost");      this._refreshSkillModal(); });
    q("tnLearnCrit")?.addEventListener("click", () => { g.learnSkill("criticalBoost");this._refreshSkillModal(); });
    q("tnLearnJob") ?.addEventListener("click", () => { g.learnJobSkill();             this._refreshSkillModal(); });

    // 상점 빌드
    this._buildShop();
  }

  render() {
  const p = this.game.player;
  if (!p) return;
  const q = id => document.getElementById(id);
  const setText = (id, val) => { const e = q(id); if(e) e.innerText = val; };

  // 골드
  const goldEl = q("townGold");
  if (goldEl) goldEl.innerText = `💰 ${p.money} G`;

  // 장비 (등급 색상 적용)
  const gradeColor = {
    normal:"#b8a888", uncommon:"#55cc55",
    rare:"#4898d8", epic:"#bb66ff", legend:"#d8a820"
  };
  const fmtEq = (item) => item
    ? wrapItemIconText(item, `<span style="color:${gradeColor[item.class]||"#b8a888"}">+${item.enhance||0} ${item.name}</span>`, 18)
    : `<span style="color:#504040;">없음</span>`;

  const weaponEl = q("tnWeapon");
  const helmetEl = q("tnHelmet");
  const armorEl  = q("tnArmor");
  if (weaponEl) weaponEl.innerHTML = fmtEq(p.equipment.weapon);
  if (helmetEl) helmetEl.innerHTML = fmtEq(p.equipment.helmet);
  if (armorEl)  armorEl.innerHTML  = fmtEq(p.equipment.armor);

  // 퀘스트 (set → setText로 수정)
  if (p.quest) {
    setText("tnQuestTitle",  p.quest.title);
    setText("tnQuestProg",   `${p.questProgress} / ${p.quest.goal}마리`);
    setText("tnQuestReward", `보상: ${p.quest.rewardGold}G / ${p.quest.rewardExp}EXP`);
  } else {
    setText("tnQuestTitle","없음");
    setText("tnQuestProg","");
    setText("tnQuestReward","");
  }

  // 심연 버튼
  const abyssBtn = q("tn-abyss");
  if (abyssBtn) {
    abyssBtn.style.opacity     = p.abyssUnlocked ? "1" : "0.4";
    abyssBtn.textContent       = p.abyssUnlocked ? "⚫ 심연 던전" : "🔒 심연 던전";
    abyssBtn.style.borderColor = p.abyssUnlocked ? "#8844cc" : "";
    abyssBtn.title             = p.abyssUnlocked ? "" : "수도를 완전히 재건하면 해금됩니다";
  }

  // 인벤토리
  this._renderInventory();
  this._renderBankSidebar();
  this._updateTownBg();
  this._syncShopOverlay();
  this._renderTownCharacters();
}

  _syncShopOverlay() {
    const p = this.game.player;
    const setText = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    const setItemHTML = (id, item) => {
      const e = document.getElementById(id);
      if (!e) return;
      e.innerHTML = item ? wrapItemIconText(item, `<span>${item.name}</span>`, 16) : "없음";
    };
    const eq = p.equipment || {};
    setItemHTML("tnWeapon2", eq.weapon);
    setItemHTML("tnHelmet2", eq.helmet);
    setItemHTML("tnArmor2",  eq.armor);
    const compEq2 = document.getElementById("tnCompEquip2");
    if (p.party && p.partyEquipment) {
      if (compEq2) compEq2.style.display = "block";
      setText("tnCompEquipName2", "⚔ 동료 장착 장비");
      setItemHTML("tnCompWeapon2", p.partyEquipment?.weapon);
      setItemHTML("tnCompHelmet2", p.partyEquipment?.helmet);
      setItemHTML("tnCompArmor2",  p.partyEquipment?.armor);
    } else if (compEq2) compEq2.style.display = "none";

    const comp2Eq = document.getElementById("tnComp2Equip2");
    if (p.party2 && p.party2Equipment) {
      if (comp2Eq) comp2Eq.style.display = "block";
      setText("tnComp2EquipName2", "⚔ 2번 동료 장착 장비");
      setItemHTML("tnComp2Weapon2", p.party2Equipment?.weapon);
      setItemHTML("tnComp2Helmet2", p.party2Equipment?.helmet);
      setItemHTML("tnComp2Armor2",  p.party2Equipment?.armor);
    } else if (comp2Eq) comp2Eq.style.display = "none";
  }

  _refreshShopOverlay() {
    // tnShop/tnInventory가 오버레이 안에 있으므로 직접 빌드
    this._buildShop();
    this._renderInventory();
    this._syncShopOverlay();

    // 상단바 골드 표시 즉시 갱신 (판매/구매 시 반영 안 되던 버그 수정)
    const p = this.game.player;
    const goldEl = document.getElementById("townGold");
    if (goldEl && p) goldEl.innerText = `💰 ${p.money} G`;
  }

 _renderInventory() {
  const p = this.game.player;
  const c = document.getElementById("tnInventory");
  if (!c) return;
  c.innerHTML = "";

  // ── 등급 색상 정의 ──
  const grade = {
    normal:   { color:"#b8a888" },
    uncommon: { color:"#55cc55" },
    rare:     { color:"#4898d8" },
    epic:     { color:"#bb66ff" },
    legend:   { color:"#d8a820" },
  };

  // ── fmtItem: 동료 장비 표시용 ──
  const fmtItem = (item) => item
    ? wrapItemIconText(item, `<span style="color:${grade[item.class]?.color||"#b8a888"}">+${item.enhance||0} ${item.name}</span>`, 18)
    : `<span style="color:#504040;">없음</span>`;

  // ── 동료 장비 섹션 갱신 ──
  const compSection = document.getElementById("tnCompEquip");
  if (compSection) {
    if (p.party) {
      const mem = PARTY_MEMBERS[p.party];
      compSection.style.display = "block";
      document.getElementById("tnCompEquipName").textContent = `⚔ ${mem.name} 장착 장비`;
      document.getElementById("tnCompWeapon").innerHTML = fmtItem(p.partyEquipment.weapon);
      document.getElementById("tnCompHelmet").innerHTML = fmtItem(p.partyEquipment.helmet);
      document.getElementById("tnCompArmor").innerHTML  = fmtItem(p.partyEquipment.armor);
    } else {
      compSection.style.display = "none";
    }
  }

  // ── 인벤토리 비어있음 ──
  if (!p.inventory.length) {
    c.innerHTML = `<div style="font-size:.7rem;color:var(--text-dim);padding:8px 0;">인벤토리 비어있음</div>`;
    return;
  }

  // ── 인벤토리 목록 ──
  p.inventory.forEach((item, idx) => {
    const g   = grade[item.class] || grade.normal;
    const row = document.createElement("div");
    row.className = "inv-row";
    row.style.borderColor = g.color + "55";

    const stat = item.type === "weapon"
      ? `ATK+${item.attack}`
      : item.type === "potion"
        ? `회복`
        : item.type === "key"
          ? `중요 아이템`
          : `DEF+${item.defense}`;

    row.innerHTML = `
      <span class="item-icon">${getItemIconSVG(item, 24)}</span>
      <span class="inv-name" style="color:${g.color};flex:1;font-size:.66rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        +${item.enhance||0} ${item.name}
        <span style="color:var(--text-dim);font-size:.6rem;">${stat}</span>
      </span>`;

    // 물약 사용 / 장비 장착 / 중요 아이템(버튼 없음)
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
        this._refreshShopOverlay?.() || this.render();
        this._refreshGuideQuestIfOpen?.();
      });
      row.appendChild(use);
    } else {
      const eq = document.createElement("button");
      eq.className = "inv-btn";
      eq.textContent = "장착";
      eq.title = "주인공 장착";
      eq.addEventListener("click", () => {
        this.game.itemManager.equip(this.game, idx, false);
        this._refreshShopOverlay?.() || this.render();
      });
      row.appendChild(eq);

      // 동료 장착 (동료가 있을 때만)
      if (p.party) {
        const eqComp = document.createElement("button");
        eqComp.className = "inv-btn";
        eqComp.textContent = "동료";
        eqComp.title = "1번 동료 장착";
        eqComp.style.cssText = "border-color:#4444cc;color:#8888ff;";
        eqComp.addEventListener("click", () => {
          this.game.itemManager.equip(this.game, idx, "party");
          this._refreshShopOverlay?.() || this.render();
        });
        row.appendChild(eqComp);
      }

      // 2번 동료 장착 (2번 동료가 있을 때만)
      if (p.party2) {
        const eqComp2 = document.createElement("button");
        eqComp2.className = "inv-btn";
        eqComp2.textContent = "동료2";
        eqComp2.title = "2번 동료 장착";
        eqComp2.style.cssText = "border-color:#9944cc;color:#cc88ff;";
        eqComp2.addEventListener("click", () => {
          this.game.itemManager.equip(this.game, idx, "party2");
          this._refreshShopOverlay?.() || this.render();
        });
        row.appendChild(eqComp2);
      }
    }

    // 판매 버튼 — 중요 아이템(key)은 판매 불가 (스토리 진행용, 매각 대상 아님)
    if (item.type !== "key") {
      const sellPrice = Math.max(1, Math.floor((item.price || 10) * 0.5 * (1 + (item.enhance || 0) * 0.2)));
      const sell = document.createElement("button");
      sell.className = "inv-btn";
      sell.textContent = `💰${sellPrice}G`;
      sell.title = `${sellPrice}G에 판매`;
      sell.style.cssText = "border-color:#cc9900;color:#ffcc44;font-size:.62rem;";
      sell.addEventListener("click", () => {
        this.game.itemManager.sellToBlacksmith(this.game, idx, sellPrice);
        this._refreshShopOverlay?.() || this.render();
      });
      row.appendChild(sell);
    }

    // 삭제 — 중요 아이템(key)은 분실 방지를 위해 삭제도 막음
    if (item.type !== "key") {
      const del = document.createElement("button");
      del.className = "inv-btn del";
      del.textContent = "❌";
      del.addEventListener("click", () => {
        this.game.itemManager.remove(this.game, idx);
        this._refreshShopOverlay?.() || this.render();
      });
      row.appendChild(del);
    }

    c.appendChild(row);
  });
}

  _buildShop() {
    const c = document.getElementById("tnShop");
    if (!c) return;
    c.innerHTML = "";

    // 직업 전용 무기 라벨
    const CLASS_LABEL = { sword:"⚔ 기사 전용", staff:"🔮 마법사 전용", bow:"🏹 궁수 전용" };
    // 내 직업이 쓸 수 있는 weaponClass
    const myWeaponClass = { knight:"sword", night:"sword", mage:"staff", archer:"bow" }[this.game.player?.type];

    SHOP_ITEMS.forEach((item, idx) => {
      const btn = document.createElement("button");

      // 직업 전용 무기이면서 내 직업과 안 맞으면 비활성화 스타일
      const isWrongClass = item.weaponClass && item.weaponClass !== myWeaponClass;
      btn.className = `shop-btn ${item.class}${isWrongClass ? " shop-btn-disabled" : ""}`;
      btn.title = isWrongClass ? `${CLASS_LABEL[item.weaponClass]} — 장착 불가` : "";

      // 스탯 미리보기
      const statStr = item.type === "weapon" ? `ATK+${item.attack}`
                    : item.type === "potion"  ? `HP+${item.heal}`
                    :                           `DEF+${item.defense}`;
      // 직업 배지 (전용 무기만 표시)
      const classBadge = item.weaponClass
        ? `<span class="shop-class-badge ${isWrongClass ? "wrong" : "ok"}">${CLASS_LABEL[item.weaponClass]}</span>`
        : "";

      btn.innerHTML = `
        <span class="item-icon">${getItemIconSVG(item, 24)}</span>
        <span class="item-name">${item.name}</span>
        ${classBadge}
        <span class="item-stat">${statStr}</span>
        <span class="item-cost">${item.cost}G</span>`;
      btn.addEventListener("click", () => {
        this.game.itemManager.buyShop(this.game, idx);
        this._refreshShopOverlay?.() || this.render();
        // 물약 등 구매가 공략/일일 퀘스트 조건에 영향 줄 수 있으므로,
        // 퀘스트 모달이 열려 있으면 즉시 다시 그려서 체크 상태를 갱신
        this._refreshGuideQuestIfOpen?.();
      });
      c.appendChild(btn);
    });
  }

  // ── 퀘스트 게시판 ───────────────────────────────
  _openQuestModal() {
    const modal = document.getElementById("tnQuestModal");
    const list  = document.getElementById("tnQuestList");
    if (!modal || !list) return;

    const p = this.game.player;
    const available = this.game.questManager.getAvailable(p);
    const shuffled  = [...available].sort(() => Math.random() - 0.5).slice(0, 4);

    list.innerHTML = "";

    // 진행 중 퀘스트
    if (p.quest) {
      const pct = this.game.questManager.getProgressPct(p);
      list.innerHTML += `
        <div class="quest-card active-quest">
          <div class="quest-badge">진행 중</div>
          <h3>${p.quest.title}</h3>
          <p>📍 ${p.quest.target} ${p.questProgress}/${p.quest.goal}</p>
          <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        </div>`;
    }

    shuffled.forEach(q => {
      const card = document.createElement("div");
      card.className = "quest-card";
      card.innerHTML = `
        ${q.giverPortrait ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <img src="${q.giverPortrait}" style="width:36px;height:36px;object-fit:contain;border:1px solid #3a2028;border-radius:2px;" onerror="this.style.display='none'"/>
          <span style="font-size:.7rem;color:${q.giverColor||'var(--text-dim)'};font-weight:700;">의뢰인: ${q.giver||"??"}</span>
        </div>` : ""}
        <h3>${q.title}</h3>
        <p>📍 ${q.target} ${q.goal}마리</p>
        <p>🎁 ${q.rewardGold}G / ${q.rewardExp}EXP</p>
        <button class="quest-accept-btn">✅ 수락</button>`;
      card.querySelector("button").addEventListener("click", () => {
        if (this.game.questManager.accept(this.game, q.id)) {
          modal.classList.add("hidden");
          this.render();
          // 의뢰인 수락 대화 표시 후 던전으로
          if (q.giverNpc && this.showNpcDialogue) {
            this.showNpcDialogue(q.giverNpc, () => {
              setTimeout(() => this.game.goToDungeon("normal"), 400);
            });
          } else {
            this.game.goToDungeon("normal");
          }
        }
      });
      list.appendChild(card);
    });

    if (!shuffled.length && !p.quest)
      list.innerHTML += `<p style="color:var(--text-dim);text-align:center;font-size:.8rem;">조건에 맞는 퀘스트 없음</p>`;

    modal.classList.remove("hidden");
  }

  // ── 스킬 모달 ───────────────────────────────────
  _openSkillModal() {
    const p = this.game.player;
    const q = id => document.getElementById(id);
    const s = (id, v) => { const e = q(id); if(e) e.innerText = v; };

    s("tnSP",     p.skillPoints);
    s("tnAtkLv",  p.skills.attackBoost);
    s("tnHpLv",   p.skills.hpBoost);
    s("tnCritLv", p.skills.criticalBoost);
    s("tnJobSkillName", { warrior:"⚔ 회전베기", mage:"🔮 매직볼", archer:"🏹 속사" }[p.type]);

    const modal = q("tnSkillModal");
    if (modal) modal.style.display = "flex";

    this._renderPassiveSkills();
    this._switchSkillTab("active");
  }

  _refreshSkillModal() {
    const p = this.game.player;
    const s = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    s("tnSP", p.skillPoints); s("tnAtkLv", p.skills.attackBoost);
    s("tnHpLv", p.skills.hpBoost); s("tnCritLv", p.skills.criticalBoost);
    this._renderPassiveSkills();
    this.render();
  }

  _switchSkillTab(tab) {
    const act = document.getElementById("tnActiveSkills");
    const pas = document.getElementById("tnPassiveSkills");
    const tA  = document.getElementById("tnTabActive");
    const tP  = document.getElementById("tnTabPassive");
    if (act) act.style.display = tab === "active"  ? "block" : "none";
    if (pas) pas.style.display = tab === "passive" ? "block" : "none";
    tA?.classList.toggle("active", tab === "active");
    tP?.classList.toggle("active", tab === "passive");
  }

  _renderPassiveSkills() {
    const el = document.getElementById("tnPassiveSkills");
    if (!el) return;
    const p = this.game.player;
    const allPassives = {
      warrior: [
        { id:"iron_body", name:"🛡 철갑 몸",     desc:["DEF+5","DEF+12","DEF+22"],           spCost:[2,3,4] },
        { id:"war_cry",   name:"📣 전쟁의 함성", desc:["적ATK-10%","적ATK-18%","적ATK-28%"], spCost:[2,3,4] },
        { id:"berserker", name:"😤 광전사",       desc:["HP30%↓ATK+20%","HP40%↓ATK+35%","HP50%↓ATK+50%"], spCost:[3,4,5] },
      ],
      mage: [
        { id:"mana_surge",  name:"💥 마나 폭발",  desc:["크리DMG+20%","크리DMG+40%","크리DMG+65%"], spCost:[2,3,4] },
        { id:"spell_echo",  name:"🔮 마법 반향",  desc:["25%추가15","30%추가30","40%추가50"],       spCost:[2,3,4] },
        { id:"arcane_ward", name:"🌀 비전 보호막",desc:["받는피해-8%","-15%","-22%"],               spCost:[2,3,4] },
      ],
      archer: [
        { id:"eagle_eye",   name:"🦅 매의 눈",   desc:["크리+8%","+16%","+26%"],               spCost:[2,3,4] },
        { id:"swift_feet",  name:"💨 신속",       desc:["회피-10%(20%)","-15%(30%)","-20%(40%)"],spCost:[2,3,4] },
        { id:"poison_tip",  name:"☠ 독 화살촉",  desc:["독+1턴","독+2턴","독+3턴"],            spCost:[2,3,4] },
      ],
    };
    const jobSkills = allPassives[p.type] || [];
    el.innerHTML = "";
    jobSkills.forEach(skill => {
      const curLv  = (p.passiveSkills||{})[skill.id] || 0;
      const maxLv  = skill.spCost.length;
      const isMax  = curLv >= maxLv;
      const cost   = isMax ? 0 : skill.spCost[curLv];
      const canLearn = !isMax && p.skillPoints >= cost;

      const row = document.createElement("div");
      row.className = "passive-skill-row";
      row.innerHTML = `
        <div class="passive-header">
          <span class="passive-name">${skill.name}</span>
          <span class="passive-level" style="color:${isMax?"var(--gold)":"var(--text-dim)"}">Lv.${curLv}/${maxLv}</span>
        </div>
        <div class="passive-desc">${isMax?"✨ MAX":`다음: ${skill.desc[curLv]}`}</div>
        <button class="passive-learn-btn ${canLearn?"":"disabled"}" ${!canLearn?"disabled":""}>
          ${isMax?"MAX":`습득 (SP${cost})`}
        </button>`;
      row.querySelector("button").addEventListener("click", () => {
        if (!canLearn) return;
        this.game.learnPassive(skill.id, jobSkills);
        this._refreshSkillModal();
      });
      el.appendChild(row);
    });
  }

  // ── 대장간 모달 ─────────────────────────────────
  _openSmithModal() {
    const p = this.game.player;
    const q = id => document.getElementById(id);
    const gEl = q("tnSmithGold"); if (gEl) gEl.innerText = p.money;
    const modal = q("tnSmithModal");
    if (modal) modal.style.display = "flex";

    const BLACKSMITH_WEAPONS = [
      { name:"기사의 검",   type:"weapon", weaponClass:"sword", attack:40, defense:0, cost:500, class:"rare",  enhance:0 },
      { name:"엘프의 활",   type:"weapon", weaponClass:"bow",   attack:38, defense:0, cost:500, class:"rare",  enhance:0 },
      { name:"현자의 지팡이",type:"weapon",weaponClass:"staff", attack:42, defense:0, cost:500, class:"rare",  enhance:0 },
    ];

    const buyEl = q("tnSmithBuy");
    if (buyEl) {
      buyEl.innerHTML = "";
      BLACKSMITH_WEAPONS.forEach(w => {
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.innerHTML = `${getItemIconSVG(w, 22)}<span class="item-name">${w.name}</span><span class="item-cost">${w.cost}G</span>`;
        btn.addEventListener("click", () => {
          if (p.money < w.cost) { this.game.log("💰 골드 부족"); return; }
          p.money -= w.cost;
          this.game.itemManager.add(this.game, { ...w, itemId: createItemId() });
          this.game.log(`🛒 ${w.name} 구매`);
          gEl.innerText = p.money;
          this.render();
        });
        buyEl.appendChild(btn);
      });
    }

    const enhEl = q("tnSmithEnhance");
    if (enhEl) {
      enhEl.innerHTML = "";
      p.inventory.forEach((item, idx) => {
        if (item.type === "potion") return;
        const cost = (item.enhance + 1) * 100;
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.innerHTML = `${getItemIconSVG(item, 22)}<span class="item-name">+${item.enhance} ${item.name}</span><span class="item-cost">강화 ${cost}G</span>`;
        btn.addEventListener("click", () => {
          this.game.itemManager.enhance(this.game, idx);
          this._openSmithModal(); // 갱신
        });
        enhEl.appendChild(btn);
      });
    }

    const sellEl = q("tnSmithSell");
    if (sellEl) {
      sellEl.innerHTML = "";
      p.inventory.forEach((item, idx) => {
        const price = 50 + (item.enhance || 0) * 20;
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.innerHTML = `${getItemIconSVG(item, 22)}<span class="item-name">${item.name}</span><span class="item-cost">판매 ${price}G</span>`;
        btn.addEventListener("click", () => {
          this.game.itemManager.sellToBlacksmith(this.game, idx, price);
          this._openSmithModal();
          this.render();
        });
        sellEl.appendChild(btn);
      });
    }
  }

  // ── 업적 모달 ───────────────────────────────────
  _openAchievementModal() {
    const modal = document.getElementById("tnAchievementModal");
    const list  = document.getElementById("tnAchievementList");
    if (!modal || !list) return;

    // 열릴 때마다 최신 달성 상태로 재확인 (놓친 업적이 있다면 이 시점에 바로 잡아줌)
    this.game.achievementManager?.check?.(this.game);
    list.innerHTML = this.game.achievementManager?.renderUI?.(this.game.player) || "업적 정보를 불러올 수 없습니다.";
    modal.style.display = "flex";
  }

  // ── 동료 모달 ───────────────────────────────────
  _openPartyModal() {
    const p = this.game.player;

    // 아직 1번째 동료조차 없으면(첫 모집) — 기존 그대로, 슬롯 고민 없이 곧바로 동료 목록
    if (!p.party) {
      this._renderPartyCardList(1, [], false);
      return;
    }

    // 이미 동료가 있으면 — 어느 슬롯을 바꿀지 먼저 물어본다
    this._renderPartySlotPicker();
  }

  _renderPartySlotPicker() {
    const modal = document.getElementById("tnPartyModal");
    const cards = document.getElementById("tnPartyCards");
    if (!modal || !cards) return;
    const p = this.game.player;

    ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    const slotLabel = (slotNum, key) => {
      const mem = key ? PARTY_MEMBERS[key] : null;
      return mem ? `${mem.icon} ${mem.name} (${mem.className})` : "비어있음";
    };

    const SLOTS = [
      { num:1, key:p.party,  title:"1번째 동료",  sub:"일반 던전 동행" },
      { num:2, key:p.party2, title:"2번째 동료",  sub:"일반·심연 던전 동행" },
      { num:3, key:p.party3, title:"3번째 동료",  sub:"심연 던전 전용" },
    ];

    cards.innerHTML = `<p style="grid-column:1/-1;color:var(--text-dim);font-size:.78rem;margin-bottom:6px;">어느 동료를 바꾸시겠어요?</p>`;
    SLOTS.forEach(slot => {
      const btn = document.createElement("button");
      btn.className = "class-card";
      btn.innerHTML = `
        <div class="class-name">${slot.title}</div>
        <div class="class-desc" style="color:var(--gold2);font-size:.74rem;margin:4px 0;">${slotLabel(slot.num, slot.key)}</div>
        <div class="class-desc" style="font-size:.66rem;">${slot.sub}</div>`;
      btn.addEventListener("click", () => {
        const excludeIds = SLOTS.filter(s => s.num !== slot.num && s.key).map(s => s.key);
        this._renderPartyCardList(slot.num, excludeIds, true);
      });
      cards.appendChild(btn);
    });

    modal.style.display = "flex";
  }

  _renderPartyCardList(slotNum, excludeIds, fromPicker) {
    const modal = document.getElementById("tnPartyModal");
    const cards = document.getElementById("tnPartyCards");
    if (!modal || !cards) return;

    // 모달 열릴 때 캐릭터 슬롯 비우기 (공략 퀘스트와 동일)
    ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    // 닫기 버튼에 슬롯 복원 연결 (중복 방지)
    const closeBtn = document.getElementById("tnCloseParty");
    if (closeBtn && !closeBtn._slotRestored) {
      closeBtn._slotRestored = true;
      closeBtn.addEventListener("click", () => {
        if (this._renderTownCharacters) this._renderTownCharacters();
      });
    }

    // 파티원 초상화 맵
    const partyPortMap = {
      healer:     "images/portrait_healer.png",
      tanker:     "images/portrait_tanker.png",
      mage_party: "images/portrait_magician.png",
      archer:     "images/portrait_archer.png",
      dealer:     "images/portrait_Knight.png",
    };

    cards.innerHTML = "";
    if (fromPicker) {
      const backBtn = document.createElement("button");
      backBtn.className = "class-card";
      backBtn.style.cssText = "grid-column:1/-1;padding:8px;";
      backBtn.innerHTML = `<div class="class-name" style="font-size:.78rem;">← 슬롯 다시 고르기</div>`;
      backBtn.addEventListener("click", () => this._renderPartySlotPicker());
      cards.appendChild(backBtn);
    }

    Object.entries(PARTY_MEMBERS)
      .filter(([key]) => !excludeIds.includes(key))
      .forEach(([key, mem]) => {
        const btn = document.createElement("button");
        btn.className = "class-card";
        const portrait = partyPortMap[key] || "";
        btn.innerHTML = `
          ${portrait ? `<img src="${portrait}" style="width:56px;height:56px;object-fit:contain;border-radius:4px;margin-bottom:6px;" onerror="this.style.display='none'"/>` : `<div class="class-icon">${mem.icon}</div>`}
          <div class="class-name">${mem.name}</div>
          <div class="class-desc" style="color:var(--gold2);font-size:.72rem;margin-bottom:4px;">${mem.className}</div>
          <div class="class-desc">HP ${mem.hp} / ATK ${mem.attack} / DEF ${mem.defense}</div>`;
        btn.addEventListener("click", () => {
          if (slotNum === 1 && !fromPicker) {
            this.game.selectParty(key);
          } else {
            this.game.selectPartySlot(slotNum, key);
          }
          modal.style.display = "none";
          this.render();
        });
        cards.appendChild(btn);
      });

    modal.style.display = "flex";
  }
}

// ─── 은행/투자 메서드 ─────────────────────────────────────────
TownScene.prototype._openBankScreen = function() {
  const el=document.getElementById("bankScreen"); if(!el)return;
  el.style.display="flex"; this._switchBankTab("deposit");
  this._refreshBankScreen(); window._townScene=this;
  // 캐릭터 슬롯이 은행 UI를 가리지 않도록 숨김
  ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
    const slotEl = document.getElementById(id);
    if (slotEl) slotEl.innerHTML = "";
  });
};
TownScene.prototype._closeBankScreen = function() {
  const el=document.getElementById("bankScreen"); if(el)el.style.display="none"; this.render();
};
TownScene.prototype._switchBankTab = function(tab) {
  const dP=document.getElementById("bankDepositPane"),iP=document.getElementById("bankInvestPane");
  const dB=document.getElementById("bankTabDeposit"),iB=document.getElementById("bankTabInvest");
  if(dP)dP.style.display=tab==="deposit"?"block":"none";
  if(iP)iP.style.display=tab==="invest"?"block":"none";
  dB?.classList.toggle("bank-tab-active",tab==="deposit");
  iB?.classList.toggle("bank-tab-active",tab==="invest");
  this._refreshBankScreen();
};
TownScene.prototype._refreshBankScreen = function() {
  const p=this.game.player;
  const b=p.bank||{deposit:0,interest:0,totalInvested:0,milestones:[]};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
  set("bankGoldDisplay",`${p.money} G`);
  set("bankDepositAmt",`${b.deposit} G`);
  set("bankInterestAmt",`${b.interest} G`);
  const stage=getTownStage(b.totalInvested);
  set("bankStageIcon",stage.icon); set("bankStageName",stage.name);
  set("bankTotalInvested",`${b.totalInvested}G`);
  const list=document.getElementById("bankStageList"); if(!list)return;
  list.innerHTML="";
  TOWN_STAGES.forEach((s2,i)=>{
    if(i===0)return;
    const achieved=b.totalInvested>=s2.minInvest;
    const prevMin=TOWN_STAGES[i-1].minInvest;
    const pct=achieved?100:Math.floor(Math.max(0,b.totalInvested-prevMin)/(s2.minInvest-prevMin)*100);
    const row=document.createElement("div");
    row.style.cssText=`background:rgba(255,255,255,.03);border:1px solid ${achieved?"#44aa44":"#2e1e24"};border-radius:6px;padding:12px 16px;margin-bottom:8px;`;
    row.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span>${s2.icon} <strong style="color:${achieved?s2.color:"var(--text)"}">${s2.name}</strong></span>
      ${achieved?"<span style='color:#44cc44;'>✅ 달성!</span>":`<span style='font-size:.72rem;color:var(--text-dim);'>${b.totalInvested}/${s2.minInvest}G</span>`}
    </div><div style="height:8px;background:#180a0c;border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${s2.color}88;"></div></div>`;
    list.appendChild(row);
  });
};
TownScene.prototype._depositGold = function(amt) {
  const p=this.game.player,a=Math.min(amt,p.money); if(a<=0)return;
  p.money-=a;p.bank.deposit+=a; this.game.log(`🏦 ${a}G 예금!`);
  this._refreshBankScreen();this.render();
};
TownScene.prototype._depositAll = function(){this._depositGold(this.game.player.money);};
TownScene.prototype._withdrawGold = function(amt) {
  const p=this.game.player,b=p.bank,total=b.deposit+b.interest,a=Math.min(amt,total);
  if(a<=0)return;
  const fi=Math.min(a,b.interest);b.interest-=fi;b.deposit-=(a-fi);p.money+=a;
  this.game.log(`🏦 ${a}G 출금!`); this._refreshBankScreen();this.render();
};
TownScene.prototype._withdrawAll = function(){this._withdrawGold(this.game.player.bank.deposit+this.game.player.bank.interest);};
TownScene.prototype._investTown = function(amt) {
  const p=this.game.player,b=p.bank,a=Math.min(amt,p.money); if(a<=0)return;
  const prev=getTownStage(b.totalInvested);
  p.money-=a;b.totalInvested+=a;
  // 일일 투자 추적
  const today = new Date().toLocaleDateString("ko-KR");
  if (p.guideDailyDate === today) {
    p.guideDailyInvest = (p.guideDailyInvest || 0) + a;
  }
  const next=getTownStage(b.totalInvested);
  this.game.log(`🏗 ${a}G 투자!`);

  // 투자액에 비례한 소량 호감도 상승 (100G당 +1, 최대 +5/회)
  const affGain = Math.min(5, Math.floor(a / 100));
  if (affGain > 0) {
    p.princessAffinity = Math.min(100, (p.princessAffinity||0) + affGain);
  }

  // ── 단계 상승 시 NPC 대화 트리거 ──
  if (next.level > prev.level) {
    this.game.showNarrative(`🎉 마을이 발전했습니다!\n\n${next.icon} ${next.name}`, 2500);

    setTimeout(() => {
      if (next.level === 1) {
        // 처음 투자 → 이장 감사 대사
        if (!p.chiefInvestStartDone) {
          p.chiefInvestStartDone = true;
          this.showNpcDialogue("village_chief_invest_start");
        }
      } else if (next.level === 2) {
        // 번화가 달성 → 이장 격려 대사
        if (!p.chiefInvestBustlingDone) {
          p.chiefInvestBustlingDone = true;
          this.showNpcDialogue("village_chief_invest_bustling");
        }
      } else if (next.level === 3) {
        // 번영 완료 → 이장 대사 후 왕 등장
        if (!p.chiefInvestCompleteDone) {
          p.chiefInvestCompleteDone = true;
          // 이장 → (잠시 후) 왕 → 칭호 수여 순으로 연결 (폴링 대신 onClose 콜백)
          this.showNpcDialogue("village_chief_invest_complete", () => {
            setTimeout(() => {
              this.showNpcDialogue("king", () => {
                if (!p.dukeTitle) {
                  p.dukeTitle = true;
                  this.game.log("👑 공작 작위를 수여받았습니다!");
                  this.game.showNarrative("👑 공작 작위 수여\n\n왕실의 인장으로 공작이 되었습니다!\n이제 왕국과 한 가족입니다.", 4000);
                }
              });
            }, 800);
          });
        }
      }
    }, 2600); // 발전 내러티브 후에 표시
  } else if (prev.level === 0 && !p.chiefInvestStartDone && b.totalInvested > 0) {
    // 레벨업 없어도 첫 투자면 이장 감사 대사
    p.chiefInvestStartDone = true;
    setTimeout(() => this.showNpcDialogue("village_chief_invest_start"), 600);
  }

  INVEST_REWARDS.forEach(r=>{
    if(b.totalInvested>=r.minInvest&&!(b.milestones||[]).includes(r.minInvest)){
      if(!b.milestones)b.milestones=[];b.milestones.push(r.minInvest);
      if(r.atkBonus)p.bonusAttack=(p.bonusAttack||0)+r.atkBonus;
      if(r.hpBonus){p.maxHp+=r.hpBonus;p.hp=Math.min(p.hp+r.hpBonus,p.maxHp);}
      this.game.log(`🎁 투자 보상! ${r.msg}`);
    }
  });
  this._refreshBankScreen();this._updateTownBg();this.render();
};
TownScene.prototype._investAll = function(){this._investTown(this.game.player.money);};
TownScene.prototype._updateTownBg = function() {
  const stage=getTownStage(this.game.player.bank?.totalInvested||0);
  const bg=document.getElementById("townBgImg"); if(bg)bg.src=stage.bg;
};
TownScene.prototype._renderBankSidebar = function() {
  const p=this.game.player,bank=p.bank||{totalInvested:0,deposit:0,interest:0};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
  const stage=getTownStage(bank.totalInvested),nxt=getNextStage(bank.totalInvested);
  set("tnTownStageName",`${stage.icon} ${stage.name}`);
  set("tnTownInvested",`투자: ${bank.totalInvested}G`);
  if(nxt){
    set("tnTownNextGoal",`다음: ${nxt.name} (${nxt.minInvest-bank.totalInvested}G 남음)`);
    const prevMin=TOWN_STAGES[stage.level].minInvest;
    const pct=Math.floor((bank.totalInvested-prevMin)/(nxt.minInvest-prevMin)*100);
    const bar=document.getElementById("tnTownBar"); if(bar)bar.style.width=`${pct}%`;
  } else {
    set("tnTownNextGoal","✅ 최고 단계!");
    const bar=document.getElementById("tnTownBar"); if(bar)bar.style.width="100%";
  }
  set("tnSideDeposit",`예금: ${bank.deposit}G`);
  set("tnSideInterest",`이자: ${bank.interest}G`);
  set("tnPrincessAff", p.princessAffinity || 0);

  // 왕국 번영도 (8단계) — 전 지역 평균 재건도
  if (this.game.regionManager) {
    this.game.regionManager.ensureState(p);
    set("tnKingdomProsp", this.game.regionManager.kingdomProsperity(p));
  }
};

// ─── 저장/불러오기 ──────────────────────────────────────────────
TownScene.prototype._openSaveScreen = function() {
  const sc=document.getElementById("saveScreen");
  if(sc){sc.style.display="flex";this._renderSaveSlots("save");}
  window._townScene=this;
};
TownScene.prototype._renderSaveSlots = function(mode) {
  const ct=document.getElementById("saveSlotContainer"); if(!ct)return;
  ct.innerHTML="";

  // 초상화 맵 (플레이어 + 파티원 공통)
  const portMap={
    knight:   "images/portrait_Knight.png",
    mage:     "images/portrait_magician.png",
    magician: "images/portrait_magician.png",
    archer:   "images/portrait_archer.png",
    tanker:   "images/portrait_tanker.png",
    healer:   "images/portrait_healer.png",
    healer_party: "images/portrait_healer.png",
    tanker_party: "images/portrait_tanker.png",
  };
  // 파티원 key → 초상화
  const partyPortMap={
    healer:     "images/portrait_healer.png",
    tanker:     "images/portrait_tanker.png",
    mage_party: "images/portrait_magician.png",
    archer:     "images/portrait_archer.png",
    dealer:     "images/portrait_Knight.png",
  };

  const imgTag = (src, size=60) =>
    `<img src="${src}" style="width:${size}px;height:${size}px;object-fit:contain;border:1px solid #4a2e38;border-radius:2px;flex-shrink:0;" onerror="this.style.display='none'"/>`;

  for(let i=0;i<3;i++){
    const key=`rpgSave_slot_${i}`;
    let sp=null; try{const r=localStorage.getItem(key);if(r)sp=JSON.parse(r);}catch(e){}

    const pl = sp?.player || null;
    const card=document.createElement("div");
    card.style.cssText="background:rgba(255,255,255,.04);border:1px solid #3a2428;border-radius:6px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px;";

    if(pl){
      const psrc = portMap[pl.type] || portMap.knight;
      const d = sp.savedAt ? new Date(sp.savedAt).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "";

      // 파티원 초상화 (최대 3명)
      const parties = [pl.party, pl.party2, pl.party3].filter(Boolean);
      const partyImgs = parties.map(p => {
        const psrc2 = partyPortMap[p] || "";
        return psrc2 ? imgTag(psrc2, 44) : "";
      }).join("");

      card.innerHTML=`
        <!-- 플레이어 초상화 -->
        ${imgTag(psrc, 64)}
        <!-- 정보 -->
        <div style="flex:1;min-width:0;">
          <div style="font-size:.85rem;font-weight:700;color:var(--gold2);margin-bottom:3px;">
            ${pl.name||"플레이어"} <span style="font-size:.72rem;color:var(--text-dim);">(${pl.type||"?"})</span>
          </div>
          <div style="font-size:.7rem;color:var(--text-dim);margin-bottom:6px;">Lv.${pl.level||1} &nbsp;${d}</div>
          <!-- 파티원 초상화 -->
          ${parties.length ? `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <span style="font-size:.62rem;color:var(--text-dim);">파티:</span>
            ${partyImgs}
          </div>` : ""}
        </div>
        <!-- 버튼 -->
        <div style="display:flex;gap:6px;flex-shrink:0;">
          ${mode==="save"?`<button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);" onclick="window._townScene._doSave(${i})">덮어쓰기</button>`:""}
          ${mode==="load"?`<button class="bank-btn" style="border-color:#88aaff;color:#88aaff;" onclick="window._townScene._doLoad(${i})">불러오기</button>`:""}
          <button class="bank-btn" style="border-color:#aa4444;color:#cc6666;" onclick="window._townScene._doDelete(${i})">삭제</button>
        </div>`;
    } else {
      card.innerHTML=`
        <div style="width:64px;height:64px;border:1px dashed #3a2428;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:1.6rem;border-radius:2px;">?</div>
        <div style="flex:1;color:var(--text-dim);font-size:.82rem;">슬롯 ${i+1} — 빈 슬롯</div>
        ${mode==="save"?`<button class="bank-btn" style="border-color:var(--gold);color:var(--gold2);flex-shrink:0;" onclick="window._townScene._doSave(${i})">💾 저장</button>`:""}`;
    }
    ct.appendChild(card);
  }
};
TownScene.prototype._doSave = function(idx) {
  const sm = this.game.saveManager;
  if (sm && sm.save(this.game, idx)) {
    this.game.log(`💾 슬롯 ${idx+1}에 저장 완료!`);
    this._renderSaveSlots("save");
  } else {
    this.game.log("❌ 저장 실패");
  }
};
TownScene.prototype._doLoad = function(idx) {
  const sm = this.game.saveManager;
  if (!sm) return;
  const data = sm.load(idx);
  if (data) {
    this.game.player = sm.hydrate(data.player);
    this.game._hadLoad = true;
    this.game._toTown();
    this.game.log(`📂 슬롯 ${idx+1} 불러오기 완료!`);
  } else {
    this.game.log("❌ 저장 데이터 없음");
  }
};
TownScene.prototype._doDelete = function(idx) {
  if (confirm(`슬롯 ${idx+1}을 삭제할까요?`)) {
    const sm = this.game.saveManager;
    if (sm) { sm.deleteSlot(idx); this._renderSaveSlots("save"); }
  }
};

// ─── NPC 대화 시스템 ─────────────────────────────────────────────
const NPC_DATA = {
  merchant:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["어서오세요, 용사님! 요즘 성 안 상황이 심상치 않습니다...","마왕 다르카스의 군세가 날이 갈수록 강해지고 있어요.","그러고 보니, 왕국의 실비아 공주님께서 용사님을 꼭 만나고 싶다 하셨어요!","공주님이 마왕 토벌에 대한 중요한 조언을 해주실 거예요. 📋 공략 퀘스트 버튼을 눌러보세요!"]},
  merchant_after_battle:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["수고하셨습니다, 용사님! 무사히 돌아오셨군요. 정말 다행이에요. 😊","다음 전투까지 푹 쉬세요! 저도 좋은 물건 준비해 두겠습니다. 💰"]},
  merchant_after_flee:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["잘 돌아오셨습니다, 용사님! 무사히 살아 돌아오셨으니 그것만으로도 다행이에요. 😅","서두를 필요 없어요. 여관에서 충분히 쉬시고, 장비도 정비해 두세요. 제가 도와드릴게요! 🛒","준비가 됐다 싶으면 다시 도전하시죠! 용사님이라면 반드시 해낼 수 있을 거예요. 💪"]},
  merchant_welcome_back:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:["오, 돌아오셨네요! 다시 뵙게 되어 반갑습니다, 용사님. 😊","그동안 별일 없으셨죠? 마왕 토벌은 차근차근 준비하시면 됩니다.","필요한 게 있으면 언제든 말씀하세요. 좋은 물건 준비해 두었습니다! 🛒"]},
  village_chief:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "당신이 전설의 용사군요. 저는 에드워드 왕국의 공주 실비아입니다.",
      "이 마을은 마왕의 침략으로 황폐해졌어요. 왕가로서 책임감을 느끼고 직접 이곳에 왔습니다.",
      "마왕 다르카스를 쓰러뜨리려면 철저한 준비가 필요해요. 제가 체크리스트를 만들었으니 참고해 주세요.",
      "📋 공략 퀘스트를 하나씩 완료하시면 반드시 마왕을 이길 수 있을 거예요. 저도 돕겠습니다!",
    ]},

  // ── 마을 투자 시작 시 ──
  village_chief_invest_start:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "정말요?! 마을에 투자해 주셨군요! 너무 감사해요, 용사님! 💕",
      "이제 사람들이 성 안 마을을 다시 일으킬 수 있게 됐어요. 덕분이에요, 정말!",
      "저도 함께 투자할게요. 우리 같이 이 마을을 되살려 봐요! 화이팅! 🏗",
    ]},

  // ── 광산도시 출발 전 — 공주의 사전 설명 (월드맵에서 광산도시 선택 시) ──
  princess_brief_mine:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "광산도시 쪽 소식이 들어왔어요... 상황이 많이 안 좋은 것 같아요.",
      "몬스터들의 습격으로 갱도 여러 곳이 무너졌고, 제련소도 멈춰버렸대요.",
      "그곳에서 캐낸 광물로 나라 살림과 겨울 난방을 버텨왔는데, 지금은 그조차 끊겼다고 해요.",
      "남아 있는 광부들이 어떻게든 버티고 있다고는 하는데... 용사님이 가주시면 정말 큰 힘이 될 거예요.",
      "조심히 다녀오세요. 저는 여기서 계속 기다리고 있을게요.",
    ]},

  // ── 광산도시 도착 — 광부 두칸의 인사 + 투자 안내 ──
  miner_chief:{name:"광부 두칸",nameColor:"#e8a850",portrait:"images/Chibi miner character dukhan.png",
    dialogues:[
      "...누구요? 아, 성에서 보내주신 용사님이시군요!",
      "보시다시피 갱도가 다 무너졌습니다. 제련소 불도 꺼진 지 오래고요.",
      "여기서 캐낸 광물이 끊기니 마을 살림도, 겨울 난방도 다 막막해졌습니다.",
      "용사님 덕분에 다시 시작할 수 있을 것 같습니다. 골드를 투자해주시면 갱도를 차근차근 복구해보겠습니다.",
      "그리고... 안에 아직 몬스터들이 들끓고 있으니, 정리도 좀 부탁드립니다. 😓",
    ]},

  // ── 광산도시 — 던전 출발 전 1회성 응원 ──
  miner_chief_send_off:{name:"광부 두칸",nameColor:"#e8a850",portrait:"images/Chibi miner character dukhan.png",
    dialogues:[
      "정말로 들어가시는 겁니까... 부디 조심하십시오.",
      "갱도 안은 저보다 용사님이 훨씬 잘 아실 테니, 길게 말 안 하겠습니다.",
      "다녀오십시오. 여기서 무사히 돌아오시길 기다리고 있겠습니다! ⛏",
    ]},

  // ── 광산도시 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  miner_chief_welcome_back:{name:"광부 두칸",nameColor:"#e8a850",portrait:"images/Chibi miner character dukhan.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내세요! ⛏",
    ]},

  // ── 항구도시 출발 전 — 공주의 사전 설명 (월드맵에서 항구도시 선택 시) ──
  princess_brief_harbor:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "이번엔 항구도시 소식이에요. 거기도... 사정이 심각해요.",
      "해적들이 들이닥쳐서 항구를 통째로 약탈하고 불을 질렀대요. 배들도 거의 다 가라앉았고요.",
      "항구가 막히니 다른 나라와의 교역도, 생필품 들어오는 길도 다 끊겼어요.",
      "다행히 항구장님이 남은 사람들을 모아서 어떻게든 버티고 계신다고 해요.",
      "해적들이 아직 근처에 숨어 있을지도 몰라요. 부디 조심하세요, 용사님.",
    ]},

  // ── 항구도시 도착 — 항구장 모리스의 인사 + 투자 안내 ──
  harbor_master:{name:"항구장 모리스",nameColor:"#5ad0e8",portrait:"images/Chibi character morris.png",
    dialogues:[
      "오, 살아있는 사람이 또 오다니! 성에서 보내신 용사님이시군요.",
      "해적 놈들이 다 태우고 부수고 갔습니다. 방파제도 무너지고, 배도 거의 남은 게 없어요.",
      "교역이 끊기니 식량도, 약도 다 부족합니다. 이대로면 겨울을 못 넘길 것 같았는데...",
      "용사님이 투자를 해주신다면, 방파제부터 차근차근 다시 세워보겠습니다.",
      "참, 항구 안쪽에 해적 잔당들이 아직 숨어 있는 것 같으니 조심하십시오. 🏴‍☠️",
    ]},

  // ── 항구도시 — 던전 출발 전 1회성 응원 ──
  harbor_master_send_off:{name:"항구장 모리스",nameColor:"#5ad0e8",portrait:"images/Chibi character morris.png",
    dialogues:[
      "벌써 안쪽으로 들어가시려고요? 거친 뱃사람들도 다 떠난 곳입니다, 정말 괜찮으시겠습니까.",
      "용사님이라면 분명 해내실 거라 믿습니다. 항구의 운명이 거기 달려있군요.",
      "무사히 돌아오십시오. 돌아오시면 따뜻한 거 한 그릇 대접하겠습니다! ⚓",
    ]},

  // ── 항구도시 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  harbor_master_welcome_back:{name:"항구장 모리스",nameColor:"#5ad0e8",portrait:"images/Chibi character morris.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내세요! ⚓",
    ]},

  // ── 깊은 숲 출발 전 — 공주의 사전 설명 (월드맵에서 깊은 숲 선택 시) ──
  princess_brief_forest:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "이번엔... 조금 다른 이야기예요. 깊은 숲에 사는 엘프들에 대한 거예요.",
      "오래전, 그 숲 근처 인간 마을이 광산을 넓히려고 숲을 베어내다가 엘프들의 성소를 무너뜨렸대요.",
      "그 일로 많은 엘프들이 목숨을 잃었고... 그 후로 엘프들은 인간을 아예 들이지 않게 됐어요.",
      "그런데 지금 몬스터들이 그 약해진 결계를 뚫고 들어가서, 엘프들도 더는 버틸 수가 없는 상황이래요.",
      "용사님이 가신다 해도 쉽게 마음을 열어주진 않을 거예요. 그래도... 부디 도와주세요.",
    ]},

  // ── 깊은 숲 도착 — 엘프 장로 실라의 인사 (경계심 가득) ──
  elf_elder:{name:"엘프 장로 실라",nameColor:"#6cd0a0",portrait:"images/Cilla the Elder Elf.png",
    dialogues:[
      "...인간이 또 여기까지 왔군요. 무슨 볼일이죠?",
      "그쪽 사정은 들었지만, 우리는 인간을 쉽게 믿지 않습니다. 한 번 잃은 것은 돌아오지 않으니까요.",
      "다만... 지금 몬스터들 때문에 결계가 다 무너져가는 건 사실이에요. 이대로면 숲도, 우리도 끝입니다.",
      "정말로 우리를 도울 마음이 있다면, 행동으로 보여주세요. 말은... 너무 많이 들었거든요.",
      "결계를 되살리는 데에는 정령의 힘이 필요해요. 그게 곧 당신이 가져오는 도움이 되겠죠.",
    ]},

  // ── 깊은 숲 — 던전 출발 전 1회성 응원(경계심 섞인) ──
  elf_elder_send_off:{name:"엘프 장로 실라",nameColor:"#6cd0a0",portrait:"images/Cilla the Elder Elf.png",
    dialogues:[
      "정말로 들어가겠다는 거군요... 아직 당신을 다 믿는 건 아니지만,",
      "그래도... 행동으로 보여주겠다는 말은 거짓이 아닌 듯하네요. 조심해서 다녀오세요.",
      "정령들이 당신을 지켜보고 있을 거예요. 🌿",
    ]},

  // ── 깊은 숲 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  elf_elder_welcome_back:{name:"엘프 장로 실라",nameColor:"#6cd0a0",portrait:"images/Cilla the Elder Elf.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내세요. 🌿",
    ]},

  // ── 수도 출발 전 — 공주의 사전 설명 (월드맵에서 수도 선택 시) ──
  princess_brief_capital:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 이건 정말 심각한 얘기예요. 왕성에... 마왕의 부하들이 숨어들었어요.",
      "근위대 대부분이 당했고, 백성들 일부가 인질로 잡혀 있다는 소식이 들어왔어요.",
      "아버지께서도 지금 안전을 확인할 수가 없는 상황이에요... 저도 너무 두려워요.",
      "근위대장 레오니스 님이 남은 병력으로 어떻게든 버티고 계신다고 해요. 그분이 용사님을 기다리고 있을 거예요.",
      "부탁이에요... 인질들도, 그리고 아버지도 꼭 무사히 구해주세요.",
    ]},

  // ══════════════════════ 사천왕 진짜 영역 — 용암 협곡 (그라모스) ══════════════════════

  // ── 용암 협곡 출발 전 — 공주의 사전 설명 ──
  princess_brief_lava:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 왕국이 다시 평화로워졌다고 생각했는데... 레오니스 님이 또 다른 소식을 가져오셨어요.",
      "광산도시에서 처치했던 그라모스... 그게 사실은 진짜가 아니었다는 거예요.",
      "분신, 혹은 그림자 같은 존재였다고 해요. 진짜 그라모스는 용암 협곡 깊은 곳에 여전히 살아있대요.",
      "더 강하고, 더 위험하다고 들었어요. 이번엔 정말로 끝을 봐야 할 것 같아요.",
      "레오니스 님이 협곡 입구에서 기다리고 계세요. 부디... 조심하세요.",
    ]},

  // ── 용암 협곡 거점 도착 인사 ──
  royal_guard_captain_lava:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "용사님, 와주셨군요. 믿기 힘든 얘기지만... 들어주십시오.",
      "광산도시에서 쓰러뜨린 그라모스, 그건 진짜가 아니었습니다. 정찰병들이 확인했습니다.",
      "이 협곡 가장 깊은 곳에, 그라모스의 진짜 본체가 숨어 있습니다. 분신보다 훨씬 강할 겁니다.",
      "왕실의 이름으로 토벌대를 꾸려 협곡에 거점을 마련하겠습니다. 용사님께 다시 한번 부탁드립니다.",
      "이번엔 확실하게 끝을 내야 합니다. 진짜 그라모스를 말입니다.",
    ]},

  // ── 용암 협곡 — 던전 출발 전 1회성 응원 ──
  royal_guard_captain_lava_send_off:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "협곡 깊은 곳의 열기는 보통이 아닙니다. 정찰대도 가까스로 살아 돌아왔습니다.",
      "하지만 용사님이라면 분명 해내실 겁니다. 이번엔 가짜가 아닌, 진짜를 상대하시는 겁니다.",
      "무사히 돌아오십시오. 왕국 전체가 용사님께 빚을 지고 있다는 걸 잊지 마십시오.",
    ]},

  // ── 용암 협곡 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  royal_guard_captain_lava_welcome_back:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내십시오! 🌋",
    ]},

  // ── 그라모스 진짜 본체 — 전투 직전 반전 대사 ──
  gramos_true_pre_fight:{name:"???",nameColor:"#ff6622",portrait:"images/sd_Dungeon_Guardian.png",
    dialogues:[
      "...왔군. 광산에서 네가 처치한 건, 내가 떼어낸 분신에 불과했다.",
      "그 정도 그릇으로 진짜 나를 상대할 수 있다고 생각했나? 우습군.",
      "여기서, 진짜 그라모스의 힘을 똑똑히 새겨주겠다.",
    ]},

  // ── 그라모스 진짜 본체 격파 후 — 축제 시작 (투자 완료 + 격파 모두 끝났을 때) ──
  royal_guard_captain_lava_festival_intro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "...해내셨군요. 진짜 그라모스의 기운이 완전히 사라졌습니다. 정찰대가 확인했습니다.",
      "분신이 아닌 본체를 직접 쓰러뜨리신 겁니다. 이건 정말... 역사에 남을 일입니다.",
      "협곡의 열기도 점점 가라앉고 있습니다. 이제 이곳도 안전한 땅이 될 겁니다.",
    ]},

  lava_festival_outro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "용암 협곡은 이제 완전히 평정되었습니다. 다음 목표로 넘어가야 할 것 같습니다.",
      "아직 세 곳이 더 남았습니다만... 용사님이라면 분명 해내실 겁니다. ⚔🌋",
    ]},

  // ══════════════════════ 사천왕 진짜 영역 — 심해 폐선 (바르칸) ══════════════════════

  princess_brief_sunken:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "그라모스도 분신이었다니... 그렇다면 다른 간부들도 마찬가지일까요?",
      "레오니스 님 말로는, 항구도시에서 처치한 바르칸도 똑같은 경우라고 해요.",
      "진짜 바르칸은 가라앉은 함대의 잔해 속에 숨어 있대요. 심해 폐선이라 불리는 곳이요.",
      "물 속 깊은 곳이라 위험이 다를 거예요. 부디 몸 조심하세요.",
    ]},

  royal_guard_captain_sunken:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "그라모스를 처치하시자마자 바로 다음 소식이 들어왔습니다. 항구도시의 바르칸도 분신이었습니다.",
      "진짜 바르칸은 가라앉은 함대의 잔해, 심해 폐선 깊은 곳에 몸을 숨기고 있다고 합니다.",
      "잠수 장비부터 갖춰야 할 것 같습니다. 왕실의 지원을 받아 준비하겠습니다.",
      "이번에도 부탁드립니다, 용사님.",
    ]},

  royal_guard_captain_sunken_send_off:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "폐선 안쪽은 수압도 상당하고, 시야도 거의 없다고 들었습니다.",
      "그래도 용사님이라면... 그라모스도 쓰러뜨리셨으니, 바르칸도 분명 해내실 겁니다.",
      "무사히 돌아오십시오. ⚓",
    ]},

  // ── 심해 폐선 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  royal_guard_captain_sunken_welcome_back:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내십시오! ⚓",
    ]},

  barkan_true_pre_fight:{name:"???",nameColor:"#2090d0",portrait:"images/sd_Dungeon_Guardian.png",
    dialogues:[
      "...항구에서 죽은 건 내 그림자였을 뿐이다. 진짜 나는 이 바다 밑에서 줄곧 너를 지켜보고 있었지.",
      "분신 하나 처치했다고 의기양양했나? 진짜 폭풍이 어떤 건지 보여주마.",
    ]},

  royal_guard_captain_sunken_festival_intro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "...해냈군요! 진짜 바르칸이 사라진 게 폐선 전체에서 느껴질 정도입니다.",
      "이걸로 둘째 본체까지 끝났습니다. 정말 대단하십니다, 용사님.",
    ]},

  sunken_festival_outro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "심해 폐선도 완전히 정리됐습니다. 이제 둘 남았군요.",
      "이대로라면 사천왕 전체를 진짜로 끝낼 수 있을 것 같습니다. ⚓🚢",
    ]},

  // ══════════════════════ 사천왕 진짜 영역 — 오염된 정령숲 (릴리스) ══════════════════════

  princess_brief_grove:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "그라모스, 바르칸... 둘 다 분신이었다면, 릴리스도 마찬가지겠죠.",
      "깊은 숲에서 처치한 건 역시 그림자였대요. 진짜 릴리스는 정령숲 가장 오염된 핵심부에 있다고 해요.",
      "실라 님과 아리아가 그렇게 애써서 정화한 곳인데... 그 아래에 더 깊은 오염이 남아있었다니.",
      "이번에도 부탁드려요, 용사님.",
    ]},

  royal_guard_captain_grove:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "바르칸에 이어 릴리스도 같은 경우로 확인됐습니다. 정령숲 가장 깊은 핵심부에 진짜가 있습니다.",
      "정화 제단을 세워서 접근로를 마련하겠습니다. 시간이 좀 걸리겠지만, 반드시 길을 열겠습니다.",
      "실라 님과 아리아 님이 애써 되살린 땅인데, 또 이런 일이 생겨서 유감입니다.",
      "용사님, 이번에도 함께해주십시오.",
    ]},

  royal_guard_captain_grove_send_off:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "이 안쪽은 오염이 짙어서, 정신이 흐려질 수도 있다고 들었습니다. 조심하셔야 합니다.",
      "그래도 용사님이라면 이겨내실 겁니다. 두 본체를 이미 쓰러뜨리셨으니까요.",
      "무사히 다녀오십시오. 🌿",
    ]},

  // ── 오염된 정령숲 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  royal_guard_captain_grove_welcome_back:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내십시오! 🌿",
    ]},

  lilith_true_pre_fight:{name:"???",nameColor:"#a060e0",portrait:"images/sd_Dungeon_Guardian.png",
    dialogues:[
      "...깊은 숲에서 죽은 건 내 일부였을 뿐, 진짜 나는 이 오염의 핵심에서 줄곧 자라나고 있었다.",
      "정령들의 힘을 뒤틀어 키운 이 힘, 분신 따위와는 비교할 수 없지.",
      "이곳에서 영원히 잠들게 해주마.",
    ]},

  royal_guard_captain_grove_festival_intro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "...진짜 릴리스의 기운이 완전히 사라졌습니다! 오염의 핵심부가 정화되고 있다는 보고입니다.",
      "셋째 본체까지 끝내셨습니다. 이제 정말 마지막 하나입니다.",
    ]},

  grove_festival_outro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "오염된 정령숲도 이제 완전히 정화됐습니다. 정말 마지막 한 곳만 남았습니다.",
      "왕성 지하 감옥, 벨제론의 진짜 본체입니다. 마지막까지 함께해주십시오. 🌿🕸",
    ]},

  // ══════════════════════ 사천왕 진짜 영역 — 왕성 지하 감옥 (벨제론) ══════════════════════

  princess_brief_dungeon:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "마지막... 벨제론이군요. 그것도 분신이었다는 게 믿기지 않지만, 이젠 놀랍지도 않아요.",
      "진짜 벨제론은... 다름 아닌 왕성 깊은 곳, 빛이 닿지 않는 지하 감옥에 숨어 있었대요.",
      "우리가 구했던 그 왕성 바로 아래에 말이에요. 정말 소름이 끼치는 얘기예요.",
      "용사님, 이게 정말 마지막이에요. 부디 무사히 끝내주세요.",
    ]},

  royal_guard_captain_dungeon:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "마지막 본체입니다. 벨제론의 진짜는... 왕성 지하, 우리가 미처 살피지 못한 감옥 깊은 곳에 있었습니다.",
      "수도를 되찾았다고 안심하고 있었는데, 정작 가장 가까운 곳에 숨어 있었다니 부끄럽습니다.",
      "지금 통로를 열고 봉인을 해제하는 작업을 진행 중입니다. 곧 길이 열릴 겁니다.",
      "용사님, 이게 사천왕의 진짜 마지막입니다. 끝까지 함께 가주십시오.",
    ]},

  royal_guard_captain_dungeon_send_off:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "이 지하 감옥은... 왕성의 가장 어두운 곳입니다. 빛조차 닿지 않는다고 합니다.",
      "하지만 용사님은 이미 셋을 쓰러뜨리셨습니다. 마지막 하나도 분명 해내실 겁니다.",
      "왕국의 모든 이들이 용사님을 믿고 있습니다. 무사히 돌아오십시오. ⛓",
    ]},

  // ── 왕성 지하 감옥 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  royal_guard_captain_dungeon_welcome_back:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내십시오! ⛓",
    ]},

  belzeron_true_pre_fight:{name:"???",nameColor:"#a83cff",portrait:"images/sd_Dungeon_Guardian.png",
    dialogues:[
      "...왕성에서 죽은 건 분신이었다. 진짜 나는 줄곧 이 감옥에서, 너희가 자만하는 모습을 지켜보고 있었지.",
      "그라모스, 바르칸, 릴리스... 동료들이 차례로 쓰러지는 걸 봤다. 하지만 나는 다르다.",
      "사천왕의 마지막, 그리고 가장 강한 본체다. 여기서 끝을 보자.",
    ]},

  royal_guard_captain_dungeon_festival_intro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "...벨제론의 진짜 본체가 사라졌습니다! 왕성 지하 전체가 떨림을 멈췄다는 보고가 들어왔습니다.",
      "정말로... 해내셨군요. 사천왕의 마지막 본체까지 전부.",
    ]},

  // ── 4지역 전부 완료 — 사천왕 진짜 전멸 선언 (마지막 지역의 outro) ──
  sacheonwang_all_defeated_outro:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "그라모스, 바르칸, 릴리스, 벨제론... 사천왕의 진짜 본체 넷 모두가 사라졌습니다.",
      "왕국 곳곳에 남아있던 분신들의 흔적도 더 이상 힘을 받지 못하고 있다는 보고가 속속 들어오고 있습니다.",
      "이건 단순한 승리가 아닙니다. 마왕군의 진짜 핵심을 완전히 뿌리뽑은 겁니다.",
      "용사님, 왕국의 이름으로 진심으로 감사드립니다. 이제 진짜 평화가 시작될 것 같습니다. 👑⚔",
    ]},

  // ── 수도 도착 — 근위대장 레오니스의 다급한 인사 ──
  royal_guard_captain:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "용사님! 드디어 오셨군요. 시간이 없습니다, 바로 본론부터 말씀드리겠습니다.",
      "마왕의 부하들이 왕성 깊은 곳까지 잠입해서 백성들 여럿을 인질로 잡고 있습니다.",
      "국왕 전하의 행방도 아직 파악이 안 됩니다... 무사하시길 바랄 뿐입니다.",
      "병력을 추슬러 친위대를 재건하면서, 동시에 안쪽 구역을 탈환해야 합니다. 시간이 걸리겠지만 반드시 해내겠습니다.",
      "용사님께서 직접 안으로 들어가 인질들을 구하고 그 잔당들을 정리해주셔야 합니다. 부탁드립니다.",
    ]},

  // ── 수도 — 던전 출발 전 1회성 응원 ──
  royal_guard_captain_send_off:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "출발하시는 겁니까. 저희도 바깥에서 최선을 다해 길을 뚫어보겠습니다.",
      "왕국의 운명이, 그리고 안에 갇힌 백성들의 목숨이 용사님께 달려있습니다.",
      "맡겨주십시오. 부디 무사히 돌아오시길, 저희도 끝까지 자리를 지키겠습니다! 🛡",
    ]},

  // ── 수도 — 거점 재방문 시 (매번) 짧은 환영 인사 ──
  royal_guard_captain_welcome_back:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "다시 오셨군요! 돌아와주셔서 감사합니다. 힘내십시오! 🛡",
    ]},

  // ── 마을 번화가 달성 시 ──
  village_chief_invest_bustling:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "오, 믿기지 않아요! 황폐했던 이 마을에 이렇게 사람들이 모여들다니! 🏘 너무 기뻐요!",
      "용사님 덕분에 상인들이 돌아오고 아이들 웃음소리가 들리기 시작했어요. 정말 대단하세요!",
      "저도 왕가의 자금을 더 지원할게요. 함께라면 이 마을을 완전히 되살릴 수 있어요! 💪",
    ]},

  // ── 마을 번영 완료 + 왕 등장 ──
  village_chief_invest_complete:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 눈물이 날 것 같아요. 이 마을이 이렇게 아름답게 빛나다니! 🌟",
      "용사님이 이 마을을 완전히 되살려 주셨어요. 황폐했던 땅이 왕국 최고의 도시가 됐어요!",
      "아버지께—아, 폐하께서 용사님의 공적을 들으시고 직접 행차하신다 하셨어요. 저도 소개해 드릴게요!",
    ]},

  king:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "짐이 직접 이곳에 오게 되다니... 이 마을의 놀라운 변화를 두 눈으로 확인하고 싶었소.",
      "용사여, 그대가 이 왕국의 성 안 마을을 황폐에서 번영으로 이끌었다는 소식을 들었소. 우리 성안의 문제와 도움을 줘서 진심으로 고맙네.",
      "이 은혜를 어찌 갚을까 생각했소. 그대에게 왕실의 인장으로 공작 작위를 내리지. 이제 우리는 한 가족이야! 👑",
      "그리고 내 딸 실비아가 그대를 신뢰한다 했소. 그것으로 이미 충분하오. 어서 마왕을 물리치고 이 왕국에 완전한 평화를 가져다 주기 바라오!",
    ]},

  // ── 수도 재건 완료 컷신 ① — 마왕이 직접 나타남 (충격적인 진실의 시작) ──
  capital_ending_appearance:{name:"???",nameColor:"#aa2244",portrait:"images/sd_Demon.png",bgImage:"images/capital_ending_appearance.png",
    dialogues:[
      "...여기까지 잘 해냈구나, 인간.",
      "수도의 일도, 지역들의 일도... 전부 내 손바닥 위에서 벌어진 일이었다는 걸 알고 있나?",
      "너희는 이미 늦었다. 전하께서는... 진실을 알게 되셨지.",
      "내 부하들을 그렇게나 처치했으니, 직접 인사라도 해야 할 것 같아서 와봤다.",
    ]},

  // ── 수도 재건 완료 컷신 ② — 충격적인 진실: 마왕은 봉인의 관리자였다 ──
  capital_ending_truth:{name:"???",nameColor:"#aa2244",portrait:"images/sd_Demon.png",bgImage:"images/Chained_in_darkness_under_a_tyrants_gaze.png",
    dialogues:[
      "다만... 한 가지는 정정해야겠군. 너희가 '마왕'이라 부르며 두려워한 존재, 그게 바로 나라고 믿었겠지.",
      "하지만 나는 그 이름의 진짜 주인이 아니다. 나는... 그저 그를 가둔 봉인을 관리하는 자일 뿐이야.",
      "진짜 마왕 다르카스는 심연 가장 깊은 곳에 봉인되어 있다. 내가 그 문을 지키고 있었을 뿐이지.",
    ]},

  // ── 수도 재건 완료 컷신 ③ — 전투 직전 도발 ──
  capital_ending_sealkeeper:{name:"봉인의 관리자",nameColor:"#aa2244",portrait:"images/sd_Demon.png",bgImage:"images/capital_ending_sealkeeper.png",
    dialogues:[
      "그 봉인을 건드리고 싶다면... 먼저 나를 넘어서야 할 것이다.",
      "이곳까지 온 너의 각오가 진심인지, 내가 직접 확인해보겠다!",
    ]},

  // ══ 전투(봉인의 관리자) 승리 후 — 아래부터 순서대로 재생 ══

  // ── ④ 재회 (공주) ──
  capital_ending_reunion:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "아버지...!",
    ]},

  // ── ⑤ 왕 구출 — 일부러 숨었다는 진실 (왕) ──
  capital_ending_rescue:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "...그대가 여기까지 왔군.",
      "미안하구나. 나는... 일부러 모습을 감췄다.",
      "납치당한 것이 아니야. 알아야만 하는 진실이 있었고, 그것을 확인하기 위해 스스로 자리를 비운 것이었다.",
    ]},

  // ── ⑥ 진실 공개 (왕) ──
  capital_ending_kingtruth:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "마왕은 단순한 침략자가 아니다.",
      "심연의 봉인이... 점점 약해지고 있다.",
      "그 봉인이 완전히 무너지면, 이 세계는 사라지게 될 것이다.",
      "마왕은 바로 그 힘을 차지하려 하고 있는 것이다.",
    ]},

  // ── ⑦ 동료 반응 (파티에 있을 때만 등장) ──
  capital_ending_companion_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["...그래서 지금까지의 재난이 다 그것 때문이었군."]},
  capital_ending_companion_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["숲의 오염도... 그 때문이었군요."]},
  capital_ending_companion_mage:{name:"엘린",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:["금지된 연구 기록에서... 비슷한 내용을 본 적이 있어요."]},

  // ── ⑦.5 시민들이 광장에 모여듦 — 왕의 복귀를 직접 눈으로 확인 (작위 수여식 직전) ──
  capital_ending_plaza:{name:"근위대장 레오니스",nameColor:"#ffd700",portrait:"images/Leonis the loyal knight boss.png",
    dialogues:[
      "전하께서 무사히 돌아오셨다는 소식이 벌써 온 왕성에 퍼졌습니다.",
      "보십시오, 광장에 백성들이 끝없이 모여들고 있습니다. 전부 직접 눈으로 확인하고 싶었던 거겠죠.",
      "전하께서도 이 자리에서, 모두가 보는 앞에서 직접 용사님께 치하하시겠다고 하셨습니다.",
    ]},

  // ── ⑧ 작위 수여 — 왕국의 수호자 (왕) ──
  capital_ending_title:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여, 그대는 단순한 모험가가 아니다.",
      "지금부터 그대를... 왕국의 수호자로 임명하겠다.",
    ]},

  // ── ⑨ 심연의 열쇠 + 엔딩 떡밥 (왕) ──
  capital_ending_key:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "심연의 문은... 왕실의 열쇠로만 열린다. 이것을 가져가거라.",
      "용사여... 마왕을 쓰러뜨린다고 해서, 모든 것이 끝나는 것은 아니다.",
      "그 말이 무슨 뜻인지는... 그곳에 가면 알게 될 것이다. 부디 무사히 돌아오길 바란다.",
    ]},

  // ══════════════ 심연 메인 스토리 — 마왕 다르카스 ══════════════

  // ── 보스룸 진입 직전 — 다르카스 등장, 전투 전 대사 ──
  darkas_pre_fight:{name:"마왕 다르카스",nameColor:"#ff3333",portrait:"images/sd_Demon.png",bgImage:"images/seal_collapse.png",
    dialogues:[
      "...드디어 여기까지 왔군. 내 부하들을 그렇게나 거두고도, 아직 멈추지 않다니.",
      "내가 왜 마왕군을 일으켰는지... 알고 싶나? 간단하다. 이 봉인에서 벗어나려면 힘이 필요했을 뿐이야.",
      "그 사천왕들도, 봉인의 관리자도... 전부 나를 위해 움직인 도구였을 뿐이지.",
      "이제 너도 알았으니, 더는 망설일 이유가 없겠지. 자, 보여줘라 — 그 각오가 진심인지.",
    ]},

  // ── 패배 직후 — "나조차도 그릇일 뿐이었다" 떡밥 ──
  darkas_post_defeat:{name:"마왕 다르카스",nameColor:"#ff3333",portrait:"images/sd_Demon.png",
    dialogues:[
      "...크윽. 설마, 여기서 이렇게 끝나다니.",
      "하지만... 너는 아직 모른다. 나조차도... 그저 그릇일 뿐이었다는 것을.",
      "이 몸에 담겨 있던 건 내 힘이 아니었어. 훨씬 더 깊은 곳에서 흘러나온... 무언가였지.",
      "그게 무엇인지, 어디서 왔는지... 그건 내가 사라진 뒤에야 비로소 드러나겠지.",
      "...크하하. 부디 끝까지 가보아라, 용사여. 진짜는... 아직 시작도 안 했으니까.",
    ]},

  // ── 봉인 붕괴 — 다르카스의 몸이 무너지며 그 안에 갇혀 있던 진짜 존재가 풀려난다 ──
  seal_collapse:{name:"기사",nameColor:"#ffe9a8",portrait:"images/portrait_Knight.png",bgImage:"images/Final_stand_in_the_arcane_temple.png",
    dialogues:[
      "...다르카스의 몸에서 빠져나온 그 기운이, 점점 커지고 있다.",
      "이건... 단순한 잔재가 아니야. 무언가가 깨어나고 있다.",
    ]},

  // ── 진짜 존재 등장 — 공허의 군주 네메시스 ──
  nemesis_appearance:{name:"???",nameColor:"#a83cff",portrait:"images/Nemesis_Lord_of_the_Void.png",bgImage:"images/Heroes_face_looming_dark_god_in_cathedral2.png",
    dialogues:[
      "...드디어. 그 오랜 봉인이 풀렸구나.",
      "나는 네메시스. 너희가 셀 수도 없을 만큼 오래전부터, 이 심연 가장 깊은 곳에 갇혀 있던 공허의 군주다.",
      "그 가엾은 그릇은... 제 역할을 다했군. 자, 이제는 진짜를 상대해 보아라.",
    ]},

  // ── 다르카스의 마지막 말 — 전투 직전 ──
  darkas_final_words:{name:"마왕 다르카스",nameColor:"#ff3333",portrait:"images/sd_Demon.png",bgImage:"images/darkas_final_words.png",
    dialogues:[
      "...아직, 끝나지 않았다.",
      "예전에도 한 번... 누군가 저것을 막으려 했었지. 그때는... 실패했다.",
      "용사여, 이번에는 다를지도 모른다는 생각이 드는군. 어째서인지는 모르겠지만.",
      "부디... 이번에는 성공해라...!",
    ]},

  // ── 네메시스 격파 이후 — 다르카스의 죽음 확인 + 세계의 완전한 재건 ──
  nemesis_victory_epilogue:{name:"기사",nameColor:"#ffe9a8",portrait:"images/portrait_Knight.png",
    dialogues:[
      "...네메시스가 사라졌다. 정말로... 끝난 건가.",
      "그 마지막 일격을 대신 받아낸 순간, 다르카스도... 결국 숨을 거두고 말았다.",
      "그가 어떤 존재였는지는 끝까지 다 알 수 없었지만... 마지막 순간, 그는 분명 우리 편이었다.",
      "이제 정말로... 세계가 완전히 평화를 되찾을 수 있을까.",
    ]},

  // ── 동료 후일담 (네메시스 승리 직후, 파티에 있을 때만) ──
  ending_companion_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["...해냈군. 이제 돌아가서, 광산도시 사람들한테 자랑 좀 해야겠어. 더는 그 무게에 짓눌리지 않을 거야. 🛡"]},
  ending_companion_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["기사로서 끝까지 책임을 다했군. 이제야 검을 내려놓고 발 뻗고 잘 수 있겠어. ⚔"]},
  ending_companion_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["드디어 끝났네요... 숲으로 돌아가면, 장로님께 가장 먼저 이 소식을 전해드려야겠어요. 🏹"]},
  ending_companion_mage:{name:"엘린",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:["금단의 비전이 결국 세상을 구하는 데 쓰였네요. 스승님도 분명 자랑스러워하실 거예요. 🔮"]},
  ending_companion_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["부모님도... 어딘가에서 지켜보고 계셨을까요. 용서를 택한 게, 결국 옳은 길이었나 봐요. ✝"]},

  // ── 동료 후일담 — 직업·직함 (위 한마디 반응 다음에 이어짐, 파티에 있을 때만) ──
  ending_career_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["그러고 보니... 광산도시에서 길드장 자리를 맡아달라고 하더군. 다시는 누구도 잃지 않도록, 이번엔 내가 직접 지켜볼 생각이야. 🛡⛏"]},
  ending_career_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["왕실에서 기사단 재건을 맡아달라고 부탁해왔어. 이번엔... 제대로 된 기사단을 만들어 보이겠어. ⚔👑"]},
  ending_career_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["장로님과 왕실, 양쪽에서 부탁하셨어요. 엘프와 인간 사이를 잇는 외교관이 되어달라고요. 기쁘게 받아들였어요. 🏹🕊"]},
  ending_career_mage:{name:"엘린",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:["왕립 마법학원의 새 마도원장으로 임명됐어요. 이제는 제가 다음 세대를 가르칠 차례네요. 🔮📚"]},
  ending_career_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["왕실에서 대치유사로 모시겠다고 하셨어요. 이제 더 많은 사람들을 도울 수 있게 됐어요. ✝👑"]},

  // ── 주인공의 결말 — 왕국 번영도 100%일 때만: 최고 훈장 + 재상 등극 ──
  ending_protagonist_chancellor:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여... 아니, 이제는 그렇게 불러서는 안 되겠군.",
      "왕국 구석구석을 단 한 곳도 빠짐없이 되살리고, 세계를 위협하던 진짜 존재까지 무찌른 자에게 걸맞은 예우를 갖추겠다.",
      "지금 이 순간부터, 그대에게 왕실 최고 훈장을 내리며... 재상의 자리에 임명하겠다.",
      "이 왕국의 모든 것을, 짐은 안심하고 그대에게 맡길 수 있을 것 같군.",
    ]},

  // ── 주인공의 결말 — 왕국 번영도가 100%에 못 미칠 때: 더 소박한 결말 ──
  ending_protagonist_modest:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여, 그대가 이뤄낸 일은... 어느 것 하나 작지 않았다.",
      "아직 왕국 곳곳에 손길이 필요한 곳이 남아있지만, 그것도 언젠가 그대의 발걸음이 닿으면 자연스레 풀릴 일이겠지.",
      "지금은... 그저 그대에게 진심으로 감사를 전하고 싶군. 이 왕국은 그대를 영원히 기억할 것이다.",
    ]},

  // ── 귀환 — 주인공의 결심 ──
  ending_return_resolve:{name:"기사",nameColor:"#ffe9a8",portrait:"images/portrait_Knight.png",
    dialogues:["...이제 돌아가자. 모두에게 알려야 할 일들이, 그리고 물어봐야 할 진실이 남아있다."]},

  // ── 왕의 세계관 진실 공개 (왕성, 마을 귀환 후) ──
  ending_king_truth1:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "...정말로 해냈군. 네메시스라는 그 존재까지 물리쳤다는 보고를 받았을 때, 짐은 믿기지 않았다.",
      "이제는 말해줄 수 있겠군. 짐이 알고 있던 진실을, 전부.",
      "아주 오랜 옛날, 이 세계가 만들어질 무렵... 공허에서 흘러나온 존재가 있었다고 전해진다. 그것이 바로 네메시스였다.",
      "고대의 영웅들이 목숨을 걸고 그것을 봉인했지만, 완전히 없앨 수는 없었지. 그래서 대신 '관리자'를 두어 그 봉인을 지키게 한 것이다.",
    ]},
  ending_king_truth2:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "다르카스는... 아마 그 역할을 짊어진 마지막 관리자였을 것이다. 그 역할 안에서 차츰 힘에 잠식되어, '마왕'이라는 존재로 변해갔겠지.",
      "그리고 사천왕도, 마왕군도... 전부 그 오래된 책무의 그림자였던 셈이다.",
      "그대가 무찌른 것은 단순한 악이 아니었다. 아주 오래전부터 이어져 온, 하나의 슬픈 책임이었던 것이다.",
      "이제 그 봉인의 책무는... 완전히 끝났다. 그대가 끝낸 것이야.",
    ]},

  // ── 왕국 완전재건 선포 ──
  ending_kingdom_rebuilt:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 왕국 곳곳에서 소식이 들려와요. 시작마을, 광산도시, 항구도시, 깊은 숲, 수도... 어디 하나 빠짐없이 완전히 되살아났대요.",
      "전부 용사님이 직접 발로 뛰며 이뤄낸 일이에요. 정말로, 정말로 고마워요.",
      "이제 이 왕국에는... 더는 두려움이 없어요. 당신이 그렇게 만들어줬으니까요. 💕",
    ]},

  // ══════════════ 동료 개인 스토리 ══════════════

  // ── 카인(탱커) — 광산도시: 무너진 갱도, 구하지 못한 동료 ──
  tanker_story_conflict:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:[
      "...잠깐, 이 무너진 갱도. 예전에 내가 있던 곳과 똑같아.",
      "그때도 이렇게 갱도가 무너졌어. 나는 살았는데... 같이 있던 동료들은 못 구했지.",
      "아직도 그날 마지막으로 본 동료들 얼굴이 잊히질 않아.",
      "...저기, 안쪽에서 무슨 소리가 들리지 않아? 설마, 아직 살아있는 사람이...?",
    ]},
  // ══════════════ 광산도시 — 완전 재건 통합 축제 이벤트 ══════════════

  // ── 광부 축제 시작 (재건 100% + 투자 최종 단계 동시 달성 시) ──
  miner_chief_festival_intro:{name:"광부 두칸",nameColor:"#e8a850",portrait:"images/Chibi miner character dukhan.png",bgImage:"images/Gold_discovery_festival_in_the_mountains.png",
    dialogues:[
      "용사님! 들으셨습니까? 갱도도, 제련소도... 이제 정말로 전부 다 되살아났습니다!",
      "광부들이 다 모여서 한바탕 잔치를 벌이자고 난리입니다. 오늘만큼은 곡괭이도 내려놓고 다 같이 즐겨야죠.",
      "용사님이 아니었다면 이런 날은 꿈도 못 꿨을 겁니다. 자, 같이 가시죠! 🎉⛏",
    ]},

  tanker_story_resolution:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:[
      "...해냈다. 진짜로 해냈어. 무너진 갱도에서, 살아있는 사람을 구해냈어.",
      "그때는 못 했던 일을, 이번엔 해냈다고. 너 덕분이야.",
      "이번엔... 지킬 수 있었어.",
      "이 방패, 이제 더 확실하게 쓸 수 있을 것 같아. 너도, 동료들도, 더는 잃지 않을 테니까. 🛡",
    ]},

  // ── 축제 마무리 (탱커 결말편 다음, 또는 동료 없을 때 곧바로) ──
  mine_festival_outro:{name:"광부 두칸",nameColor:"#e8a850",portrait:"images/Chibi miner character dukhan.png",bgImage:"images/Gold_discovery_festival_in_the_mountains.png",
    dialogues:[
      "광산도시는 이제 그 누구보다 단단하게 다시 섰습니다. 전부 용사님 덕분입니다.",
      "이 마을 사람들은 평생 용사님을 잊지 못할 겁니다. 정말 감사합니다! ⛏✨",
    ]},

  // ══════════════ 항구도시 — 완전 재건 통합 축제 이벤트 ══════════════

  // ── 항구 축제 시작 (재건 100% + 투자 최종 단계 동시 달성 시) ──
  harbor_master_festival_intro:{name:"항구장 모리스",nameColor:"#5ad0e8",portrait:"images/Chibi character morris.png",bgImage:"images/Coastal_port_festival_celebration_in_full_swing.png",
    dialogues:[
      "용사님, 저것 좀 보십시오! 수평선 너머로 배들이 줄지어 들어오고 있습니다!",
      "교역선이 돌아온다는 소식에 아이들이 부둣가로 뛰쳐나와 손을 흔들고 있어요. 이런 풍경은 정말 오랜만입니다.",
      "당신은... 정말로 이 도시를 살렸어. 그 말 외에는 달리 표현할 방법이 없군요. 🚢🎉",
    ]},

  // ── 항구 축제 마무리 — 항해 허가증 수여 ──
  harbor_festival_outro:{name:"항구장 모리스",nameColor:"#5ad0e8",portrait:"images/Chibi character morris.png",bgImage:"images/Coastal_port_festival_celebration_in_full_swing.png",
    dialogues:[
      "이 항구는 다시 세계와 이어졌습니다. 전부 용사님이 해내신 일입니다.",
      "이걸 받으십시오 — 항해 허가증입니다. 이제 어느 바다로든 떠나실 수 있을 겁니다. ⚓📜",
    ]},

  // ══════════════ 깊은 숲 — 완전 재건 통합 축제 이벤트 ══════════════

  // ── 결계 회복 직후 — 충격적인 진실: 그날의 "인간"은 사실 마족이었다 ──
  elf_elder_festival_intro:{name:"엘프 장로 실라",nameColor:"#6cd0a0",portrait:"images/Cilla the Elder Elf.png",bgImage:"images/Elven_festival_in_a_verdant_valley.png",
    dialogues:[
      "...결계가 다시 살아났어요. 정말 오랜만에 느껴보는 따뜻한 기운이네요.",
      "그런데 결계를 회복하는 동안, 정령들이 들려준 이야기가 있어요. 믿기 힘들겠지만... 들어주세요.",
      "그 옛날 성소를 무너뜨린 건 인간이 아니었어요. 인간으로 변장한 마족이었던 거예요.",
      "우리는 그 오랜 세월 동안, 진짜 원수를 엉뚱한 곳에서 찾고 있었던 거군요...",
    ]},

  // ── 동료(아리아) 결말편 다음 — 장로 실라의 축복 ──
  elf_elder_blessing:{name:"엘프 장로 실라",nameColor:"#6cd0a0",portrait:"images/Cilla the Elder Elf.png",bgImage:"images/Elven_festival_in_a_verdant_valley.png",
    dialogues:[
      "당신을 의심했던 그 모든 순간이... 부끄러워지는군요. 용서를 구하고 싶어요.",
      "이 숲과 우리 모두를 대신해, 당신에게 정령의 축복을 내리겠습니다.",
      "어디를 가든, 그 축복이 당신과 함께하기를. 🌿✨",
    ]},

  // ── 아리아의 마지막 축복 — 축제 마무리 ──
  archer_blessing_outro:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",bgImage:"images/Elven_festival_in_a_verdant_valley.png",
    dialogues:[
      "장로님의 축복까지 받으셨네요. 이걸로... 정말 모든 게 끝난 것 같아요.",
      "저도 한 번 더 말씀드릴게요. 함께해줘서, 정말 고마워요. 🏹💚",
    ]},

  // ── 카르나(딜러/기사) — 항구도시: 기사단 해체, 배신의 진실 ──
  dealer_story_conflict:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:[
      "...저 사람, 낯이 익은데. 설마, 그때 기사단에 있던...",
      "오래전에 해적 토벌에 나섰다가 실패해서 기사단이 해체됐어. 그때 살아남은 동료가 또 있을 줄은 몰랐군.",
      "그 작전, 사실은 누군가 정보를 흘려서 실패한 거였어. 나는 그게 누군지... 짐작은 하고 있었지만 증거가 없었지.",
      "이번엔 다를 거야. 배신자가 누군지, 끝까지 확인하고야 말겠어.",
    ]},
  dealer_story_resolution:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:[
      "...해적 선장을 처치하고서야 알았어. 배신자가 누구였는지, 전부 다.",
      "오래 묵혀둔 의심이 풀리니까, 오히려 마음이 가벼워지는군.",
      "이제야... 기사로서의 책임을 다한 것 같아.",
      "다시 검을 든 의미를 찾은 기분이야. 앞으로도 잘 부탁한다. ⚔",
    ]},

  // ── 아리아(궁수) — 깊은 숲: 인간에게 가족을 잃은 과거 ──
  archer_story_conflict:{name:"엘프 장로 실라",nameColor:"#6cd0a0",portrait:"images/Cilla the Elder Elf.png",
    dialogues:[
      "...인간을 데려오다니, 미쳤느냐! 우리가 무슨 일을 겪었는지 몰라서 이러는 게야?",
      "그날 그 인간들이 성소를 부수면서 얼마나 많은 동족이 죽었는지, 너는 상상도 못 할 것이다.",
    ]},
  archer_story_conflict2:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:[
      "장로님, 그만하세요! ...이 사람은 그때 그 인간들과는 달라요.",
      "저도 그날 가족을 잃었어요. 그 누구보다 인간을 미워할 이유가 있는 사람이 바로 저예요.",
      "그런데도 이 사람이라면... 믿어보고 싶어요. 부탁이에요, 장로님.",
    ]},
  archer_story_resolution:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:[
      "성소가... 다시 빛을 되찾았어요. 정말 다행이에요.",
      "장로님도 이제는 당신을 인정하셨어요. 엘프와 인간이 다시 함께할 수 있게 됐네요.",
      "솔직히 말하면, 오랫동안 그날의 기억에 갇혀 있었어요. 분노로 버텨온 시간이었죠.",
      "이제는... 과거를 놓아줄 수 있을 것 같아요. 고마워요, 정말로. 🏹",
    ]},

  // ── 엘린(마법사) — 수도: 금지된 연구로 추방, 사실은 누명 ──
  mage_story_conflict:{name:"엘린의 옛 스승",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:[
      "...엘린? 살아있었구나. 왕립 마법학원에서 추방된 그 아이가, 여기서 다시 만나다니.",
      "금지된 연구를 했다는 죄목으로 쫓겨났었지. 그때 학회 전체가 그렇게 알고 있었다.",
    ]},
  mage_story_conflict2:{name:"엘린",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:[
      "...사실대로 말씀드릴게요. 저는 금지된 연구를 한 게 아니었어요.",
      "그 무렵 학원 지하에서 마왕의 흔적으로 보이는 마력 반응을 발견하고, 그걸 조사하고 있었을 뿐이에요.",
      "그런데 그게 '금지된 연구'로 둔갑해서 누명을 쓰고 쫓겨난 거예요. 아무도 제 말을 들어주지 않았죠.",
    ]},
  mage_story_resolution:{name:"엘린의 옛 스승",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:[
      "...그게 정말이었군. 우리가 잘못 판단했다. 미안하구나, 엘린.",
      "왕립 마법사로서의 자격을 다시 인정하겠다. 그리고 이것은... 학원에 봉인되어 있던 최상위 공격 마법서다.",
      "이제 떳떳하게 네 힘을 펼쳐 보여라.",
    ]},
  mage_story_resolution2:{name:"엘린",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:[
      "드디어... 누명을 벗었어요. 그것도 최상위 마법서까지 함께요.",
      "당신이 없었다면 평생 추방자로 살았을 거예요. 정말 고마워요.",
      "이제 이 힘, 마왕을 무찌르는 데 제대로 써볼게요. 🔮",
    ]},

  // ── 리온(힐러) — 심연 진입 전: 부모를 죽인 마물과의 재회, 복수와 용서 ──
  healer_story_conflict:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:[
      "...이 느낌, 잊을 수가 없어요. 제 부모님을 죽인 그 마물의 기운이에요.",
      "어릴 때 마왕군의 습격으로 마을이 불탔어요. 저는 그날 부모님을 잃었죠.",
      "그때부터 사람을 살리는 힐러가 되기로 했어요. 복수가 아니라, 살리는 쪽을 선택한 거예요.",
      "그런데 지금... 막상 그 마물을 다시 마주하니 마음이 흔들려요. 복수할 기회가 눈앞에 있는데...",
    ]},
  healer_story_resolution:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:[
      "...결국 저는 용서하는 쪽을 택했어요. 그 마물을 죽이는 것보다, 더 많은 사람을 살리는 게 제 길이니까요.",
      "상처는... 사라지지 않아요. 아마 평생 가겠죠.",
      "하지만 상처는 사라지지 않아도, 앞으로 나아갈 수는 있어요.",
      "이제 제 힘을 온전히 믿고 쓸 수 있을 것 같아요. 모두를 지킬게요. ✝",
    ]},

  // ══════════════ 마왕군 간부 격파 — 지역 재난 + 동료 사연의 진짜 원인 ══════════════

  // ── 그라모스(광산도시) ──
  general_gramos_defeat_with_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:[
      "...그라모스. 이 자가 갱도에 암흑광석을 뿌려서 일부러 붕괴를 일으킨 거였어.",
      "그 말은... 그때 내 동료들이 죽은 것도, 전부 이 마왕군 간부가 벌인 일이었다는 거잖아.",
      "오랫동안 내 잘못이라고 생각하며 살아왔는데... 처음부터 우리 잘못이 아니었어.",
      "이제야 모든 게 이어지는군. 광산도시의 재난도, 내가 짊어졌던 죄책감도, 다 이 마왕군 때문이었어.",
    ]},
  general_gramos_defeat_generic:{name:"용사",nameColor:"#d8c8b0",portrait:"images/Hero.png",
    dialogues:[
      "마왕군 간부 그라모스... 이 자가 광산에 암흑광석을 뿌려 갱도를 무너뜨린 진짜 원인이었군.",
      "광산도시의 재난이 단순한 사고가 아니라, 마왕군이 의도적으로 벌인 일이었다는 게 밝혀졌다.",
    ]},

  // ── 바르칸(항구도시) ──
  general_barkan_defeat_with_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:[
      "...바르칸. 이 자가 뒤에서 해적단을 조종하고 있었다니.",
      "그렇다면 그때 기사단을 무너뜨린 배신, 그 정보가 새어나간 것도... 이 자의 짓이었을 가능성이 커.",
      "오랜 의심이 이제야 풀리는군. 우리 기사단의 실패도, 항구도시의 약탈도, 전부 같은 곳에서 시작된 거였어.",
      "이걸로 확실해졌다. 더는 옛일에 휘둘리지 않겠어.",
    ]},
  general_barkan_defeat_generic:{name:"용사",nameColor:"#d8c8b0",portrait:"images/Hero.png",
    dialogues:[
      "마왕군 간부 바르칸... 해적단을 뒤에서 조종한 진짜 배후가 바로 이 자였다.",
      "항구도시를 약탈한 해적들도, 결국 마왕군의 손에서 움직이고 있었던 것이었다.",
    ]},

  // ── 릴리스(깊은 숲) ──
  general_lilith_defeat_with_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:[
      "...릴리스. 이 마왕군 간부가 정령들을 오염시켜서 결계를 약하게 만든 거였어요.",
      "그렇다면... 그 옛날 성소가 무너지기 쉬웠던 것도, 이 자가 오랫동안 숲의 힘을 갉아먹고 있었기 때문일지도 몰라요.",
      "인간들의 잘못만이 아니라, 처음부터 마왕군이 이 숲을 노리고 있었던 거예요.",
      "장로님께도 이 사실을 꼭 알려야겠어요. 우리 모두... 같은 적을 상대하고 있었던 거니까요.",
    ]},
  general_lilith_defeat_generic:{name:"용사",nameColor:"#d8c8b0",portrait:"images/Hero.png",
    dialogues:[
      "마왕군 간부 릴리스... 정령들을 오염시켜 숲의 결계를 약화시킨 자가 바로 이 자였다.",
      "깊은 숲의 위기도 결국 마왕군이 꾸민 일이었음이 드러났다.",
    ]},

  // ── 벨제론(수도) ──
  general_belzeron_defeat_with_mage:{name:"엘린",nameColor:"#cc88ff",portrait:"images/sd_magician.png",
    dialogues:[
      "...벨제론. 왕성에 잠입한 마왕군을 이끈 게 바로 이 자였군요.",
      "그러고 보니... 제가 학원에서 발견했던 마력의 흔적, 그게 이 자의 기운이었을지도 몰라요.",
      "제가 누명을 쓰고 추방당한 것도, 결국 이 자의 계획을 막으려다 벌어진 일이었던 거예요.",
      "이제야 모든 게 설명되는군요. 그때부터 지금까지, 전부 하나로 이어져 있었어요.",
    ]},
  general_belzeron_defeat_generic:{name:"용사",nameColor:"#d8c8b0",portrait:"images/Hero.png",
    dialogues:[
      "마왕군 간부 벨제론... 왕성에 잠입한 마왕군을 이끈 자가 바로 이 자였다.",
      "수도의 위기 또한 마왕군이 오래전부터 계획해온 일이었다.",
    ]},

  healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["당신과 함께 여기까지 오다니 꿈만 같아요.","당신이 앞에 서 있으면 용기가 생겨요.","신성의 빛이 다하는 날까지 함께할게요.","마왕을 쓰러뜨리는 날 같이 맛집 가요! ✝"]},
  tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["네가 이렇게 강해질 줄 몰랐다.","이 방패가 버티는 한 칼날 못 건드린다.","마왕이고 뭐고 내 앞에서 다 처리해 준다.","같이 싸우는 게 나쁘지 않아. 🛡"]},
  mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["마왕의 핵심 마력은 심연 최심부에 있어요.","당신 곁이라면 더 빨리 성장할 수 있어요.","고대 서적에서 약점을 찾았어요. 🔮","두렵지만 설레기도 해요."]},
  archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["마왕 척후대가 이 근방까지 왔어요.","외로웠는데 이제 혼자가 아니네요.","제 화살이 닿지 않는 거리는 없어요. 🏹","앞으로도 잘 부탁드려요!"]},

  // ── 동료 합류 대화 ─────────────────────────────────
  join_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:[
      "저도... 마왕에게 잃은 게 있어요. 소중한 사람을 잃었거든요.",
      "혼자서는 마왕에게 닿을 수 없어요. 하지만 용사님이라면... 함께라면 할 수 있을 것 같아요.",
      "제 신성의 빛, 용사님을 위해 쓸게요. 끝까지 함께할게요. ✝",
    ]},
  join_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:[
      "......흥. 딱히 네가 마음에 들어서가 아냐. 오해하지 마.",
      "혼자 무모하게 들어갔다가 죽는 꼴 보기 싫어서 따라가는 거라고.",
      "이 방패가 버티는 한, 네 뒤는 내가 지킨다. 딱 그것뿐이야. 🛡",
    ]},
  join_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:[
      "오오! 드디어 만났군요! 저 고대 서적에서 마왕의 약점을 찾아냈어요! 🔮",
      "혼자 연구만 해서는 실전에 쓸 수가 없었거든요. 용사님과 함께라면 검증할 수 있어요!",
      "걱정 마세요. 마법 지원은 제가 맡을게요. 반드시 마왕을 쓰러뜨릴 수 있어요!",
    ]},
  join_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:[
      "...이 숲은 내가 평생 지켜온 곳이에요. 마왕의 부하들이 이곳까지 침범했어요.",
      "더 이상 지켜만 볼 수 없어요. 마왕을 직접 끝내야 해요.",
      "제 화살이 닿지 않는 곳은 없어요. 당신 뒤를 맡길게요. 🏹",
    ]},
  join_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:[
      "하하! 마침 나도 마왕한테 한 방 먹여주고 싶었거든? 타이밍 딱 맞네.",
      "뭐, 실력은 내가 더 좋을 수도 있어. 근데 혼자 가기엔 심연이 너무 깊어.",
      "자, 이제부터 우리 팀이야. 후회는 시키지 않을게! ⚔",
    ]},

  // ── 레벨업 동료 반응 대사 ─────────────────────────

  // Lv.5 ─────
  levelup_5_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.5 달성이에요! 당신이 성장하는 걸 보니 저도 덩달아 힘이 나요. ✝","계속 이렇게 강해지면... 마왕도 두렵지 않아요!"]},
  levelup_5_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["흐음... Lv.5 정도면 이제 겨우 시작이지. 아직 멀었어.","뭐, 나쁘지는 않군. 계속 그렇게 해봐. 🛡"]},
  levelup_5_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["오오! Lv.5 달성! 성장 속도가 제 예측치를 웃돌고 있어요! 🔮","이 추세라면 마왕 토벌도 충분히 가능해요!"]},
  levelup_5_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["...Lv.5. 예상보다 빠르네요. 🏹","당신이라면 믿을 수 있을 것 같아요."]},
  levelup_5_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["오, Lv.5! 제법인데? 아직 나한테는 멀었지만. ⚔","하하, 농담이야. 좋은 출발이야!"]},

  // Lv.10 ─────
  levelup_10_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.10이에요! 이제 당신의 빛이 눈에 보일 정도로 강해졌어요. ✨","저도 더 강한 치유 마법을 익혀야겠어요. 함께 성장해요!"]},
  levelup_10_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.10... 솔직히 말하면, 처음보다 많이 강해졌어.","이 정도면 어지간한 던전은 버틸 수 있겠어. 🛡"]},
  levelup_10_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.10 달성! 이제 진짜 모험가라고 할 수 있겠어요! 🔮","마력 수치도 눈에 띄게 올랐어요. 제 분석이 맞았어요!"]},
  levelup_10_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.10. 이제 어지간한 몬스터들은 상대가 되지 않겠군요. 🏹","조금씩 당신을 믿게 되고 있어요."]},
  levelup_10_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["Lv.10이라고! 이야, 꽤 하는데? ⚔","인정해줄게. 이 정도면 같이 다닐 만해!"]},

  // Lv.15 ─────
  levelup_15_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.15... 당신 곁에 있으니까 저도 강해지는 것 같아요. ✝","심연 던전이 점점 현실이 돼가는 느낌이에요. 두렵지만 설레요."]},
  levelup_15_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.15이라... 이 방패를 믿어도 될 것 같다는 생각이 드는군.","한 가지만 말할게. 내가 앞에 있는 한, 넌 절대 안 죽어. 🛡"]},
  levelup_15_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.15! 이제 고급 마법 공략도 함께 쓸 수 있겠어요! 🔮","마왕의 약점 분석도 거의 완성됐어요. 조금만 더요!"]},
  levelup_15_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.15. 이제 심연 입구까지는 충분히 싸울 수 있어요. 🏹","...같이 여기까지 온 게, 사실 외롭지 않았어요."]},
  levelup_15_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["오오, Lv.15! 이 정도면 나랑 어깨를 나란히 할 만하잖아? ⚔","농담이 아니야. 진짜로 실력이 붙었어. 인정!"]},

  // Lv.20 ─────
  levelup_20_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.20... 드디어 이 날이 왔군요. 공주님 체크리스트, 클리어예요! ✅","이제 심연 던전에 도전할 수 있어요. 제가 끝까지 치료해 드릴게요. ✝"]},
  levelup_20_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.20. ......됐어. 이제 심연에 들어갈 자격이 생겼군.","각오해. 마왕 앞에서도 내 방패는 절대 무너지지 않아. 🛡"]},
  levelup_20_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.20 달성!! 공략 퀘스트 조건 충족이에요! 드디어예요! 🔮🎉","마왕 약점 분석 완료, 전략 준비 완료! 이제 심연에 갑시다!"]},
  levelup_20_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.20. 이걸 기다리고 있었어요. 🏹","이제 마왕을 끝낼 준비가 됐어요. 같이 가요."]},
  levelup_20_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["Lv.20! 드디어야! 이제 마왕이랑 제대로 붙어볼 수 있겠어! ⚔","솔직히 여기까지 같이 올 줄 몰랐어. 잘했어, 진짜로."]},

  // Lv.25 ─────
  levelup_25_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["Lv.25... 당신의 강함이 이제 저를 지켜주는 것 같아요. ✝","마왕과의 전투, 두렵지 않아요. 당신 곁이라면."]},
  levelup_25_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["Lv.25라... 처음 봤을 때랑 딴판이야. 🛡","마왕이 눈앞에 있어도 내가 막아줄 테니까. 걱정 마."]},
  levelup_25_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["Lv.25! 이 정도 성장이면 마왕에게도 충분히 유효한 데미지를 줄 수 있어요! 🔮","마지막 전략 점검 완료. 이제 마왕만 남았어요!"]},
  levelup_25_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["Lv.25. ...당신 덕분에 이 숲도, 나도 달라졌어요. 🏹","마지막까지 함께할게요."]},
  levelup_25_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["Lv.25! 이야! 거의 내 수준이잖아? ⚔","하하, 농담이야. 근데 진짜로 강해졌어. 마왕, 각오해라!"]},

  // MAX ─────
  levelup_max_healer:{name:"리온",nameColor:"#88ccff",portrait:"images/portrait_healer.png",
    dialogues:["최... 최고 레벨 달성이에요!! 정말 대단해요!!! ✨✝","이제 마왕은 우리 앞에 설 수 없어요. 함께 끝냅시다!"]},
  levelup_max_tanker:{name:"카인",nameColor:"#ffaa44",portrait:"images/portrait_tanker.png",
    dialogues:["...최고 레벨. 솔직히 말할게.","처음부터 알아봤어. 넌 특별한 놈이야. 같이 마왕을 끝내자. 🛡"]},
  levelup_max_mage_party:{name:"엘린",nameColor:"#cc88ff",portrait:"images/portrait_magician.png",
    dialogues:["최고 레벨 달성!!! 제 연구 역사상 가장 위대한 순간이에요!!! 🔮🎉","마왕의 완전 공략 데이터 준비 완료! 이제 우리가 역사를 만들어요!"]},
  levelup_max_archer:{name:"아리아",nameColor:"#88ee88",portrait:"images/portrait_archer.png",
    dialogues:["최고 레벨... 당신은 제가 본 가장 강한 사람이에요. 🏹","마지막 화살, 마왕의 심장을 향해 쏠게요."]},
  levelup_max_dealer:{name:"카르나",nameColor:"#ffdd66",portrait:"images/portrait_Knight.png",
    dialogues:["최고 레벨 달성!! 야, 너 진짜 미쳤다! ⚔","인정! 이제 진짜 최강 파티야. 마왕, 우리가 간다!!!"]},

  // ══ 퀘스트 수락 대화 ══════════════════════════════

  qaccept_q_slime:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:[
      "아이고, 용사님! 마침 잘 오셨어요. 사실 골치 아픈 일이 생겼어요. 😅",
      "저장창고에 슬라임들이 들어와서 물건을 다 녹여버리고 있거든요! 이러다 가게 망할 것 같아요!",
      "슬라임 5마리만 처치해 주시면 사례금을 드릴게요. 성 밖 사냥터에 많이 있답니다. 부탁드려요!",
    ]},

  qaccept_q_goblin:{name:"마을 주민 마르타",nameColor:"#ddbb88",portrait:"images/Marta a village resident.png",
    dialogues:[
      "용사님! 저 마르타라고 해요. 제발 좀 도와주세요! 😢",
      "숲 근처 우리 밭에 고블린들이 떼로 몰려와서 작물을 다 망쳐놓고 있어요.",
      "올 겨울 식량이 다 거기 있었는데... 고블린 4마리만 쫓아내 주시면 정말 감사할게요!",
    ]},

  qaccept_q_skeleton:{name:"경비대장 가르",nameColor:"#aaaacc",portrait:"images/portrait_Knight.png",
    dialogues:[
      "용사여, 잠깐! 나는 이 마을 경비대장 가르다. 급한 부탁이 있소.",
      "일반 던전 깊은 곳에서 해골 기사들이 점점 늘어나고 있소. 내 부하들만으로는 버겁구려.",
      "해골 기사 3구만 격멸해 주시오. 왕국 안전을 위해 꼭 부탁드리오! 보상은 충분히 드리겠소. 🗡",
    ]},

  qaccept_q_orc:{name:"농부 티모",nameColor:"#99cc77",portrait:"images/Farmer Teemo.png",
    dialogues:[
      "헉헉... 용사님! 저 좀 도와주세요. 밭에서 달려왔어요. 🌾",
      "오크 전사들이 우리 농장을 짓밟고 있어요! 몇 달 동안 키운 농작물이 다 망가지고 있다고요!",
      "오크 3마리만 처치해 주시면 올해 수확물의 일부를 드릴게요. 제발 부탁드려요!",
    ]},

  qaccept_q_orc2:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 마침 찾고 있었어요. 왕국 안보에 관한 중요한 임무예요.",
      "오크 도발꾼들이 마을 경계에서 주민들을 위협하고 있어요. 일반 오크보다 훨씬 교활하고 강해요.",
      "2마리만 처단해 주시면 돼요. 위험하니까 꼭 조심하세요. 저도 걱정되거든요... 💕",
    ]},

  qaccept_q_guardian:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여, 짐이 직접 이 임무를 맡기노라. 왕국의 운명이 걸린 일이오.",
      "일반 던전 깊은 곳에 수호자가 도사리고 있소. 그놈을 처치해야 심연 던전의 봉인이 열린다오.",
      "심연 던전... 그곳에 마왕 다르카스가 있소. 수호자를 쓰러뜨려 길을 열어주시오. 왕국이 그대를 믿소! 👑",
    ]},

  // ══ 퀘스트 완료 대화 ══════════════════════════════

  qcomplete_q_slime:{name:"상인 카를로",nameColor:"#44dd88",portrait:"images/sd_merchant.png",
    dialogues:[
      "용사님!! 돌아오셨군요! 슬라임들을 다 없애주셨어요?! 정말요?! 😍",
      "창고에 가봤더니 깨끗해졌더라고요! 이제 안심이에요. 약속대로 사례금 드릴게요!",
      "또 도움이 필요하면 언제든 찾아와 주세요. 용사님 덕분에 가게가 살았어요! 💰",
    ]},

  qcomplete_q_goblin:{name:"마을 주민 마르타",nameColor:"#ddbb88",portrait:"images/Marta a village resident.png",
    dialogues:[
      "용사님! 오셨군요! 밭에 가봤더니 고블린들이 하나도 없었어요! 🥹",
      "덕분에 남은 작물이라도 수확할 수 있었어요. 올 겨울은 버틸 수 있을 것 같아요.",
      "정말 감사해요, 용사님. 이 은혜 평생 잊지 못할 거예요!",
    ]},

  qcomplete_q_skeleton:{name:"경비대장 가르",nameColor:"#aaaacc",portrait:"images/portrait_Knight.png",
    dialogues:[
      "오, 돌아왔군. 임무 완수했는가? 해골 기사 3구 모두 격멸 확인!",
      "잘 해냈소. 덕분에 던전 주변 경비가 한결 수월해질 것이오. 🗡",
      "보상은 약속대로 드리겠소. 왕국을 위해 수고했소, 용사!",
    ]},

  qcomplete_q_orc:{name:"농부 티모",nameColor:"#99cc77",portrait:"images/Farmer Teemo.png",
    dialogues:[
      "용사님!! 오크들이 다 사라졌어요! 밭이 다시 조용해졌다고요! 🌾",
      "정말 감사해요. 수확물 일부를 사례금으로 준비했어요. 많이 드리지 못해서 죄송해요...",
      "내년에 풍년이 들면 꼭 더 사례할게요! 정말정말 감사합니다, 용사님!",
    ]},

  qcomplete_q_orc2:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님! 무사히 돌아오셨군요! 정말 걱정했어요. 😊",
      "오크 도발꾼들이 처단됐다는 보고 받았어요. 덕분에 마을 경계가 안전해졌어요!",
      "역시 믿을 수 있는 분이에요. 보상이에요. 앞으로도 잘 부탁드려요! 💕",
    ]},

  qcomplete_q_guardian:{name:"왕 에드워드 3세",nameColor:"#FFD700",portrait:"images/King_Edward_III_SIDE.png",
    dialogues:[
      "용사여! 던전 수호자를 쓰러뜨렸다 들었소. 실로 대단한 무위로다! 👑",
      "이제 심연 던전의 봉인이 열렸소. 그 안에 마왕 다르카스가 기다리고 있을 것이오.",
      "마지막 전투가 남았소. 왕국의 모든 이가 그대를 응원하고 있소. 반드시 이겨주시오!",
    ]},

  // ══ 공주 알현 — 호감도 단계별 일상 대화 ══════════════

  princess_talk_0:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "오, 용사님. 무슨 일로 찾아오셨나요?",
      "아직 저희가 서로 잘 모르는 사이지만... 앞으로 친해질 수 있으면 좋겠어요.",
      "마을과 왕국을 위해 늘 애써주셔서 감사해요.",
    ]},

  princess_talk_25:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 오셨군요! 요즘 자주 뵈니까 좋네요. 😊",
      "사실 처음엔 좀 어려웠는데, 이제는 편하게 이야기할 수 있을 것 같아요.",
      "마을 일도, 모험도... 항상 응원하고 있어요!",
    ]},

  princess_talk_50:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님! 기다리고 있었어요. 오늘은 무슨 얘기를 해볼까요? 💕",
      "솔직히 말하면... 용사님이 찾아와 주시는 시간이 하루 중 제일 기다려져요.",
      "왕가의 공주로서가 아니라, 그냥 실비아로서 당신과 이야기하고 싶어요.",
    ]},

  princess_talk_75:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 와주셨네요. 당신이 오면 마음이 편안해져요. ☺",
      "마왕과의 싸움이 두렵지 않냐고요? 두려워요. 그래서 당신이 더 걱정돼요.",
      "꼭... 무사히 돌아오겠다고 약속해 주세요. 저한테는 그게 제일 중요해요.",
    ]},

  princess_talk_100:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님. 당신이 와주는 것만으로도 하루가 환해져요. ❤",
      "이제는... 왕가와 백성을 위해서가 아니라, 그냥 제가 당신을 응원하고 싶어요.",
      "마왕을 쓰러뜨리고 돌아오면... 하고 싶은 얘기가 있어요. 꼭 살아 돌아오세요. 약속해요.",
    ]},

  // ══ 공주 호감도 마일스톤 이벤트 ══════════════════════

  princess_milestone_25:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 잠시만요! 드리고 싶은 게 있어요.",
      "왕실 의사에게 부탁해서 만든 건강 부적이에요. 최대 체력이 늘어날 거예요.",
      "큰 건 아니지만... 받아주세요. 항상 건강하셔야 해요! 💊",
    ]},

  princess_milestone_50:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 이건... 제 개인 검이에요. 어릴 때부터 검술을 배웠거든요.",
      "왕실 대장간에서 특별히 제작한 거예요. 당신이 더 강해지는 데 도움이 될 거예요.",
      "부디 받아주세요. 당신이 다치지 않길 바라는 제 마음이에요. ⚔",
    ]},

  princess_milestone_75:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님... 이건 어머니께서 물려주신 부적이에요. 왕가의 보물이죠.",
      "원래는 함부로 줄 수 없는 물건이지만... 당신에게라면 드리고 싶어요.",
      "이게 당신을 지켜줄 거예요. 반드시... 무사히 돌아와 주세요. 🍀",
    ]},

  princess_milestone_100:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님. 더 이상 숨기지 않을게요. 저는... 당신을 진심으로 좋아하게 됐어요.",
      "왕실의 인장이에요. 이걸 가지고 있으면 왕국의 모든 힘이 당신과 함께할 거예요.",
      "마왕을 쓰러뜨리고 반드시 제게 돌아와 주세요. 저는... 여기서 당신을 기다리고 있을게요. ❤",
    ]},

  // ── 평상시 마을 귀환 시, 상인 인사 후 종종 등장하는 공주의 다정한 당부 ──
  princess_reminder_a:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 잠깐 들렀어요. 잘 지내고 계신가요? 😊",
      "마왕의 위협은 여전하지만... 당신이 있어 마음이 한결 놓여요.",
      "그래도 다시 한번 부탁드릴게요. 📋 공략 퀘스트, 무리하지 않게 천천히라도 꼭 살펴봐 주세요!",
    ]},
  princess_reminder_b:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "아, 용사님! 마침 잘 만났네요. 😊",
      "마을 사람들이 요즘 부쩍 용사님 얘기를 많이 해요. 다들 큰 힘이 되고 있다고 그러더라고요.",
      "저도 다시 한번... 부탁드리고 싶어요. 끝까지 함께해 주실 거죠?",
    ]},
  princess_reminder_c:{name:"공주 실비아",nameColor:"#ffaacc",portrait:"images/Silvia_front.png",
    dialogues:[
      "용사님, 여기서 또 뵙네요! 사실은... 일부러 한 번 와봤어요. 😳",
      "괜한 걱정인 줄 알지만, 자꾸 신경이 쓰여서요.",
      "무리하지 마세요. 그래도... 다시 한번, 저희를 잘 부탁드려요.",
    ]},
};

(function(){
  if(document.getElementById("npcDialogueStyle"))return;
  const s=document.createElement("style");s.id="npcDialogueStyle";
  s.textContent=`#npcDialogueBox{position:fixed;bottom:0;left:0;right:0;z-index:8000;display:flex;justify-content:center;padding:0 0 18px;pointer-events:none;animation:npcFadeIn .35s ease}@keyframes npcFadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}.npc-wrap{pointer-events:all;width:min(740px,96vw);background:linear-gradient(170deg,#0d0808 80%,#1a0a10);border:2px solid #6b3a20;border-radius:4px;box-shadow:0 0 0 1px #3a1a0a,0 8px 40px rgba(0,0,0,.92);cursor:pointer}.npc-namebar{padding:7px 16px;background:rgba(0,0,0,.6);border-bottom:1px solid #4a2510;font-size:.83rem;font-weight:700;letter-spacing:.14em}.npc-body{display:flex;align-items:flex-start;gap:16px;padding:16px;min-height:108px}.npc-portrait{width:96px;height:96px;flex-shrink:0;object-fit:contain;border:1px solid #4a2510;background:#080404;border-radius:3px}.npc-textarea{flex:1;display:flex;flex-direction:column;justify-content:center}.npc-text{color:#e8d8b8;font-size:.92rem;line-height:1.85;letter-spacing:.03em;min-height:56px}.npc-footer{display:flex;justify-content:space-between;align-items:center;padding:7px 16px 10px;border-top:1px solid #2a1208}.npc-progress{font-size:.65rem;color:#6a4828}.npc-hint{font-size:.72rem;color:#aa7744;animation:npcBlink 1.1s infinite}@keyframes npcBlink{0%,100%{opacity:1}50%{opacity:.15}}.npc-closebtn{background:transparent;border:1px solid #4a2510;color:#aa7744;padding:4px 14px;cursor:pointer;font-size:.72rem;font-family:inherit;border-radius:2px}.npc-closebtn:hover{background:#2a1008;color:#ffcc66}`;
  document.head.appendChild(s);
})();
// ── 대기 대사 말풍선 ("이제 어디로 갈까?") ──────────────
TownScene.prototype._showIdleBubble = function(text) {
  const el = document.getElementById("townIdleBubble");
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.add("tib-show");
};

TownScene.prototype._hideIdleBubble = function() {
  const el = document.getElementById("townIdleBubble");
  if (el) el.classList.remove("tib-show");
};

// 진입/귀환 시 재생되는 대화 체인이 모두 끝났는지 감지한 뒤
// 기본 대기 대사를 표시한다 (대화창이 사라진 채로 안정되면 종료로 판단).
//
// 참고: 여기는 의도적으로 폴링을 유지한다. 다른 대화들은 "정해진 순서"라
// onClose 콜백으로 이을 수 있지만, 이 감시는 "지금 어떤 체인이 돌고 있는지,
// 대화가 몇 개나 남았는지 모르는" 불확정 상태를 기다리는 것이라 폴링이 더 맞다.
// 대화창이 연속 3회(약 1.2초) 비어 있어야 종료로 판단해 체인 중간 틈에서 오발동 방지.
TownScene.prototype._watchIdleBubbleReady = function() {
  let stableTicks = 0;
  const check = setInterval(() => {
    if (this._destroyed) { clearInterval(check); return; }
    if (this.game._introChainActive || document.getElementById("npcDialogueBox")) {
      stableTicks = 0;
      return;
    }
    stableTicks++;
    if (stableTicks >= 3) {
      clearInterval(check);
      this._showIdleBubble("이제 어디로 갈까?");
    }
  }, 400);
};

// 던전 출발 버튼 클릭 시 — "좋아! 여기로 가자!" 표시 후 잠시 뒤 사라지고 이동
TownScene.prototype._confirmDeparture = function(dungeonType) {
  this._showIdleBubble("좋아! 여기로 가자!");
  setTimeout(() => {
    this._hideIdleBubble();
    this.game.goToDungeon(dungeonType);
  }, 700);
};

// 평상시 마을 귀환 시 공주가 종종 들러 다정하게 다시 한번 당부하는 대사 (변주 랜덤 선택)
TownScene.prototype._showPrincessReminder = function() {
  const p = this.game.player;
  const variants = ["princess_reminder_a", "princess_reminder_b", "princess_reminder_c"];
  let pool = variants;
  if (p?._lastPrincessReminder) {
    pool = variants.filter(v => v !== p._lastPrincessReminder);
  }
  const key = pool[Math.floor(Math.random() * pool.length)];
  if (p) p._lastPrincessReminder = key;
  this.showNpcDialogue(key);
};

TownScene.prototype._showSelfDialogue = function(key, lines, onClose) {
  const p = this.game.player;
  const PLAYER_PORTRAIT = {
    knight:   "images/portrait_Knight.png",
    mage:     "images/portrait_magician.png",
    magician: "images/portrait_magician.png",
    archer:   "images/portrait_archer.png",
    tanker:   "images/portrait_tanker.png",
    healer:   "images/portrait_healer.png",
  };
  NPC_DATA[key] = {
    name: p?.name || "용사",
    nameColor: "#ffe9a8",
    portrait: PLAYER_PORTRAIT[p?.type] || PLAYER_PORTRAIT.knight,
    dialogues: lines,
  };
  // onClose 를 그대로 전달 — showNpcDialogue 가 닫힐 때 직접 호출(폴링 제거).
  // 단, 이 인스턴스가 폐기되면 콜백을 실행하지 않아 끊긴 체인이 새 화면을 건드리지 않게 한다.
  this.showNpcDialogue(key, onClose ? () => { if (!this._destroyed) onClose(); } : undefined);
};

// ── 대화를 Promise 로 감싸는 헬퍼 ───────────────────────
// 대화창이 완전히 닫히면 resolve. async/await 로 대화 체인을 위→아래로
// 자연스럽게 작성할 수 있게 해준다. 인스턴스가 폐기되면 resolve 하지 않아
// (await 가 영원히 멈춤) 끊긴 체인의 다음 단계가 실행되지 않는다.
TownScene.prototype.npcDialogueAsync = function(npcId) {
  return new Promise(resolve => {
    this.showNpcDialogue(npcId, () => { if (!this._destroyed) resolve(); });
  });
};

// 주인공 독백(self dialogue)을 Promise 로 감싼 버전
TownScene.prototype.selfDialogueAsync = function(key, lines) {
  return new Promise(resolve => {
    this._showSelfDialogue(key, lines, () => resolve());
  });
};

// 지정 시간(ms) 대기 — 인스턴스가 폐기되면 resolve 안 함
TownScene.prototype._delay = function(ms) {
  return new Promise(resolve => {
    setTimeout(() => { if (!this._destroyed) resolve(); }, ms);
  });
};


TownScene.prototype.showNpcDialogue = function(npcId, onClose) {
  const npc=NPC_DATA[npcId];
  if(!npc){ if(onClose) onClose(); return; }  // NPC 데이터 없으면 즉시 콜백(체인 안 끊기게)
  this._hideIdleBubble();
  document.getElementById("npcDialogueBox")?.remove();

  // ── NPC 전신 이미지 맵 (슬롯 표시용) ──
  const NPC_BODY = {
    merchant:                      "images/sd_merchant.png",
    merchant_after_battle:         "images/sd_merchant.png",
    village_chief:                 "images/Silvia_front.png",
    village_chief_invest_start:    "images/Silvia_front.png",
    village_chief_invest_bustling: "images/Silvia_front.png",
    village_chief_invest_complete: "images/Silvia_front.png",
    king:                          "images/King_Edward_III_SIDE.png",
    healer:                        "images/sd_healer.png",
    tanker:                        "images/SD_Tanker.png",
    mage_party:                    "images/sd_magician.png",
    archer:                        "images/sd_archer.png",
    dealer:                        "images/sd_knight.png",
    // 합류 대화용
    join_healer:     "images/sd_healer.png",
    join_tanker:     "images/SD_Tanker.png",
    join_mage_party: "images/sd_magician.png",
    join_archer:     "images/sd_archer.png",
    join_dealer:     "images/sd_knight.png",
    // 레벨업 반응용
    levelup_5_healer:      "images/sd_healer.png",
    levelup_10_healer:     "images/sd_healer.png",
    levelup_15_healer:     "images/sd_healer.png",
    levelup_20_healer:     "images/sd_healer.png",
    levelup_25_healer:     "images/sd_healer.png",
    levelup_max_healer:    "images/sd_healer.png",
    levelup_5_tanker:      "images/SD_Tanker.png",
    levelup_10_tanker:     "images/SD_Tanker.png",
    levelup_15_tanker:     "images/SD_Tanker.png",
    levelup_20_tanker:     "images/SD_Tanker.png",
    levelup_25_tanker:     "images/SD_Tanker.png",
    levelup_max_tanker:    "images/SD_Tanker.png",
    levelup_5_mage_party:  "images/sd_magician.png",
    levelup_10_mage_party: "images/sd_magician.png",
    levelup_15_mage_party: "images/sd_magician.png",
    levelup_20_mage_party: "images/sd_magician.png",
    levelup_25_mage_party: "images/sd_magician.png",
    levelup_max_mage_party:"images/sd_magician.png",
    levelup_5_archer:      "images/sd_archer.png",
    levelup_10_archer:     "images/sd_archer.png",
    levelup_15_archer:     "images/sd_archer.png",
    levelup_20_archer:     "images/sd_archer.png",
    levelup_25_archer:     "images/sd_archer.png",
    levelup_max_archer:    "images/sd_archer.png",
    levelup_5_dealer:      "images/sd_knight.png",
    levelup_10_dealer:     "images/sd_knight.png",
    levelup_15_dealer:     "images/sd_knight.png",
    levelup_20_dealer:     "images/sd_knight.png",
    levelup_25_dealer:     "images/sd_knight.png",
    levelup_max_dealer:    "images/sd_knight.png",
    // 퀘스트 의뢰인
    qaccept_q_slime:      "images/sd_merchant.png",
    qaccept_q_goblin:     "images/Marta a village resident.png",
    qaccept_q_skeleton:   "images/portrait_Knight.png",
    qaccept_q_orc:        "images/Farmer Teemo.png",
    qaccept_q_orc2:       "images/Silvia_front.png",
    qaccept_q_guardian:   "images/King_Edward_III_SIDE.png",
    qcomplete_q_slime:    "images/sd_merchant.png",
    qcomplete_q_goblin:   "images/Marta a village resident.png",
    qcomplete_q_skeleton: "images/portrait_Knight.png",
    qcomplete_q_orc:      "images/Farmer Teemo.png",
    qcomplete_q_orc2:     "images/Silvia_front.png",
    qcomplete_q_guardian: "images/King_Edward_III_SIDE.png",
    // 공주 알현/마일스톤
    princess_talk_0:        "images/Silvia_front.png",
    princess_talk_25:       "images/Silvia_front.png",
    princess_talk_50:       "images/Silvia_front.png",
    princess_talk_75:       "images/Silvia_front.png",
    princess_talk_100:      "images/Silvia_front.png",
    princess_milestone_25:  "images/Silvia_front.png",
    princess_milestone_50:  "images/Silvia_front.png",
    princess_milestone_75:  "images/Silvia_front.png",
    princess_milestone_100: "images/Silvia_front.png",
    princess_reminder_a:    "images/Silvia_front.png",
    princess_reminder_b:    "images/Silvia_front.png",
    princess_reminder_c:    "images/Silvia_front.png",
  };

  // ── 플레이어 이미지 맵 ──
  const PLAYER_BODY = {
    knight:   "images/sd_knight.png",
    mage:     "images/sd_magician.png",
    magician: "images/sd_magician.png",
    archer:   "images/sd_archer.png",
    tanker:   "images/SD_Tanker.png",
    healer:   "images/sd_healer.png",
  };
  const PLAYER_FALLBACK = {
    knight:   "images/sd_knight_walk_1.png",
    mage:     "images/sd_magician_walk_1.png",
    magician: "images/sd_magician_walk_1.png",
    archer:   "images/sd_archer_walk_1.png",
    tanker:   "images/sd_tanker_walk_1.png",
    healer:   "images/sd_healer_walk_1.png",
  };

  const p = this.game?.player;

  // ── 슬롯에 NPC + 플레이어 이미지 표시 ──
  const showSlotImg = (slotId, src, fallback, delayClass) => {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    if (!src) { slot.innerHTML = ""; return; }
    const img = document.createElement("img");
    img.className = `tc-img${delayClass ? " " + delayClass : ""}`;
    img.alt = ""; img.src = src;
    if (fallback) img.onerror = () => { img.src = fallback; img.onerror = null; };
    slot.innerHTML = "";
    slot.appendChild(img);
  };

  const npcBody    = (npcId.startsWith("self_") ? null : (NPC_BODY[npcId] || npc.portrait));
  const playerType = p?.type || "knight";
  const playerBody = PLAYER_BODY[playerType];
  const playerFb   = PLAYER_FALLBACK[playerType] || "images/sd_knight_walk_1.png";

  // 슬롯1: 플레이어(주인공), 슬롯2: 비어있음, 슬롯3: NPC 캐릭터
  showSlotImg("townCharSlot1", playerBody, playerFb, "");
  showSlotImg("townCharSlot2", null, null, "");
  showSlotImg("townCharSlot3", npcBody, null, "delay1");

  let lineIdx=0,charIdx=0,typeTimer=null;

  // 특정 스토리 대화는 전용 배경 이미지를 깔아 분위기를 더한다 (npc.bgImage 가 있을 때만)
  document.getElementById("npcDialogueBg")?.remove();
  if (npc.bgImage) {
    const bg = document.createElement("div");
    bg.id = "npcDialogueBg";
    bg.style.cssText = `position:fixed;inset:0;z-index:7999;background-size:cover;background-position:center;background-repeat:no-repeat;opacity:0;transition:opacity .6s ease;`;
    document.body.appendChild(bg);
    const probe = new Image();
    probe.onload = () => {
      bg.style.backgroundImage = `url('${npc.bgImage}')`;
      requestAnimationFrame(() => { bg.style.opacity = "1"; });
    };
    probe.onerror = () => console.warn(`[대화 배경 로드 실패] "${npc.bgImage}" 파일을 images/ 폴더에서 찾을 수 없습니다.`);
    probe.src = npc.bgImage;
  }

  const box=document.createElement("div"); box.id="npcDialogueBox";
  box.innerHTML=`<div class="npc-wrap"><div class="npc-namebar" style="color:${npc.nameColor||'#44dd88'}">${npc.name}</div><div class="npc-body"><img class="npc-portrait" src="${npc.portrait}" onerror="this.style.display='none'" alt="${npc.name}"/><div class="npc-textarea"><div class="npc-text" id="npcText"></div></div></div><div class="npc-footer"><span class="npc-progress" id="npcProg"></span><span class="npc-hint" id="npcHint">▼ 클릭하여 계속</span><button class="npc-closebtn" id="npcClose">✕ 닫기</button></div></div>`;
  document.body.appendChild(box);
  const textEl=document.getElementById("npcText"),progEl=document.getElementById("npcProg"),hintEl=document.getElementById("npcHint");
  const lastLine=()=>lineIdx>=npc.dialogues.length-1;
  const updateUI=()=>{progEl.textContent=`${lineIdx+1}/${npc.dialogues.length}`;hintEl.textContent=lastLine()?"":"▼ 클릭하여 계속";document.getElementById("npcClose").textContent=lastLine()?"✕ 닫기 [Enter]":"✕ 닫기";};
  const typeLine=()=>{clearTimeout(typeTimer);charIdx=0;hintEl.textContent="";textEl.textContent="";updateUI();const line=npc.dialogues[lineIdx]||"";const tick=()=>{if(charIdx<line.length){textEl.textContent+=line[charIdx++];typeTimer=setTimeout(tick,26);}else {
      updateUI();
      // 공략 퀘스트 언급 시 버튼 반짝이기
      if (line.includes("공략 퀘스트")) {
        const btn = document.getElementById("tn-guide");
        if (btn) {
          // JS 직접 스타일 토글 (CSS @keyframes 미사용)
          let tick = 0;
          const iv = setInterval(() => {
            tick++;
            if (tick % 2 === 1) {
              btn.style.boxShadow  = "0 0 10px 5px rgba(136,255,136,.55)";
              btn.style.borderColor = "#ccffcc";
              btn.style.color       = "#ccffcc";
            } else {
              btn.style.boxShadow  = "none";
              btn.style.borderColor = "#88ff88";
              btn.style.color       = "#88ff88";
            }
          }, 500);
          setTimeout(() => {
            clearInterval(iv);
            btn.style.boxShadow  = "";
            btn.style.borderColor = "";
            btn.style.color       = "";
          }, 6000);
        }
      }
    }};tick();};
  const advance=()=>{const line=npc.dialogues[lineIdx]||"";if(charIdx<line.length){clearTimeout(typeTimer);textEl.textContent=line;charIdx=line.length;updateUI();return;}if(!lastLine()){lineIdx++;typeLine();}else closeBox();};

  // ── 닫기: 슬롯을 원래 플레이어/동료로 복원 ──
  let _closed = false;  // 중복 호출 방지 (클릭+키 동시 등)
  const closeBox=()=>{
    if (_closed) return;
    _closed = true;
    clearTimeout(typeTimer);
    box.style.transition="opacity .25s";
    box.style.opacity="0";
    const bgEl = document.getElementById("npcDialogueBg");
    if (bgEl) { bgEl.style.opacity = "0"; setTimeout(() => bgEl.remove(), 650); }
    setTimeout(() => {
      box.remove();
      // 슬롯 복원
      if (this._renderTownCharacters) this._renderTownCharacters();
      // 대화가 완전히 닫힌 뒤 콜백 실행 — setInterval 폴링 대신 직접 호출
      if (onClose) onClose();
    }, 270);
    document.removeEventListener("keydown",onKey);
  };

  const onKey=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();advance();}if(e.key==="Escape")closeBox();};
  box.querySelector(".npc-wrap").addEventListener("click",advance);
  document.getElementById("npcClose").addEventListener("click",e=>{e.stopPropagation();closeBox();});
  document.addEventListener("keydown",onKey);
  typeLine();
};

TownScene.prototype._talkToPrincess = function() {
  const p = this.game.player;
  const today = new Date().toLocaleDateString("ko-KR");
  const aff = p.princessAffinity || 0;

  // 호감도 단계별 대화 ID 결정
  let npcId;
  if (aff >= 100)      npcId = "princess_talk_100";
  else if (aff >= 75)  npcId = "princess_talk_75";
  else if (aff >= 50)  npcId = "princess_talk_50";
  else if (aff >= 25)  npcId = "princess_talk_25";
  else                 npcId = "princess_talk_0";

  // 하루 1회만 호감도 상승 — 대화가 끝나면 마일스톤 이벤트 체크
  if (p.princessTalkDate !== today) {
    p.princessTalkDate = today;
    p.princessAffinity = Math.min(100, aff + 3);
    this.game.log(`👸 공주 호감도 +3 (현재 ${p.princessAffinity})`);
    this.showNpcDialogue(npcId, () => this._checkPrincessMilestone());
  } else {
    this.showNpcDialogue(npcId);
  }
};

TownScene.prototype._checkPrincessMilestone = function() {
  const p = this.game.player;
  const aff = p.princessAffinity || 0;
  const ev = p.princessEvents || (p.princessEvents = {});

  if (aff >= 25 && !ev.aff25) {
    ev.aff25 = true;
    p.maxHp += 15; p.hp = Math.min(p.hp + 15, p.maxHp + (p.bonusHp||0));
    this.game.log("👸 공주와 친밀해졌다! 최대 HP +15");
    setTimeout(() => this.showNpcDialogue("princess_milestone_25"), 400);
  } else if (aff >= 50 && !ev.aff50) {
    ev.aff50 = true;
    p.bonusAttack = (p.bonusAttack||0) + 8;
    this.game.log("👸 공주가 왕실 검을 빌려주었다! 공격력 +8");
    setTimeout(() => this.showNpcDialogue("princess_milestone_50"), 400);
  } else if (aff >= 75 && !ev.aff75) {
    ev.aff75 = true;
    p.bonusHp = (p.bonusHp||0) + 50;
    this.game.log("👸 공주의 부적 효과! 최대 HP +50");
    setTimeout(() => this.showNpcDialogue("princess_milestone_75"), 400);
  } else if (aff >= 100 && !ev.aff100) {
    ev.aff100 = true;
    p.bonusAttack = (p.bonusAttack||0) + 15;
    p.bonusHp     = (p.bonusHp||0) + 100;
    this.game.log("👸 공주의 진심! 왕실 인장 가호 — 공격력 +15, HP +100");
    setTimeout(() => this.showNpcDialogue("princess_milestone_100"), 400);
  }
};

TownScene.prototype._refreshGuideQuestIfOpen = function() {
  const modal = document.getElementById("guideQuestModal");
  if (modal && modal.style.display !== "none") {
    this._renderGuideQuestModal();
  }
};

TownScene.prototype._openGuideQuestModal = function() {
  // 이장 미만남 → 이장 대화 먼저, 끝나면 모달 열기
  if (!this.game.player.metVillageChief) {
    this.game.player.metVillageChief = true;
    this.showNpcDialogue("village_chief", () => {
      setTimeout(() => this._renderGuideQuestModal(), 400);
    });
    return;
  }
  this._renderGuideQuestModal();
};

TownScene.prototype._renderGuideQuestModal = function() {
  const modal = document.getElementById("guideQuestModal");
  if (!modal) return;
  modal.style.display = "block";

  // 모달 열릴 때 캐릭터 슬롯 비우기
  ["townCharSlot1","townCharSlot2","townCharSlot3"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // 모달 닫기 버튼에 슬롯 복원 연결 (중복 방지)
  const closeBtn = document.getElementById("guideQuestClose");
  if (closeBtn && !closeBtn._slotRestored) {
    closeBtn._slotRestored = true;
    closeBtn.addEventListener("click", () => {
      if (this._renderTownCharacters) this._renderTownCharacters();
    });
  }

  const p = this.game.player;
  const today = new Date().toLocaleDateString("ko-KR");

  // 일일 투자 리셋
  if (!p.guideDailyDate || p.guideDailyDate !== today) {
    p.guideDailyDate    = today;
    p.guideDailyInvest  = 0;
    p.guideDailyBattle  = 0;
    p.guideDailyPotion  = false;
  }

  // ── 공략 퀘스트 정의 ──
  const GUIDE_QUESTS = [
    { id:"lv20",    icon:"⚔", label:"Lv.20 달성",              desc:"심연 던전 입장 전 필수 레벨",     reward:"공격력 +10",   done: p.level >= 20 },
    { id:"invest",  icon:"🏗", label:"마을에 총 100G 이상 투자", desc:"마을 성장 → 능력치 보너스 획득",  reward:"마을 성장",    done: (p.bank?.totalInvested||0) >= 100 },
    { id:"party3",  icon:"👥", label:"동료 3명 모집",             desc:"전투 협력 체계 구축",            reward:"전투력 상승",  done: !!(p.party && p.party2 && p.party3) },
    { id:"bond75",  icon:"❤", label:"동료 호감도 75+ 달성",       desc:"유대 이벤트로 공격력 보너스",    reward:"공격력 +5",    done: Object.values(p.affinity||{}).some(v=>v>=75) },
    { id:"potions", icon:"💊", label:"회복 물약 3개 이상 보유",   desc:"장기전 생존 필수",               reward:"생존력 향상",  done: (p.inventory||[]).filter(i=>i.type==="potion").length >= 3 },
    { id:"abyss",   icon:"⚫", label:"심연 던전 해금 (수도 재건)", desc:"왕국 지도에서 수도를 완전히 재건해야 함", reward:"마왕 도전 가능", done: !!p.abyssUnlocked },
  ];

  // ── 일일 퀘스트 정의 ──
  const DAILY_QUESTS = [
    { id:"d_invest", icon:"💰", label:"오늘 100G 투자하기",   done: (p.guideDailyInvest||0) >= 100, cur: p.guideDailyInvest||0, target:100 },
    { id:"d_battle", icon:"⚔", label:"오늘 전투 3회 승리하기", done: (p.guideDailyBattle||0) >= 3,  cur: p.guideDailyBattle||0,  target:3   },
    { id:"d_potion", icon:"💊", label:"회복 물약 구매/보유 확인", done: (p.inventory||[]).some(i=>i.type==="potion"), cur:0, target:1 },
  ];

  const doneCount = GUIDE_QUESTS.filter(q=>q.done).length;
  const pct = Math.floor(doneCount / GUIDE_QUESTS.length * 100);

  // 진행도
  const bar  = document.getElementById("guideProgressBar");
  const prog = document.getElementById("guideProgress");
  if (bar)  bar.style.width  = `${pct}%`;
  if (prog) prog.textContent = `${doneCount}/${GUIDE_QUESTS.length} 완료`;

  // 이장 메시지
  const msg = document.getElementById("guideChiefMsg");
  if (msg) {
    if (doneCount === GUIDE_QUESTS.length)
      msg.textContent = "완벽해요! 모든 준비가 끝났어요. 이제 심연 던전에서 마왕을 쓰러뜨려 주세요! 🔥";
    else if (doneCount >= 4)
      msg.textContent = "거의 다 왔어요! 남은 항목만 완료하면 마왕과 맞설 수 있어요. 조금만 더 힘내요!";
    else
      msg.textContent = "마왕 다르카스를 쓰러뜨리려면 철저한 준비가 필요해요. 아래 항목을 하나씩 완료해 주세요!";
  }

  // 완료 메시지
  const completeMsg = document.getElementById("guideCompleteMsg");
  if (completeMsg) completeMsg.style.display = doneCount === GUIDE_QUESTS.length ? "block" : "none";

  // 공략 퀘스트 목록 렌더
  const list = document.getElementById("guideQuestList");
  if (list) {
    list.innerHTML = "";
    GUIDE_QUESTS.forEach(q => {
      const row = document.createElement("div");
      row.style.cssText = [
        "display:flex;align-items:center;gap:12px;padding:12px 14px;",
        "border-radius:6px;border:1px solid",
        q.done ? "#2a5a2a;background:rgba(68,170,68,.08);" : "#2a1828;background:rgba(255,255,255,.03);",
      ].join("");
      row.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0;">${q.done ? "✅" : "☐"}</span>
        <span style="font-size:1.2rem;flex-shrink:0;">${q.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.82rem;font-weight:700;color:${q.done?"#88ff88":"var(--text)"};margin-bottom:2px;">${q.label}</div>
          <div style="font-size:.68rem;color:var(--text-dim);">${q.desc}</div>
        </div>
        <div style="font-size:.65rem;color:#ffcc44;text-align:right;flex-shrink:0;">보상<br>${q.reward}</div>`;
      list.appendChild(row);
    });
  }

  // 일일 퀘스트 렌더
  const dlist = document.getElementById("dailyQuestList");
  if (dlist) {
    dlist.innerHTML = "";
    DAILY_QUESTS.forEach(q => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a1828;font-size:.78rem;";
      const progress = q.target > 1 ? ` (${q.cur}/${q.target})` : "";
      row.innerHTML = `
        <span style="font-size:1rem;">${q.done ? "✅" : "☐"}</span>
        <span>${q.icon}</span>
        <span style="flex:1;color:${q.done?"#88ff88":"var(--text)"};">${q.label}${progress}</span>
        <span style="font-size:.65rem;color:var(--text-dim);">${today}</span>`;
      dlist.appendChild(row);
    });
  }
};
TownScene.prototype._renderTownCharacters = function() {
  // 대화창 / 상점·인벤 오버레이 / 은행 화면이 열려있는 동안은 슬롯을 덮어쓰지 않음
  if (document.getElementById("npcDialogueBox")) return;
  const shopOv = document.getElementById("shopInvenOverlay");
  if (shopOv && shopOv.style.display !== "none") return;
  const bankSc = document.getElementById("bankScreen");
  if (bankSc && bankSc.style.display !== "none") return;

  const p = this.game.player;

  // GIF 우선, 없으면 walk_1 PNG
  const CHAR_IMG = {
    knight:   "images/sd_knight.png",
    night:    "images/sd_knight.png",
    warrior:  "images/SD_Tanker.png",
    mage:     "images/sd_magician.png",
    magician: "images/sd_magician.png",
    archer:   "images/sd_archer.png",
    tanker:   "images/SD_Tanker.png",
    healer:   "images/sd_healer.png",
  };
  const CHAR_FALLBACK = {
    knight:   "images/sd_knight_walk_1.png",
    night:    "images/sd_knight_walk_1.png",
    warrior:  "images/sd_tanker_walk_1.png",
    mage:     "images/sd_magician_walk_1.png",
    magician: "images/sd_magician_walk_1.png",
    archer:   "images/sd_archer_walk_1.png",
    tanker:   "images/sd_tanker_walk_1.png",
    healer:   "images/sd_healer_walk_1.png",
  };
  const COMP_IMG = {
    healer:     "images/sd_healer.png",
    tanker:     "images/SD_Tanker.png",
    mage_party: "images/sd_magician.png",
    archer:     "images/sd_archer.png",
    dealer:     "images/sd_knight.png",
  };
  const COMP_FALLBACK = {
    healer:     "images/sd_healer_walk_1.png",
    tanker:     "images/sd_tanker_walk_1.png",
    mage_party: "images/sd_magician_walk_1.png",
    archer:     "images/sd_archer_walk_1.png",
    dealer:     "images/sd_knight_walk_1.png",
  };

  // CSS 애니메이션 (최초 1회 주입)
  if (!document.getElementById("townCharCSS")) {
    const s = document.createElement("style");
    s.id = "townCharCSS";
    s.textContent = `
      .tc-img { width:100%; max-height:240px; object-fit:contain;
        filter:drop-shadow(0 6px 24px rgba(0,0,0,.85));
        animation:tcBob 3s ease-in-out infinite; }
      .tc-img.delay1 { animation-delay:.5s; }
      .tc-img.delay2 { animation-delay:1s; }
      @keyframes tcBob {
        0%,100% { transform:translateY(0); }
        50%      { transform:translateY(-10px); }
      }`;
    document.head.appendChild(s);
  }

  const setSlot = (slotId, gifSrc, fallback, delayClass) => {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    if (!gifSrc && !fallback) { slot.innerHTML = ""; return; }

    const ex = slot.querySelector("img");
    const target = gifSrc || fallback;
    if (ex && (ex.src.endsWith(gifSrc) || ex.src.endsWith(fallback))) return;

    const img = document.createElement("img");
    img.className = `tc-img${delayClass ? " " + delayClass : ""}`;
    img.alt = "";
    img.src = gifSrc || fallback;
    if (gifSrc && fallback) {
      img.onerror = () => { img.src = fallback; img.onerror = null; };
    }
    slot.innerHTML = "";
    slot.appendChild(img);
  };

  setSlot("townCharSlot1",
    CHAR_IMG[p.type],
    CHAR_FALLBACK[p.type] || CHAR_FALLBACK.knight,
    "");
  setSlot("townCharSlot2",
    p.party  ? COMP_IMG[p.party]  : null,
    p.party  ? COMP_FALLBACK[p.party]  : null,
    "delay1");
  const comp2 = p.party2 || p.party3;
  setSlot("townCharSlot3",
    comp2 ? COMP_IMG[comp2]  : null,
    comp2 ? COMP_FALLBACK[comp2] : null,
    "delay2");
};

window.TownScene = TownScene;
window.getTownStage = getTownStage;
window.applyBattleInterest = applyBattleInterest;
window.NPC_DATA = NPC_DATA;
