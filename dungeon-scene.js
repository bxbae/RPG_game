// ═══════════════════════════════════════════════════
//  dungeon-scene.js  — 탑다운 맵 탐험
// ═══════════════════════════════════════════════════
"use strict";

// ── 맵 생성 유틸 ──────────────────────────────────
const TILE = {
  WALL:   0,
  FLOOR:  1,
  ENEMY:  2,
  BOSS:   3,
  CHEST:  4,
  EXIT:   5,
  STAIRS: 6,
  START:  7,
};

const TILE_COLORS = {
  [TILE.WALL]:  { bg:"#1a0e14", border:"#0a0608" },
  [TILE.FLOOR]: { bg:"#1e161a", border:"#2a1a20" },
  [TILE.ENEMY]: { bg:"#2a0e0e", border:"#4a1a1a" },
  [TILE.BOSS]:  { bg:"#2a0808", border:"#6a1010" },
  [TILE.CHEST]: { bg:"#1a1a0e", border:"#3a3a18" },
  [TILE.EXIT]:  { bg:"#0e1a1a", border:"#1a3a3a" },
  [TILE.STAIRS]:{ bg:"#0e0e2a", border:"#2a2a8a" }, // 계단: 파란빛
  [TILE.START]: { bg:"#1a1e0e", border:"#2a3018" },
};

const TILE_ICONS = {
  [TILE.ENEMY]:  "👺",
  [TILE.BOSS]:   "👹",
  [TILE.CHEST]:  "📦",
  [TILE.EXIT]:   "🚪",
  [TILE.STAIRS]: "⬇",  // 다음 층으로 내려가는 계단
  [TILE.START]:  "⬤",
};

// 던전 유형·층별 적 풀
const FLOOR_ENEMY_POOLS = {
  outside: {                                               // 성 밖 사냥터 (튜토리얼, 1층)
    1: ["bat", "slime"],
  },
  forest: {                                               // 숲 던전 (동료 1명)
    1: ["goblin", "wolf"],
    2: ["goblin", "lizardman", "orc"],
    3: ["lizardman", "orc", "orc2"],
  },
  normal: {                                               // 일반 던전 (동료 2명)
    1: ["slime", "ice_slime", "skeleton"],
    2: ["skeleton", "orc2", "mage_golem"],
    3: ["dark_knight", "vampire", "mage_golem"],
  },
  abyss: {                                                // 심연 던전 (동료 3명)
    1: ["dark_knight", "vampire", "wyvern", "chimera"],
    2: ["wyvern", "chimera", "lich", "demon_knight"],
    3: ["lich", "demon_knight", "dragon"],
  },
};

// 층별 난이도 배수
const FLOOR_DIFFICULTY = {
  outside: [0.5,  0.5,  0.5 ],   // 매우 쉬움 (튜토리얼)
  forest:  [0.8,  1.0,  1.2 ],   // 쉬움
  normal:  [1.0,  1.35, 1.7 ],   // 일반
  abyss:   [2.0,  2.6,  3.2 ],   // 심연
};

// 던전 타입별 표시명
const DUNGEON_LABELS = {
  outside: "성 밖 사냥터",
  forest:  "숲 던전",
  normal:  "일반 던전",
  abyss:   "심연 던전",
};

