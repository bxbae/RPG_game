// 세이브 테스트 — 버전/마이그레이션, 안전한 불러오기(프로토타입 오염·타입 혼동·HTML 주입), 백업.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGame } = require("./helpers/load-game");

const fresh = () => loadGame(["balance.js", "models.js", "save-schema.js", "managers.js"]);

// 실제 플레이로 만든 것과 같은 세이브 봉투를 만든다
function makeEnvelope(g, mutate, version = 4) {
  const Player = g.get("Player"), SaveManager = g.get("SaveManager");
  const p = new Player("mage");
  p.gainExp(5000);
  p.party = "tanker"; p.partyHp = p.partyMaxHp = 140;
  p.inventory.push(g.run('normalizeItem({ name:"강철검", type:"weapon", attack:35, class:"rare" })'));
  if (mutate) mutate(p);
  const sm = new SaveManager();
  return { version, savedAt: 1, player: JSON.parse(JSON.stringify(sm._serializePlayer(p))) };
}

test("저장 → 불러오기 왕복: 진행 상태가 그대로 복원된다", () => {
  const g = fresh(), sm = new (g.get("SaveManager"))();
  const env = makeEnvelope(g, null, 4);
  const back = sm.hydrate(g.get("SaveSchema").migrateSave(env).player);
  assert.equal(back.type, "mage");
  assert.equal(back.level, env.player.level);
  assert.equal(back.exp, env.player.exp);
  assert.equal(back.nextExp, env.player.nextExp);
  assert.equal(back.party, "tanker");
  assert.equal(back.inventory[0].name, "강철검");
  assert.equal(Object.getPrototypeOf(back), g.get("Player").prototype);
});

test("저장 봉투에는 현재 버전과 경험치 곡선 id가 기록된다", () => {
  const g = fresh(), sm = new (g.get("SaveManager"))();
  const Player = g.get("Player");
  const game = { player: new Player("knight") };
  assert.ok(sm.save(game, 1));
  const data = JSON.parse(g.localStorage.getItem("rpgSave_slot_1"));
  assert.equal(data.version, g.get("SaveSchema").SAVE_VERSION);
  assert.equal(data.curve, g.get("Balance").CURVE_ID);
});

test("옛 저장(v3): 직업 별칭 night→knight, 카르나(dealer)→카인(tanker) 이관", () => {
  const g = fresh(), S = g.get("SaveSchema"), sm = new (g.get("SaveManager"))();
  const env = makeEnvelope(g, p => {
    p.type = "night"; p.party = "dealer"; p.partyHp = 80; p.partyMaxHp = 100;
    p.affinity = { archer: 5, healer: 0, tanker: 10, dealer: 60, mage_party: 0 };
    p.partyCutinLevel = { healer: 0, tanker: 1, mage_party: 0, archer: 0, dealer: 3 };
    p.companionStory = { dealer: { done: true }, tanker: { done: false } };
    p.companionPassives = { dealer: { id: "x" } };
  }, 3);
  const m = S.migrateSave(env);
  assert.equal(m.version, 4);
  assert.equal(m.migratedFrom.version, 3);
  const p = sm.hydrate(m.player);
  assert.equal(p.type, "knight");
  assert.equal(p.name, "기사");
  assert.equal(p.party, "tanker");
  assert.equal(p.partyHp, 140);                       // 카인 기준 HP 로 채워진다
  assert.equal(p.affinity.tanker, 60);                // 호감도는 높은 쪽
  assert.equal("dealer" in p.affinity, false);
  assert.equal(p.partyCutinLevel.tanker, 3);
  assert.equal("dealer" in p.companionStory, false);
  assert.equal("dealer" in p.companionPassives, false);
});

test("카인이 이미 파티에 있으면 카르나 자리는 비운다", () => {
  const g = fresh(), S = g.get("SaveSchema");
  const env = makeEnvelope(g, p => { p.party = "tanker"; p.party2 = "dealer"; p.party2Hp = 50; p.party2MaxHp = 100; }, 3);
  const p = S.migrateSave(env).player;
  assert.equal(p.party, "tanker");
  assert.equal(p.party2, null);
  assert.equal(p.party2Hp, 0);
});

test("버전 필드가 없는 아주 옛 저장도 읽고, 더 새로운 버전·손상된 데이터는 거부한다", () => {
  const g = fresh(), S = g.get("SaveSchema");
  const env = makeEnvelope(g, null, 4); delete env.version;
  assert.equal(S.migrateSave(env).version, 4);
  assert.equal(S.migrateSave({ ...makeEnvelope(g, null, 4), version: 99 }), null);
  for (const bad of [null, undefined, 5, "x", [], {}, { player: null }, { player: [] }]) assert.equal(S.migrateSave(bad), null);
});

