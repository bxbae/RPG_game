// ═══════════════════════════════════════════════════
//  battle-manager.js  — 턴제 전투 로직
//
//  [ARCH 02] UI 역할 분리
//  BattleManager는 순수 계산 + 게임 상태 변경만 담당합니다.
//  UI 호출은 _emit()으로 이벤트를 누적한 뒤 _flushUI()에서
//  BattleScene에 일괄 위임합니다.
//  덕분에 BattleManager 로직 메서드는 DOM에 의존하지 않으며,
//  BattleScene 없이도 독립적으로 단위 테스트할 수 있습니다.
// ═══════════════════════════════════════════════════
"use strict";

class BattleManager {

  static STATUS_NAME = { poison:"중독", stun:"기절", burn:"화상" };
  static STATUS_ICON = { poison:"🟢", stun:"💫", burn:"🔥" };

  // 직업별 무기 드랍 생성 헬퍼
  // names: { sword, staff, bow }  attack: 공격력 수치
  static _weaponDrop(playerType, names, attack) {
    const wClass = { night:"sword", warrior:"sword", mage:"staff", archer:"bow" }[playerType] ?? "sword";
    return normalizeItem({
      name:       names[wClass],
      type:       "weapon",
      weaponClass: wClass,
      attack,
      defense:    0,
      class:      "legend",
      enhance:    0,
    });
  }

  // ── [ARCH 02] UI 이벤트 누적 / 플러시 ────────────
  _emit(type, data = {}) {
    if (this._events) this._events.push({ type, ...data });
  }

  _flushUI(game) {
    const scene  = game.battleScene;
    const events = this._events;
    this._events = [];
    if (!scene || !events?.length) return;
    for (const e of events) {
      switch (e.type) {
        case "damage":        scene.showDamage(e.amount, e.target); break;
        case "render":        scene.render(); break;
        case "statusUpdate":  scene.updateStatusIcons(); break;
        case "bossWarning":   scene.showBossWarning(e.msg); break;
        case "hitFlash":      scene.hitFlash(); break;
        case "heroUltimate":
          if (game.currentScene === "battle") scene.showHeroUltimate(e.playerType);
          break;
        case "exCutin":
          if (game.currentScene === "battle") scene.showEXCutin();
          break;
        case "rewardPopup":   scene.showRewardPopup(e); break;
      }
    }
  }

  // 모든 쿨다운을 1씩 감소 (skip 목록에 있는 쿨다운은 제외)
  // skip: 방금 사용한 스킬명 — 그 턴에 자신의 쿨다운은 감소시키지 않음
  _tickCooldowns(game, ...skip) {
    const cd = game.player.cooldowns;
    if (!skip.includes("heal")           && cd.heal > 0)           cd.heal--;
    if (!skip.includes("jobSkill")       && cd.jobSkill > 0)       cd.jobSkill--;
    if (!skip.includes("partyUltimate")  && cd.partyUltimate > 0)  cd.partyUltimate--;
    if (!skip.includes("party2Ultimate") && (cd.party2Ultimate||0) > 0) cd.party2Ultimate--;
  }

  // ── 상태이상 적용 ─────────────────────────────────
  applyStatus(target, type, turns, game, targetName) {
    if (!target.status) target.status = { poison:0, stun:0, burn:0 };
    const existing = target.status[type] > 0;
    target.status[type] = existing ? Math.max(target.status[type], turns) : turns;
    game.log(`${BattleManager.STATUS_ICON[type]} ${targetName}에게 [${BattleManager.STATUS_NAME[type]}] ${existing?"갱신":"부여"}! (${turns}턴)`);
    this._emit("statusUpdate");
  }

  processPlayerStatus(game) {
    const p = game.player;
    if (!p?.status) return;
    if (p.status.poison > 0) {
      const dmg = Math.max(5, Math.floor((p.maxHp + p.bonusHp) * 0.06));
      p.hp = Math.max(1, p.hp - dmg);
      p.status.poison--;
      game.log(`🟢 중독 피해 ${dmg} (남은 ${p.status.poison}턴)`);
    }
    if (p.status.burn > 0) {
      const dmg = Math.max(3, Math.floor((p.maxHp + p.bonusHp) * 0.04));
      p.hp = Math.max(1, p.hp - dmg);
      p.status.burn--;
      game.log(`🔥 화상 피해 ${dmg} (남은 ${p.status.burn}턴)`);
    }
    if (p.status.stun > 0) {
      p.status.stun--;
      game.log(`💫 기절 중... (남은 ${p.status.stun}턴)`);
    }
    this._emit("statusUpdate");
  }