// 던전 맵 생성 (BSP-like)
// floor: 현재 층 (1-based), isLastFloor: true면 보스 배치, dungeonType: 풀 선택
function generateDungeonMap(width = 25, height = 18, floor = 1, isLastFloor = false, dungeonType = "normal") {
  const map = Array.from({ length: height }, () => Array(width).fill(TILE.WALL));
  const rooms = [];

  const tryRoom = (x, y, w, h) => {
    if (x < 1 || y < 1 || x+w >= width-1 || y+h >= height-1) return false;
    for (const r of rooms) {
      if (x < r.x+r.w+1 && x+w+1 > r.x && y < r.y+r.h+1 && y+h+1 > r.y) return false;
    }
    rooms.push({ x, y, w, h });
    for (let ry = y; ry < y+h; ry++)
      for (let rx = x; rx < x+w; rx++)
        map[ry][rx] = TILE.FLOOR;
    return true;
  };

  // 방 생성 (최대 8개)
  for (let i = 0; i < 60; i++) {
    const rw = 3 + Math.floor(Math.random() * 4);
    const rh = 3 + Math.floor(Math.random() * 4);
    const rx = 1 + Math.floor(Math.random() * (width  - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (height - rh - 2));
    tryRoom(rx, ry, rw, rh);
    if (rooms.length >= 8) break;
  }

  // 방을 복도로 연결
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i-1], b = rooms[i];
    const ax = Math.floor(a.x + a.w/2), ay = Math.floor(a.y + a.h/2);
    const bx = Math.floor(b.x + b.w/2), by = Math.floor(b.y + b.h/2);
    for (let x = Math.min(ax,bx); x <= Math.max(ax,bx); x++) map[ay][x] = TILE.FLOOR;
    for (let y = Math.min(ay,by); y <= Math.max(ay,by); y++) map[y][bx] = TILE.FLOOR;
  }

  const objects = new Map();
  const floorTiles = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (map[y][x] === TILE.FLOOR) floorTiles.push({ x, y });

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const place = (type, data = {}) => {
    const available = floorTiles.filter(t => !objects.has(`${t.x},${t.y}`));
    if (!available.length) return null;
    const t = rand(available);
    objects.set(`${t.x},${t.y}`, { type, ...data });
    return t;
  };

  // 방 생성이 실패한 극단적 경우 비상 폴백 (25×18 맵에서 사실상 불가능하지만 방어 코드)
  if (!rooms.length) tryRoom(2, 2, 5, 5);

  // 시작 위치 (첫 번째 방 중앙)
  const startRoom = rooms[0];
  const startX = Math.floor(startRoom.x + startRoom.w/2);
  const startY = Math.floor(startRoom.y + startRoom.h/2);
  objects.set(`${startX},${startY}`, { type: TILE.START });

  // 마지막 방 → 최종 층이면 보스(outside 제외), 아니면 다음 층 계단
  if (rooms.length >= 2) {
    const lastRoom = rooms[rooms.length - 1];
    const lx = Math.floor(lastRoom.x + lastRoom.w/2);
    const ly = Math.floor(lastRoom.y + lastRoom.h/2);
    if (isLastFloor && dungeonType !== "outside") {
      objects.set(`${lx},${ly}`, { type: TILE.BOSS });
    } else if (!isLastFloor) {
      objects.set(`${lx},${ly}`, { type: TILE.STAIRS });
    } else {
      // outside 단층 마지막방: 보물상자
      objects.set(`${lx},${ly}`, { type: TILE.CHEST });
    }
  }

  // 던전 유형·층에 맞는 적 풀 선택
  const pools     = FLOOR_ENEMY_POOLS[dungeonType] ?? FLOOR_ENEMY_POOLS.normal;
  const poolFloor = Math.min(floor, Object.keys(pools).length);
  const enemyPool = pools[poolFloor] ?? pools[1];
  const enemyCount = 3 + floor + Math.floor(Math.random() * 3); // 1층:4~6, 2층:5~7, 3층:6~8
  for (let i = 0; i < enemyCount; i++) {
    place(TILE.ENEMY, { monsterId: rand(enemyPool) });
  }

  // 보물상자 (층이 깊을수록 더 많이)
  const chestCount = 2 + Math.floor(floor / 2) + Math.floor(Math.random() * 2);
  for (let i = 0; i < chestCount; i++) place(TILE.CHEST);

  // 출구 — 언제든지 마을로 탈출 (모든 층에 존재)
  place(TILE.EXIT);

  return { map, rooms, objects, startX, startY, width, height };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DungeonScene 클래스
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 걷기 애니메이션 프레임 (PNG 3장 순환) ─────────────────────────
const WALK_FRAMES = {
  knight:   ["images/sd_knight_walk_1.png",   "images/sd_knight_walk_2.png",   "images/sd_knight_walk_3.png"],
  night:    ["images/sd_knight_walk_1.png",   "images/sd_knight_walk_2.png",   "images/sd_knight_walk_3.png"],
  warrior:  ["images/sd_tanker_walk_1.png",   "images/sd_tanker_walk_2.png",   "images/sd_tanker_walk_3.png"],
  mage:     ["images/sd_magician_walk_1.png", "images/sd_magician_walk_2.png", "images/sd_magician_walk_3.png"],
  magician: ["images/sd_magician_walk_1.png", "images/sd_magician_walk_2.png", "images/sd_magician_walk_3.png"],
  archer:   ["images/sd_archer_walk_1.png",   "images/sd_archer_walk_2.png",   "images/sd_archer_walk_3.png"],
  tanker:   ["images/sd_tanker_walk_1.png",   "images/sd_tanker_walk_2.png",   "images/sd_tanker_walk_3.png"],
  healer:   ["images/sd_healer_walk_1.png",   "images/sd_healer_walk_2.png",   "images/sd_healer_walk_3.png"],
};
const COMP_WALK_FRAMES = {
  healer:     ["images/sd_healer_walk_1.png",   "images/sd_healer_walk_2.png",   "images/sd_healer_walk_3.png"],
  tanker:     ["images/sd_tanker_walk_1.png",   "images/sd_tanker_walk_2.png",   "images/sd_tanker_walk_3.png"],
  mage_party: ["images/sd_magician_walk_1.png", "images/sd_magician_walk_2.png", "images/sd_magician_walk_3.png"],
  archer:     ["images/sd_archer_walk_1.png",   "images/sd_archer_walk_2.png",   "images/sd_archer_walk_3.png"],
  dealer:     ["images/sd_knight_walk_1.png",   "images/sd_knight_walk_2.png",   "images/sd_knight_walk_3.png"],
};

