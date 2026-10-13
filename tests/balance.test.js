// 밸런스 수식 테스트 — balance.js 의 규칙(곡선 2)을 고정하고, 어떤 수치로 바꿔도 지켜야 할 불변식을 확인한다.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGame } = require("./helpers/load-game");

const g = loadGame(["balance.js", "models.js"]);
const Balance = g.get("Balance");
const Player = g.get("Player");
const MONSTERS = g.get("MONSTERS");
const createMonsterInstance = g.get("createMonsterInstance");
const plain = x => JSON.parse(JSON.stringify(x));

// ── 규칙 고정(골든) ─────────────────────────────────────────
test("경험치 곡선: 100 + 30×(레벨-1)^1.65 (곡선 2)", () => {
  assert.equal(Balance.CURVE_ID, 2);
  assert.deepEqual([1, 2, 3, 5, 10, 20, 30, 40, 49].map(l => Balance.expToNext(l)), [100, 130, 194, 395, 1226, 3964, 7863, 12758, 17930]);
});

test("최고 레벨은 50이고 models.js 와 일치한다", () => {
  assert.equal(Balance.MAX_LEVEL, 50);
  assert.equal(g.get("MAX_LEVEL"), 50);
});

test("몬스터 스케일: 레벨당 +8.5%에 층 난이도를 곱한다", () => {
  assert.equal(Balance.monsterScale(1, 1), 1);
  assert.equal(Balance.monsterScale(11, 1), 1.85);
  assert.ok(Math.abs(Balance.monsterScale(11, 1.35) - 1.85 * 1.35) < 1e-12);
  const m = createMonsterInstance("slime", Balance.monsterScale(11, 1));   // slime HP 80 / ATK 8
  assert.equal(m.hp, Math.floor(80 * 1.85));
  assert.equal(m.attack, Math.floor(8 * 1.85));
  assert.equal(m.hp, m.maxHp);
  assert.equal(m.scale, 1.85);                                              // 보상 계산용으로 기록된다
});

test("전투 보상: 몬스터 배수만큼 늘고, 번영 보너스는 골드에만 붙는다", () => {
  assert.deepEqual(plain(Balance.battleRewards({ goldRate: 100, expRate: 70, scale: 1 }, 0)), { gold: 100, exp: 70 });
  assert.deepEqual(plain(Balance.battleRewards({ goldRate: 100, expRate: 70, scale: 2 }, 0)), { gold: 200, exp: 140 });
  assert.deepEqual(plain(Balance.battleRewards({ goldRate: 100, expRate: 70, scale: 2 }, 20)), { gold: 240, exp: 140 });
  assert.deepEqual(plain(Balance.battleRewards({})), { gold: 50, exp: 40 });
  assert.deepEqual(plain(Balance.battleRewards({ isBoss: true })), { gold: 180, exp: 120 });
  assert.deepEqual(plain(Balance.battleRewards({ isFinal: true, isBoss: true })), { gold: 500, exp: 300 });
});

test("방어: 비율 감쇠 — 방어 100이면 피해 절반, 공격이 있으면 최소 1", () => {
  assert.equal(Balance.damageAfterDefense(30, 0), 30);
  assert.equal(Balance.damageAfterDefense(30, 100), 15);
  assert.equal(Balance.damageAfterDefense(30, 28), 23);
  assert.equal(Balance.damageAfterDefense(5, 5000), 1);
  assert.equal(Balance.damageAfterDefense(0, 10), 0);
  assert.equal(Balance.damageAfterDefense(-3, 10), 0);
  assert.equal(Balance.damageAfterDefense(20, -50), 20);                    // 음수 방어는 0 으로 취급
  assert.equal(Balance.partyCounterDamage(100, 0, 0), 60);                  // 동료 1번은 몬스터 공격의 60%
  assert.equal(Balance.partyCounterDamage(100, 1, 0), 40);
  assert.equal(Balance.partyCounterDamage(100, 2, 0), 35);
});

test("회복: 최대 HP 비율(스킬 20%, 물약 35%), 아이템 값과 기본값이 최솟값", () => {
  assert.equal(Balance.healSkillAmount(100), 25);        // 25 가 더 크다
  assert.equal(Balance.healSkillAmount(540), 108);
  assert.equal(Balance.potionAmount({ heal: 50 }, 100), 50);
  assert.equal(Balance.potionAmount({ heal: 50 }, 540), 189);
  assert.equal(Balance.potionAmount({}, 100), 50);
  assert.equal(Balance.potionAmount({ heal: 200 }, 100), 200);
});

