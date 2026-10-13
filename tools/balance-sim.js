#!/usr/bin/env node
// ═══════════════════════════════════════════════════
//  tools/balance-sim.js — 밸런스 시뮬레이터
//
//  게임이 실제로 쓰는 수식(balance.js)·데이터(models.js 의 몬스터, dungeon-scene.js 의 적 풀/층 난이도)를
//  그대로 불러와서, "이 레벨의 플레이어가 이 지역 몬스터와 싸우면 어떻게 되는가"를 계산한다.
//
//   npm run balance                      # 일반 던전 2층 표 (기사, 상점 최고 장비)
//   node tools/balance-sim.js --zone abyss:3 --class tanker --gear starter --max 40
//   npm run balance:check                # 목표 곡선(TARGETS)과 비교, 어긋나면 종료 코드 1
//
//  모델(보수적인 단순화): 플레이어는 매 턴 "싸운다"만 사용(치명타·스킬·동료·패시브 없음).
//  몬스터는 플레이어가 죽이지 못한 턴에만 반격한다(battle-manager.js attack() 과 같은 순서).
// ═══════════════════════════════════════════════════
"use strict";
const { loadGame } = require("../tests/helpers/load-game");

// 목표 곡선 — 3번 작업(밸런스 개편)의 합격 기준. 값은 제안이며 여기서만 고치면 된다.
const TARGETS = {
  maxLevel: 50,
  hpLossPct: [15, 35],          // 일반 몬스터 한 마리 처치당 평균 HP 손실(%) — 레벨 5~maxLevel 구간
  killsPerLevel: [[25, 30], [50, 80]],   // [레벨 상한, 다음 레벨까지 필요한 처치 수 상한]
  killsPerLevelMin: [8, 4],     // [이 레벨부터, 레벨당 최소 처치 수] — 레벨업이 너무 빨라 성장이 무의미해지지 않게
  minHitAtStart: 1,             // 1레벨·시작 장비로도 1층 몬스터가 0 피해를 주면 안 된다(긴장감)
  healSkillMinPct: 10,          // 회복 스킬이 레벨 20 최대 HP 의 몇 % 이상이어야 하는가
};

const GEAR = {
  // 시작 골드 300G 로 살 수 있는 기본 장비(철검 + 철 갑옷 + 철 투구)
  starter: { weapon: 20, defense: 15 },
  // 상점 최고 등급(강철검 + 사슬 갑옷 + 강철 투구)
  best:    { weapon: 35, defense: 28 },
};

function load() {
  // dungeon-scene.js 는 적 풀(FLOOR_ENEMY_POOLS)과 층 난이도(FLOOR_DIFFICULTY)를 가진다.
  const g = loadGame(["balance.js", "models.js", "dungeon-scene.js"]);
  return {
    Balance: g.get("Balance"), CLASSES: g.get("CLASSES"), MONSTERS: g.get("MONSTERS"),
    POOLS: g.get("FLOOR_ENEMY_POOLS"), DIFF: g.get("FLOOR_DIFFICULTY"),
    createMonster: g.get("createMonsterInstance"),
  };
}

// 한 레벨·한 지역에 대한 결과
function simulate({ cls = "knight", gear = "best", zone = "normal", floor = 2, minLevel = 1, maxLevel = 50 } = {}, env = load()) {
  const { Balance: B, CLASSES, MONSTERS, POOLS, DIFF } = env;
  const base = CLASSES[cls] || CLASSES.knight;
  const gearSet = GEAR[gear] || GEAR.best;
  const pool = (POOLS[zone] || POOLS.normal)[Math.min(floor, Object.keys(POOLS[zone] || POOLS.normal).length)];
  const floorMult = (DIFF[zone] || DIFF.normal)[Math.min(floor - 1, 2)];
  const rows = [];
  for (let L = minLevel; L <= maxLevel; L++) {
    const maxHp = base.hp + B.LEVELUP.hp * (L - 1);
    const atk = base.attack + B.LEVELUP.atk * (L - 1) + gearSet.weapon;
    const def = gearSet.defense + (base.defense || 0);        // 직업 기본 방어 + 장비
    const scale = B.monsterScale(L, floorMult);
    let loss = 0, hit = 0, turns = 0, exp = 0, gold = 0;
    for (const id of pool) {
      const def0 = MONSTERS.find(m => m.id === id);
      const m = B.monsterStats(def0, scale);
      const t = Math.ceil(m.hp / atk);
      const perHit = B.damageAfterDefense(m.attack, def);
      loss += perHit * (t - 1);           // 처치한 턴에는 반격이 없다
      hit += perHit; turns += t;
      const r = B.battleRewards({ ...def0, scale });
      exp += r.exp; gold += r.gold;
    }
    const n = pool.length;
    const need = B.expToNext(L);
    rows.push({
      level: L, maxHp, atk, def,
      monsterHp: Math.round(pool.reduce((s, id) => s + B.monsterStats(MONSTERS.find(m => m.id === id), scale).hp, 0) / n),
      monsterAtk: Math.round(pool.reduce((s, id) => s + B.monsterStats(MONSTERS.find(m => m.id === id), scale).attack, 0) / n),
      hitPerTurn: +(hit / n).toFixed(1),
      turnsToKill: +(turns / n).toFixed(1),
      hpLossPct: +(100 * (loss / n) / maxHp).toFixed(1),
      expPerKill: Math.round(exp / n), goldPerKill: Math.round(gold / n),
      killsToNext: Math.ceil(need / (exp / n)),
      healSkillPct: +(100 * B.healSkillAmount(maxHp) / maxHp).toFixed(1),
      potionPct: +(100 * B.potionAmount({ heal: 50 }, maxHp) / maxHp).toFixed(1),
    });
  }
  return rows;
}

