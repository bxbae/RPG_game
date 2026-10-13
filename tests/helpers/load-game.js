// 브라우저 전역 스크립트들을 Node 의 vm 컨텍스트에 "클래식 스크립트처럼" 순서대로 불러온다.
// (top-level const/class 는 같은 컨텍스트의 다음 스크립트에서 이름으로 보인다 — 브라우저와 동일)
"use strict";
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

// files: 불러올 스크립트(프로젝트 루트 기준). overrides: 불러오기 전에 컨텍스트에 넣을 값.
function loadGame(files = ["balance.js", "models.js", "save-schema.js", "managers.js"], overrides = {}) {
  const sandbox = {
    console, Math, JSON, Date, Set, Map, Object, Array, Number, String, Boolean, RegExp, Error,
    setTimeout, clearTimeout, setInterval, clearInterval,
    crypto: require("crypto").webcrypto,
    localStorage: makeLocalStorage(),
    document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }), addEventListener() {} },
    ...overrides,
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  const get = expr => vm.runInContext(expr, ctx);
  return { ctx, get, run: code => vm.runInContext(code, ctx), localStorage: sandbox.localStorage };
}

module.exports = { loadGame, ROOT };