class DungeonScene {
  constructor(game) {
    this.game        = game;
    this._walkFrame  = 0;   // 현재 걷기 프레임 인덱스
    this._walkTimer  = null; // 걷기 애니메이션 타이머
    this._compWalkFrame = 0;
    this.canvas      = null;
    this.ctx         = null;
    this.mapData     = null;
    this.tileSize    = 36;
    this.playerX     = 0;
    this.playerY     = 0;
    this.cameraX     = 0;
    this.cameraY     = 0;
    this.keys        = {};
    this.moving      = false;
    this.moveQueue   = [];
    this._raf        = null;
    this._stepTimer  = null;
    this.revealed    = new Set();
    this.questKillCount = 0;
    // 층 정보 — 실제 값은 init()에서 dungeonType에 따라 설정
    this.floor       = 1;
    this.maxFloors   = 3; // 기본값; init()이 dungeonType별로 재설정
  }

  // ── 초기화 ──────────────────────────────────────
  init(canvas, dungeonType = "normal", startFloor = 1) {
    this.canvas      = canvas;
    this.ctx         = canvas.getContext("2d");
    this.dungeonType = dungeonType;
    this.floor       = startFloor;
    this.maxFloors   = dungeonType === "outside" ? 1 : 3; // 성 밖은 단층

    const isLast = this.floor >= this.maxFloors;
    this.mapData = generateDungeonMap(25, 18, this.floor, isLast, this.dungeonType);
    this.playerX = this.mapData.startX;
    this.playerY = this.mapData.startY;

    this.revealed.clear();
    this._revealAround(this.playerX, this.playerY, 4);
    this._centerCamera();

    this._bindKeys();
    this._startLoop();
    this._renderMinimap();
    this._startWalkAnim(); // 걷기 애니메이션 시작
  }

  // ── 걷기 애니메이션 타이머 ────────────────────────
  _startWalkAnim() {
    clearInterval(this._walkTimer);
    this._walkFrame     = 0;
    this._compWalkFrame = 0;
    this._walkTimer = setInterval(() => {
      // 던전 화면이 숨겨져 있으면 (전투 중) 업데이트 중단
      const dungeonScreen = document.getElementById("dungeonScreen");
      if (dungeonScreen && dungeonScreen.style.display === "none") return;

      this._walkFrame++;
      this._compWalkFrame++;
      const p     = this.game.player;
      const type  = p?.type || "knight";
      const party = p?.party;

      // 플레이어 스프라이트 프레임 교체
      const spr    = document.getElementById("dungeonPlayerSprite");
      const frames = WALK_FRAMES[type];
      if (spr && frames) {
        spr.src       = frames[this._walkFrame % frames.length];
        spr.onerror   = null;
      }

      // 동료 스프라이트 프레임 교체
      const cspr    = document.getElementById("dungeonCompSprite");
      const cframes = party ? COMP_WALK_FRAMES[party] : null;
      if (cspr && cframes) {
        cspr.src     = cframes[this._compWalkFrame % cframes.length];
        cspr.onerror = null;
      }
    }, 160); // 약 6FPS
  }