test("경험치/레벨 보정: 잘못된 nextExp·초과 레벨·음수 경험치를 바로잡는다", () => {
  const g = fresh(), S = g.get("SaveSchema"), B = g.get("Balance"), MAX = g.get("MAX_LEVEL");
  const p1 = S.migrateSave(makeEnvelope(g, p => { p.level = 10; p.exp = -5; p.nextExp = 7; })).player;
  assert.equal(p1.nextExp, B.expToNext(10)); assert.equal(p1.exp, 0);
  const p2 = S.migrateSave(makeEnvelope(g, p => { p.level = 5000; })).player;
  assert.equal(p2.level, MAX); assert.equal(p2.exp, p2.nextExp - 1);
  const p3 = S.migrateSave(makeEnvelope(g, p => { p.level = 12; p.exp = 10 ** 12; })).player;   // 터무니없이 큰 경험치
  assert.equal(p3.exp, B.expToNext(12) - 1);
});

test("경험치 곡선이 바뀌면 진행도(레벨 내 비율)를 새 곡선으로 옮긴다", () => {
  const g = fresh(), S = g.get("SaveSchema"), B = g.get("Balance");
  const env = makeEnvelope(g, p => { p.level = 10; p.nextExp = B.expToNext(10); p.exp = Math.floor(p.nextExp / 2); });
  env.curve = B.CURVE_ID;                                // 지금 곡선으로 저장된 세이브
  const oldNext = B.expToNext(10);
  B.EXP_COEF = 45; B.CURVE_ID += 1;                      // 이후 또 한 번 곡선을 바꾸는 상황을 흉내
  const newNext = B.expToNext(10);
  assert.notEqual(newNext, oldNext);
  const m = S.migrateSave(env);
  assert.equal(m.player.nextExp, newNext);
  assert.equal(m.player.exp, Math.floor(Math.floor(oldNext / 2) * (newNext / oldNext)));
  assert.equal(m.curve, B.CURVE_ID);
  assert.deepEqual(JSON.parse(JSON.stringify(m.migratedFrom)), { version: 4, curve: B.CURVE_ID - 1 });
  // 같은 곡선으로 한 번 더 저장/불러오면 더는 옮기지 않는다(멱등)
  const again = S.migrateSave({ ...m });
  assert.equal(again.player.exp, m.player.exp);
  assert.equal(again.migratedFrom, undefined);
});

test("실제 옛 곡선(곡선 1: ×1.3 지수 성장)의 세이브가 새 곡선(2)으로 진행도 비율을 지켜 옮겨진다", () => {
  const g = fresh(), S = g.get("SaveSchema"), B = g.get("Balance");
  // 곡선 1 로 만들어진 레벨 20 세이브 — 필요 경험치 14,566(= 100 에서 floor(×1.3)을 19번 누적), 현재 7,283(정확히 50%)
  let oldNext = 100; for (let i = 1; i < 20; i++) oldNext = Math.floor(oldNext * 1.3);
  const env = makeEnvelope(g, p => { p.level = 20; p.nextExp = oldNext; p.exp = Math.floor(oldNext / 2); }, 4);
  env.curve = 1;
  const m = S.migrateSave(env);
  assert.equal(m.player.level, 20);
  assert.equal(m.player.nextExp, B.expToNext(20));
  assert.equal(m.player.exp, Math.floor(Math.floor(oldNext / 2) * (B.expToNext(20) / oldNext)));
  assert.ok(Math.abs(m.player.exp / m.player.nextExp - 0.5) < 0.01, "레벨 안에서의 진행 비율(50%)이 유지된다");
});

test("옛 곡선에서 최고 레벨(50)을 넘긴 세이브는 50으로 맞추고 경험치 바를 가득 채운다", () => {
  const g = fresh(), S = g.get("SaveSchema"), B = g.get("Balance");
  const env = makeEnvelope(g, p => { p.level = 73; p.exp = 123; p.nextExp = 999999; }, 4);
  env.curve = 1;
  const p = S.migrateSave(env).player;
  assert.equal(p.level, 50);
  assert.equal(p.nextExp, B.expToNext(50));
  assert.equal(p.exp, p.nextExp - 1);
});