// 목표 곡선과 비교해서 항목별 PASS/FAIL 을 돌려준다.
function evaluate(env = load(), targets = TARGETS) {
  const out = [];
  const add = (id, label, pass, detail) => out.push({ id, label, pass, detail });

  const rows = simulate({ cls: "knight", gear: "best", zone: "normal", floor: 2, maxLevel: targets.maxLevel }, env);
  const mid = rows.filter(r => r.level >= 5);
  const bad = mid.filter(r => r.hpLossPct < targets.hpLossPct[0] || r.hpLossPct > targets.hpLossPct[1]);
  add("hp-loss", `전투당 HP 손실이 ${targets.hpLossPct.join("~")}% (레벨 5~${targets.maxLevel})`, bad.length === 0,
      bad.length ? `벗어난 레벨 ${bad.length}개 (예: Lv${bad[0].level} ${bad[0].hpLossPct}%)` : "모두 범위 안");

  for (const [cap, maxKills] of targets.killsPerLevel) {
    const over = rows.filter(r => r.level <= cap && r.killsToNext > maxKills);
    add(`kills-${cap}`, `레벨 ${cap} 이하에서 레벨당 처치 수 ≤ ${maxKills}`, over.length === 0,
        over.length ? `Lv${over[0].level}에서 ${over[0].killsToNext}마리 필요` : "모두 범위 안");
  }

  const [fromLv, minKills] = targets.killsPerLevelMin;
  const fast = rows.filter(r => r.level >= fromLv && r.level < targets.maxLevel && r.killsToNext < minKills);
  add("kills-min", `레벨 ${fromLv} 이상에서 레벨당 처치 수 ≥ ${minKills}`, fast.length === 0,
      fast.length ? `Lv${fast[0].level}에서 ${fast[0].killsToNext}마리면 충분` : "모두 범위 안");

  const start = simulate({ cls: "knight", gear: "starter", zone: "normal", floor: 1, minLevel: 1, maxLevel: 1 }, env)[0];
  add("start-tension", "1레벨 시작 장비로도 1층 몬스터가 피해를 준다", start.hitPerTurn >= targets.minHitAtStart,
      `1층 몬스터 평균 피해 ${start.hitPerTurn}/턴`);

  const l20 = rows.find(r => r.level === 20);
  add("heal-skill", `회복 스킬이 레벨 20 최대 HP 의 ${targets.healSkillMinPct}% 이상`, !!l20 && l20.healSkillPct >= targets.healSkillMinPct,
      l20 ? `${l20.healSkillPct}% (물약 ${l20.potionPct}%)` : "레벨 20 없음");

  const B = env.Balance;
  add("level-cap", `최고 레벨이 ${targets.maxLevel} 이하`, (env.MAX_LEVEL ?? env.Balance.MAX_LEVEL) <= targets.maxLevel,
      `현재 MAX_LEVEL ${env.MAX_LEVEL ?? env.Balance.MAX_LEVEL}`);
  return out;
}

// ── CLI ─────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const env = load();
  env.MAX_LEVEL = env.Balance.MAX_LEVEL;
  const [zone, floor] = (opt("--zone") || "normal:2").split(":");
  const rows = simulate({ cls: opt("--class") || "knight", gear: opt("--gear") || "best", zone, floor: +floor || 1, maxLevel: +(opt("--max") || 50) }, env);

  const show = args.includes("--check") ? [] : rows.filter(r => [1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 99].includes(r.level));
  if (show.length) {
    console.log(`\n${opt("--class") || "knight"} / 장비 ${opt("--gear") || "best"} / ${zone} ${floor}층 — 매 턴 '싸운다'만 사용, 동료·패시브·치명타 없음\n`);
    console.log(" Lv | 최대HP  공격 | 몬스터HP/ATK | 받는피해/턴 | 처치턴 | 전투당HP손실 | 처치당EXP | 다음레벨까지 처치");
    for (const r of show)
      console.log(String(r.level).padStart(3), "|", String(r.maxHp).padStart(6), String(r.atk).padStart(5), "|",
        `${r.monsterHp}/${r.monsterAtk}`.padStart(12), "|", String(r.hitPerTurn).padStart(10), "|", String(r.turnsToKill).padStart(6), "|",
        (r.hpLossPct + "%").padStart(12), "|", String(r.expPerKill).padStart(9), "|", String(r.killsToNext).padStart(10));
  }

  const results = evaluate(env);
  console.log("\n목표 곡선 점검 (balance-sim.js 의 TARGETS 기준)");
  for (const r of results) console.log(` ${r.pass ? "PASS" : "FAIL"}  ${r.label} — ${r.detail}`);
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} 항목 통과`);
  if (args.includes("--check") && failed) process.exitCode = 1;
}

module.exports = { simulate, evaluate, load, TARGETS, GEAR };
if (require.main === module) main();
