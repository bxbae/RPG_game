"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../tools/fullkit-sim");

test("같은 시드는 같은 결과(재현 가능)", () => {
  const a = S.clearRate(S.create(7), { cls: "knight", level: 20, gear: "auto" }, "normal", 3, 20);
  const b = S.clearRate(S.create(7), { cls: "knight", level: 20, gear: "auto" }, "normal", 3, 20);
  assert.deepEqual(a, b);
});

test("키트: 레벨 능력치·동료 수가 지역 규칙을 따른다", () => {
  const env = S.create(1);
  const p = env.buildKit({ cls: "knight", level: 20, zone: "abyss", gear: "auto" });
  assert.equal(p.level, 20);
  assert.equal(p.maxHp, env.CLASSES.knight.hp + env.Balance.LEVELUP.hp * 19);
  assert.ok(p.party && p.party2 && p.party3);
  assert.equal(env.buildKit({ cls: "knight", level: 5, zone: "outside" }).party, null);
});

test("레벨이 오를수록 클리어율이 떨어지지 않는다(일반 3층)", () => {
  const env = S.create(3);
  const r = [5, 20, 40].map(L => S.clearRate(env, { cls: "knight", level: L, gear: "auto" }, "normal", 3, 40).clear);
  assert.ok(r[0] <= r[1] + 0.1 && r[1] <= r[2] + 0.1, JSON.stringify(r));
  assert.ok(r[2] >= 0.9);
});

test("1레벨 기사는 일반 던전 1층을 편안히 깬다", () => {
  assert.ok(S.clearRate(S.create(1), { cls: "knight", level: 5, gear: "iron" }, "normal", 1, 40).clear >= 0.9);
});
