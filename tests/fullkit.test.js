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
  assert.equal(p.maxHp, env.CLASSES.knight.hp + env.Balance.growth('knight').hp * 19);
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

test("기준 레벨: 몬스터는 레벨을 일부만 따라간다", () => {
  const { Balance: B } = S.create(1);
  assert.equal(B.monsterScale(10, 1), B.monsterScale(10, 1, undefined));          // zoneLevel 생략 = 예전 방식
  assert.equal(B.effectiveLevel(20, 20), 20);
  assert.ok(B.monsterScale(40, 1, 20) < B.monsterScale(40, 1));                   // 기준보다 강한 용사에겐 쉬워진다
  assert.ok(B.monsterScale(1, 1, 20) > B.monsterScale(1, 1));                     // 약하게 들어가면 더 강하다
});

test("구역 난이도 계단: 기준 레벨에선 편안하고 한참 낮으면 깰 수 없다", () => {
  const env = S.create(5);
  const kit = L => ({ cls: "knight", gear: "auto", level: L });
  for (const [zone, floor, L] of [["normal", 3, 15], ["harbor", 3, 28], ["capital", 3, 40], ["abyss", 3, 46]]) {
    assert.ok(S.clearRate(env, kit(L + 3), zone, floor, 40).clear >= 0.7, `${zone}${floor} Lv${L + 3}`);
    assert.ok(S.clearRate(env, kit(L - 12), zone, floor, 40).clear <= 0.2, `${zone}${floor} Lv${L - 12}`);
  }
  // 같은 레벨이면 더 깊은 구역일수록 어렵다
  const r = ["normal", "harbor", "abyss"].map(z => S.clearRate(env, kit(30), z, 3, 40).clear);
  assert.ok(r[0] >= r[1] && r[1] >= r[2], JSON.stringify(r));
});

function oneTurn(env, cls, fn) {
  const p = env.buildKit({ cls, level: 20, zone: "normal", gear: "auto" });
  const g = S.makeGame(env, p, "normal");
  const m = env.createMonster("orc", 3); g.currentMonster = m;
  const bm = new env.BattleManager(); bm._onMonsterDefeated = gg => { gg._won = true; gg._battleLocked = true; };
  fn(bm, g, p, m); return { bm, g, p, m };
}

test("기절한 적은 반격하지 못하고 보스는 1턴만 멈춘다", () => {
  const env = S.create(2);
  oneTurn(env, "knight", (bm, g, p, m) => {
    m.status = { poison: 0, stun: 2, burn: 0 }; const hp = p.hp;
    bm._counter(g); assert.equal(p.hp, hp); assert.equal(m.status.stun, 1);
    bm._counter(g); assert.equal(p.hp, hp); assert.equal(m.status.stun, 0);
    bm._counter(g); assert.ok(p.hp < hp);
  });
  oneTurn(env, "knight", (bm, g, p, m) => {
    m.isBoss = true; m.status = { poison: 0, stun: 2, burn: 0 }; const hp = p.hp;
    bm._counter(g); assert.equal(p.hp, hp); assert.equal(m.status.stun, 0);
  });
});

test("탱커·힐러도 직업 스킬을 쓴다", () => {
  const env = S.create(2);
  oneTurn(env, "tanker", (bm, g, p, m) => {
    p.activeSkills.shieldBash = true; const hp0 = m.hp; bm.jobSkill(g);
    assert.ok(m.hp < hp0); assert.ok(p.cooldowns.jobSkill > 0); assert.equal(p.guardBuff, env.Balance.JOB_SKILL.tankerGuard - 1);   // 반격 한 번이 이미 방어 태세를 소모했다
  });
  oneTurn(env, "healer", (bm, g, p, m) => {
    p.activeSkills.holyLight = true; p.hp = 50; m.attack = 0; bm.jobSkill(g);
    assert.ok(p.hp > 50); assert.ok(p.cooldowns.jobSkill > 0);
  });
  oneTurn(env, "tanker", (bm, g, p, m) => { p.activeSkills.shieldBash = false; const hp0 = m.hp; bm.jobSkill(g); assert.equal(m.hp, hp0); });   // 배우지 않았으면 안 나간다
});

test("축복 패시브는 회복 스킬을 키운다", () => {
  const env = S.create(2);
  const heal = lv => { let out; oneTurn(env, "healer", (bm, g, p) => { p.passiveSkills = { blessing: lv }; p.hp = 1; bm.heal(g); out = p.hp - 1; }); return out; };
  assert.ok(heal(3) > heal(0));
});

test("직업 균형: 기준 구역에서 모든 직업이 비슷하게 클리어한다", () => {
  const env = S.create(9);
  const rate = c => S.clearRate(env, { cls: c, gear: "auto", level: 30 }, "harbor", 3, 60).clear;
  const r = Object.fromEntries(["knight", "tanker", "mage", "archer", "healer"].map(c => [c, rate(c)]));
  for (const c of Object.keys(r)) assert.ok(r[c] >= 0.6, `${c} ${JSON.stringify(r)}`);   // 어느 직업도 못 깨는 구역이 없어야 한다
  const lo = Math.min(...Object.values(r)), hi = Math.max(...Object.values(r));
  assert.ok(hi - lo <= 0.4, JSON.stringify(r));
});