  destroy() {
    clearInterval(this._walkTimer);
    this._walkTimer = null;
    this._unbindKeys();
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._stepTimer) { clearTimeout(this._stepTimer); this._stepTimer = null; }
    // 스프라이트 제거
    document.getElementById("dungeonPlayerSprite")?.remove();
    document.getElementById("dungeonCompSprite")?.remove();
  }

  // ── 키 입력 ─────────────────────────────────────
  _bindKeys() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      // 방향키 눌리면 즉시 이동 시도
      const dirs = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
                     KeyW:[0,-1],    KeyS:[0,1],       KeyA:[-1,0],      KeyD:[1,0] };
      const d = dirs[e.code];
      if (d) { e.preventDefault(); this._tryMove(d[0], d[1]); }
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup",   this._onKeyUp);
  }
  _unbindKeys() {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp)   window.removeEventListener("keyup",   this._onKeyUp);
  }

  // ── 이동 처리 ────────────────────────────────────
  _tryMove(dx, dy) {
    if (this.moving) return;
    const nx = this.playerX + dx;
    const ny = this.playerY + dy;
    const { map, width, height, objects } = this.mapData;

    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
    if (map[ny][nx] === TILE.WALL) {
      this._wallBump();
      return;
    }

    this.moving = true;
    this.playerX = nx;
    this.playerY = ny;
    this._revealAround(nx, ny, 4);

    // 충돌 오브젝트 체크
    const obj = this.mapData.objects.get(`${nx},${ny}`);
    if (obj) this._handleObjectCollision(nx, ny, obj);

    // 이동 애니메이션 후 완료
    this._animMove(() => {
      this.moving = false;
      this._centerCamera();
      this._renderMinimap();
    });
  }

  _animMove(onDone) {
    // 간단히 타이머로 처리 (60fps loop에서 보간)
    this._stepTimer = setTimeout(() => {
      if (onDone) onDone();
    }, 120);
  }

  _wallBump() {
    // 시각적 효과: 캔버스 흔들기
    this.canvas?.parentElement?.classList?.add("bump");
    setTimeout(() => this.canvas?.parentElement?.classList?.remove("bump"), 150);
  }

  _handleObjectCollision(x, y, obj) {
    switch (obj.type) {
      case TILE.ENEMY:
        this.mapData.objects.delete(`${x},${y}`);
        setTimeout(() => this.game.startBattle(obj.monsterId || "slime", false), 100);
        break;
      case TILE.BOSS: {
        this.mapData.objects.delete(`${x},${y}`);
        // 던전 타입별 보스 몬스터 결정
        const BOSS_MAP = { forest:"orc2", normal:"guardian", abyss:"demon" };
        const bossId = BOSS_MAP[this.dungeonType] ?? "guardian";
        setTimeout(() => this.game.startBattle(bossId, true), 100);
        break;
      }
      case TILE.CHEST:
        this.mapData.objects.delete(`${x},${y}`);
        this._openChest(x, y);
        break;
      case TILE.STAIRS:
        // 다음 층으로 이동
        this.mapData.objects.delete(`${x},${y}`);
        setTimeout(() => this._nextFloor(), 200);
        break;
      case TILE.EXIT:
        // 마을로 탈출
        this.mapData.objects.delete(`${x},${y}`);
        setTimeout(() => this.game.returnToTown("exit"), 200);
        break;
    }
  }

  // ── 다음 층으로 ─────────────────────────────────
  _nextFloor() {
    this.floor++;
    const isLast = this.floor >= this.maxFloors;
    const floorName = this.floor + "층";

    this.game.log(`⬇ ${floorName}으로 내려간다...`);
    if (window.audioMgr) audioMgr.playSfx("levelup");

    // 새 맵 생성 (던전 유형 유지)
    this.mapData = generateDungeonMap(25, 18, this.floor, isLast, this.dungeonType);
    this.playerX = this.mapData.startX;
    this.playerY = this.mapData.startY;

    this.revealed.clear();
    this._revealAround(this.playerX, this.playerY, 4);
    this._centerCamera();
    this._renderMinimap();

    // HUD 갱신
    this.game.dungeonHud?.render();
    this.game.dungeonHud?.flashMsg(
      isLast ? `👹 ${floorName} — 보스룸!` : `⬇ ${floorName} 도달!`,
      isLast ? "#ff6666" : "#88ddff"
    );

    // ── 마왕 존재감: 심연 던전 층별 분위기 메시지 ──
    if (this.dungeonType === "abyss") {
      const ABYSS_FLOOR_MSG = {
        2: { text: "마왕의 마력이 점점 짙어진다. 몬스터들이 더 흉포해졌다...", color: "#dd6644", delay: 1200 },
        3: { text: "...바로 앞에서 압도적인 기운이 느껴진다. 마왕이 가까이 있다.", color: "#ff3333", delay: 1200 },
      };
      const msg = ABYSS_FLOOR_MSG[this.floor];
      if (msg) setTimeout(() => this.game.dungeonHud?.flashMsg(msg.text, msg.color), msg.delay);
    }
  }

  _openChest(x, y) {
    const roll = Math.random();
    const p    = this.game.player;
    // 층이 깊을수록 더 많은 골드, 더 좋은 아이템
    const floorBonus = (this.floor - 1) * 60;
    if (roll < 0.5) {
      const gold = 100 + floorBonus + Math.floor(Math.random() * 200);
      p.money += gold;
      this.game.log(`📦 보물 상자! +${gold}G`);
      this.game.dungeonHud?.flashMsg(`💰 +${gold}G`, "#ffd700");
    } else {
      // 3층 상자는 희귀 아이템 확률 높음
      const isBossChest = this.floor >= 3 || Math.random() < 0.25;
      const item = createRandomItem(isBossChest);
      this.game.itemManager.add(this.game, item);
      this.game.log(`📦 아이템 발견: ${item.name}`);
      this.game.dungeonHud?.flashMsg(`🎁 ${item.name}`, "#88ddff");
    }
  }

  // ── 카메라 ──────────────────────────────────────
  _centerCamera() {
    if (!this.canvas) return;
    const ts = this.tileSize;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    this.cameraX = Math.round(this.playerX * ts - cw / 2 + ts / 2);
    this.cameraY = Math.round(this.playerY * ts - ch / 2 + ts / 2);
    // 맵 경계 클램프
    const mapW = this.mapData.width  * ts;
    const mapH = this.mapData.height * ts;
    this.cameraX = Math.max(0, Math.min(this.cameraX, mapW - cw));
    this.cameraY = Math.max(0, Math.min(this.cameraY, mapH - ch));
  }

  // ── FOG ─────────────────────────────────────────
  _revealAround(cx, cy, r) {
    const { width, height, map } = this.mapData;
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
        if (dist <= r) this.revealed.add(`${x},${y}`);
      }
  }

  // ── 렌더 루프 ────────────────────────────────────
  _startLoop() {
    const loop = () => {
      this._render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

 _render() {
  const ctx = this.ctx;
  if (!ctx || !this.canvas) return;
  const { map, objects, width, height } = this.mapData;
  const ts = this.tileSize;
  const cw = this.canvas.width;
  const ch = this.canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#060304";
  ctx.fillRect(0, 0, cw, ch);

  // 보이는 타일 범위 계산
  const startTX = Math.max(0, Math.floor(this.cameraX / ts) - 1);
  const startTY = Math.max(0, Math.floor(this.cameraY / ts) - 1);
  const endTX   = Math.min(width  - 1, startTX + Math.ceil(cw / ts) + 2);
  const endTY   = Math.min(height - 1, startTY + Math.ceil(ch / ts) + 2);

  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      const key      = `${tx},${ty}`;
      const isRevealed = this.revealed.has(key);
      if (!isRevealed) continue;

      const px = tx * ts - this.cameraX;
      const py = ty * ts - this.cameraY;
      const tileType  = map[ty][tx];
      const colors    = TILE_COLORS[tileType] || TILE_COLORS[TILE.WALL];
      const isVisible = Math.abs(tx - this.playerX) <= 4
                     && Math.abs(ty - this.playerY) <= 4;

      // ── 타일 배경 ──
      ctx.globalAlpha = isVisible ? 1.0 : 0.45;
      ctx.fillStyle   = colors.bg;
      ctx.fillRect(px, py, ts, ts);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

      // 바닥 텍스처
      if (tileType === TILE.FLOOR) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
      }
      ctx.globalAlpha = 1;

      // ── 오브젝트 아이콘 ──
      const obj = objects.get(key);
      if (obj && obj.type !== TILE.START) {
        const icon = TILE_ICONS[obj.type] || "";
        if (icon) {
          // 시야 내: 선명, 시야 밖 탐색됨: 반투명
          ctx.globalAlpha = isVisible ? 1.0 : 0.55;

          // 발광 효과
          if (obj.type === TILE.BOSS) {
            ctx.shadowColor = "#ff3300";
            ctx.shadowBlur  = 20;
          } else if (obj.type === TILE.ENEMY) {
            ctx.shadowColor = "#ff6600";
            ctx.shadowBlur  = 14;
          } else if (obj.type === TILE.CHEST) {
            ctx.shadowColor = "#ffcc00";
            ctx.shadowBlur  = 12;
          } else if (obj.type === TILE.EXIT) {
            ctx.shadowColor = "#00ffcc";
            ctx.shadowBlur  = 12;
          } else if (obj.type === TILE.STAIRS) {
            ctx.shadowColor = "#4488ff"; // 파란 발광으로 계단 강조
            ctx.shadowBlur  = 14;
          } else {
            ctx.shadowBlur = 0;
          }

          // 아이콘 크기 크게
          ctx.font         = `${Math.floor(ts * 0.75)}px serif`;
          ctx.textAlign    = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(icon, px + ts / 2, py + ts / 2);
          ctx.shadowBlur = 0;

          // 시야 내에서만 라벨 표시
          if (isVisible && (obj.type === TILE.ENEMY || obj.type === TILE.BOSS)) {
            ctx.globalAlpha = 1;
            ctx.font      = `bold ${Math.floor(ts * 0.25)}px sans-serif`;
            ctx.fillStyle = obj.type === TILE.BOSS ? "#ff4400" : "#ffaa88";
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(
              obj.type === TILE.BOSS ? "BOSS" : "적",
              px + ts / 2,
              py + ts - 2
            );
          }

          ctx.globalAlpha  = 1;
          ctx.fillStyle    = "#ffffff";
          ctx.textBaseline = "middle";
        }
      }
    }
  }

  // ── 플레이어 렌더 (PNG 프레임 순환 스프라이트 오버레이) ──
  const ppx = this.playerX * ts - this.cameraX + ts / 2;
  const ppy = this.playerY * ts - this.cameraY + ts / 2;

  const p    = this.game.player;
  const type = p?.type || "knight";

  // 캔버스 부모 relative 설정
  const canvasParent = this.canvas.parentElement;
  if (canvasParent && canvasParent.style.position !== "relative") {
    canvasParent.style.position = "relative";
  }

  // 플레이어 스프라이트 img 생성/재사용
  let spr = document.getElementById("dungeonPlayerSprite");
  if (!spr) {
    spr = document.createElement("img");
    spr.id = "dungeonPlayerSprite";
    spr.style.cssText = [
      "position:absolute",
      "pointer-events:none",
      "z-index:15",
      "transform:translate(-50%,-62%)",
      "image-rendering:auto",
      "transition:left .1s linear,top .1s linear",
    ].join(";");
    // 초기 이미지 설정 (타이머가 프레임을 교체)
    const frames = WALK_FRAMES[type];
    if (frames) spr.src = frames[0];
    canvasParent?.appendChild(spr);
  }

  // 캔버스 좌표 → CSS 픽셀 변환
  const scaleX = (this.canvas.offsetWidth  || this.canvas.width)  / this.canvas.width;
  const scaleY = (this.canvas.offsetHeight || this.canvas.height) / this.canvas.height;
  const sprSize = ts * 2.4 * scaleX;
  spr.style.width  = `${sprSize}px`;
  spr.style.height = `${sprSize}px`;
  spr.style.left   = `${this.canvas.offsetLeft + ppx * scaleX}px`;
  spr.style.top    = `${this.canvas.offsetTop  + ppy * scaleY}px`;

  // 동료 스프라이트
  let cspr = document.getElementById("dungeonCompSprite");
  if (p?.party && COMP_WALK_FRAMES[p.party]) {
    if (!cspr) {
      cspr = document.createElement("img");
      cspr.id = "dungeonCompSprite";
      cspr.style.cssText = [
        "position:absolute",
        "pointer-events:none",
        "z-index:14",
        "transform:translate(-50%,-62%)",
        "image-rendering:auto",
        "opacity:0.88",
        "transition:left .1s linear,top .1s linear",
      ].join(";");
      const cf = COMP_WALK_FRAMES[p.party];
      if (cf) cspr.src = cf[0];
      canvasParent?.appendChild(cspr);
    }
    const cSize = sprSize;              // 플레이어와 동일 크기
    cspr.style.width   = `${cSize}px`;
    cspr.style.height  = `${cSize}px`;
    cspr.style.left    = `${this.canvas.offsetLeft + (ppx + ts * 1.5) * scaleX}px`; // 옆으로, 간격 넓힘
    cspr.style.top     = `${this.canvas.offsetTop  + ppy * scaleY}px`;             // 세로 위치는 플레이어와 동일 (일렬)
    cspr.style.display = "block";
  } else if (cspr) {
    cspr.style.display = "none";
  }
}




  // ── 미니맵 ──────────────────────────────────────
  _renderMinimap() {
    const minimapEl = document.getElementById("dungeonMinimap");
    if (!minimapEl) return;
    const mCtx = minimapEl.getContext("2d");
    const { map, objects, width, height } = this.mapData;
    const mts = 6; // 미니맵 타일 크기
    minimapEl.width  = width  * mts;
    minimapEl.height = height * mts;

    mCtx.fillStyle = "#060304";
    mCtx.fillRect(0, 0, minimapEl.width, minimapEl.height);

    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        if (!this.revealed.has(`${tx},${ty}`)) continue;
        const t = map[ty][tx];
        const obj = objects.get(`${tx},${ty}`);
        let color = t === TILE.WALL ? "#0e090c" : "#2a1e22";
        if (obj) {
          if      (obj.type === TILE.ENEMY)  color = "#8a2020";
          else if (obj.type === TILE.BOSS)   color = "#cc3300";
          else if (obj.type === TILE.CHEST)  color = "#6a6a20";
          else if (obj.type === TILE.EXIT)   color = "#1a5050";
          else if (obj.type === TILE.STAIRS) color = "#1a2a6a"; // 파란색으로 계단 표시
        }
        mCtx.fillStyle = color;
        mCtx.fillRect(tx * mts, ty * mts, mts, mts);
      }
    }

    // 플레이어 위치
    mCtx.fillStyle = "#FFD700";
    mCtx.fillRect(this.playerX * mts, this.playerY * mts, mts, mts);
  }

  // 터치/클릭 이동 버튼 지원 (모바일)
  onDpadPress(dir) {
    const map = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
    const d = map[dir];
    if (d) this._tryMove(d[0], d[1]);
  }
}

window.DungeonScene       = DungeonScene;
window.generateDungeonMap = generateDungeonMap;
window.TILE               = TILE;
window.FLOOR_DIFFICULTY   = FLOOR_DIFFICULTY;
window.FLOOR_ENEMY_POOLS  = FLOOR_ENEMY_POOLS;
window.DUNGEON_LABELS     = DUNGEON_LABELS;
