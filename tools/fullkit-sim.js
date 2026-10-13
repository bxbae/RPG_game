#!/usr/bin/env node
// ═══════════════════════════════════════════════════
//  tools/fullkit-sim.js — 풀 키트 전투 시뮬레이터
//
//  tools/balance-sim.js 는 "공격 버튼만 누르는 플레이어"를 계산식으로 본다.
//  이 도구는 한 걸음 더 나간다:
//    · 실제 BattleManager 코드를 Node 에서 그대로 실행한다(수식을 따로 흉내 내지 않는다)
//      → 동료 반격·궁극기·직업 스킬·상태이상·보스 분노·게이지/쿨다운이 게임과 똑같이 동작한다
//    · 플레이어는 "합리적인 사람"처럼 행동한다: 체력이 낮으면 회복, 궁극기가 차면 사용,
//      동료 궁극기/직업 스킬이 준비되면 사용, 아니면 공격
//    · 레벨에 맞는 "키트"(스킬 포인트 분배, 장비 단계, 동료, 호감도)를 갖추고 싸운다
//    · 한 번의 전투뿐 아니라 "던전 한 층"(적 여러 마리 + 보스, 체력/쿨다운/동료 부상 이월, 물약 사용)을
//      몇백 번 돌려서 클리어 확률을 구한다 → 지역·층 난이도 계단을 숫자로 본다
//
//   node tools/fullkit-sim.js                        # 난이도 계단표 (기사, 자동 장비)
//   node tools/fullkit-sim.js --class mage --gear shop
//   node tools/fullkit-sim.js --fight normal:3 --level 20     # 한 지역·레벨의 상세
//   node tools/fullkit-sim.js --compare                       # 직업 × 장비 가정 비교
//
//  ※ 장비·스킬·호감도는 "가정"이다(아래 KIT 설명 참고). 값은 옵션으로 바꿀 수 있고,
//    결과는 가정 범위(shop ≤ auto ≤ legend)로 같이 보면 해석하기 쉽다.
// ═══════════════════════════════════════════════════
"use strict";
const { loadGame } = require("../tests/helpers/load-game");

// ── 재현 가능한 난수 ──────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── 게임 데이터를 불러온다 (BattleManager 포함) ─────────
function load(seed = 1) {
  const rng = { f: mulberry32(seed) };
  const M = {}; for (const k of Object.getOwnPropertyNames(Math)) M[k] = Math[k];
  M.random = () => rng.f();
  const g = loadGame(["balance.js", "models.js", "battle-manager.js", "dungeon-scene.js"], { Math: M });
  return {
    g, rng, reseed: s => { rng.f = mulberry32(s); },
    Balance: g.get("Balance"), Player: g.get("Player"), BattleManager: g.get("BattleManager"),
    CLASSES: g.get("CLASSES"), PARTY_MEMBERS: g.get("PARTY_MEMBERS"), MONSTERS: g.get("MONSTERS"),
    POOLS: g.get("FLOOR_ENEMY_POOLS"), DIFF: g.get("FLOOR_DIFFICULTY"), ZLV: g.get("FLOOR_LEVEL"), BOSSD: g.get("BOSS_DIFFICULTY"), createMonster: g.get("createMonsterInstance"),
  };
}