test("동료 균형: 어느 동료를 데려가도 전투 부담이 비슷하게 줄어든다", () => {
  const env = S.create(4), L = 28, zone = "harbor";
  const lost = comp => {
    let sum = 0, N = 60;
    for (let i = 0; i < N; i++) {
      const p = env.buildKit({ cls: "knight", gear: "auto", level: L, zone, companions: [comp, "healer"], affinity: 100 });
      p.party2 = null;
      const g = S.makeGame(env, p, zone), hp0 = p.hp;
      const sc = env.Balance.monsterScale(L, env.DIFF[zone][0], env.ZLV[zone][0]);
      S.fight(env, g, env.createMonster("chimera", sc), { heals: 0, ults: 0, partyUlts: 0, jobs: 0, turns: 0 });
      sum += (hp0 - Math.max(0, p.hp)) / (p.maxHp + p.bonusHp);
    }
    return 100 * sum / N;
  };
  const r = Object.fromEntries(["tanker", "healer", "archer", "mage_party"].map(c => [c, lost(c)]));
  const v = Object.values(r);
  assert.ok(Math.max(...v) - Math.min(...v) <= 20, JSON.stringify(r));
});

test("동료 슬롯: 던전 종류별로 함께 싸우는 동료 수가 일관된다", () => {
  const env = S.create(6), B = env.Balance;
  assert.deepEqual(["outside", "normal", "mine", "harbor", "elfForest", "capital", "abyss"].map(z => B.partySlots(z)), [0, 2, 2, 2, 2, 2, 3]);
  // 같은 몬스터를 상대로 동료 수가 많을수록 처치가 빠르거나 같다(광산에서도 2번 동료가 공격에 가세한다)
  const turns = zone => {
    const p = env.buildKit({ cls: "knight", gear: "auto", level: 25, zone, affinity: 0 });
    const g = S.makeGame(env, p, zone), st = { heals: 0, ults: 0, partyUlts: 0, jobs: 0, turns: 0 };
    p.cooldowns.heal = 99; p.skills.criticalBoost = 0;
    const m = env.createMonster("orc", 1); m.hp = m.maxHp = 400; m.attack = 0;
    return S.fight(env, g, m, st) && st.turns;
  };
  assert.ok(turns("mine") <= turns("outside"));
  // 성 밖에서는 동료가 피해를 받지 않는다
  const p = env.buildKit({ cls: "knight", gear: "auto", level: 25, zone: "normal" }), g = S.makeGame(env, p, "outside");
  const hp = [p.partyHp, p.party2Hp]; g.currentMonster = env.createMonster("orc", 3);
  new env.BattleManager()._counter(g);
  assert.deepEqual([p.partyHp, p.party2Hp], hp);
});

test("전투 연출 이벤트: 회복·상태이상·기절·방어·스킬 모션이 이벤트로 나간다", () => {
  const env = S.create(8);
  // _flushUI 가 이벤트를 비우므로, 비우기 직전에 기록한다
  const types = fn => {
    const seen = [];
    oneTurn(env, "knight", (bm, g, p, m) => {
      p.hp = 50; m.attack = 60; bm._events = [];
      bm._flushUI = function () { seen.push(...this._events.map(e => e.type)); this._events = []; };
      fn(bm, g, p, m); bm._flushUI();
    });
    return seen;
  };
  assert.ok(types((bm, g) => { bm.heal(g); }).includes("heal"));
  assert.ok(types((bm, g, p, m) => { bm.applyStatus(m, "burn", 3, g, "m"); }).includes("status"));
  assert.ok(types((bm, g, p, m) => { m.status = { poison: 0, stun: 1, burn: 0 }; bm._counter(g); }).includes("stunSkip"));
  assert.ok(types((bm, g, p) => { p.guardBuff = 2; bm._counter(g); }).includes("guardHit"));
  assert.ok(types((bm, g, p) => { p.activeSkills.whirlwind = true; bm.jobSkill(g); }).includes("skillAction"));
  // 회복 이벤트의 양은 실제로 회복된 만큼이다(가득 차 있으면 이벤트 없음)
  assert.equal(types((bm, g, p) => { p.hp = p.maxHp + p.bonusHp; bm.heal(g); }).includes("heal"), false);
});

test("몬스터 포즈 그림: battle-fx.js 가 참조하는 파일이 모두 있고 기본 그림과 같은 크기다", () => {
  const fs = require("node:fs"), path = require("node:path");
  const root = path.join(__dirname, "..");
  const src = fs.readFileSync(path.join(root, "battle-fx.js"), "utf8");
  const size = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };   // PNG 헤더의 가로·세로
  const entries = [...src.matchAll(/^\s*"(sd_[^"]+\.png)":\s*\{(.*)\},?\s*$/gm)];
  assert.ok(entries.length >= 6);
  let n = 0;
  for (const [, base, body] of entries) {
    assert.ok(fs.existsSync(path.join(root, "images", base)), base);
    for (const [, f] of body.matchAll(/D \+ "([a-z0-9_]+\.png)"/g)) {
      const p = path.join(root, "images", "monsters", f);
      assert.ok(fs.existsSync(p), f);
      assert.deepEqual(size(p), size(path.join(root, "images", base)), f);
      n++;
    }
  }
  assert.ok(n >= 20);
  // 몬스터가 쓰는 그림 파일 이름이 실제 몬스터 정의와 맞는지(오타 방지)
  const models = fs.readFileSync(path.join(root, "models.js"), "utf8");
  for (const [, base] of entries) assert.ok(models.includes("images/" + base), base + " 를 쓰는 몬스터가 없다");
});
