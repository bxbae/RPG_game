// ═══════════════════════════════════════════════════
//  region-hub-scene.js — RegionHubScene
//
//  지역(광산도시 등)에 도착했을 때 보여주는 "지역 거점" 화면.
//  마을의 은행·NPC 대화 시스템과 같은 구조를 지역별로 따로 둔다:
//    - 그 지역 고유 NPC 인사 (예: 광부 두칸)
//    - 그 지역 고유 투자 시스템 (REGION_INVESTMENT, region-data.js)
//    - "던전으로 출발" 버튼으로 실제 재건 던전 진입
//
//  showNpcDialogue 는 TownScene 의 구현을 그대로 빌려 쓴다(this.game 만
//  있으면 동작하도록 설계되어 있어 중복 구현 없이 동일한 대화창을 띄울 수 있다).
// ═══════════════════════════════════════════════════
"use strict";

class RegionHubScene {
  constructor(game, regionId) {
    this.game = game;
    this.regionId = regionId;
    this._destroyed = false;
  }

  destroy() { this._destroyed = true; }

  // TownScene 의 대화창 구현을 빌려 쓴다 (this.game 만 있으면 동일하게 동작)
  showNpcDialogue(npcId, onClose) {
    if (typeof TownScene === "undefined") { if (onClose) onClose(); return; }
    TownScene.prototype.showNpcDialogue.call(this, npcId, onClose);
  }

  // 빌려 쓰는 showNpcDialogue 내부에서 호출되지만, 거점 화면엔 대기 말풍선이
  // 없으므로 안전하게 아무 동작도 하지 않는 스텁
  _hideIdleBubble() {}

  mount(container) {
    if (!container) return;
    const g  = this.game;
    const rm = g.regionManager;
    const region = rm?.get(g.player, this.regionId);
    if (!region) { container.innerHTML = `<div style="color:#fff;padding:40px;">지역 정보 없음</div>`; return; }

    this._injectCSS();
    container.innerHTML = this._buildHTML(region);
    this._bindEvents(container, region);

    // 첫 도착이면 NPC 인사 대사를 잠시 후 재생
    const arrivedKey = `_arrived_${this.regionId}`;
    const isFirstArrival = !g.player[arrivedKey];
    if (isFirstArrival) {
      g.player[arrivedKey] = true;
      g.saveManager?.autoSave?.(g);
    }

    // 동료 개인 스토리 갈등편 — 이 지역과 연결된 동료가 파티에 있고 호감도가 충분하면 발동
    const storyKey = this._findTriggerableCompanionStory();
    if (storyKey) {
      setTimeout(() => { if (!this._destroyed) this._playCompanionStoryConflict(storyKey); }, 600);
      return; // 갈등편이 우선 재생되므로 평소 NPC 인사는 건너뜀
    }

    if (isFirstArrival) {
      const cfg = rm.getInvestConfig(this.regionId);
      if (cfg?.npcId) {
        setTimeout(() => { if (!this._destroyed) this.showNpcDialogue(cfg.npcId); }, 500);
      }
    }
  }

  // 이 지역에 연결된 동료 스토리가 지금 트리거 가능한지 확인 (파티에 실제로 있어야 함)
  _findTriggerableCompanionStory() {
    const g = this.game, p = g.player, rm = g.regionManager;
    for (const key of [p.party, p.party2].filter(Boolean)) {
      if (rm.canTriggerCompanionStory(p, key, this.regionId)) return key;
    }
    return null;
  }

  async _playCompanionStoryConflict(partyKey) {
    const g = this.game, rm = g.regionManager;
    const cfg = rm.getCompanionStoryConfig(partyKey);
    if (!cfg) return;
    await this.showNpcDialogueAsync(cfg.conflictNpcId);
    // 궁수·마법사 스토리는 동료 본인이 한 번 더 변호하는 2단계 대화가 있음
    const secondKey = `${cfg.conflictNpcId}2`;
    if (NPC_DATA?.[secondKey]) {
      await this._delay(400);
      if (this._destroyed) return;
      await this.showNpcDialogueAsync(secondKey);
    }
    rm.markCompanionConflictShown(g.player, partyKey);
    g.saveManager?.autoSave?.(g);
  }