// ══ KIT (플레이어가 레벨에 맞춰 갖췄다고 가정하는 것) ═════════════════════════════
// 스킬 포인트: 레벨당 1점. 직업 스킬(3점) → 직업 패시브(레벨 순서대로) → 남는 점은 공격/체력/치명타 강화에 번갈아.
// 패시브 정의는 town-scene.js 의 _renderPassiveSkills 와 같다(spCost). passives: "actual"(기본) | "none"
const PASSIVES = {
  knight: [{ id: "iron_body", cost: [2, 3, 4] }, { id: "war_cry", cost: [2, 3, 4] }, { id: "berserker", cost: [3, 4, 5] }],
  mage:   [{ id: "mana_surge", cost: [2, 3, 4] }, { id: "spell_echo", cost: [2, 3, 4] }, { id: "arcane_ward", cost: [2, 3, 4] }],
  archer: [{ id: "eagle_eye", cost: [2, 3, 4] }, { id: "swift_feet", cost: [2, 3, 4] }, { id: "poison_tip", cost: [2, 3, 4] }],
};
PASSIVES.tanker = PASSIVES.knight;
PASSIVES.healer = [{ id: "blessing", cost: [2, 3, 4] }, { id: "arcane_ward", cost: [2, 3, 4] }, { id: "war_cry", cost: [2, 3, 4] }];
// 습득 순서(SP 가 모자라면 앞쪽부터 채워진다). 방어 패시브를 먼저 찍는 쪽이 대체로 유리해서 그렇게 가정한다.
const PLAN_ORDER = {
  knight: ["iron_body", "war_cry", "berserker"], tanker: ["iron_body", "war_cry", "berserker"],
  mage: ["arcane_ward", "mana_surge", "spell_echo"], archer: ["swift_feet", "eagle_eye", "poison_tip"],
  healer: ["blessing", "arcane_ward", "war_cry"],
};
const JOB_SKILL = { knight: "whirlwind", mage: "magicBall", archer: "rapidShot", tanker: "shieldBash", healer: "holyLight" };

// 장비 단계(무기 공격력 / 갑옷 방어 / 투구 방어). 출처: models.js SHOP_ITEMS, createRandomItem(12/6 + [0,5,12,25,40])
//   iron  = 시작 골드로 살 수 있는 철장비,   rare = 상점 최고(강철검·사슬 갑옷·강철 투구),
//   epic  = 상자 '영웅' 등급(37/31/31),      legend = 상자 '전설' 등급(52/46/46) + 무기 강화 +5
const GEAR_TIER = {
  iron:   { weapon: 20, armor: 10, helmet: 5,  enhance: 0 },
  rare:   { weapon: 35, armor: 18, helmet: 10, enhance: 0 },
  epic:   { weapon: 37, armor: 31, helmet: 31, enhance: 2 },
  legend: { weapon: 52, armor: 46, helmet: 46, enhance: 5 },
};
// gear 옵션: "shop"(상점에서 살 수 있는 최선만), "auto"(레벨에 따라 상자 장비를 얻음), "legend"(낙관), 또는 단계 이름
function gearTierFor(level, mode) {
  if (GEAR_TIER[mode]) return GEAR_TIER[mode];
  if (mode === "legend") return GEAR_TIER.legend;
  if (mode === "shop") return level < 10 ? GEAR_TIER.iron : GEAR_TIER.rare;
  /* auto */ return level < 10 ? GEAR_TIER.iron : level < 20 ? GEAR_TIER.rare : level < 30 ? GEAR_TIER.epic : GEAR_TIER.legend;
}

const COMPANION_PREF = ["tanker", "healer", "archer", "mage_party"];          // 같은 직업은 제외하고 이 순서로 고른다
const CLASS_TO_COMPANION = { knight: null, tanker: "tanker", healer: "healer", mage: "mage_party", archer: "archer" };
const BOSS_OF = { normal: "guardian", abyss: "demon", mine: "general_gramos", harbor: "general_barkan", elfForest: "general_lilith", capital: "general_belzeron" };

function allocateSkills(env, p, points, passivesMode) {
  const left = { n: points };
  const spend = c => { if (left.n >= c) { left.n -= c; return true; } return false; };
  const job = JOB_SKILL[p.type];
  if (job && spend(3)) p.activeSkills[job] = true;
  const plan = passivesMode === "none" ? [] : (PLAN_ORDER[p.type] || PASSIVES[p.type].map(x => x.id)).map(id => PASSIVES[p.type].find(x => x.id === id));
  p.passiveSkills = {};
  for (const sk of plan || []) for (let lv = 0; lv < sk.cost.length; lv++) { if (!spend(sk.cost[lv])) break; p.passiveSkills[sk.id] = lv + 1; }
  const order = ["attackBoost", "hpBoost", "criticalBoost"];
  for (let i = 0; left.n > 0 && order.some(k => p.skills[k] < 10); i++) { const k = order[i % 3]; if (p.skills[k] < 10) { p.skills[k]++; left.n--; } }
  p.skillPoints = left.n;
}