  // 반환값: 이 틱에 몬스터가 사망했으면 true
  // [ARCH 02] 사망 처리(_onMonsterDefeated)는 호출자 책임 — 내부에서 직접 호출 안 함
  processMonsterStatus(game) {
    const m = game.currentMonster;
    if (!m?.status) return false;
    if (m.status.poison > 0) {
      const dmg = Math.max(8, Math.floor(m.maxHp * 0.07));
      m.hp = Math.max(0, m.hp - dmg);
      m.status.poison--;
      game.log(`🟢 ${m.name} 중독 피해 ${dmg}`);
      this._emit("hitFlash");
    }
    if (m.status.burn > 0) {
      const dmg = Math.max(5, Math.floor(m.maxHp * 0.05));
      m.hp = Math.max(0, m.hp - dmg);
      m.status.burn--;
      game.log(`🔥 ${m.name} 화상 피해 ${dmg}`);
      this._emit("hitFlash");
    }
    return m.hp <= 0;
  }

  // ── 공격 ──────────────────────────────────────────
  attack(game) {
    if (game.isGameOver() || game._battleLocked) return;
    this._events = [];

    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;

    if (p.status?.stun > 0) {
      p.status.stun--;
      game.log(`💫 기절! 행동 불가 (남은 ${p.status.stun}턴)`);
      this._emit("statusUpdate");
      this._counter(game);
      this._emit("render");
      this._flushUI(game);
      return;
    }

    if (this.processMonsterStatus(game)) {
      this._emit("render");
      this._onMonsterDefeated(game);
      return;
    }

    if (window.audioMgr) {
      const sfxMap = { night:"sword", mage:"magic", archer:"arrow" };
      audioMgr.playSfx(sfxMap[p.type] || "sword");
    }

    p.ultimateGauge = Math.min(100, p.ultimateGauge + 20);

    let dmg = p.totalAttack;
    const dt = game.dungeonType ?? "normal"; // 던전 타입별 동료 참전 제한
    const partyActive  = p.party  && p.partyHp  > 0 && dt !== "outside";
    const party2Active = p.party2 && p.party2Hp > 0 && (dt === "normal" || dt === "abyss");
    const party3Active = p.party3 && p.party3Hp > 0 && dt === "abyss";

    if (partyActive) dmg += p.partyAttack;
    if (partyActive && p.party === "dealer") dmg = Math.floor(dmg * 1.2);
    if (partyActive && p.party === "healer") {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 15);
      game.log("✨ 힐러 회복 +15");
    }
    // 2번째 동료 (일반 던전+)
    if (party2Active) dmg += p.party2Attack;
    // 3번째 동료 (심연 전용)
    if (party3Active) dmg += p.party3Attack;