test("보안: __proto__ / constructor 키로 프로토타입을 오염시킬 수 없다", () => {
  const g = fresh(), S = g.get("SaveSchema"), sm = new (g.get("SaveManager"))();
  const payload = JSON.parse(`{
    "version": 4, "player": {
      "type": "knight", "level": 3,
      "__proto__": { "isAdmin": true, "gainExp": "pwned" },
      "constructor": { "prototype": { "polluted": 1 } },
      "status": { "__proto__": { "evil": 1 } },
      "inventory": [ { "name": "x", "type": "weapon", "__proto__": { "evil2": 1 } } ]
    } }`);
  const p = sm.hydrate(S.migrateSave(payload).player);
  assert.equal(Object.getPrototypeOf(p), g.get("Player").prototype);
  assert.equal(p.isAdmin, undefined);
  assert.equal(typeof p.gainExp, "function");
  assert.equal(({}).isAdmin, undefined); assert.equal(({}).polluted, undefined); assert.equal(({}).evil, undefined);
  assert.equal(p.status.evil, undefined); assert.equal(p.inventory[0].evil2, undefined);
});

test("보안: 타입이 어긋난 값은 무시하고 기본값을 유지한다", () => {
  const g = fresh(), S = g.get("SaveSchema"), sm = new (g.get("SaveManager"))();
  const env = makeEnvelope(g, null, 4);
  Object.assign(env.player, { baseAttack: "9999", hp: { a: 1 }, inventory: "hacked", partyEvents: [1, 2], maxHp: null });
  const p = sm.hydrate(S.migrateSave(env).player);
  const base = new (g.get("Player"))("mage");
  assert.equal(p.baseAttack, base.baseAttack);                      // 문자열 "9999" 는 무시되고 클래스 기본값이 남는다
  assert.equal(typeof p.hp, "number");
  assert.ok(Array.isArray(p.inventory));
  assert.equal(typeof p.maxHp, "number");
});

test("보안: 이름·아이템 이름에서 HTML 태그 문자를 제거한다 (innerHTML 로 그려질 수 있음)", () => {
  const g = fresh(), S = g.get("SaveSchema"), sm = new (g.get("SaveManager"))();
  const env = makeEnvelope(g, p => {
    p.name = '<img src=x onerror="alert(1)">용사';
    p.inventory = [{ name: "<script>alert(1)</script>검", type: "weapon", desc: "<b>x</b>", attack: 1, class: "normal" }];
  });
  const p = sm.hydrate(S.migrateSave(env).player);
  assert.ok(!/[<>"']/.test(p.name), p.name);
  assert.ok(!/[<>]/.test(p.inventory[0].name) && !/[<>]/.test(p.inventory[0].desc));
});

test("SaveManager: 저장할 때 직전 저장을 _bak 로 남기고, 옛 저장을 열면 원본을 한 번만 백업한다", () => {
  const g = fresh(), sm = new (g.get("SaveManager"))();
  const Player = g.get("Player"), ls = g.localStorage;
  const game = { player: new Player("archer") };
  sm.save(game, 0); assert.equal(ls.getItem("rpgSave_slot_0_bak"), null);
  game.player.gainExp(300); sm.save(game, 0);
  assert.notEqual(ls.getItem("rpgSave_slot_0_bak"), null);
  assert.equal(JSON.parse(ls.getItem("rpgSave_slot_0_bak")).player.level, 1);   // 직전 저장(레벨 1)

  const legacy = JSON.stringify(makeEnvelope(g, p => { p.type = "warrior"; }, 3));
  ls.setItem("rpgSave_slot_2", legacy);
  const data = sm.load(2);
  assert.equal(data.player.type, "knight");
  assert.equal(ls.getItem("rpgSave_slot_2_v3c1"), legacy);                       // 원본 보존
  ls.setItem("rpgSave_slot_2_v3c1", "KEEP");
  sm.load(2);
  assert.equal(ls.getItem("rpgSave_slot_2_v3c1"), "KEEP");                       // 다시 덮어쓰지 않는다
});

test("SaveManager: 깨진 JSON·신버전 저장은 슬롯 목록에서 빈 슬롯으로 보이고 예외를 던지지 않는다", () => {
  const g = fresh(), sm = new (g.get("SaveManager"))(), ls = g.localStorage;
  ls.setItem("rpgSave_slot_0", "{not json");
  ls.setItem("rpgSave_slot_1", JSON.stringify({ version: 99, player: { type: "knight" } }));
  const slots = sm.getAllSlots();
  assert.equal(slots[0].empty, true); assert.equal(slots[1].empty, true);
  assert.equal(sm.load(0), null); assert.equal(sm.load(1), null);
});