// 누적 처치 수로 호감도를 추정한다(전투에서 이긴 동료는 승리마다 호감도 +1, 상한 100)
function affinityAt(env, level, mode) {
  if (typeof mode === "number") return mode;
  const { simulate } = require("./balance-sim");
  const rows = simulate({ minLevel: 1, maxLevel: Math.max(1, level - 1) }, env.balanceEnv || (env.balanceEnv = require("./balance-sim").load()));
  return Math.min(100, rows.reduce((s, r) => s + r.killsToNext, 0));
}

// spec: { cls, level, zone, gear:'auto', passives:'actual', affinity:'auto'|number, companionGear:'weapon'|'none'|'full', companions:[keys] }
function buildKit(env, spec) {
  const { Player, CLASSES, PARTY_MEMBERS, Balance } = env;
  const L = spec.level, zone = spec.zone || "normal";
  const base = CLASSES[spec.cls];
  const p = new Player(spec.cls);
  p.level = L;
  const gr = Balance.growth(spec.cls);
  p.maxHp = base.hp + gr.hp * (L - 1);
  p.baseAttack = base.attack + gr.atk * (L - 1);
  allocateSkills(env, p, L - 1, spec.passives || "actual");

  const tier = gearTierFor(L, spec.gear || "auto");
  const item = (type, v, extra = {}) => ({ name: type, type, attack: type === "weapon" ? v : 0, defense: type === "weapon" ? 0 : v, class: "normal", enhance: 0, ...extra });
  p.equipment = { weapon: item("weapon", tier.weapon, { enhance: tier.enhance }), armor: item("armor", tier.armor), helmet: item("helmet", tier.helmet) };

  // 동료 (연습 던전 성 밖에서는 혼자, 일반+ 에서는 2명, 심연에서는 3명 — 단 2번 동료는 normal/abyss 에서만 공격한다, 아래 참고)
  const mine = CLASS_TO_COMPANION[spec.cls];
  const pool = (spec.companions || COMPANION_PREF).filter(k => k !== mine);
  const want = Balance.partySlots(zone);
  const aff = affinityAt(env, L, spec.affinity ?? "auto");
  const cg = spec.companionGear || "weapon";
  ["party", "party2", "party3"].slice(0, want).forEach((slot, i) => {
    const key = pool[i]; if (!key) return;
    const mem = PARTY_MEMBERS[key];
    p[slot] = key; p[slot + "Hp"] = p[slot + "MaxHp"] = mem.hp; p.affinity[key] = aff;
    const eq = slot === "party3" ? null : slot === "party" ? p.partyEquipment : p.party2Equipment;   // 3번 동료는 장비 칸이 없다
    if (eq && cg !== "none") {
      eq.weapon = item("weapon", tier.weapon, { enhance: tier.enhance });
      if (cg === "full") { eq.armor = item("armor", tier.armor); eq.helmet = item("helmet", tier.helmet); }
    }
  });
  p.hp = p.maxHp + p.bonusHp;
  return p;
}

// ══ 전투 엔진 ═══════════════════════════════════════════════════════════════
function makeGame(env, p, zone) {
  const g = { player: p, slots: env.Balance.partySlots(zone), currentMonster: null, dungeonType: zone, _battleLocked: false, _battleTurnCount: 0, battleScene: null,
    currentScene: "battle", regionManager: null, log() {}, _won: false, isGameOver() { return p.hp <= 0 || this._won; } };
  return g;
}

// 합리적인 플레이어의 한 턴
function act(bm, g, stats) {
  const p = g.player, maxHp = p.maxHp + p.bonusHp;
  const ready = (slot, cdKey, hpKey) => p[slot] && p[hpKey] > 0 && (p.affinity?.[p[slot]] || 0) >= 30 && (p.cooldowns[cdKey] || 0) <= 0;
  const hasJob = p.activeSkills[JOB_SKILL[p.type]];
  if (p.hp < maxHp * 0.35 && p.cooldowns.heal <= 0) { stats.heals++; return bm.heal(g); }
  if (p.ultimateGauge >= 100) { stats.ults++; return bm.heroUltimate(g); }
  if (ready("party", "partyUltimate", "partyHp") && g.slots >= 1) { stats.partyUlts++; return bm.partyUltimate(g); }
  if (ready("party2", "party2Ultimate", "party2Hp") && g.slots >= 2) { stats.partyUlts++; return bm.party2Ultimate(g); }
  if (ready("party3", "party3Ultimate", "party3Hp") && g.slots >= 3) { stats.partyUlts++; return bm.party3Ultimate(g); }
  if (hasJob && p.cooldowns.jobSkill <= 0) { stats.jobs++; return bm.jobSkill(g); }
  return bm.attack(g);
}

