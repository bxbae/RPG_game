// ╔═══════════════════════════════════════════════════════════════╗
// ║  ⚠  DEPRECATED — 이 파일은 더 이상 사용되지 않습니다           ║
// ║  [ARCH 01] 현재 활성 버전: game.js (전역 스크립트 방식)        ║
// ║                                                               ║
// ║  rpg-game.js 는 구 아키텍처(ES Module + UIManager)의           ║
// ║  잔재입니다. 새로운 기능은 아래 파일에만 추가하세요:             ║
// ║    • game.js        — 메인 게임 컨트롤러                       ║
// ║    • models.js      — 데이터 모델 & 상수                       ║
// ║    • managers.js    — SaveManager / ItemManager / QuestManager ║
// ║    • battle-manager.js — 전투 로직                             ║
// ║    • town-scene.js  — 마을 UI                                  ║
// ║    • dungeon-scene.js — 던전 탐험                              ║
// ║    • battle-scene.js  — 전투 UI                                ║
// ║                                                               ║
// ║  index.html에서 이 파일을 import하고 있다면 game.js로           ║
// ║  교체하고 이 파일은 삭제하세요.                                  ║
// ╚═══════════════════════════════════════════════════════════════╝

// rpg-game.js (구 버전 — 하위 참조용으로만 보존)
import {
  Player,
  PARTY_MEMBERS,
  SHOP_ITEMS,
  QUESTS,
  EXPLORATION_EVENTS,
  RARE_EXPLORATION_EVENTS,
  AFFINITY_DIALOGS,
  ABYSS_SET,
  HERO_SET,
  PARTY_STORIES,
} from "./rpg-models.js";
import { CombatSystem, InventorySystem, SaveSystem } from "./rpg-systems.js";

import { UIManager } from "./rpg-ui.js";

class Game {
  constructor() {
    this.ui = new UIManager();
    this.inventorySystem = new InventorySystem();
    this.saveSystem = new SaveSystem();
    this.combat = new CombatSystem();
    this.player = null;
    this.monster = null;
    this.comboCount = 0;
    this.comboTimer = null;
    this.ui.bind(this);
    window.game = this;
    window.rpgGame = this;
  }

  isGameOver() {
    if (!this.player) {
      return true;
    }

    if (this.player.hp <= 0) {
      return true;
    }

    return false;
  }

  start(type) {
    this.player = new Player(type);
    this.monster = null;
    this.comboCount = 0;
    this.ui.clearLog();
    this.ui.showScreen("town");
    this.ui.render(this);
    this.ui.showNarrative(
      `${this.player.name}이(가) 마을에 도착했다.\n마왕의 위협으로 마을 사람들은 두려움에 떨고 있다...`,
      4000,
    );
  }

  loadGame() {
    const data = this.saveSystem.load();
    if (!data) {
      alert("저장 데이터 없음");
      return;
    }
    this.player = this.saveSystem.hydratePlayer(data.player);

    const p = this.player;

    p.storyRewardClaimed = p.storyRewardClaimed || {};

    this.monster = data.monster;
    this.comboCount = data.comboCount || 0;
    this.ui.clearLog();
    if (
      this.player.storyPhase === "dungeon" ||
      this.player.storyPhase === "boss"
    ) {
      this.ui.showScreen("dungeon");
      this.render();
    } else {
      this.ui.showScreen("town");
      this.ui.render(this);
    }
    this.log("📖 저장 데이터를 불러왔습니다.");
  }

  save() {
    if (!this.player) return;
    this.saveSystem.save(this);
    this.log("💾 저장 완료!");
  }

  restart() {
    this.player = null;
    this.monster = null;
    this.comboCount = 0;
    this.ui.showScreen("title");
  }

  // ── 스토리 ───────────────────────────

  goToDungeon() {
    if (!this.player) return;
    if (!this.player.party) {
      alert("동료 없이는 던전에 갈 수 없습니다!\n주점에서 동료를 모집하세요.");
      return;
    }
    // 계곡 이미지 전환 화면 표시 후 던전 진입
    this.ui.showScreen("depart");
    setTimeout(() => {
      this.player.storyPhase = "dungeon";
      this.ui.clearLog();
      this.ui.showScreen("dungeon");
      this.ui.showPartySelection(false);
      this.ui.updatePlayerSprite(this);
      this.combat.spawnMonster(this);
      this.render();
      this.log("⚔ 던전 탐험 시작! 마왕을 향해 전진하라!");
    }, 3000);
  }

