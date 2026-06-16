// ═══════════════════════════════════════════════════
//  battle-manager.js  — 턴제 전투 로직 (최종)
// ═══════════════════════════════════════════════════
"use strict";

class BattleManager {
  static STATUS_NAME = { poison: "중독", stun: "기절", burn: "화상" };
  static STATUS_ICON = { poison: "🟢", stun: "💫", burn: "🔥" };

  applyStatus(target, type, turns, game, targetName) {
    if (!target.status) target.status = { poison: 0, stun: 0, burn: 0 };
    const existing = target.status[type] > 0;
    target.status[type] = existing
      ? Math.max(target.status[type], turns)
      : turns;
    game.log(
      `${BattleManager.STATUS_ICON[type]} ${targetName}에게 [${BattleManager.STATUS_NAME[type]}] ${existing ? "갱신" : "부여"}! (${turns}턴)`,
    );
    game.battleScene?.updateStatusIcons();
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
    game.battleScene?.updateStatusIcons();
  }

  processMonsterStatus(game) {
    const m = game.currentMonster;
    if (!m?.status) return false;
    let killed = false;
    if (m.status.poison > 0) {
      const dmg = Math.max(8, Math.floor(m.maxHp * 0.07));
      m.hp = Math.max(0, m.hp - dmg);
      m.status.poison--;
      game.log(`🟢 ${m.name} 중독 피해 ${dmg}`);
      game.battleScene?.hitFlash();
    }
    if (m.status.burn > 0) {
      const dmg = Math.max(5, Math.floor(m.maxHp * 0.05));
      m.hp = Math.max(0, m.hp - dmg);
      m.status.burn--;
      game.log(`🔥 ${m.name} 화상 피해 ${dmg}`);
      game.battleScene?.hitFlash();
    }
    if (m.hp <= 0) {
      this._onMonsterDefeated(game);
      killed = true;
    }
    return killed;
  }

  attack(game) {
    if (game.isGameOver() || game._battleLocked) return;
    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;

    if (p.status?.stun > 0) {
      p.status.stun--;
      game.log(`💫 기절! 행동 불가 (남은 ${p.status.stun}턴)`);
      game.battleScene?.updateStatusIcons();
      this._counter(game);
      game.battleScene?.render();
      return;
    }

    if (this.processMonsterStatus(game)) {
      game.battleScene?.render();
      return;
    }

    if (window.audioMgr) {
      const sfxMap = { night: "sword", mage: "magic", archer: "arrow" };
      audioMgr.playSfx(sfxMap[p.type] || "sword");
    }

    p.ultimateGauge = Math.min(100, p.ultimateGauge + 20);

    let dmg = p.totalAttack;
    if (p.party) dmg += p.partyAttack;
    if (p.party === "healer") {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 15);
      game.log("✨ 힐러 회복 +15");
    }