function fight(env, g, monster, stats) {
  const p = g.player, bm = new env.BattleManager();
  bm._onMonsterDefeated = gg => { gg._won = true; gg._battleLocked = true; };
  g.currentMonster = monster; g._won = false; g._battleLocked = false; g._battleTurnCount = 0;
  const hp0 = p.hp; let turns = 0;
  while (!g._won && p.hp > 0 && turns < 200) { act(bm, g, stats); turns++; }
  stats.turns += turns;
  return { win: g._won, hpLost: hp0 - Math.max(0, p.hp) };
}

// 한 지역·층을 한 번 클리어하는 시도: 적 (층+4)마리, 3층(마지막 층)이면 보스까지. 체력·쿨다운·게이지·동료 부상이 이월된다.
function runFloor(env, kit, zone, floor, opts = {}) {
  const { Balance, POOLS, DIFF, createMonster } = env;
  const p = env.buildKit({ ...kit, zone }), g = makeGame(env, p, zone);
  const stats = { heals: 0, ults: 0, partyUlts: 0, jobs: 0, turns: 0, potions: 0 };
  const pools = POOLS[zone] || POOLS.normal, pool = pools[Math.min(floor, Object.keys(pools).length)];
  const fm = (DIFF[zone] || DIFF.normal)[Math.min(floor - 1, 2)];
  const scale = Balance.monsterScale(p.level, fm, (env.ZLV[zone] || env.ZLV.normal)[Math.min(floor - 1, 2)]);
  const maxFloor = zone === "outside" ? 1 : 3;
  const enemies = zone === "outside" ? 4 : floor + 4;
  let potions = opts.potions ?? 3, killed = 0;
  const maxHp = () => p.maxHp + p.bonusHp;
  const queue = [];
  for (let i = 0; i < enemies; i++) queue.push({ id: pool[Math.floor(env.rng.f() * pool.length)], boss: false });
  if (floor === maxFloor && zone !== "outside" && !opts.noBoss) queue.push({ id: BOSS_OF[zone] || "guardian", boss: true });
  for (const q of queue) {
    while (potions > 0 && p.hp < maxHp() * 0.4) { p.hp = Math.min(maxHp(), p.hp + Balance.potionAmount({ heal: 50 }, maxHp())); potions--; stats.potions++; }
    const m = createMonster(q.id, q.boss ? scale * (env.BOSSD[zone] ?? 1) : scale);
    if (q.boss) { m.isBoss = true; if (q.id === "demon") m.isFinal = true; }
    const r = fight(env, g, m, stats);
    if (!r.win) return { clear: false, killed, boss: q.boss, stats, hpPct: 0 };
    killed++;
  }
  return { clear: true, killed, stats, hpPct: Math.max(0, p.hp) / maxHp() };
}

function clearRate(env, kit, zone, floor, runs, opts = {}) {
  let ok = 0, hp = 0, pot = 0, ult = 0, bossDeaths = 0;
  for (let i = 0; i < runs; i++) {
    const r = runFloor(env, kit, zone, floor, opts);
    if (r.clear) { ok++; hp += r.hpPct; } else if (r.boss) bossDeaths++;
    pot += r.stats.potions; ult += r.stats.ults + r.stats.partyUlts;
  }
  return { clear: ok / runs, avgHpLeft: ok ? hp / ok : 0, potions: pot / runs, ultsPerRun: ult / runs, bossDeaths: bossDeaths / runs };
}

// ── 난이도 계단 ─────────────────────────────────────
const LADDER = [["outside", 1]]
  .concat(...["normal", "mine", "harbor", "elfForest", "capital", "abyss"].map(z => [1, 2, 3].map(f => [z, f])));