  onEnterBossRoom() {
    this.ui.showScreen("boss");
    this.ui.showNarrative(
      "드디어 마왕의 방이다!\n모든 힘을 쏟아 싸워라!",
      3500,
    );
  }

  fightBoss() {
    this.player.storyPhase = "boss";

    this.ui.showScreen("dungeon");

    this.ui.updatePlayerSprite(this);

    this.combat.spawnMonster(this, true);

    this.render();
  }
  goToAbyss() {
    if (!this.player?.abyssUnlocked) {
      this.log("🔒 심연은 아직 잠겨 있습니다.");

      return;
    }

    this.player.storyPhase = "abyss";

    this.ui.showScreen("dungeon");

    this.ui.clearLog();

    this.ui.updatePlayerSprite(this);

    if (this.player.pendingAbyssBoss) {
      this.player.abyssKillCount = 0;

      this.combat.spawnAbyssBoss(this);
    } else {
      this.combat.spawnAbyssMonster(this);
    }

    this.render();

    this.log("👹 심연 던전 진입!");
  }

  onFinalBossDefeated() {
    this.player.abyssUnlocked = true;
    this.player.storyPhase = "town";

    this.ui.showNarrative("마왕은 쓰러졌지만...\n심연의 문이 열렸다!", 5000);

    this.ui.showScreen("town");
    this.saveSystem.save(this);
    setTimeout(() => {
      this.ui.showScreen("victory");
    }, 600);
  }
  // --대장간----------------------------
  openBlacksmith() {
    this.ui.showScreen("blacksmith");

    this.ui.renderBlacksmith(this);
  }
  // ── 동료 ────────────────────────────

  showPartyRecruitment() {
    this.ui.showScreen("partySelect");
  }

  selectParty(type) {
    if (!this.player) return;
    const member = PARTY_MEMBERS[type];
    if (!member) return;
    this.player.party = type;
    this.player.partyHp = member.hp;
    this.player.partyMaxHp = member.hp;
    this.ui.showPartySelection(false);
    this.log(`🤝 동료 합류: ${member.name} (${member.className})`);
    this.ui.showNarrative(`${member.name}이(가) 파티에 합류했다!`, 2500);
    this.ui.showScreen("town");
    this.ui.render(this);
    this.ui.updateCompanionCard(this);
  }

  // ── 전투 ────────────────────────────

  attack() {
    this.combat.attack(this);
  }
  heal() {
    this.combat.heal(this);
  }
  // ── 스킬 트리 ───────────────────────

  learnSkill(skillName) {
    const p = this.player;

    if (!p) return;

    if (p.skillPoints <= 0) {
      this.log("❌ SP가 부족합니다.");
      return;
    }

    if (p.skills[skillName] >= 10) {
      this.log("⚠ 최대 레벨입니다.");
      return;
    }

    p.skillPoints--;
    p.skills[skillName]++;

    if (skillName === "hpBoost") {
      p.hp += 20;

      const maxHp = p.maxHp + (p.bonusHp || 0);

      if (p.hp > maxHp) {
        p.hp = maxHp;
      }
    }

    const names = {
      attackBoost: "공격 강화",
      hpBoost: "체력 강화",
      criticalBoost: "치명타 강화",
    };

    this.log(`🌟 ${names[skillName]} Lv.${p.skills[skillName]}`);

    this.render();
  }
  learnJobSkill() {
    const p = this.player;

    if (!p) return;

    if (p.skillPoints < 3) {
      this.log("❌ SP 3 필요");
      return;
    }

    if (
      p.activeSkills.whirlwind ||
      p.activeSkills.magicBall ||
      p.activeSkills.rapidShot
    ) {
      this.log("⚠ 이미 습득했습니다.");
      return;
    }

    p.skillPoints -= 3;

    switch (p.type) {
      case "warrior":
        p.activeSkills.whirlwind = true;
        break;

      case "mage":
        p.activeSkills.magicBall = true;
        break;

      case "archer":
        p.activeSkills.rapidShot = true;
        break;
    }

    this.log("✨ 직업 스킬 습득!");
    this.render();
  }

  acceptQuest(index) {
    const quest = QUESTS[index];

    if (!quest) return;

    this.player.quest = quest;
    this.player.questProgress = 0;

    this.log(`📜 퀘스트 수락 : ${quest.title}`);

    this.render();
  }

