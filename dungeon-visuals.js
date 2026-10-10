// ═══════════════════════════════════════════════════
//  dungeon-visuals.js — 던전 탐험 화면 비주얼
//  돌바닥·암벽 텍스처, 횃불/수정 조명, 몬스터·상자 연출, 배경 아트
//  DungeonScene._render 가 호출한다. 게임 로직은 건드리지 않고 그리기만 담당.
// ═══════════════════════════════════════════════════
"use strict";

const DungeonVisuals = (() => {
  const SS = 2; // 타일 텍스처는 2배 해상도로 만들어 축소해 그린다 (더 부드러움)

  // 던전 유형별 팔레트 — floor: 바닥 위/아래, cap: 벽 윗면, face: 벽 앞면 위/아래,
  // accent: 수정·이끼 색, glow: 횃불/플레이어 빛(r,g,b), tint: 배경 아트 위에 깔 색
  const THEMES = {
    normal:    { floor:["#4b4256","#3d3548"], wall:"#2b2238", cap:"#54486a", face:["#3a2f4a","#1a1223"], accent:"#6fd0ff", glow:"255,170,90",  tint:"28,16,44", deco:"crystal", backdrop:"images/dungeon_interior.png" },
    outside:   { floor:["#46543a","#394730"], wall:"#16281a", cap:"#2d4a2e", face:["#244026","#0d1a10"], accent:"#b8ff9a", glow:"255,220,140", tint:"8,24,20",  deco:"grass",   backdrop:"images/forest_exploration_night.png" },
    mine:      { floor:["#5a4126","#493320"], wall:"#2c1b0d", cap:"#68482a", face:["#4a3018","#1a0e05"], accent:"#ffb347", glow:"255,190,100", tint:"40,22,6",  deco:"crystal", backdrop:"images/dungeon_interior.png" },
    harbor:    { floor:["#245056","#1b4148"], wall:"#0a2229", cap:"#2c6670", face:["#14414a","#061519"], accent:"#5ff2e0", glow:"140,230,255", tint:"4,26,36",  deco:"puddle",  backdrop:"images/Haunted_shipwreck_on_a_stormy_shore.png" },
    elfForest: { floor:["#33583a","#294830"], wall:"#0e2514", cap:"#2f6a3a", face:["#1d4425","#08160c"], accent:"#b6ff9c", glow:"210,255,150", tint:"6,28,16",  deco:"grass",   backdrop:"images/Corrupted_forest_of_forgotten_ruins.png" },
    capital:   { floor:["#58262c","#471d23"], wall:"#2a0d12", cap:"#6a323a", face:["#471a20","#16060a"], accent:"#ff6a78", glow:"255,170,140", tint:"36,6,12",  deco:"crystal", backdrop:"images/Dungeon_BOSS_ROOM.png" },
    abyss:     { floor:["#37245a","#2b1b48"], wall:"#150b28", cap:"#4a3380", face:["#2f1d52","#0e0620"], accent:"#c070ff", glow:"190,120,255", tint:"22,8,40",  deco:"crystal", backdrop:"images/Final_stand_in_the_arcane_temple.png" },
  };
  const ALIAS = { lavaCanyon:"capital", sunkenWreck:"harbor", corruptedGrove:"elfForest", royalDungeon:"capital" };
  const themeOf = (type) => THEMES[type] || THEMES[ALIAS[type]] || THEMES.normal;

  // 던전 유형별 보스 몬스터 (dungeon-scene.js 의 BOSS_MAP 과 같은 값 — 보스 스프라이트용)
  const BOSS_MONSTER = {
    normal:"guardian", abyss:"demon", mine:"general_gramos", harbor:"general_barkan",
    elfForest:"general_lilith", capital:"general_belzeron", lavaCanyon:"gramos_true",
    sunkenWreck:"barkan_true", corruptedGrove:"lilith_true", royalDungeon:"belzeron_true",
  };

  // ── 유틸 ─────────────────────────────────────────
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hash = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  };
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

  const imgCache = new Map();
  function getImg(src) {
    if (!src) return null;
    let im = imgCache.get(src);
    if (!im) { im = new Image(); im.src = src; imgCache.set(src, im); }
    return im.complete && im.naturalWidth ? im : null;
  }

  // ── 타일 텍스처 생성 (유형·타일크기별 1회) ─────────
  function makeFloor(th, S, seed) {
    const c = mk(S, S), g = c.getContext("2d"), r = rng(seed);
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, th.floor[0]); gr.addColorStop(1, th.floor[1]);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 5; i++) {                       // 큰 얼룩
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.09)";
      g.beginPath(); g.ellipse(r() * S, r() * S, S * (.15 + r() * .22), S * (.1 + r() * .18), r() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 50; i++) {                      // 점박이 질감
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${.05 + r() * .1})` : `rgba(0,0,0,${.08 + r() * .14})`;
      g.fillRect(r() * S, r() * S, 1 + r() * 2.2, 1 + r() * 2.2);
    }
    for (let k = 0; k < 2; k++) {                       // 균열
      let x = r() * S, y = r() * S;
      const pts = [[x, y]];
      for (let j = 0; j < 3; j++) { x += (r() - .5) * S * .5; y += (r() - .5) * S * .5; pts.push([x, y]); }
      for (const [col, off] of [["rgba(0,0,0,.32)", 0], ["rgba(255,255,255,.07)", 1.2]]) {
        g.strokeStyle = col; g.lineWidth = 1.3; g.beginPath();
        pts.forEach(([px, py], i) => i ? g.lineTo(px + off, py + off) : g.moveTo(px + off, py + off));
        g.stroke();
      }
    }
    g.strokeStyle = "rgba(0,0,0,.26)"; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);          // 슬랩 이음새
    g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(3, S - 3); g.lineTo(3, 3); g.lineTo(S - 3, 3); g.stroke();
    return c;
  }

  function makeRock(th, S, seed) {                      // 안쪽 암반(윗면만 보이는 벽)
    const c = mk(S, S), g = c.getContext("2d"), r = rng(seed);
    g.fillStyle = th.wall; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = r() < 0.45 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.2)";
      g.beginPath();
      const cx = r() * S, cy = r() * S;
      for (let j = 0; j < 5; j++) {
        const a = j / 5 * Math.PI * 2, rr = S * (.14 + r() * .2);
        j ? g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(0,0,0,${.1 + r() * .2})`;
      g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
    }
    return c;
  }

  function makeWallFace(th, S, seed) {                  // 윗면(cap) + 앞면(face): 바닥과 맞닿는 벽
    const c = mk(S, S), g = c.getContext("2d"), r = rng(seed);
    const capH = Math.round(S * 0.36);
    const cg = g.createLinearGradient(0, 0, 0, capH);
    cg.addColorStop(0, th.wall); cg.addColorStop(1, th.cap);
    g.fillStyle = cg; g.fillRect(0, 0, S, capH);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.18)";
      g.fillRect(r() * S, r() * capH, 1 + r() * 3, 1 + r() * 2);
    }
    const fg = g.createLinearGradient(0, capH, 0, S);
    fg.addColorStop(0, th.face[0]); fg.addColorStop(1, th.face[1]);
    g.fillStyle = fg; g.fillRect(0, capH, S, S - capH);
    // 벽돌 줄눈
    const rows = 2, rh = (S - capH) / (rows + 1);
    g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 1.4;
    for (let i = 1; i <= rows; i++) {
      const y = capH + rh * i;
      g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      const y0 = capH + rh * i, off = (i % 2) * S * 0.25 + r() * S * .1;
      for (let x = off; x < S; x += S * 0.5) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + rh); g.stroke(); }
    }
    for (let i = 0; i < 20; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.2)";
      g.fillRect(r() * S, capH + r() * (S - capH), 1 + r() * 2, 1 + r() * 2);
    }
    g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(0, capH - 1, S, 2);       // 모서리 하이라이트
    const sg = g.createLinearGradient(0, S - S * .22, 0, S);                      // 바닥 접촉 그림자
    sg.addColorStop(0, "rgba(0,0,0,0)"); sg.addColorStop(1, "rgba(0,0,0,.5)");
    g.fillStyle = sg; g.fillRect(0, S - S * .22, S, S * .22);
    return c;
  }

  function makeAO(S, dir) {                             // 벽 옆 바닥에 깔리는 그림자
    const c = mk(S, S), g = c.getContext("2d");
    const gr = dir === "top" ? g.createLinearGradient(0, 0, 0, S * .5)
             : dir === "left" ? g.createLinearGradient(0, 0, S * .3, 0)
             : g.createLinearGradient(S, 0, S * .7, 0);
    gr.addColorStop(0, `rgba(0,0,0,${dir === "top" ? .5 : .32})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    return c;
  }

  function makeDeco(th, S, kind, seed) {                // 바닥 장식 (투명 배경)
    const c = mk(S, S), g = c.getContext("2d"), r = rng(seed);
    if (kind === "crystal") {
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const bx = S * (.28 + r() * .44), by = S * (.74 + r() * .1), h = S * (.28 + r() * .3), w = S * (.07 + r() * .06);
        const gr = g.createLinearGradient(bx, by - h, bx, by);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(.35, th.accent); gr.addColorStop(1, "rgba(0,0,0,.55)");
        g.fillStyle = gr; g.globalAlpha = .95;
        g.beginPath(); g.moveTo(bx - w, by); g.lineTo(bx - w * .7, by - h * .7); g.lineTo(bx, by - h); g.lineTo(bx + w * .7, by - h * .7); g.lineTo(bx + w, by); g.closePath(); g.fill();
        g.globalAlpha = .5; g.fillStyle = "#fff";
        g.beginPath(); g.moveTo(bx - w * .3, by); g.lineTo(bx - w * .3, by - h * .75); g.lineTo(bx, by - h); g.lineTo(bx - w * .05, by); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }
    } else if (kind === "grass") {
      g.strokeStyle = th.accent; g.lineCap = "round";
      for (let i = 0; i < 9; i++) {
        const bx = S * (.2 + r() * .6), by = S * (.78 + r() * .08), h = S * (.14 + r() * .2);
        g.globalAlpha = .55 + r() * .4; g.lineWidth = 1.6 + r();
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + (r() - .5) * S * .25, by - h * .6, bx + (r() - .5) * S * .3, by - h); g.stroke();
      }
      g.globalAlpha = 1;
    } else {                                            // puddle
      g.fillStyle = th.accent; g.globalAlpha = .22;
      g.beginPath(); g.ellipse(S * (.4 + r() * .2), S * (.55 + r() * .2), S * (.2 + r() * .12), S * (.08 + r() * .05), 0, 0, 7); g.fill();
      g.globalAlpha = .5; g.strokeStyle = "#fff"; g.lineWidth = 1.2;
      g.beginPath(); g.arc(S * .5, S * .6, S * .13, 3.4, 5.2); g.stroke();
      g.globalAlpha = 1;
    }
    return c;
  }

  const spriteCache = new Map();
  function sprites(type, ts) {
    const key = `${type}|${ts}`;
    let s = spriteCache.get(key);
    if (s) return s;
    const th = themeOf(type), S = ts * SS;
    s = {
      floor: [1, 2, 3, 4].map(i => makeFloor(th, S, 11 * i)),
      rock:  [1, 2, 3].map(i => makeRock(th, S, 7 * i)),
      face:  [1, 2, 3].map(i => makeWallFace(th, S, 5 * i)),
      aoTop: makeAO(S, "top"), aoLeft: makeAO(S, "left"), aoRight: makeAO(S, "right"),
      deco:  [1, 2, 3].map(i => makeDeco(th, S, th.deco, 13 * i)),
    };
    spriteCache.set(key, s);
    return s;
  }

  // ── 배경 아트 ────────────────────────────────────
  function drawBackdrop(ctx, th, cw, ch, camX, camY) {
    ctx.fillStyle = `rgb(${th.tint})`; ctx.fillRect(0, 0, cw, ch);
    const img = getImg(th.backdrop);
    if (img) {
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * 1.18;
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2 - camX * 0.06, (ch - h) / 2 - camY * 0.06, w, h); // 살짝 시차를 줘서 깊이감
    }
    ctx.fillStyle = `rgba(${th.tint},.5)`; ctx.fillRect(0, 0, cw, ch);
  }

  // ── 오브젝트 ─────────────────────────────────────
  const shadow = (ctx, cx, cy, rx, ry, a = .45) => {
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
  };

  function drawMonster(ctx, px, py, ts, monsterId, boss, t, seed) {
    const cx = px + ts / 2, base = py + ts * 0.88;
    const pulse = .5 + .5 * Math.sin(t / 420 + seed);
    const ring = ctx.createRadialGradient(cx, base, 2, cx, base, ts * (boss ? 1.5 : .9));
    ring.addColorStop(0, `rgba(255,70,40,${(boss ? .5 : .32) + pulse * .12})`); ring.addColorStop(1, "rgba(255,70,40,0)");
    ctx.fillStyle = ring; ctx.fillRect(cx - ts * 1.6, base - ts * 1.2, ts * 3.2, ts * 2.4);
    shadow(ctx, cx, base, ts * (boss ? .6 : .36), ts * (boss ? .17 : .11));
    const m = (window.MONSTERS || []).find(x => x.id === monsterId);
    const img = getImg(m?.img);
    const bob = Math.sin(t / 380 + seed) * 1.6;
    let top = base - ts * 1.2;
    if (img) {
      const h = ts * (boss ? 3 : 1.9), w = h * img.naturalWidth / img.naturalHeight;
      ctx.drawImage(img, cx - w / 2, base - h + bob + ts * .08, w, h);
      top = base - h + bob;
    } else {
      ctx.font = `${Math.floor(ts * .8)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(boss ? "👹" : "👺", cx, base - ts * .45);
    }
    if (boss) {
      ctx.font = `bold ${Math.floor(ts * .3)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.8)"; ctx.strokeText("BOSS", cx, top - 2);
      ctx.fillStyle = "#ff5030"; ctx.fillText("BOSS", cx, top - 2);
    } else {                                            // 머리 위 경계 표시 "!"
      const my = top - ts * .12 + Math.sin(t / 240 + seed) * 2;
      ctx.font = `900 ${Math.floor(ts * .55)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(60,30,0,.9)"; ctx.strokeText("!", cx, my);
      ctx.fillStyle = "#ffd23c"; ctx.fillText("!", cx, my);
    }
  }

  function drawChest(ctx, px, py, ts, t, seed) {
    const cx = px + ts / 2, cy = py + ts * .6, w = ts * .62, h = ts * .4;
    shadow(ctx, cx, cy + h * .55, w * .62, ts * .08);
    const x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = "#5e3a1a"; ctx.fillRect(x, y + h * .35, w, h * .65);
    const lid = ctx.createLinearGradient(0, y, 0, y + h * .45); lid.addColorStop(0, "#b07a3c"); lid.addColorStop(1, "#7a4a22");
    ctx.fillStyle = lid; ctx.beginPath(); ctx.moveTo(x, y + h * .4); ctx.quadraticCurveTo(cx, y - h * .35, x + w, y + h * .4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f2c23e"; ctx.fillRect(x, y + h * .36, w, h * .1); ctx.fillRect(cx - w * .07, y + h * .1, w * .14, h * .85);
    ctx.fillStyle = "#fff6c0"; ctx.fillRect(cx - w * .035, y + h * .42, w * .07, h * .16);
    const sp = (Math.sin(t / 300 + seed) + 1) / 2;                  // 반짝임
    ctx.globalAlpha = sp; ctx.fillStyle = "#fff"; const sx = x + w * .8, sy = y - h * .05;
    ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 1.2, sy - 1.2); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx + 1.2, sy + 1.2); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx - 1.2, sy + 1.2); ctx.lineTo(sx - 4, sy); ctx.lineTo(sx - 1.2, sy - 1.2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawStairs(ctx, px, py, ts, t) {
    const x = px + ts * .12, w = ts * .76;
    for (let i = 0; i < 4; i++) {
      const y = py + ts * (.14 + i * .2), sh = 40 - i * 9;
      ctx.fillStyle = `rgb(${sh + 30},${sh + 34},${sh + 70})`; ctx.fillRect(x + i * 2, y, w - i * 4, ts * .2);
      ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(x + i * 2, y, w - i * 4, 1.5);
    }
    ctx.globalAlpha = .55 + .3 * Math.sin(t / 300);
    ctx.font = `bold ${Math.floor(ts * .42)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#8fc8ff"; ctx.fillText("▼", px + ts / 2, py + ts * .52); ctx.globalAlpha = 1;
  }

  function drawExit(ctx, px, py, ts, t) {
    const cx = px + ts / 2, cy = py + ts * .55;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, ts * .55);
    g.addColorStop(0, "rgba(160,255,240,.95)"); g.addColorStop(1, "rgba(0,200,180,0)");
    ctx.fillStyle = g; ctx.fillRect(px - ts * .3, py - ts * .2, ts * 1.6, ts * 1.6);
    ctx.strokeStyle = "#7affea"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, ts * .26, ts * .38 + Math.sin(t / 260) * 1.5, 0, 0, 7); ctx.stroke();
  }

  function drawTrapRoom(ctx, px, py, ts, t) {
    const cx = px + ts / 2, cy = py + ts / 2;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, ts * .6);
    g.addColorStop(0, "rgba(190,90,255,.5)"); g.addColorStop(1, "rgba(150,50,255,0)");
    ctx.fillStyle = g; ctx.fillRect(px - ts * .3, py - ts * .3, ts * 1.6, ts * 1.6);
    ctx.strokeStyle = "#c470ff"; ctx.lineWidth = 1.5;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t / 1400);
    ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, ts * .36, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; i ? ctx.lineTo(Math.cos(a) * ts * .24, Math.sin(a) * ts * .24) : ctx.moveTo(Math.cos(a) * ts * .24, Math.sin(a) * ts * .24); }
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  function drawTorch(ctx, cx, cy, ts, t, seed) {         // 벽에 걸린 횃불
    ctx.fillStyle = "#3a2a1a"; ctx.fillRect(cx - ts * .04, cy - ts * .02, ts * .08, ts * .22);
    ctx.fillStyle = "#6a4a2a"; ctx.fillRect(cx - ts * .09, cy - ts * .04, ts * .18, ts * .06);
    const f = 1 + .18 * Math.sin(t / 90 + seed) + .1 * Math.sin(t / 53 + seed * 2);
    const fh = ts * .26 * f;
    const g = ctx.createLinearGradient(0, cy - fh, 0, cy);
    g.addColorStop(0, "rgba(255,240,170,.95)"); g.addColorStop(.5, "rgba(255,150,40,.95)"); g.addColorStop(1, "rgba(220,60,10,.9)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - ts * .08, cy - ts * .03);
    ctx.quadraticCurveTo(cx - ts * .09, cy - fh * .6, cx, cy - fh);
    ctx.quadraticCurveTo(cx + ts * .09, cy - fh * .6, cx + ts * .08, cy - ts * .03); ctx.closePath(); ctx.fill();
  }

  // ── 조명 ────────────────────────────────────────
  let darkLayer = null, sceneLayer = null;
  function applyLighting(ctx, sc, cw, ch, lights) {
    if (!darkLayer || darkLayer.width !== cw || darkLayer.height !== ch) darkLayer = mk(cw, ch);
    const d = darkLayer.getContext("2d");
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, cw, ch);
    d.fillStyle = "rgba(4,2,10,.7)"; d.fillRect(0, 0, cw, ch);   // 탐색했지만 빛이 닿지 않는 곳은 어둡게 남김
    d.globalCompositeOperation = "destination-out";
    for (const L of lights) {
      const g = d.createRadialGradient(L.x, L.y, L.r * .12, L.x, L.y, L.r);
      g.addColorStop(0, `rgba(0,0,0,${L.p})`); g.addColorStop(.55, `rgba(0,0,0,${L.p * .6})`); g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g; d.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    d.globalCompositeOperation = "source-over";
    sc.globalCompositeOperation = "source-atop";
    sc.drawImage(darkLayer, 0, 0);
    sc.globalCompositeOperation = "source-over";
    ctx.drawImage(sc.canvas, 0, 0);
    // 빛의 색감(따뜻한 광원)을 더해 준다
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const L of lights) {
      if (!L.tint) continue;
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * .8);
      g.addColorStop(0, `rgba(${L.tint},${L.glow})`); g.addColorStop(1, `rgba(${L.tint},0)`);
      ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    ctx.restore();
  }

  function vignette(ctx, cw, ch) {
    const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .35, cw / 2, ch / 2, Math.max(cw, ch) * .72);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  }

  // ── 메인 렌더 ────────────────────────────────────
  function render(scene, t) {
    const mainCtx = scene.ctx, { map, objects, width, height } = scene.mapData;
    const ts = scene.tileSize, cw = scene.canvas.width, ch = scene.canvas.height;
    const type = scene.dungeonType, th = themeOf(type), spr = sprites(type, ts);
    const camX = scene.cameraX, camY = scene.cameraY;
    mainCtx.imageSmoothingEnabled = true;
    drawBackdrop(mainCtx, th, cw, ch, camX, camY);          // 배경 아트는 조명과 무관하게 항상 보이게 따로 그린다

    // 타일·오브젝트는 투명한 중간 레이어에 그려 두고, 조명(어둠)은 이 레이어에만 적용한다
    if (!sceneLayer || sceneLayer.width !== cw || sceneLayer.height !== ch) sceneLayer = mk(cw, ch);
    const ctx = sceneLayer.getContext("2d");
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;

    const sx = Math.max(0, Math.floor(camX / ts) - 1), sy = Math.max(0, Math.floor(camY / ts) - 1);
    const ex = Math.min(width - 1, sx + Math.ceil(cw / ts) + 2), ey = Math.min(height - 1, sy + Math.ceil(ch / ts) + 2);
    const isWall = (x, y) => x < 0 || y < 0 || x >= width || y >= height || map[y][x] === 0;

    const torches = [], crystals = [], objs = [];
    for (let ty = sy; ty <= ey; ty++) {
      for (let tx = sx; tx <= ex; tx++) {
        if (!scene.revealed.has(`${tx},${ty}`)) continue;
        const px = tx * ts - camX, py = ty * ts - camY, h = hash(tx, ty, scene.floor || 1);
        if (map[ty][tx] === 0) {
          const open = !isWall(tx, ty + 1);
          ctx.drawImage(open ? spr.face[h % 3] : spr.rock[h % 3], px, py, ts, ts);
          if (open && h % 9 === 0) torches.push({ x: px + ts / 2, y: py + ts * .62, seed: (h % 100) / 10 });
          continue;
        }
        ctx.drawImage(spr.floor[h % 4], px, py, ts, ts);
        if (isWall(tx, ty - 1)) ctx.drawImage(spr.aoTop, px, py, ts, ts);
        if (isWall(tx - 1, ty)) ctx.drawImage(spr.aoLeft, px, py, ts, ts);
        if (isWall(tx + 1, ty)) ctx.drawImage(spr.aoRight, px, py, ts, ts);
        const key = `${tx},${ty}`, obj = objects.get(key);
        if (obj) { if (obj.type !== 7) objs.push({ tx, ty, px, py, obj, h }); }
        else if (h % 11 === 3) {                                         // 바닥 장식
          ctx.drawImage(spr.deco[(h >>> 4) % 3], px, py, ts, ts);
          if (th.deco === "crystal") crystals.push({ x: px + ts / 2, y: py + ts * .55 });
        }
      }
    }

    objs.sort((a, b) => a.py - b.py);                                    // 아래쪽 오브젝트가 위에 그려지게
    for (const o of objs) {
      const T = o.obj.type, seed = o.h % 628 / 100;
      if (T === 2) drawMonster(ctx, o.px, o.py, ts, o.obj.monsterId, false, t, seed);
      else if (T === 3) drawMonster(ctx, o.px, o.py, ts, BOSS_MONSTER[type] || "guardian", true, t, seed);
      else if (T === 4) drawChest(ctx, o.px, o.py, ts, t, seed);
      else if (T === 6) drawStairs(ctx, o.px, o.py, ts, t);
      else if (T === 5) drawExit(ctx, o.px, o.py, ts, t);
      else if (T === 8) drawTrapRoom(ctx, o.px, o.py, ts, t);
    }
    for (const q of torches) drawTorch(ctx, q.x, q.y, ts, t, q.seed);

    // 조명: 플레이어 > 횃불 > 수정
    const ppx = scene.playerX * ts - camX + ts / 2, ppy = scene.playerY * ts - camY + ts / 2;
    const lights = [{ x: ppx, y: ppy, r: ts * 6.4, p: 1, tint: th.glow, glow: .13 }];
    for (const q of torches) {
      const fl = 1 + .08 * Math.sin(t / 110 + q.seed);
      lights.push({ x: q.x, y: q.y, r: ts * 3.4 * fl, p: .95, tint: "255,150,60", glow: .2 });
    }
    for (const c of crystals) lights.push({ x: c.x, y: c.y, r: ts * 1.9, p: .7, tint: null });
    for (const o of objs) {                                              // 보물·계단·함정의 방은 멀리서도 눈에 띄게
      const T = o.obj.type;
      if (T === 4 || T === 6 || T === 8 || T === 5) lights.push({ x: o.px + ts / 2, y: o.py + ts / 2, r: ts * 1.6, p: .8, tint: null });
    }
    applyLighting(mainCtx, ctx, cw, ch, lights);
    vignette(mainCtx, cw, ch);
  }

  // 파티 이름표 (참고 화면의 캐릭터 아래 이름 띠)
  function drawNameTag(ctx, cx, y, text, color, ts) {
    ctx.font = `bold ${Math.floor(ts * .3)}px sans-serif`;
    const w = ctx.measureText(text).width + 12, h = ts * .42, x = cx - w / 2;
    ctx.fillStyle = "rgba(8,6,14,.72)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, cx, y + h / 2 + .5);
  }

  const backdropFor = (type) => themeOf(type).backdrop;
  return { render, drawNameTag, backdropFor, themeOf };
})();

window.DungeonVisuals = DungeonVisuals;
