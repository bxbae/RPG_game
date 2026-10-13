// 시뮬레이터 테스트 — 계산이 손 계산과 맞는지, 그리고 현재 밸런스의 알려진 결함이 보고되는지.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulate, evaluate, load } = require("../tools/balance-sim");

const env = load();

test("시뮬레이터: 한 지점을 손으로 계산한 값과 일치한다", () => {
  // 기사 Lv10, 상점 최고 장비, 일반 던전 1층(난이도 1.0), 적 풀 = 슬라임/아이스 슬라임/해골 기사
  const B = env.Balance;
  const [r] = simulate({ cls: "knight", gear: "best", zone: "normal", floor: 1, minLevel: 10, maxLevel: 10 }, env);
  const atk = 32 + 5 * 9 + 35, def = 28 + env.CLASSES.knight.defense, maxHp = 160 + 20 * 9, scale = B.monsterScale(10, 1.0);   // 장비 방어 28 + 기사 기본 방어
  let loss = 0;
  for (const id of ["slime", "ice_slime", "skeleton"]) {
    const m = B.monsterStats(env.MONSTERS.find(x => x.id === id), scale);
    loss += B.damageAfterDefense(m.attack, def) * (Math.ceil(m.hp / atk) - 1);
  }
  assert.equal(r.maxHp, maxHp); assert.equal(r.atk, atk);
  assert.equal(r.hpLossPct, +(100 * (loss / 3) / maxHp).toFixed(1));
});

test("시뮬레이터: 레벨이 오를수록 다음 레벨까지 필요한 처치 수는 줄지 않는다", () => {
  const rows = simulate({ maxLevel: 60 }, env);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].killsToNext >= rows[i - 1].killsToNext, `Lv${rows[i].level}`);
});

test("시뮬레이터: 같은 입력은 항상 같은 결과다(결정적)", () => {
  assert.deepEqual(simulate({ cls: "tanker", zone: "abyss", floor: 3 }, env), simulate({ cls: "tanker", zone: "abyss", floor: 3 }, env));
});

test("목표 곡선 점검은 항목별로 PASS/FAIL 과 근거를 돌려준다", () => {
  const res = evaluate(env);
  assert.ok(res.length >= 5);
  for (const r of res) { assert.equal(typeof r.pass, "boolean"); assert.ok(r.detail.length > 0); }
});

test("현재 밸런스가 목표 곡선을 모두 만족한다", () => {
  const failed = evaluate(env).filter(r => !r.pass);
  assert.deepEqual(failed.map(r => `${r.id}: ${r.detail}`), []);
});

test("모든 직업이 상점 최고 장비로 기준 지역(일반 2층)에서 전투당 HP 손실 10~40% 안에 든다", () => {
  for (const cls of ["knight", "tanker", "mage", "archer", "healer"]) {
    for (const r of simulate({ cls, gear: "best", zone: "normal", floor: 2, minLevel: 5, maxLevel: 50 }, env))
      assert.ok(r.hpLossPct >= 10 && r.hpLossPct <= 40, `${cls} Lv${r.level} ${r.hpLossPct}%`);
  }
});