  jobSkill() {
    this.combat.jobSkill(this);
  }
  partySkill() {
    if (this.combat.partySkill) {
      this.combat.partySkill(this);
    } else {
      this.log("⚠ 파티 스킬 준비 중...");
    }
  }
  partyUltimate() {
    this.combat.partyUltimate(this);
  }
  ultimate() {
    this.combat.ultimate(this);
  }
  //---파티멤버와 이야기 ---

  showPartyStory() {
    const p = this.player;

    if (!p.partyStoryUnlocked) {
      this.log("❌ 아직 해금되지 않았습니다.");
      return;
    }

    const story = PARTY_STORIES[p.party];

    if (!story) return;

    if (p.storyRewardClaimed[p.party]) {
      this.log("📖 이미 완료한 이야기입니다.");
      return;
    }

    this.ui.showSpecialEvent(story.title, story.text, [
      {
        text: "이야기를 듣는다",
        action: () => {
          this.ui.hideSpecialEvent();

          if (story.reward.attack) {
            p.baseAttack += story.reward.attack;
          }

          if (story.reward.hp) {
            p.maxHp += story.reward.hp;
            p.hp += story.reward.hp;
          }

          if (story.reward.defense) {
            p.bonusDefense = (p.bonusDefense || 0) + story.reward.defense;
          }

          if (story.reward.crit) {
            p.storyCritBonus = (p.storyCritBonus || 0) + story.reward.crit;
          }
          p.storyRewardClaimed[p.party] = true;

          const exclusiveWeapons = {
            healer: {
              name: "성녀의 지팡이",
              type: "weapon",
              attack: 80,
              weaponClass: "staff",
              class: "legend",
            },

            warrior: {
              name: "수호자의 방패검",
              type: "weapon",
              attack: 90,
              weaponClass: "sword",
              class: "legend",
            },

            mage_party: {
              name: "천공의 마도서",
              type: "weapon",
              attack: 110,
              weaponClass: "staff",
              class: "legend",
            },

            archer: {
              name: "세계수의 활",
              type: "weapon",
              attack: 100,
              weaponClass: "bow",
              class: "legend",
            },

            dealer: {
              name: "혈월의 대검",
              type: "weapon",
              attack: 105,
              weaponClass: "sword",
              class: "legend",
            },
          };

          p.inventory.push(normalizeItem(exclusiveWeapons[p.party]));

          p.partyExAwakened = true;

          this.log("🌟 전용 무기 획득!");
          this.log("⚡ EX 각성!");

          this.log("📖 개인 스토리 완료!");
          this.render();
        },
      },
    ]);
  }

  //---탐험----
  startExplorationEvent() {
    let pool = EXPLORATION_EVENTS;

    if (Math.random() < 0.15) {
      pool = RARE_EXPLORATION_EVENTS;
    }

    const event = pool[Math.floor(Math.random() * pool.length)];

    this.player.lastExploration = event;

    this.ui.showExplorationEvent(event, this);
  }

  resolveExploration(effect) {
    switch (effect) {
      case "atk":
        this.player.bonusAttack = (this.player.bonusAttack || 0) + 10;

        this.log("🌟 공격력 +10");
        break;

      case "gold":
        this.player.money += 500;
        this.log("💰 500 골드 획득");
        break;
      case "merchant":
        this.ui.showSpecialEvent(
          "🧙 숨겨진 상인",

          "희귀한 물건을 판매하고 있다.",

          [
            {
              text: "심연 장비 구매 (5000G)",

              action: () => {
                if (this.player.money < 5000) {
                  this.log("❌ 골드 부족");

                  return;
                }

                this.player.money -= 5000;

                const item = JSON.parse(
                  JSON.stringify(
                    ABYSS_SET[Math.floor(Math.random() * ABYSS_SET.length)],
                  ),
                );

                this.player.inventory.push(item);

                this.log(`🌌 ${item.name} 획득`);

                this.ui.hideSpecialEvent();

                this.resolveExploration("none");
              },
            },

            {
              text: "떠난다",

              action: () => {
                this.ui.hideSpecialEvent();

                this.resolveExploration("none");
              },
            },
          ],
        );

        return;

      case "legend":
        this.ui.showSpecialEvent(
          "👑 전설 상자",

          "강력한 장비가 들어있다.",

          [
            {
              text: "개봉",

              action: () => {
                const item = JSON.parse(
                  JSON.stringify(
                    HERO_SET[Math.floor(Math.random() * HERO_SET.length)],
                  ),
                );

                this.player.inventory.push(item);

                this.log(`👑 ${item.name} 획득`);

                this.ui.hideSpecialEvent();

                this.resolveExploration("none");
              },
            },
          ],
        );

        return;

      case "curse":
        this.ui.showSpecialEvent(
          "💀 저주 방",

          "힘을 얻지만 대가를 치른다.",

          [
            {
              text: "받아들인다",

              action: () => {
                this.player.hp = Math.max(1, Math.floor(this.player.hp * 0.5));

                this.player.bonusAttack += 50;

                this.log("💀 저주 수용");

                this.log("⚔ 공격력 +50");

                this.ui.hideSpecialEvent();

                this.resolveExploration("none");
              },
            },
          ],
        );

        return;

      case "portal":
        this.ui.showSpecialEvent(
          "🌀 비밀 포탈",

          "심연 군주의 영역으로 이동한다.",

          [
            {
              text: "진입",

              action: () => {
                this.player.abyssKillCount = 10;

                this.combat.spawnAbyssBoss(this);

                this.ui.hideSpecialEvent();

                this.render();
              },
            },
          ],
        );

        return;
      case "none":
        break;
    }

    this.render();
  }