// ── 직업 방어가 실제로 반영된다 ─────────────────────────────
test("직업 기본 방어(기사 8 / 탱커 15 …)가 Player.defense 에 들어간다", () => {
  const CLASSES = g.get("CLASSES");
  for (const type of ["knight", "tanker", "mage", "archer", "healer"]) {
    const p = new Player(type);
    assert.equal(p.baseDefense, CLASSES[type].defense, type);
    assert.equal(p.defense, CLASSES[type].defense, type);          // 장비 없음
  }
  const t = new Player("tanker"); t.equipment.armor = { name: "x", type: "armor", defense: 10 };
  assert.equal(t.defense, 25);
});

test("1번 동료도 동료 기본 방어를 쓴다 (2·3번 동료와 동일)", () => {
  const PM = g.get("PARTY_MEMBERS"), p = new Player("knight");
  p.party = "tanker"; p.party2 = "tanker"; p.party3 = "tanker";
  assert.equal(p.partyDefense, PM.tanker.defense);
  assert.equal(p.party2Defense, PM.tanker.defense);
  assert.equal(p.party3Defense, PM.tanker.defense);
});

// ── 레벨업 / 불변식 ─────────────────────────────────────────
test("Player.gainExp: 레벨업 보상과 최고 레벨(50) 고정", () => {
  const p = new Player("knight");
  const hp0 = p.maxHp, atk0 = p.baseAttack;
  assert.equal(p.nextExp, 100);
  assert.equal(p.gainExp(100), true);
  assert.deepEqual([p.level, p.exp, p.nextExp, p.skillPoints, p.maxHp, p.baseAttack], [2, 0, 130, 1, hp0 + 20, atk0 + 5]);
  p.gainExp(10 ** 9);                                    // 한꺼번에 최고 레벨까지
  assert.equal(p.level, 50);
  assert.equal(p.exp, p.nextExp - 1);                   // 경험치 바는 가득 찬 채 고정
  assert.equal(p.skillPoints, 49);
  assert.equal(p.gainExp(999), false);
  assert.equal(p.level, 50);
});

test("불변식: 필요 경험치는 항상 증가하고, 레벨 안에서 exp < nextExp 이다", () => {
  for (let l = 1; l < 120; l++) assert.ok(Balance.expToNext(l + 1) > Balance.expToNext(l), `Lv${l}`);
  const p = new Player("mage");
  let seed = 7; const r = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 400; i++) { p.gainExp(Math.floor(r() * 3000)); assert.ok(p.exp < p.nextExp && p.exp >= 0 && p.level <= 50); }
});

test("불변식: 모든 몬스터·레벨에서 능력치는 양의 정수이고 레벨에 따라 줄지 않는다", () => {
  for (const def of MONSTERS) {
    let prev = null;
    for (let L = 1; L <= 50; L++) {
      const s = Balance.monsterStats(def, Balance.monsterScale(L, 1));
      assert.ok(Number.isInteger(s.hp) && s.hp > 0 && Number.isInteger(s.attack) && s.attack > 0, `${def.id} Lv${L}`);
      if (prev) assert.ok(s.hp >= prev.hp && s.attack >= prev.attack, `${def.id} Lv${L} 감소`);
      prev = s;
    }
  }
});

test("불변식: 피해는 방어가 오를수록 줄어들지만 공격이 있으면 0 이 되지 않는다", () => {
  for (const atk of [1, 7, 30, 200, 5000]) {
    let prev = Infinity;
    for (let def = 0; def <= 400; def += 10) {
      const d = Balance.damageAfterDefense(atk, def);
      assert.ok(d >= 1 && d <= prev && d <= atk, `atk ${atk} def ${def}`);
      prev = d;
    }
  }
});

test("불변식: 보상은 몬스터가 강할수록(배수가 클수록) 줄지 않는다", () => {
  let prev = { gold: 0, exp: 0 };
  for (const scale of [0.5, 1, 1.35, 2, 3.2, 8]) {
    const r = plain(Balance.battleRewards({ goldRate: 55, expRate: 70, scale }));
    assert.ok(r.gold >= prev.gold && r.exp >= prev.exp);
    prev = r;
  }
});