function ladder(env, kit, { levels = [5, 10, 15, 20, 30, 40, 50], runs = 100, comfort = 0.8, scanStep = 2, scanRuns = 60 } = {}) {
  const out = [];
  for (const [zone, floor] of LADDER) {
    const row = { zone, floor, byLevel: {}, comfortLevel: null };
    for (const L of levels) row.byLevel[L] = clearRate(env, { ...kit, level: L }, zone, floor, runs);
    // 편안해지는 첫 레벨(클리어율이 comfort 이상이고 다음 2칸에서도 유지)
    const ok = L => clearRate(env, { ...kit, level: L }, zone, floor, scanRuns).clear >= comfort;
    for (let L = 1; L <= env.Balance.MAX_LEVEL; L += scanStep) { if (ok(L) && ok(Math.min(50, L + 2)) && ok(Math.min(50, L + 4))) { row.comfortLevel = L; break; } }
    out.push(row);
  }
  return out;
}

function create(seed = 1) {
  const env = load(seed);
  env.buildKit = spec => buildKit(env, spec);
  return env;
}

module.exports = { create, buildKit, runFloor, clearRate, ladder, fight, makeGame, act, gearTierFor, GEAR_TIER, PASSIVES, LADDER, BOSS_OF };

// ── CLI ─────────────────────────────────────────────
function main() {
  const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const seed = +opt("--seed", 1), runs = +opt("--runs", 100);
  const env = create(seed);
  const kit = { cls: opt("--class", "knight"), gear: opt("--gear", "auto"), passives: opt("--passives", "actual"), affinity: opt("--affinity") ? +opt("--affinity") : "auto", companionGear: opt("--companion-gear", "weapon") };
  const pct = x => String(Math.round(x * 100)).padStart(3) + "%";

  if (opt("--fight")) {
    const [zone, floor] = opt("--fight").split(":"); const L = +opt("--level", 20);
    const r = clearRate(env, { ...kit, level: L }, zone, +floor || 1, runs);
    const p = buildKit(env, { ...kit, level: L, zone });
    console.log(`\n${kit.cls} Lv${L} (${kit.gear} 장비, 패시브 ${kit.passives}) → ${zone} ${floor}층 ${runs}회`);
    console.log(`  키트: 공격 ${p.totalAttack} · 방어 ${p.defense} · HP ${p.maxHp + p.bonusHp} · 동료 ${[p.party, p.party2, p.party3].filter(Boolean).join("/") || "없음"} · 패시브 ${JSON.stringify(p.passiveSkills)}`);
    console.log(`  클리어 ${pct(r.clear)} · 클리어 시 남은 HP ${pct(r.avgHpLeft)} · 물약 ${r.potions.toFixed(1)}개 · 궁극기 ${r.ultsPerRun.toFixed(1)}회/시도 · 보스에서 사망 ${pct(r.bossDeaths)}`);
    return;
  }
  if (a.includes("--compare")) {
    console.log(`\n직업 × 장비 가정 비교 — 일반 던전 3층(보스 포함) 클리어율, 레벨 10/20/30/40 (${runs}회)`);
    for (const cls of ["knight", "tanker", "mage", "archer", "healer"]) for (const gear of ["shop", "auto", "legend"]) {
      console.log(`  ${cls.padEnd(7)} ${gear.padEnd(7)}`, [10, 20, 30, 40].map(L => pct(clearRate(env, { ...kit, cls, gear, level: L }, "normal", 3, runs).clear)).join(" "));
    }
    return;
  }
  const rows = ladder(env, kit, { runs });
  const levels = Object.keys(rows[0].byLevel);
  console.log(`\n난이도 계단 — ${kit.cls}, 장비 가정 ${kit.gear}, 패시브 ${kit.passives}, 층 1회 클리어율 (적 ${"층+4"}마리${"+보스"}, 물약 3개, ${runs}회)`);
  console.log("지역·층".padEnd(14), levels.map(l => ("Lv" + l).padStart(5)).join(""), "  편안해지는 레벨(클리어 ≥80%)");
  for (const r of rows)
    console.log(`${r.zone} ${r.floor}층`.padEnd(14), levels.map(l => pct(r.byLevel[l].clear).padStart(5)).join(""), "  ", r.comfortLevel ?? "—(50까지도 아님)");
}
if (require.main === module) main();