  // ── 인벤토리 ─────────────────────────

  buyShopItem(idx) {
    if (this.inventorySystem.buyItem(this, SHOP_ITEMS[idx])) this.render();
  }

  // 나/동료에게 직접 장착 (아이템 패널에서 호출)
  equipTo(index, forParty = false) {
    this.inventorySystem.equipItem(this, index, forParty);
    this.render();
  }

  // 장착 슬롯 해제
  unequipSlot(slot, forParty = false) {
    const eq = forParty ? this.player.partyEquipment : this.player.equipment;

    const item = eq[slot];

    if (!item) return;

    this.player.inventory.push(item);

    eq[slot] = null;

    this.render();

    this.log(`🔓 ${slot} 슬롯 해제`);
  }

  equip(index) {
    if (!this.player) return;
    if (this.player.party) {
      this._showEquipDialog(index);
    } else {
      this.inventorySystem.equipItem(this, index, false);
      this.render();
    }
  }

  _showEquipDialog(index) {
    document.getElementById("equipDialog")?.remove();

    const item = this.player.inventory[index];

    if (!item) return;
    const dlg = document.createElement("div");
    dlg.id = "equipDialog";
    dlg.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);`;
    dlg.innerHTML = `
      <div style="background:#110d0f;border:1px solid #4a2e38;padding:28px 36px;text-align:center;max-width:300px;font-family:'Noto Serif KR',serif;color:#d8c8b0;">
        <div style="font-size:.85rem;color:#c8980e;margin-bottom:6px;">장착</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:16px;"><span class="${item.class}">${item.name}</span>을(를)<br>누구에게 장착하시겠습니까?</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="equipMe"     style="flex:1;padding:10px;background:#1a1012;border:1px solid #4a2e38;color:#d8c8b0;cursor:pointer;font-family:inherit;">나에게</button>
          <button id="equipComp"   style="flex:1;padding:10px;background:#1a1012;border:1px solid #4a2870;color:#d8c8b0;cursor:pointer;font-family:inherit;">동료에게</button>
          <button id="equipCancel" style="padding:10px 14px;background:transparent;border:1px solid #2e1e24;color:#786050;cursor:pointer;font-family:inherit;">취소</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    document.getElementById("equipMe").onclick = () => {
      this.inventorySystem.equipItem(this, index, false);
      this.render();
      dlg.remove();
    };
    document.getElementById("equipComp").onclick = () => {
      this.inventorySystem.equipItem(this, index, true);
      this.render();
      dlg.remove();
    };
    document.getElementById("equipCancel").onclick = () => dlg.remove();
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.remove();
    });
  }

  remove(index) {
    this.inventorySystem.removeItem(this, index);
    this.render();
  }

  enhance(index) {
    this.inventorySystem.enhanceItem(this, index);
    this.render();
  }

  // ── 유틸 ────────────────────────────

  isGameOver() {
    return !this.player || this.player.hp <= 0;
  }
  log(msg) {
    this.ui.log(msg);
  }

  render() {
    this.ui.render(this);

    if (this.isGameOver() && this.player?.storyPhase !== "victory") {
      setTimeout(() => this.ui.showScreen("defeat"), 800);
    }
  }
}

const game = new Game();

window.rpgGame = game;

window.__rpgPartyData = {
  PARTY_MEMBERS,
};

export default game;
