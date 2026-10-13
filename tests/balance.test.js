// 밸런스 수식 테스트 — balance.js 로 모은 수식이 "리팩터링 이전 게임과 똑같이" 동작하는지 확인한다.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGame } = require("./helpers/load-game");

const g = loadGame(["balance.js", "models.js"]);
const Balance = g.get("Balance");
const Player = g.get("Player");
const createMonsterInstance = g.get("createMonsterInstance");

// ── 리팩터링 이전의 원본 로직(오라클) ────────────────────────
function legacyGainExp(p, amount, maxLevel) {
  if (p.level >= maxLevel) { p.exp = p.nextExp - 1; return false; }
  p.exp += amount;
  let up = false;
  while (p.exp >= p.nextExp && p.level < maxLevel) {
    p.exp -= p.nextExp; p.level += 1; p.skillPoints += 1; p.maxHp += 20; p.baseAttack += 5;
    p.nextExp = Math.floor(p.nextExp * 1.3); up = true;
  }
  if (p.level >= maxLevel) p.exp = p.nextExp - 1;
  return up;
}
const legacyScale = (level, floorMult) => (1 + (level - 1) * 0.15) * floorMult;

const plain = x => JSON.parse(JSON.stringify(x));
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); }

test("경험치 곡선: 처음 몇 레벨의 값이 고정되어 있다 (기존 게임의 값)", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(l => Balance.expToNext(l)), [100, 130, 169, 219, 284, 369]);
});

test("경험치 곡선: 기존의 '매 레벨 floor(×1.3)' 누적과 레벨 1~80 전부 같다", () => {
  let n = 100;
  for (let lv = 1; lv <= 80; lv++) {
    assert.equal(Balance.expToNext(lv), n, `Lv${lv}`);
    n = Math.floor(n * 1.3);
  }
});

test("Player.gainExp 는 기존 로직과 무작위 경험치 열에서 항상 같은 결과를 낸다", () => {
  const MAX = g.get("MAX_LEVEL");
  for (let seed = 1; seed <= 60; seed++) {
    const r = rng(seed);
    const p = new Player("knight");
    const o = { level: 1, exp: 0, nextExp: 100, skillPoints: 0, maxHp: p.maxHp, baseAttack: p.baseAttack };
    for (let i = 0; i < 80; i++) {
      const amt = Math.floor(r() * 40000);
      assert.equal(p.gainExp(amt), legacyGainExp(o, amt, MAX));
      assert.deepEqual(
        { level: p.level, exp: p.exp, nextExp: p.nextExp, skillPoints: p.skillPoints, maxHp: p.maxHp, baseAttack: p.baseAttack }, o,
        `seed ${seed} step ${i}`);
    }
  }
});

test("몬스터 스케일: 기존 식과 같고, 능력치는 내림으로 계산된다", () => {
  for (const L of [1, 2, 7, 10, 25, 60]) for (const fm of [0.5, 1, 1.35, 1.7, 3.2])
    assert.equal(Balance.monsterScale(L, fm), legacyScale(L, fm));
  const m = createMonsterInstance("slime", Balance.monsterScale(10, 1.35));   // slime: HP 80 / ATK 8
  assert.equal(m.hp, Math.floor(80 * legacyScale(10, 1.35)));                   // 253
  assert.equal(m.attack, Math.floor(8 * legacyScale(10, 1.35)));                // 25
  assert.equal(m.hp, m.maxHp);
});

test("전투 보상: 번영 보너스는 골드에만 붙고, 정의가 없으면 기본값을 쓴다", () => {
  assert.deepEqual(plain(Balance.battleRewards({ goldRate: 100, expRate: 70 }, 0)), { gold: 100, exp: 70 });
  assert.deepEqual(plain(Balance.battleRewards({ goldRate: 100, expRate: 70 }, 20)), { gold: 120, exp: 70 });
  assert.deepEqual(plain(Balance.battleRewards({})), { gold: 50, exp: 40 });
  assert.deepEqual(plain(Balance.battleRewards({ isBoss: true })), { gold: 180, exp: 120 });
  assert.deepEqual(plain(Balance.battleRewards({ isFinal: true, isBoss: true })), { gold: 500, exp: 300 });
});

test("피해 수식: 정액 차감, 0 아래로 내려가지 않는다", () => {
  assert.equal(Balance.damageAfterDefense(30, 12), 18);
  assert.equal(Balance.damageAfterDefense(10, 15), 0);
  assert.equal(Balance.partyCounterDamage(100, 0, 5), 55);   // floor(100×0.6) − 5
  assert.equal(Balance.partyCounterDamage(100, 1, 5), 35);   // floor(100×0.4) − 5
  assert.equal(Balance.partyCounterDamage(100, 2, 5), 30);   // floor(100×0.35) − 5
  assert.equal(Balance.partyCounterDamage(10, 0, 99), 0);
});

test("회복 수식: 회복 스킬 +25, 물약은 아이템 값(없으면 +50)", () => {
  assert.equal(Balance.healSkillAmount(540), 25);
  assert.equal(Balance.potionAmount({ heal: 80 }, 540), 80);
  assert.equal(Balance.potionAmount({}, 540), 50);
});

test("불변식: 모든 몬스터·레벨에서 능력치는 양의 정수이고 레벨에 따라 줄지 않는다", () => {
  const MONSTERS = g.get("MONSTERS");
  for (const def of MONSTERS) {
    let prev = null;
    for (let L = 1; L <= 99; L++) {
      const s = Balance.monsterStats(def, Balance.monsterScale(L, 1));
      assert.ok(Number.isInteger(s.hp) && s.hp > 0 && Number.isInteger(s.attack) && s.attack > 0, `${def.id} Lv${L}`);
      if (prev) assert.ok(s.hp >= prev.hp && s.attack >= prev.attack, `${def.id} Lv${L} 감소`);
      prev = s;
    }
  }
});