    const critChance =
      p.skills.criticalBoost * 5 +
      p.setBonus.crit +
      (p.party === "archer" ? 15 : 0) +
      (p.passiveSkills?.eagle_eye || 0
        ? [0, 8, 16, 26][p.passiveSkills.eagle_eye]
        : 0);
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
      const manaSurgeLv = p.passiveSkills?.mana_surge || 0;
      dmg = Math.floor(dmg * (1.5 + [0, 0.2, 0.4, 0.65][manaSurgeLv]));
      game.battleScene?.showBossWarning("CRITICAL!");
      p._critCount = (p._critCount || 0) + 1; // ★ 치명타 카운트
    }

    if (p.party === "healer" && Math.random() < 0.15) {
      p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 80);
      game.log("✨ 대치유!");
    }
    if (p.party === "archer" && Math.random() < 0.15) {
      m.hp -= dmg;
      game.log("🏹 관통사격!");
    }
    if (p.party === "mage_party" && Math.random() < 0.15) {
      const ex = 80 + p.level * 3;
      m.hp -= ex;
      game.log(`☄ 메테오! ${ex}`);
    }

    const spellEchoLv = p.passiveSkills?.spell_echo || 0;
    if (spellEchoLv > 0 && p.type === "magician") {
      if (Math.random() < [0, 0.25, 0.3, 0.4][spellEchoLv]) {
        const echoDmg = [0, 15, 30, 50][spellEchoLv];
        m.hp -= echoDmg;
        game.log(`🔮 마법 반향! +${echoDmg}`);
      }
    }

    const abyssCount = [
      p.equipment.weapon?.name,
      p.equipment.helmet?.name,
      p.equipment.armor?.name,
    ].filter((n) => n?.startsWith("심연의")).length;
    if (abyssCount >= 3 && Math.random() < 0.25) {
      dmg *= 2;
      game.log("🌌 심연 폭주!");
    }

    m.hp -= dmg;
    game.battleScene?.showDamage(dmg, "monster");
    game.log(
      isCrit
        ? `💥 치명타! <span style="color:#ffd700">${dmg} 데미지!</span>`
        : `⚔ 공격! <span style="color:#ff8888">${dmg} 데미지</span>`,
    );

    this._tryInflictMonster(game);
    this._bossPhase(game);

    if (m.hp <= 0) {
      this._onMonsterDefeated(game);
      return;
    }

    this._counter(game);
    this.processPlayerStatus(game);

    if (p.cooldowns.jobSkill > 0) p.cooldowns.jobSkill--;
    if (p.cooldowns.partyUltimate > 0) p.cooldowns.partyUltimate--;

    game.battleScene?.render();
  }

  heal(game) {
    if (game.isGameOver()) return;
    const p = game.player;
    if (p.cooldowns.heal > 0) {
      game.log(`💊 회복 대기 (${p.cooldowns.heal}턴)`);
      return;
    }
    p.hp = Math.min(p.maxHp + p.bonusHp, p.hp + 25);
    p.cooldowns.heal = 3;
    game.log("💚 회복! +25 HP");
    if (window.audioMgr) audioMgr.playSfx("heal");
    game.battleScene?.render();
  }

  heroUltimate(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!p || !m) return;
    if (p.ultimateGauge < 100) {
      game.log(`⚡ 게이지 부족 (${p.ultimateGauge}%)`);
      return;
    }

    p.ultimateGauge = 0;
    if (game.currentScene === "battle" && game.battleScene) {
      game.battleScene.showHeroUltimate(p.type);
    }

    let dmg = 0;
    switch (p.type) {
      case "warrior":
      case "knight":
        dmg = Math.floor(p.totalAttack * 3.5);
        m.hp -= dmg;
        if (!m.status) m.status = { poison: 0, stun: 0, burn: 0 };
        m.status.stun = 2;
        game.log(`⚔ 폭풍검술! ${dmg} — 2턴 기절!`);
        break;
      case "magician":
        dmg = Math.floor(p.totalAttack * 4.0);
        m.hp -= dmg;
        if (!m.status) m.status = { poison: 0, stun: 0, burn: 0 };
        m.status.burn = 3;
        game.log(`🔮 대마법진! ${dmg} — 3턴 화상!`);
        break;
      case "archer":
        dmg = Math.floor(p.totalAttack * 2.0);
        for (let i = 0; i < 3; i++) m.hp -= dmg;
        if (!m.status) m.status = { poison: 0, stun: 0, burn: 0 };
        m.status.poison = 4;
        game.log(`🏹 천격사격! ${dmg}×3 — 4턴 맹독!`);
        break;
    }
    game.battleScene?.showDamage(dmg, "monster");
    if (m.hp <= 0) {
      this._onMonsterDefeated(game);
      return;
    }
    game.battleScene?.render();
  }

  partyUltimate(game) {
    const p = game.player;
    const m = game.currentMonster;
    const party = p.party;
    if (!party || !m) {
      game.log("❌ 동료가 없습니다");
      return;
    }
    if (p.partyHp <= 0) {
      game.log("💔 동료 전투 불능");
      return;
    }

    const aff = p.affinity?.[party] || 0;
    if (aff < 30) {
      game.log(`💔 호감도 부족 (현재 ${aff}/30)`);
      return;
    }
    if ((p.cooldowns?.partyUltimate || 0) > 0) {
      game.log(`⏳ 쿨타임 ${p.cooldowns.partyUltimate}턴`);
      return;
    }

    if (aff >= 30 && game.currentScene === "battle" && game.battleScene) {
      game.battleScene.showEXCutin();
    }

    const ex = aff >= 100;
    switch (party) {
      case "healer":
        p.hp = p.maxHp + p.bonusHp;
        if (p.partyHp) p.partyHp = p.partyMaxHp;
        if (ex) p.guardBuff = 5;
        game.log(ex ? "🌟 EX 천상의 기적!" : "✨ 천상의 기적!");
        break;
      case "tanker":
        p.guardBuff = ex ? 10 : 5;
        game.log(ex ? "🌟 EX 절대수호!" : "🛡 수호 결계!");
        break;
      case "archer": {
        const hits = ex ? 10 : 6;
        const hitDmg = Math.floor(p.partyAttack || 20);
        for (let i = 0; i < hits; i++) m.hp -= hitDmg;
        game.battleScene?.showDamage(hitDmg * hits, "monster");
        game.log(`🏹 폭풍 사격! ×${hits} (${hitDmg * hits})`);
        break;
      }
      case "mage_party": {
        const dmg = Math.floor(p.totalAttack * (ex ? 8 : 5));
        m.hp -= dmg;
        game.battleScene?.showDamage(dmg, "monster");
        game.log(`☄ 아포칼립스! ${dmg}`);
        break;
      }
    }
    p.cooldowns.partyUltimate = 8;
    if (m.hp <= 0) {
      this._onMonsterDefeated(game);
      return;
    }
    game.battleScene?.render();
  }

  jobSkill(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!p || !m) return;
    if (p.cooldowns.jobSkill > 0) {
      game.log(`⏳ 쿨타임 ${p.cooldowns.jobSkill}턴`);
      return;
    }

    const hasSkill = {
      night: p.activeSkills.whirlwind,
      mage: p.activeSkills.magicBall,
      archer: p.activeSkills.rapidShot,
    }[p.type];
    if (!hasSkill) {
      game.log("❌ 스킬을 배우지 않았습니다");
      return;
    }

    let dmg = 0;
    switch (p.type) {
      case "warrior":
      case "knight":
        dmg = Math.floor(p.totalAttack * 2);
        m.hp -= dmg;
        game.log(`⚔ 회전베기! ${dmg}`);
        break;
      case "magician":
        dmg = Math.floor(p.totalAttack * 2.2);
        m.hp -= dmg;
        game.log(`🔮 매직볼! ${dmg}`);
        break;
      case "archer":
        dmg = Math.floor(p.totalAttack * 1.2);
        m.hp -= dmg * 2;
        game.log(`🏹 속사! ${dmg}×2`);
        break;
    }
    game.battleScene?.showDamage(dmg, "monster");
    p.cooldowns.jobSkill = 3;
    if (m.hp <= 0) {
      this._onMonsterDefeated(game);
      return;
    }
    this._counter(game);
    game.battleScene?.render();
  }

  _tryInflictMonster(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;
    if (p.type === "magician" && Math.random() < 0.3)
      this.applyStatus(m, "burn", 3, game, m.name);
    if (p.type === "archer" && Math.random() < 0.25)
      this.applyStatus(
        m,
        "poison",
        3 + ([0, 1, 2, 3][p.passiveSkills?.poison_tip || 0] || 0),
        game,
        m.name,
      );
    if ((p.type === "knight" || p.type === "warrior") && Math.random() < 0.15) {
      this.applyStatus(m, "stun", 1, game, m.name);
      game.log("💫 적이 기절!");
    }
  }

  _tryInflictPlayer(game) {
    const m = game.currentMonster;
    const p = game.player;
    if (!m || !p) return;
    if (m.name?.includes("슬라임") && Math.random() < 0.2)
      this.applyStatus(p, "poison", 2, game, "플레이어");
    if (m.isFinal && Math.random() < 0.25)
      this.applyStatus(p, "burn", 3, game, "플레이어");
    if (m.name?.includes("해골") && Math.random() < 0.15)
      this.applyStatus(p, "stun", 1, game, "플레이어");
    if (m.name?.includes("오크") && Math.random() < 0.2)
      this.applyStatus(p, "burn", 2, game, "플레이어");
  }

  _bossPhase(game) {
    const m = game.currentMonster;
    if (!m?.isBoss) return;
    if (m.isFinal && m.hp < m.maxHp * 0.25 && m.phase === 2) {
      m.phase = 3;
      m.attack += 15;
      game.log("🔥 마왕이 최후의 힘을 끌어낸다!");
      game.battleScene?.showBossWarning("광란 상태!");
    } else if (m.isBoss && m.hp < m.maxHp * 0.5 && m.phase === 1) {
      m.phase = 2;
      m.attack += 12;
      game.log(`💢 ${m.name} 분노!`);
      game.battleScene?.showBossWarning("분노 상태!");
    }
  }

  _counter(game) {
    const p = game.player;
    const m = game.currentMonster;
    if (!m) return;

    let monsterAtk = m.attack;
    const warCryLv = p.passiveSkills?.war_cry || 0;
    if (warCryLv > 0)
      monsterAtk = Math.floor(
        monsterAtk * (1 - [0, 0.1, 0.18, 0.28][warCryLv]),
      );

    let dmg = Math.max(0, monsterAtk - p.defense);
    const arcaneWardLv = p.passiveSkills?.arcane_ward || 0;
    if (arcaneWardLv > 0)
      dmg = Math.floor(dmg * (1 - [0, 0.08, 0.15, 0.22][arcaneWardLv]));

    const swiftLv = p.passiveSkills?.swift_feet || 0;
    if (swiftLv > 0 && Math.random() < [0, 0.2, 0.3, 0.4][swiftLv]) {
      dmg = Math.floor(dmg * (1 - [0, 0.1, 0.15, 0.2][swiftLv]));
      game.log("💨 회피!");
    }
    if (p.guardBuff > 0) {
      dmg = Math.floor(dmg * 0.5);
      p.guardBuff--;
    }

    p.hp = Math.max(0, p.hp - dmg);
    game.battleScene?.showDamage(dmg, "player");
    game.log(`💥 ${m.name} 반격! <span style="color:#88ff88">${dmg}</span>`);
    this._tryInflictPlayer(game);

    if (p.party && p.partyHp > 0) {
      const cd = Math.max(0, Math.floor(m.attack * 0.6) - p.partyDefense);
      p.partyHp = Math.max(0, p.partyHp - cd);
      if (cd > 0) game.log(`👥 동료 ${cd} 피해`);
      if (p.partyHp <= 0) {
        game.log("💔 동료 전투 불능!");
        p.party = null;
      }
    }

    const abyssCount = [
      p.equipment.weapon?.name,
      p.equipment.helmet?.name,
      p.equipment.armor?.name,
    ].filter((n) => n?.startsWith("심연의")).length;
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
    const goldReward = m.isFinal ? 500 : m.isBoss ? 180 : 50;
    const expReward = m.isFinal ? 300 : m.isBoss ? 120 : 40;
    p.money += goldReward;
    const lvUp = p.gainExp(expReward);

    game.log(`🏆 ${m.name} 처치! +${goldReward}G +${expReward}EXP`);
    if (lvUp) game.log(`🎉 레벨 업! Lv.${p.level}`);
    if (window.audioMgr) audioMgr.playSfx("levelup");

    // ★ 호감도 + 대화 씬 트리거
    if (p.party) {
      p.affinity[p.party] = Math.min(100, (p.affinity[p.party] || 0) + 1);
      const aff = p.affinity[p.party];

      // 호감도 달성 시 대화 씬 2초 후 자동 실행
      const triggerDialogue = (level) => {
        setTimeout(() => {
          if (window.dialogueScene && p.party) {
            window.dialogueScene.show(p.party, level);
          }
        }, 2000);
      };

      if (aff === 30 && !p.partyUltimateUnlocked) {
        p.partyUltimateUnlocked = true;
        game.log("✨ 동료 궁극기 해금!");
        triggerDialogue(30);
      }
      if (aff === 50 && !p.partyEvents?.affinity50) {
        p.partyEvents.affinity50 = true;
        p.baseAttack += 10;
        game.log("💞 유대 강화! 공격력 +10");
        triggerDialogue(50);
      }
      if (aff === 75 && !p.partyEvents?.affinity75) {
        p.partyEvents.affinity75 = true;
        p.partyStoryUnlocked = true;
        game.log("📖 개인 스토리 해금!");
        triggerDialogue(75);
      }
      if (aff >= 100 && !p.partyEvents?.affinity100) {
        p.partyEvents.affinity100 = true;
        p.partyBondMax = true;
        p.partyUltimateEX = true;
        p.partyExAwakened = true;
        p.baseAttack += 30;
        p.maxHp += 100;
        p.hp = Math.min(p.hp + 100, p.maxHp + p.bonusHp);
        game.log("🌟 EX 궁극기 해금! 공격력+30 HP+100");
        triggerDialogue(100);
      }
    }

    // 퀘스트 처리
    const hadQuest = !!p.quest;
    const questGoal = p.quest?.goal || 0;
    const monsterName = m.name;
    const dungeonType = game.dungeonType || "normal";

    if (!game._returnAfterBattle) {
      game._returnAfterBattle = { type: dungeonType };
    }

    const qResult = game.questManager.onKill(game, monsterName);

    // 아이템 드랍
    let item;
    if (m.isFinal && Math.random() < 0.5)
      item = normalizeItem({
        name: "마왕의 검",
        type: "weapon",
        attack: 80,
        defense: 0,
        class: "legend",
        enhance: 0,
      });
    else if (m.isBoss && Math.random() < 0.25)
      item = normalizeItem({
        name: "수호자 검",
        type: "weapon",
        attack: 45,
        defense: 0,
        class: "legend",
        enhance: 0,
      });
    else item = createRandomItem(m.isBoss);
    game.itemManager.add(game, item);
    game.log(`🎁 ${item.name}`);

    // 보상 팝업
    game.battleScene?.showRewardPopup({
      title: qResult.cleared ? `🏆 퀘스트 완료!` : `⚔ ${monsterName} 처치!`,
      lines: qResult.cleared
        ? [
            qResult.quest?.title || "",
            `+${qResult.quest?.rewardGold}G`,
            `+${qResult.quest?.rewardExp}EXP`,
          ]
        : [
            `+${goldReward}G`,
            `+${expReward}EXP`,
            lvUp ? `🎉 Lv.${p.level}` : "",
          ].filter(Boolean),
      color: qResult.cleared ? "#e8b830" : "#88ddff",
    });

    if (m.isFinal) {
      game.onFinalBossDefeated();
      return;
    }

    if (qResult.cleared) {
      setTimeout(() => game.returnToTown("quest"), 2200);
      return;
    }

    if (hadQuest && !qResult.cleared) {
      game.log(`📜 계속 진행! (${p.questProgress}/${questGoal})`);
      if (!game._returnAfterBattle)
        game._returnAfterBattle = { type: dungeonType };
      setTimeout(() => game.onBattleVictory(), 1800);
      return;
    }

    if (!game._returnAfterBattle)
      game._returnAfterBattle = { type: dungeonType };
    setTimeout(() => game.onBattleVictory(), 1800);
  }
}

window.BattleManager = BattleManager;