  showNpcDialogueAsync(npcId) {
    return new Promise(resolve => this.showNpcDialogue(npcId, () => resolve()));
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(() => { if (!this._destroyed) resolve(); }, ms));
  }

  refresh() {
    const c = this.game.containers?.regionhub;
    if (!c) return;
    const region = this.game.regionManager?.get(this.game.player, this.regionId);
    if (!region) return;
    c.innerHTML = this._buildHTML(region);
    this._bindEvents(c, region);
  }

  _buildHTML(region) {
    const g   = this.game;
    const rm  = g.regionManager;
    const cfg = rm.getInvestConfig(this.regionId);
    const hasInvest = !!cfg;

    let investHTML = "";
    if (hasInvest) {
      const state = rm.ensureInvestState(g.player, this.regionId);
      const stage = rm.getInvestStage(this.regionId, state.totalInvested);
      const next  = rm.getNextInvestStage(this.regionId, state.totalInvested);
      const prevMin = stage ? stage.minInvest : 0;
      const pct = next ? Math.floor((state.totalInvested - prevMin) / (next.minInvest - prevMin) * 100) : 100;

      investHTML = `
        <div class="rh-invest-card">
          <div class="rh-invest-head">
            <span class="rh-invest-icon">${stage?.icon || "💀"}</span>
            <div>
              <div class="rh-invest-stage">${stage?.name || ""}</div>
              <div class="rh-invest-total">총 투자: <b>${state.totalInvested.toLocaleString()}G</b></div>
            </div>
          </div>
          <div class="rh-invest-track"><div class="rh-invest-fill" style="width:${pct}%;"></div></div>
          <div class="rh-invest-next">${next ? `다음 단계: ${next.name} (${(next.minInvest - state.totalInvested).toLocaleString()}G 남음)` : "✅ 최고 단계 달성!"}</div>
          <div class="rh-invest-btns">
            <button class="rh-btn" data-invest="100">100G</button>
            <button class="rh-btn" data-invest="500">500G</button>
            <button class="rh-btn" data-invest="1000">1000G</button>
            <button class="rh-btn rh-btn-gold" data-invest="all">전액</button>
          </div>
        </div>`;
    }

    const bgImage = region.completed ? (cfg?.completedBgImage || cfg?.bgImage) : cfg?.bgImage;
    const bgHTML = bgImage
      ? `<div class="rh-bg" style="background-image:url('${bgImage}');"></div>`
      : "";

    return `
      <div class="rh-root">
        ${bgHTML}
        <header class="rh-header">
          <button class="rh-back" id="rhBack">← 왕국 지도</button>
          <div class="rh-title-wrap">
            <h1 class="rh-title">${region.icon || "📍"} ${region.name}</h1>
            <p class="rh-subtitle">재건도 ${region.prosperity}% ${region.completed ? "· 재건 완료" : ""}</p>
          </div>
        </header>

        <div class="rh-body">
          ${investHTML}
          <button class="rh-depart-btn" id="rhDepart">⚔ 던전으로 출발 →</button>
        </div>
      </div>`;
  }

  // "던전으로 출발" 클릭 처리 — 이 지역에서 처음 출발하는 거라면
  // 거점 NPC의 1회성 응원 대사를 먼저 보여주고, 그 다음부터는 곧바로 출발한다.
  _handleDepartClick() {
    const g  = this.game;
    const rm = g.regionManager;
    const sentOffKey = `_sentOff_${this.regionId}`;
    const cfg = rm.getInvestConfig(this.regionId);

    if (!g.player[sentOffKey] && cfg?.departDialogueId) {
      g.player[sentOffKey] = true;
      g.saveManager?.autoSave?.(g);
      this.showNpcDialogue(cfg.departDialogueId, () => {
        if (this._destroyed) return;
        g._departFromRegionHub?.(this.regionId);
      });
      return;
    }

    g._departFromRegionHub?.(this.regionId);
  }

  _bindEvents(container, region) {
    container.querySelector("#rhBack")?.addEventListener("click", () => {
      this.game._fromRegionHubToWorldMap?.();
    });
    container.querySelector("#rhDepart")?.addEventListener("click", () => {
      this._handleDepartClick();
    });
    container.querySelectorAll("[data-invest]").forEach(btn => {
      btn.addEventListener("click", () => {
        const raw = btn.getAttribute("data-invest");
        const amt = raw === "all" ? this.game.player.money : parseInt(raw, 10);
        this._doInvest(amt);
      });
    });
  }

  _doInvest(amount) {
    const g  = this.game;
    const rm = g.regionManager;
    const result = rm.invest(g.player, this.regionId, amount);
    if (!result) { g.log?.("💰 골드가 부족합니다"); return; }

    g.log?.(`🏗 ${result.invested.toLocaleString()}G 투자!`);
    this.refresh();

    if (result.leveledUp) {
      g.showNarrative?.(`🎉 ${result.nextStage.icon} ${result.nextStage.name}`, 2200);
    }
    result.newMilestones.forEach(m => {
      setTimeout(() => g.log?.(`✨ 투자 보상: ${m.msg}`), 600);
    });
    g.saveManager?.autoSave?.(g);

    // 이 투자로 "재건 100% + 투자 최종 단계"가 방금 모두 갖춰졌다면 통합 축제로 전환
    // (던전 클리어가 먼저 끝나있던 경우 — 투자가 마지막으로 완성되는 시점)
    if (rm.canTriggerRegionFestival(g.player, this.regionId)) {
      g._pendingRegionFestival = this.regionId;
      setTimeout(() => {
        g.showNarrative?.(`🎉 ${g.regionManager.get(g.player, this.regionId)?.name || ""}\n완전히 되살아났습니다!`, 2400);
      }, 600);
      setTimeout(() => { this.destroy?.(); g._toTown(); }, 1400);
    }
  }

  _injectCSS() {
    if (document.getElementById("regionHubCSS")) return;
    const style = document.createElement("style");
    style.id = "regionHubCSS";
    style.textContent = `
      .rh-root {
        width:100%; height:100%; overflow-y:auto; position:relative;
        background:
          radial-gradient(1000px 460px at 50% -10%, rgba(90,60,30,.16), transparent 70%),
          linear-gradient(180deg, #08070a 0%, #0a0908 100%);
        color:var(--text,#d8c8b0); padding:18px 16px 40px; box-sizing:border-box; font-family:inherit;
      }
      .rh-bg {
        position:absolute; inset:0; z-index:0;
        background-size:cover; background-position:center; opacity:.28;
        mask-image:linear-gradient(180deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.5) 40%, transparent 85%);
        -webkit-mask-image:linear-gradient(180deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.5) 40%, transparent 85%);
      }
      .rh-header, .rh-body { position:relative; z-index:1; }
      .rh-header { display:flex; align-items:center; gap:14px; max-width:560px; margin:0 auto 22px; }
      .rh-back {
        background:rgba(20,10,30,.85); border:1px solid #4a2e38; color:var(--text,#d8c8b0);
        padding:9px 14px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:.78rem; font-weight:700;
      }
      .rh-back:hover { filter:brightness(1.3); border-color:var(--gold,#c8980e); }
      .rh-title { margin:0; font-size:1.4rem; font-weight:800; color:var(--gold2,#e8b830); }
      .rh-subtitle { margin:2px 0 0; font-size:.74rem; color:var(--text-dim,#786050); }

      .rh-body { max-width:560px; margin:0 auto; display:flex; flex-direction:column; gap:18px; }

      .rh-invest-card {
        border-radius:14px; padding:18px; background:linear-gradient(160deg, rgba(40,26,14,.9), rgba(18,12,8,.9));
        border:1px solid #3a2a18;
      }
      .rh-invest-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
      .rh-invest-icon { font-size:2rem; }
      .rh-invest-stage { font-size:1.05rem; font-weight:800; color:#f0e0c4; }
      .rh-invest-total { font-size:.72rem; color:var(--text-dim,#9a8270); margin-top:2px; }
      .rh-invest-track { height:9px; border-radius:5px; background:rgba(0,0,0,.4); overflow:hidden; border:1px solid #3a2a18; margin-bottom:6px; }
      .rh-invest-fill { height:100%; border-radius:5px; background:linear-gradient(90deg,#a8780e,#e8b830); transition:width .5s ease; }
      .rh-invest-next { font-size:.68rem; color:var(--text-dim,#9a8270); margin-bottom:12px; }
      .rh-invest-btns { display:flex; flex-wrap:wrap; gap:8px; }
      .rh-btn {
        background:rgba(20,10,30,.85); border:1px solid #4a2e38; color:var(--text,#d8c8b0);
        padding:9px 16px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:.78rem; font-weight:700;
      }
      .rh-btn:hover { filter:brightness(1.3); }
      .rh-btn-gold { border-color:var(--gold,#c8980e); color:var(--gold2,#e8b830); }

      .rh-depart-btn {
        padding:16px; border-radius:12px; font-size:.95rem; font-weight:800; cursor:pointer; font-family:inherit;
        background:linear-gradient(180deg, #7a3030, #4a1818); color:#ffd8c0; border:1px solid #aa5050;
      }
      .rh-depart-btn:hover { filter:brightness(1.15); }
      @media (prefers-reduced-motion: reduce) { .rh-invest-fill { transition:none; } }`;
    document.head.appendChild(style);
  }
}

window.RegionHubScene = RegionHubScene;
