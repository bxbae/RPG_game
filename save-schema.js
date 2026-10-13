// ═══════════════════════════════════════════════════
//  save-schema.js — 세이브 버전 · 마이그레이션 · 입력 검증
//
//  저장 데이터는 "신뢰할 수 없는 입력"으로 취급한다(브라우저 저장소는 사용자가 직접 고칠 수 있고,
//  앞으로 공유/가져오기 기능이 생길 수도 있다). 이 파일이 불러오기 경계에서
//    ① 옛 버전 저장을 현재 구조로 올리고(migrate*),
//    ② 위험한 키·이상한 타입을 걸러내고(safeAssign),
//    ③ 레벨/경험치 같은 값을 일관되게 보정한다(migratePlayer).
//  DOM 에 의존하지 않아 Node 에서 그대로 테스트한다(tests/).
//
//  버전 이력
//   v1~v3  기존 저장(타입 별칭 night/warrior, 동료 카르나(dealer) 존재)
//   v4     타입 별칭 정리, 카르나→카인 이관을 마이그레이션으로 이동, 경험치 곡선 id(curve) 기록
// ═══════════════════════════════════════════════════
"use strict";

(function (root) {
  const SAVE_VERSION = 4;
  const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const MAX_DEPTH = 12;

  // JSON 값을 깊게 복사하면서 프로토타입 오염용 키를 제거한다.
  function deepStrip(v, depth = 0) {
    if (v === null || typeof v !== "object") return typeof v === "function" ? undefined : v;
    if (depth > MAX_DEPTH) return undefined;
    if (Array.isArray(v)) return v.map(x => deepStrip(x, depth + 1));
    const out = {};
    for (const k of Object.keys(v)) {
      if (BLOCKED_KEYS.has(k)) continue;
      const c = deepStrip(v[k], depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }

  // HTML 로 그려질 수 있는 문자열에서 태그/따옴표를 뺀다.
  const cleanText = (s, max = 60) => String(s ?? "").replace(/[<>&"'`\u0000-\u001f]/g, "").slice(0, max);

  const isPlainObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number.isFinite(+n) ? +n : lo)));

  // raw(저장값) → target(새 Player) 로 안전하게 복사한다.
  //  - __proto__ / constructor / prototype 키는 버린다
  //  - 기본값이 숫자/문자열/불린인데 저장값 타입이 다르거나 NaN·Infinity 면 기본값을 유지한다
  //  - 기본값이 배열/객체인데 저장값 종류가 다르면 기본값을 유지한다
  function safeAssign(target, raw) {
    for (const k of Object.keys(raw)) {
      if (BLOCKED_KEYS.has(k) || !KEY_RE.test(k)) continue;
      const v = raw[k];
      if (typeof v === "function" || v === undefined) continue;
      const d = target[k];
      if (typeof d === "number")  { if (typeof v !== "number" || !Number.isFinite(v)) continue; }
      else if (typeof d === "string" || typeof d === "boolean") { if (typeof v !== typeof d) continue; }
      else if (Array.isArray(d))  { if (!Array.isArray(v)) continue; }
      else if (isPlainObj(d))     { if (!isPlainObj(v)) continue; }
      target[k] = deepStrip(v);
    }
    return target;
  }

  const CLASS_ALIAS = { night: "knight", warrior: "knight" };   // 옛 직업 id
  // 불러오기 코드가 내부 필드를 직접 읽는 "구조 있는" 객체들
  const STRUCT_OBJECTS = ["equipment", "partyEquipment", "party2Equipment", "partyEvents", "cooldowns",
                          "status", "affinity", "bank", "skills", "passiveSkills", "companionStory", "companionPassives",
                          "partyCutinLevel"];

  // 플레이어 데이터(JSON 객체)를 현재 구조로 맞춘다. 여러 번 호출해도 결과가 같다(멱등).
  //   ctx.fromCurve: 저장 당시 경험치 곡선 id (없으면 1)
  function migratePlayer(src, ctx = {}) {
    const fixes = [];
    const p = deepStrip(src) || {};
    const B = root.Balance;

    // 0) 구조 검증 — 불러오기 코드가 배열/객체로 다루는 필드가 다른 타입이면 버린다(기본값이 쓰인다).
    //    (조작되거나 깨진 저장이 불러오기 도중 예외를 일으키지 않도록)
    for (const k of STRUCT_OBJECTS) if (k in p && !isPlainObj(p[k])) { delete p[k]; fixes.push(`drop ${k}`); }
    if ("inventory" in p) {
      if (!Array.isArray(p.inventory)) { delete p.inventory; fixes.push("drop inventory"); }
      else p.inventory = p.inventory.filter(isPlainObj);
    }
    for (const k of ["equipment", "partyEquipment", "party2Equipment"]) {
      if (isPlainObj(p[k])) for (const slot of Object.keys(p[k])) if (p[k][slot] !== null && !isPlainObj(p[k][slot])) p[k][slot] = null;
    }

    // 1) 옛 직업 id
    if (CLASS_ALIAS[p.type]) {
      const type = CLASS_ALIAS[p.type], base = (root.CLASSES || globalThis.CLASSES || {})[type] || {};
      fixes.push(`type ${p.type}→${type}`);
      p.type = type;
      if (base.name) { p.name = base.name; p.icon = base.icon; p.portrait = base.portrait || ""; }
    }

    // 2) 동료 카르나(dealer)는 카인(tanker)에 병합 — 파티 슬롯·호감도·컷인·사연 데이터를 카인으로 이관
    const PM = root.PARTY_MEMBERS || globalThis.PARTY_MEMBERS || {};
    const slots = ["party", "party2", "party3"];
    if (slots.some(s => p[s] === "dealer")) {
      fixes.push("dealer→tanker");
      const tankerAlready = slots.some(s => p[s] === "tanker");
      for (const s of slots) {
        if (p[s] !== "dealer") continue;
        const mem = tankerAlready ? null : PM.tanker;
        p[s] = mem ? "tanker" : null;
        p[`${s}Hp`] = mem ? mem.hp : 0;
        p[`${s}MaxHp`] = mem ? mem.hp : 0;
        p[`_${s}KnockedOut`] = false;
      }
    }
    if (isPlainObj(p.affinity) && "dealer" in p.affinity) {
      p.affinity.tanker = Math.max(+p.affinity.tanker || 0, +p.affinity.dealer || 0);
      delete p.affinity.dealer;
    }
    if (isPlainObj(p.partyCutinLevel) && "dealer" in p.partyCutinLevel) {
      p.partyCutinLevel.tanker = Math.max(+p.partyCutinLevel.tanker || 0, +p.partyCutinLevel.dealer || 0);
      delete p.partyCutinLevel.dealer;
    }
    if (isPlainObj(p.companionStory))   delete p.companionStory.dealer;
    if (isPlainObj(p.companionPassives)) delete p.companionPassives.dealer;

    // 3) 레벨/경험치 보정 — 곡선이 바뀌었으면 진행도를 비율로 옮긴다
    if (B) {
      const maxLv = root.MAX_LEVEL || globalThis.MAX_LEVEL || 99;
      const lv0 = p.level;
      p.level = clampInt(p.level ?? 1, 1, maxLv);
      if (p.level !== lv0) fixes.push(`level ${lv0}→${p.level}`);
      const expectNext = B.expToNext(p.level);
      let exp = Number.isFinite(+p.exp) ? Math.max(0, +p.exp) : 0;
      const oldNext = Number.isFinite(+p.nextExp) && +p.nextExp > 0 ? +p.nextExp : expectNext;
      const fromCurve = ctx.fromCurve ?? B.CURVE_ID;
      if (fromCurve !== B.CURVE_ID && oldNext !== expectNext) {
        exp = Math.floor(exp * (expectNext / oldNext));
        fixes.push(`exp curve ${fromCurve}→${B.CURVE_ID}`);
      }
      if (p.nextExp !== expectNext) fixes.push(`nextExp ${p.nextExp}→${expectNext}`);
      p.nextExp = expectNext;
      p.exp = p.level >= maxLv ? expectNext - 1 : Math.min(Math.floor(exp), expectNext - 1);   // 최고 레벨은 경험치 바가 가득 찬 채로 고정
      p.skillPoints = clampInt(p.skillPoints ?? 0, 0, 1e6);
    }

    // 4) 화면에 그려지는 문자열
    if (p.name !== undefined) p.name = cleanText(p.name, 24) || (root.CLASSES?.[p.type]?.name ?? "용사");
    return { player: p, fixes };
  }

  // 저장 파일(봉투) 전체를 현재 버전으로 올린다. 읽을 수 없거나 더 새로운 버전이면 null.
  function migrateSave(data) {
    if (!isPlainObj(data) || !isPlainObj(data.player)) return null;
    const from = Number.isFinite(data.version) ? data.version : 1;
    if (from > SAVE_VERSION) return null;                       // 이 빌드보다 새 버전에서 만든 저장
    const fromCurve = Number.isFinite(data.curve) ? data.curve : 1;
    const { player, fixes } = migratePlayer(data.player, { fromCurve });
    const curve = root.Balance ? root.Balance.CURVE_ID : fromCurve;
    const out = {
      version: SAVE_VERSION, curve, savedAt: data.savedAt, player, fixes,
    };
    if (data.isAutoSave) out.isAutoSave = true;
    if (from < SAVE_VERSION || fromCurve !== curve) out.migratedFrom = { version: from, curve: fromCurve };
    return out;
  }

  const SaveSchema = { SAVE_VERSION, deepStrip, cleanText, safeAssign, migratePlayer, migrateSave };
  root.SaveSchema = SaveSchema;
  if (typeof module !== "undefined" && module.exports) module.exports = SaveSchema;
})(typeof window !== "undefined" ? window : globalThis);