    const critChance = p.skills.criticalBoost * 5 + p.setBonus.crit
      + (partyActive && p.party === "archer" ? 15 : 0)
      + ((p.passiveSkills?.eagle_eye || 0) ? [0,8,16,26][p.passiveSkills.eagle_eye] : 0);
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
      const manaSurgeLv = p.passiveSkills?.mana_surge || 0;
      dmg = Math.floor(dmg * (1.5 + [0,0.2,0.4,0.65][manaSurgeLv]));
      this._emit("bossWarning", { msg: "CRITICAL!" });
    }

    if (partyActive && p.party === "healer" && Math.random() < 0.15) {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 80);
      game.log("✨ 대치유!");
    }
    // [BALANCE 05] dealer 암살: 15%→10%, dmg 2배 대신 totalAttack 추가 피해 (중복 배율 제거)
    if (partyActive && p.party === "dealer" && Math.random() < 0.10) {
      const assassinBonus = p.totalAttack;
      m.hp -= assassinBonus;
      game.log(`⚔ 암살! +${assassinBonus}`);
    }
    if (partyActive && p.party === "archer"     && Math.random() < 0.15) { m.hp -= dmg; game.log("🏹 관통사격!"); }
    if (partyActive && p.party === "mage_party" && Math.random() < 0.15) { const ex = 80 + p.level * 3; m.hp -= ex; game.log(`☄ 메테오! ${ex}`); }

    const spellEchoLv = p.passiveSkills?.spell_echo || 0;
    if (spellEchoLv > 0 && p.type === "mage") {
      if (Math.random() < [0,0.25,0.3,0.4][spellEchoLv]) {
        const echoDmg = [0,15,30,50][spellEchoLv];
        m.hp -= echoDmg;
        game.log(`🔮 마법 반향! +${echoDmg}`);
      }
    }

    const abyssCount = [p.equipment.weapon?.name, p.equipment.helmet?.name, p.equipment.armor?.name]
      .filter(n => n?.startsWith("심연의")).length;
    if (abyssCount >= 3 && Math.random() < 0.25) { dmg *= 2; game.log("🌌 심연 폭주!"); }

    m.hp -= dmg;
    this._emit("damage", { amount: dmg, target: "monster" });
    game.log(isCrit
      ? `💥 치명타! <span style="color:#ffd700">${dmg} 데미지!</span>`
      : `⚔ 공격! <span style="color:#ff8888">${dmg} 데미지</span>`);

    this._tryInflictMonster(game);
    this._bossPhase(game);

    if (m.hp <= 0) { this._onMonsterDefeated(game); return; }

    this._counter(game);
    this.processPlayerStatus(game);
    this._tickCooldowns(game); // heal + jobSkill + partyUltimate 전부 감소

    this._emit("render");
    this._flushUI(game);
  }

  // ── 회복 ──────────────────────────────────────────
  heal(game) {
    if (game.isGameOver()) return;
    this._events = [];

    const p = game.player;
    if (p.cooldowns.heal > 0) { game.log(`💊 회복 대기 (${p.cooldowns.heal}턴)`); return; }
    p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 25);
    p.cooldowns.heal = 3;
    game.log("💚 회복! +25 HP");
    if (window.audioMgr) audioMgr.playSfx("heal");

    // [BUG FIX 02] 회복도 행동 소모 — 몬스터 반격 + 상태이상 틱
    const m = game.currentMonster;
    if (m && m.hp > 0) {
      this._counter(game);
      this.processPlayerStatus(game);
      this._tickCooldowns(game, "heal"); // heal은 방금 사용했으므로 제외
    }

    this._emit("render");
    this._flushUI(game);
  }

  // ── 주인공 궁극기 ─────────────────────────────────
  heroUltimate(game) {
    this._events = [];

    const p = game.player;
    const m = game.currentMonster;
    if (!p || !m) return;
    if (p.ultimateGauge < 100) { game.log(`⚡ 게이지 부족 (${p.ultimateGauge}%)`); return; }

    p.ultimateGauge = 0;
    this._emit("heroUltimate", { playerType: p.type });

    let dmg = 0;
    switch (p.type) {
      case "warrior": // 하위호환 [BUG FIX 01]
      case "night":
        dmg = Math.floor(p.totalAttack * 3.5); m.hp -= dmg;
        if (!m.status) m.status = { poison:0, stun:0, burn:0 };
        m.status.stun = 2;
        game.log(`⚔ 폭풍검술! ${dmg} — 2턴 기절!`); break;
      case "mage":
        dmg = Math.floor(p.totalAttack * 4.0); m.hp -= dmg;
        if (!m.status) m.status = { poison:0, stun:0, burn:0 };
        m.status.burn = 3;
        game.log(`🔮 대마법진! ${dmg} — 3턴 화상!`); break;
      case "archer":
        // [BALANCE 01] 2.0×3=6배 → 1.5×3=4.5배 (기사 3.5배, 마법사 4.0배와 균형)
        dmg = Math.floor(p.totalAttack * 1.5);
        for (let i = 0; i < 3; i++) m.hp -= dmg;
        if (!m.status) m.status = { poison:0, stun:0, burn:0 };
        m.status.poison = 4;
        game.log(`🏹 천격사격! ${dmg}×3 — 4턴 맹독!`); break;
    }
    this._emit("damage", { amount: dmg, target: "monster" });
    if (m.hp <= 0) { this._onMonsterDefeated(game); return; }
    this._tickCooldowns(game); // 궁극기는 게이지 소모 — 쿨다운 없으므로 전부 감소
    this._emit("render");
    this._flushUI(game);
  }

  // ── 동료 궁극기 ───────────────────────────────────
  partyUltimate(game) {
    this._events = [];

    const p = game.player;
    const m = game.currentMonster;
    const party = p.party;
    if (!party || !m) { game.log("❌ 동료가 없습니다"); return; }
    if (p.partyHp <= 0) { game.log("💔 동료 전투 불능 (마을에서 회복 가능)"); return; }

    const aff = p.affinity?.[party] || 0;
    if (aff < 30) { game.log(`💔 호감도 부족 (현재 ${aff}/30)`); return; }
    if ((p.cooldowns?.partyUltimate || 0) > 0) { game.log(`⏳ 쿨타임 ${p.cooldowns.partyUltimate}턴`); return; }

    if (aff >= 30) this._emit("exCutin");

    const ex = aff >= 100;
    switch (party) {
      case "healer":
        p.hp = p.maxHp + p.bonusHp;
        if (p.partyHp) p.partyHp = p.partyMaxHp;
        if (ex) p.guardBuff = 5;
        game.log(ex ? "🌟 EX 천상의 기적!" : "✨ 천상의 기적!"); break;
      case "tanker":
        p.guardBuff = ex ? 10 : 5;
        game.log(ex ? "🌟 EX 절대수호!" : "🛡 수호 결계!"); break;
      case "archer": {
        const hits = ex ? 10 : 6;
        const hitDmg = Math.floor(p.partyAttack || 20);
        for (let i = 0; i < hits; i++) m.hp -= hitDmg;
        this._emit("damage", { amount: hitDmg * hits, target: "monster" });
        game.log(`🏹 폭풍 사격! ×${hits} (${hitDmg * hits})`); break;
      }
      case "mage_party": {
        const dmg = Math.floor(p.totalAttack * (ex ? 8 : 5));
        m.hp -= dmg;
        this._emit("damage", { amount: dmg, target: "monster" });
        game.log(`☄ 아포칼립스! ${dmg}`); break;
      }
      case "dealer": {
        const dmg = Math.floor(m.maxHp * (ex ? 0.6 : 0.35));
        m.hp -= dmg;
        this._emit("damage", { amount: dmg, target: "monster" });
        game.log(`⚔ 그림자 참격! ${dmg}`); break;
      }
    }
    p.cooldowns.partyUltimate = 8;
    if (m.hp <= 0) { this._onMonsterDefeated(game); return; }
    this._tickCooldowns(game, "partyUltimate"); // partyUltimate는 방금 사용했으므로 제외
    this._emit("render");
    this._flushUI(game);
  }

  // ── 2번 동료 궁극기 (party2 전용) ───────────────────
  party2Ultimate(game) {
    this._events = [];

    const p = game.player;
    const m = game.currentMonster;
    const party = p.party2;
    if (!party || !m) { game.log("❌ 2번 동료가 없습니다"); return; }
    if (p.party2Hp <= 0) { game.log("💔 2번 동료 전투 불능 (마을에서 회복 가능)"); return; }

    const aff = p.affinity?.[party] || 0;
    if (aff < 30) { game.log(`💔 호감도 부족 (현재 ${aff}/30)`); return; }
    if ((p.cooldowns?.party2Ultimate || 0) > 0) { game.log(`⏳ 쿨타임 ${p.cooldowns.party2Ultimate}턴`); return; }

    if (aff >= 30) this._emit("exCutin");

    const ex = aff >= 100;
    switch (party) {
      case "healer":
        p.hp = p.maxHp + p.bonusHp;
        if (p.party2Hp) p.party2Hp = p.party2MaxHp;
        if (ex) p.guardBuff = 5;
        game.log(ex ? "🌟 EX 천상의 기적!" : "✨ 천상의 기적!"); break;
      case "tanker":
        p.guardBuff = ex ? 10 : 5;
        game.log(ex ? "🌟 EX 절대수호!" : "🛡 수호 결계!"); break;
      case "archer": {
        const hits = ex ? 10 : 6;
        const hitDmg = Math.floor(p.party2Attack || 20);
        for (let i = 0; i < hits; i++) m.hp -= hitDmg;
        this._emit("damage", { amount: hitDmg * hits, target: "monster" });
        game.log(`🏹 폭풍 사격! ×${hits} (${hitDmg * hits})`); break;
      }
      case "mage_party": {
        const dmg = Math.floor(p.totalAttack * (ex ? 8 : 5));
        m.hp -= dmg;
        this._emit("damage", { amount: dmg, target: "monster" });
        game.log(`☄ 아포칼립스! ${dmg}`); break;
      }
      case "dealer": {
        const dmg = Math.floor(m.maxHp * (ex ? 0.6 : 0.35));
        m.hp -= dmg;
        this._emit("damage", { amount: dmg, target: "monster" });
        game.log(`⚔ 그림자 참격! ${dmg}`); break;
      }
    }
    p.cooldowns.party2Ultimate = 8;
    if (m.hp <= 0) { this._onMonsterDefeated(game); return; }
    this._tickCooldowns(game, "party2Ultimate"); // 방금 사용했으므로 제외
    this._emit("render");
    this._flushUI(game);
  }

  // ── 직업 스킬 ─────────────────────────────────────
  jobSkill(game) {
    this._events = [];

    const p = game.player;
    const m = game.currentMonster;
    if (!p || !m) return;
    if (p.cooldowns.jobSkill > 0) { game.log(`⏳ 쿨타임 ${p.cooldowns.jobSkill}턴`); return; }

    const hasSkill = { night:p.activeSkills.whirlwind, mage:p.activeSkills.magicBall, archer:p.activeSkills.rapidShot }[p.type];
    if (!hasSkill) { game.log("❌ 스킬을 배우지 않았습니다"); return; }

    let dmg = 0;
    switch (p.type) {
      case "warrior": // 하위호환 [BUG FIX 01: 중복 case 제거]
      case "night":   dmg = Math.floor(p.totalAttack * 2);   m.hp -= dmg;   game.log(`⚔ 회전베기! ${dmg}`);  break;
      case "mage":    dmg = Math.floor(p.totalAttack * 2.2); m.hp -= dmg;   game.log(`🔮 매직볼! ${dmg}`);    break;
      case "archer":  dmg = Math.floor(p.totalAttack * 1.2); m.hp -= dmg*2; game.log(`🏹 속사! ${dmg}×2`);   break;
    }
    this._emit("damage", { amount: dmg, target: "monster" });
    p.cooldowns.jobSkill = 3;
    if (m.hp <= 0) { this._onMonsterDefeated(game); return; }
    this._counter(game);
    this._tickCooldowns(game, "jobSkill"); // jobSkill은 방금 사용했으므로 제외
    this._emit("render");
    this._flushUI(game);
  }

  // ── 내부 헬퍼 ─────────────────────────────────────
  _tryInflictMonster(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;
    if (p.type === "mage"    && Math.random() < 0.3)  this.applyStatus(m, "burn",   3, game, m.name);
    if (p.type === "archer"  && Math.random() < 0.25) this.applyStatus(m, "poison", 3 + ([0,1,2,3][p.passiveSkills?.poison_tip||0]||0), game, m.name);
    if ((p.type === "night" || p.type === "warrior") && Math.random() < 0.15) {
      this.applyStatus(m, "stun", 1, game, m.name);
      game.log("💫 적이 기절!");
    }
  }

  _tryInflictPlayer(game) {
    const m = game.currentMonster;
    const p = game.player;
    if (!m || !p) return;
    if (m.name?.includes("슬라임") && Math.random() < 0.2)  this.applyStatus(p, "poison", 2, game, "플레이어");
    if (m.isFinal               && Math.random() < 0.25) this.applyStatus(p, "burn",   3, game, "플레이어");
    if (m.name?.includes("해골") && Math.random() < 0.15) this.applyStatus(p, "stun",   1, game, "플레이어");
    if (m.name?.includes("오크") && Math.random() < 0.2)  this.applyStatus(p, "burn",   2, game, "플레이어");
  }

  _bossPhase(game) {
    const m = game.currentMonster;
    if (!m?.isBoss) return;
    if (m.isFinal && m.hp < m.maxHp * 0.25 && m.phase === 2) {
      m.phase = 3; m.attack += 15;
      game.log("🔥 마왕이 최후의 힘을 끌어낸다!");
      this._emit("bossWarning", { msg: "광란 상태!" });
    } else if (m.isBoss && m.hp < m.maxHp * 0.5 && m.phase === 1) {
      m.phase = 2; m.attack += 12;
      game.log(`💢 ${m.name} 분노!`);
      this._emit("bossWarning", { msg: "분노 상태!" });
    }
  }

  _counter(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;

    let monsterAtk = m.attack;
    const warCryLv = p.passiveSkills?.war_cry || 0;
    if (warCryLv > 0) monsterAtk = Math.floor(monsterAtk * (1 - [0,0.1,0.18,0.28][warCryLv]));

    let dmg = Math.max(0, monsterAtk - p.defense);
    const arcaneWardLv = p.passiveSkills?.arcane_ward || 0;
    if (arcaneWardLv > 0) dmg = Math.floor(dmg * (1 - [0,0.08,0.15,0.22][arcaneWardLv]));

    const swiftLv = p.passiveSkills?.swift_feet || 0;
    if (swiftLv > 0 && Math.random() < [0,0.2,0.3,0.4][swiftLv]) {
      dmg = Math.floor(dmg * (1 - [0,0.1,0.15,0.2][swiftLv]));
      game.log("💨 회피!");
    }
    if (p.guardBuff > 0) { dmg = Math.floor(dmg * 0.5); p.guardBuff--; }

    p.hp = Math.max(0, p.hp - dmg);
    this._emit("damage", { amount: dmg, target: "player" });
    game.log(`💥 ${m.name} 반격! <span style="color:#88ff88">${dmg}</span>`);
    this._tryInflictPlayer(game);

    // 파티원 반격 피해 — outside 던전(혼자)은 제외
    if (p.party && p.partyHp > 0 && game.dungeonType !== "outside") {
      const cd = Math.max(0, Math.floor(m.attack * 0.6) - p.partyDefense);
      p.partyHp = Math.max(0, p.partyHp - cd);
      if (cd > 0) game.log(`👥 동료 ${cd} 피해`);
      if (p.partyHp <= 0) {
        p.partyHp = 0;
        p._partyKnockedOut = true;
        game.log("💔 동료 전투 불능! (마을에서 회복 가능)");
      }
    }

    // 2번째 동료 반격 피해 (일반+)
    if (p.party2 && p.party2Hp > 0) {
      const cd2 = Math.max(0, Math.floor(m.attack * 0.4) - p.party2Defense);
      p.party2Hp = Math.max(0, p.party2Hp - cd2);
      if (cd2 > 0) game.log(`👤 보조 동료 ${cd2} 피해`);
      if (p.party2Hp <= 0) { p.party2Hp = 0; p._party2KnockedOut = true; game.log("💔 보조 동료 전투 불능!"); }
    }

    // 3번째 동료 반격 피해 (심연 전용)
    if (p.party3 && p.party3Hp > 0) {
      const cd3 = Math.max(0, Math.floor(m.attack * 0.35) - p.party3Defense);
      p.party3Hp = Math.max(0, p.party3Hp - cd3);
      if (cd3 > 0) game.log(`👥 3번째 동료 ${cd3} 피해`);
      if (p.party3Hp <= 0) { p.party3Hp = 0; p._party3KnockedOut = true; game.log("💔 3번째 동료 전투 불능!"); }
    }

    const abyssCount = [p.equipment.weapon?.name, p.equipment.helmet?.name, p.equipment.armor?.name]
      .filter(n => n?.startsWith("심연의")).length;
    if (abyssCount >= 3) {
      const heal = Math.floor(dmg * 0.3);
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + heal);
      game.log(`🌑 심연 흡혈 +${heal}`);
    }
  }

  _onMonsterDefeated(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;

    p.killCount++;
    // [BUG FIX 03] models.js의 goldRate·expRate 우선 사용
    const goldReward = m.goldRate ?? (m.isFinal ? 500 : m.isBoss ? 180 : 50);
    const expReward  = m.expRate  ?? (m.isFinal ? 300 : m.isBoss ? 120 : 40);
    p.money += goldReward; // setter가 MAX_GOLD 자동 클램프
    const lvUp = p.gainExp(expReward);

    game.log(`🏆 ${m.name} 처치! +${goldReward.toLocaleString()}G +${expReward}EXP`);
    if (lvUp) {
      game.log(p.level >= MAX_LEVEL
        ? `🏆 최고 레벨 달성! Lv.${p.level} ✦MAX`
        : `🎉 레벨 업! Lv.${p.level}`
      );
    }
    if (p.money >= MAX_GOLD) game.log("💰 골드 상한 달성! (9,999,999G ✦MAX)");
    if (window.audioMgr) audioMgr.playSfx("levelup");

    // 호감도
    if (p.party) {
      p.affinity[p.party] = Math.min(100, (p.affinity[p.party] || 0) + 1);
      const aff = p.affinity[p.party];

      // ── 호감도 25: 첫 유대 이벤트 ─────────────────
      if (aff === 25 && !p.partyEvents?.affinity25) {
        p.partyEvents.affinity25 = true;
        p.maxHp += 10;
        p.hp = Math.min(p.hp + 10, p.maxHp + p.bonusHp);
        game.log("💬 동료와 처음 마음을 나눴다! 최대 HP +10");

        // 동료별 개성 있는 첫 대사
        const FIRST_BOND_LINES = {
          healer:
            "리온: \"당신과 함께 싸우면서… 조금씩 믿음이 생기고 있어요.\"\n" +
            "\"제가 곁에 있을게요. 절대 혼자 두지 않을 테니까요.\"",
          tanker:
            "카인: \"흥, 꽤 하는군. 이 정도면 내 등을 맡겨도 되겠어.\"\n" +
            "\"…그게 내 방식의 칭찬이다. 오해하지 마라.\"",
          dealer:
            "카르나: \"아직 경계를 완전히 풀 순 없지만… 나쁘지 않은 동료야.\"\n" +
            "\"그림자에서 사는 나한테 이런 감정은 처음이라, 좀 당황스럽군.\"",
          mage_party:
            "엘린: \"이상해요. 당신 곁에 있으면 마법이 더 잘 풀리는 것 같아요.\"\n" +
            "\"마나의 흐름이 공명하는 걸까요? 아니면… 다른 이유일까요?\"",
          archer:
            "아리아: \"화살 하나를 나눌 사이가 됐네요. 이게 꽤 큰 의미거든요, 궁수들한테는.\"\n" +
            "\"앞으로도 잘 부탁해요. 절대 빗나가지 않을 테니까요!\"",
        };
        const line = FIRST_BOND_LINES[p.party]
          ?? "\"당신과 함께라면… 앞으로도 더 멀리 갈 수 있을 것 같아요.\"";

        // 전투 보상 팝업이 끝난 뒤 내러티브 오버레이로 표시
        setTimeout(() => {
          game.showNarrative(
            `💬 호감도 25 — 첫 유대\n\n${line}\n\n❤ 최대 HP +10 획득`,
            5000
          );
        }, 2500);
      }

      // ── 호감도 30: 동료 궁극기 해금 ───────────────
      if (aff === 30  && !p.partyUltimateUnlocked) { p.partyUltimateUnlocked = true; game.log("✨ 동료 궁극기 해금!"); }
      if (aff === 50  && !p.partyEvents?.affinity50)  { p.partyEvents.affinity50 = true;  p.baseAttack += 10; game.log("💞 유대 강화! 공격력 +10"); }
      if (aff === 75  && !p.partyEvents?.affinity75)  { p.partyEvents.affinity75 = true;  p.partyStoryUnlocked = true; game.log("📖 개인 스토리 해금!"); }
      if (aff >= 100  && !p.partyEvents?.affinity100) {
        p.partyEvents.affinity100 = true; p.partyBondMax = true;
        p.partyUltimateEX = true; p.partyExAwakened = true;
        p.baseAttack += 30; p.maxHp += 100;
        p.hp = Math.min(p.hp + 100, p.maxHp + p.bonusHp);
        game.log("🌟 EX 궁극기 해금! 공격력+30 HP+100");
      }
    }

    const hadQuest    = !!(p.quest);
    const questGoal   = p.quest?.goal || 0;
    const monsterName = m.name;
    const dungeonType = game.dungeonType || "normal";

    game._returnAfterBattle ??= { type: dungeonType }; // [BUG FIX: 중복 null 체크 제거]

    const qResult = game.questManager.onKill(game, monsterName);

    // 수호자 처치 (일반 던전) → 심연 해금 + 자동저장 훅
    if (m.id === "guardian" && !p.guardianDefeated) {
      p.guardianDefeated = true;
      p.abyssUnlocked    = true;
      game.onGuardianDefeated?.(); // 자동저장 등 훅
      setTimeout(() => game.log("⚫ 심연 던전의 문이 열렸다! 마을로 돌아가 확인하세요."), 2500);
    }

    // ── 보스별 전용 드랍 ───────────────────────────────
    // 모든 보스 무기는 플레이어 직업에 맞는 종류(검/지팡이/활)로 지급
    let item;

    if (m.isFinal && Math.random() < 0.5) {
      // 마왕 다르카스: 직업별 무기 60% / 마왕의 갑옷 20% / 마왕의 면갑 20%
      const r = Math.random();
      if (r < 0.6) {
        item = BattleManager._weaponDrop(p.type, {
          sword: "마왕의 검",
          staff: "마왕의 지팡이",
          bow:   "마왕의 각궁",
        }, 80);
      } else if (r < 0.8) {
        item = normalizeItem({ name:"마왕의 갑옷", type:"armor",  attack:0, defense:40, class:"legend", enhance:0 });
      } else {
        item = normalizeItem({ name:"마왕의 면갑", type:"helmet", attack:0, defense:28, class:"legend", enhance:0 });
      }

    } else if (m.id === "guardian" && Math.random() < 0.3) {
      // 던전 수호자: 직업별 무기
      item = BattleManager._weaponDrop(p.type, {
        sword: "수호자 검",
        staff: "수호자 지팡이",
        bow:   "수호자 활",
      }, 45);

    } else if (m.id === "dragon" && Math.random() < 0.4) {
      // 고대 드래곤: 직업별 무기 50% / 용린 갑옷 25% / 용의 투구 25%
      const r = Math.random();
      if (r < 0.5) {
        item = BattleManager._weaponDrop(p.type, {
          sword: "용의 이빨",
          staff: "용의 마력구",
          bow:   "용의 뿔 활",
        }, 60);
      } else if (r < 0.75) {
        item = normalizeItem({ name:"용린 갑옷", type:"armor",  attack:0, defense:30, class:"legend", enhance:0 });
      } else {
        item = normalizeItem({ name:"용의 투구", type:"helmet", attack:0, defense:22, class:"legend", enhance:0 });
      }

    } else {
      // 일반 보스: 희귀 이상 랜덤 드랍 / 일반 몬스터: 일반 드랍
      item = createRandomItem(m.isBoss);
    }
    game.itemManager.add(game, item);
    game.log(`🎁 ${item.name}`);

    // [ARCH 02] 보상 팝업 이벤트 누적 → 즉시 플러시 (팝업은 타이밍이 중요)
    this._emit("rewardPopup", {
      title: qResult.cleared ? `🏆 퀘스트 완료!` : `⚔ ${monsterName} 처치!`,
      lines: qResult.cleared
        ? [qResult.quest?.title || "", `+${qResult.quest?.rewardGold}G`, `+${qResult.quest?.rewardExp}EXP`]
        : [`+${goldReward}G`, `+${expReward}EXP`, lvUp ? `🎉 Lv.${p.level}` : ""].filter(Boolean),
      color: qResult.cleared ? "#e8b830" : "#88ddff",
    });
    this._flushUI(game);

    // 마왕 처치
    if (m.isFinal) { game.onFinalBossDefeated(); return; }

    // 퀘스트 완료 → 마을 복귀
    if (qResult.cleared) {
      setTimeout(() => game.returnToTown("quest"), 2200);
      return;
    }

    // 퀘스트 진행 중 or 일반 전투 → 던전 복귀
    if (hadQuest && !qResult.cleared) {
      game.log(`📜 계속 진행! (${p.questProgress}/${questGoal})`);
    }
    setTimeout(() => game.onBattleVictory(), 1800);
  }
}

window.BattleManager = BattleManager;
