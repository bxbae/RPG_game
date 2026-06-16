// ═══════════════════════════════════════════════════
//  dungeon-scene.js  — 탑다운 맵 탐험
// ═══════════════════════════════════════════════════
"use strict";

const TILE = {
  WALL: 0,
  FLOOR: 1,
  ENEMY: 2,
  BOSS: 3,
  CHEST: 4,
  EXIT: 5,
  STAIRS: 6,
  START: 7,
};

const TILE_COLORS = {
  [TILE.WALL]: { bg: "#1a0e14", border: "#0a0608" },
  [TILE.FLOOR]: { bg: "#1e161a", border: "#2a1a20" },
  [TILE.ENEMY]: { bg: "#2a0e0e", border: "#4a1a1a" },
  [TILE.BOSS]: { bg: "#2a0808", border: "#6a1010" },
  [TILE.CHEST]: { bg: "#1a1a0e", border: "#3a3a18" },
  [TILE.EXIT]: { bg: "#0e1a1a", border: "#1a3a3a" },
  [TILE.STAIRS]: { bg: "#0e0e2a", border: "#1a1a5a" },
  [TILE.START]: { bg: "#1a1e0e", border: "#2a3018" },
};

const TILE_ICONS = {
  [TILE.ENEMY]: "👺",
  [TILE.BOSS]: "👹",
  [TILE.CHEST]: "📦",
  [TILE.EXIT]: "🚪",
  [TILE.STAIRS]: "🪜",
  [TILE.START]: "⬤",
};

function generateDungeonMap(width = 25, height = 18) {
  const map = Array.from({ length: height }, () =>
    Array(width).fill(TILE.WALL),
  );
  const rooms = [];

  const tryRoom = (x, y, w, h) => {
    if (x < 1 || y < 1 || x + w >= width - 1 || y + h >= height - 1)
      return false;
    for (const r of rooms) {
      if (
        x < r.x + r.w + 1 &&
        x + w + 1 > r.x &&
        y < r.y + r.h + 1 &&
        y + h + 1 > r.y
      )
        return false;
    }
    rooms.push({ x, y, w, h });
    for (let ry = y; ry < y + h; ry++)
      for (let rx = x; rx < x + w; rx++) map[ry][rx] = TILE.FLOOR;
    return true;
  };

  for (let i = 0; i < 60; i++) {
    const rw = 3 + Math.floor(Math.random() * 4);
    const rh = 3 + Math.floor(Math.random() * 4);
    const rx = 1 + Math.floor(Math.random() * (width - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (height - rh - 2));
    tryRoom(rx, ry, rw, rh);
    if (rooms.length >= 8) break;
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2),
      ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2),
      by = Math.floor(b.y + b.h / 2);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
      map[ay][x] = TILE.FLOOR;
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++)
      map[y][bx] = TILE.FLOOR;
  }

  const objects = new Map();
  const floorTiles = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (map[y][x] === TILE.FLOOR) floorTiles.push({ x, y });

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const place = (type, data = {}) => {
    const available = floorTiles.filter((t) => !objects.has(`${t.x},${t.y}`));
    if (!available.length) return null;
    const t = rand(available);
    objects.set(`${t.x},${t.y}`, { type, ...data });
    return t;
  };

  const startRoom = rooms[0];
  const startX = Math.floor(startRoom.x + startRoom.w / 2);
  const startY = Math.floor(startRoom.y + startRoom.h / 2);
  objects.set(`${startX},${startY}`, { type: TILE.START });

  if (rooms.length >= 2) {
    const bossRoom = rooms[rooms.length - 1];
    const bx = Math.floor(bossRoom.x + bossRoom.w / 2);
    const by = Math.floor(bossRoom.y + bossRoom.h / 2);
    objects.set(`${bx},${by}`, { type: TILE.BOSS, monsterId: "guardian" });
  }

  const enemyCount = 3 + Math.floor(Math.random() * 4);
  const enemyIds = ["slime", "goblin", "skeleton", "orc", "orc2"];
  for (let i = 0; i < enemyCount; i++) {
    place(TILE.ENEMY, {
      monsterId: enemyIds[Math.floor(Math.random() * enemyIds.length)],
    });
  }

  const chestCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < chestCount; i++) place(TILE.CHEST);

  place(TILE.EXIT);

  return { map, rooms, objects, startX, startY, width, height };
}

class DungeonScene {
  constructor(game) {
    this.game = game;
    this.canvas = null;
    this.ctx = null;
    this.mapData = null;
    this.tileSize = 36;
    this.playerX = 0;
    this.playerY = 0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.keys = {};
    this.moving = false;
    this._raf = null;
    this._stepTimer = null;
    this.revealed = new Set();

    // ★ 수호자 처치 후 마왕 전투 예약
    this.guardianDefeated = false;
  }

  init(canvas, dungeonType = "normal", savedState = null, floorConfig = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dungeonType = dungeonType;
    this.guardianDefeated = false;

    // ★ 층수 설정 저장
    this.floorConfig =
      floorConfig || window.DUNGEON_FLOORS[dungeonType]?.[0] || null;

    if (savedState && savedState.mapData) {
      // 전투 복귀 시 기존 맵 재사용
      const sd = savedState.mapData;
      this.mapData = {
        map: sd.map,
        rooms: sd.rooms,
        objects: new Map(sd.objects),
        startX: sd.startX,
        startY: sd.startY,
        width: sd.width,
        height: sd.height,
      };
      this.playerX = savedState.playerX;
      this.playerY = savedState.playerY;
      this.revealed = new Set(savedState.revealed);
    } else {
      // 층수별 맵 크기 적용
      const mw = this.floorConfig?.mapW || 25;
      const mh = this.floorConfig?.mapH || 18;
      this.mapData = generateDungeonMap(mw, mh);
      this.playerX = this.mapData.startX;
      this.playerY = this.mapData.startY;
      this.revealed.clear();
      this._revealAround(this.playerX, this.playerY, 4);

      // 도시 탐험: 특수 타일 배치
      if (this.floorConfig?.specialTiles) {
        this._placeCityTiles();
      }
    }

    this._centerCamera();
    this._bindKeys();
    this._startLoop();
    this._renderMinimap();

    // 층수별 배경 단색 적용
    const wrap = canvas.parentElement;
    if (wrap) {
      wrap.style.backgroundImage = "none";
      wrap.style.background = this.floorConfig?.bgCanvas || "#1a0808";
    }
    if (dungeonType === "abyss") this._applyAbyssBg();
  }

  // ★ 심연 던전 배경 적용
  _applyAbyssBg() {
    const canvasWrap = document.getElementById("dungeonCanvasWrap");
    if (canvasWrap) {
      canvasWrap.style.backgroundImage = "url('images/Abyss_Dungeon.png')";
      canvasWrap.style.backgroundSize = "cover";
      canvasWrap.style.backgroundPosition = "center";
    }
    // 캔버스 반투명으로
    if (this.canvas) {
      this.canvas.style.opacity = "0.82";
    }
  }

  destroy() {
    this._unbindKeys();
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    if (this._stepTimer) {
      clearTimeout(this._stepTimer);
      this._stepTimer = null;
    }
  }

  _bindKeys() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      const dirs = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        KeyW: [0, -1],
        KeyS: [0, 1],
        KeyA: [-1, 0],
        KeyD: [1, 0],
      };
      const d = dirs[e.code];
      if (d) {
        e.preventDefault();
        this._tryMove(d[0], d[1]);
      }
    };
    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }
  _unbindKeys() {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
  }

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

    const obj = this.mapData.objects.get(`${nx},${ny}`);
    if (obj) this._handleObjectCollision(nx, ny, obj);

    this._animMove(() => {
      this.moving = false;
      this._centerCamera();
      this._renderMinimap();
    });
  }

  _animMove(onDone) {
    this._stepTimer = setTimeout(() => {
      if (onDone) onDone();
    }, 120);
  }

  _wallBump() {
    this.canvas?.parentElement?.classList?.add("bump");
    setTimeout(
      () => this.canvas?.parentElement?.classList?.remove("bump"),
      150,
    );
  }

  _handleObjectCollision(x, y, obj) {
    switch (obj.type) {
      case TILE.ENEMY: {
        this.mapData.objects.delete(`${x},${y}`);
        // ★ 층수 설정에서 몬스터 풀 선택
        const pool = this.floorConfig?.enemies || [
          "slime",
          "goblin",
          "skeleton",
          "orc",
          "orc2",
        ];
        const monsterId =
          obj.monsterId || pool[Math.floor(Math.random() * pool.length)];
        setTimeout(() => this.game.startBattle(monsterId, false), 100);
        break;
      }

      case TILE.BOSS: {
        this.mapData.objects.delete(`${x},${y}`);
        // ★ 층수 설정에서 보스 ID 선택
        const bossId = this.floorConfig?.boss || "guardian";
        const bossMult = this.floorConfig?.bossMultiplier || 1.0;
        this.game._bossMult = bossMult;
        this.guardianDefeated = false;
        setTimeout(() => this.game.startBattle(bossId, true), 100);
        break;
      }

      case TILE.CHEST: {
        const subtype = obj.subtype;
        this.mapData.objects.delete(`${x},${y}`);
        if (subtype === "shop") {
          // 도시 상점 타일
          this.game.showNarrative(
            '🏪 상인\n\n"어서오세요! 좋은 물건이 많이 있습니다."',
            2000,
          );
          setTimeout(() => this.game._toTown(), 2200);
        } else if (subtype === "npc") {
          // 도시 NPC 타일
          this.game.showNarrative(
            "💬 도시 주민\n\n모험가님! 도시 깊숙한 곳에 도적단 소굴이 있다고 합니다. 조심하세요!",
            3000,
          );
        } else {
          this._openChest(x, y);
        }
        break;
      }

      case TILE.EXIT:
        this.mapData.objects.delete(`${x},${y}`);
        setTimeout(() => this.game.returnToTown("exit"), 200);
        break;
    }
  }

  // game.js의 onBattleVictory에서 직접 처리 (5회 카운트 방식)
  onGuardianDefeated() {
    this.guardianDefeated = true;
    // game.js onBattleVictory에서 직접 처리됨
  }

  _openChest(x, y) {
    // ★ 보물상자 효과음
    if (window.audioMgr) audioMgr.playSfx("chest");
    // ★ 보물상자 카운트
    if (this.game.player)
      this.game.player._chestCount = (this.game.player._chestCount || 0) + 1;
    this.game.achievementManager?.check(this.game);

    const roll = Math.random();
    const p = this.game.player;
    if (roll < 0.5) {
      const gold = 100 + Math.floor(Math.random() * 200);
      p.money += gold;
      this.game.log(`📦 보물 상자! +${gold}G`);
      this.game.dungeonHud?.flashMsg(`💰 +${gold}G`, "#ffd700");
    } else {
      const item = createRandomItem(Math.random() < 0.2);
      this.game.itemManager.add(this.game, item);
      this.game.log(`📦 아이템 발견: ${item.name}`);
      this.game.dungeonHud?.flashMsg(`🎁 ${item.name}`, "#88ddff");
    }
  }

  _centerCamera() {
    if (!this.canvas) return;
    const ts = this.tileSize;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    this.cameraX = Math.round(this.playerX * ts - cw / 2 + ts / 2);
    this.cameraY = Math.round(this.playerY * ts - ch / 2 + ts / 2);
    const mapW = this.mapData.width * ts;
    const mapH = this.mapData.height * ts;
    this.cameraX = Math.max(0, Math.min(this.cameraX, mapW - cw));
    this.cameraY = Math.max(0, Math.min(this.cameraY, mapH - ch));
  }

  _revealAround(cx, cy, r) {
    const { width, height, map } = this.mapData;
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= r) this.revealed.add(`${x},${y}`);
      }
  }

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

    const startTX = Math.max(0, Math.floor(this.cameraX / ts) - 1);
    const startTY = Math.max(0, Math.floor(this.cameraY / ts) - 1);
    const endTX = Math.min(width - 1, startTX + Math.ceil(cw / ts) + 2);
    const endTY = Math.min(height - 1, startTY + Math.ceil(ch / ts) + 2);

    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        const key = `${tx},${ty}`;
        if (!this.revealed.has(key)) continue;

        const px = tx * ts - this.cameraX;
        const py = ty * ts - this.cameraY;
        const tileType = map[ty][tx];
        const colors = TILE_COLORS[tileType] || TILE_COLORS[TILE.WALL];
        const isVisible =
          Math.abs(tx - this.playerX) <= 4 && Math.abs(ty - this.playerY) <= 4;

        ctx.globalAlpha = isVisible ? 1.0 : 0.45;
        ctx.fillStyle = colors.bg;
        ctx.fillRect(px, py, ts, ts);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

        if (tileType === TILE.FLOOR) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        }
        ctx.globalAlpha = 1;

        const obj = objects.get(key);
        if (obj && obj.type !== TILE.START) {
          const icon = TILE_ICONS[obj.type] || "";
          if (icon) {
            ctx.globalAlpha = isVisible ? 1.0 : 0.55;
            if (obj.type === TILE.BOSS) {
              ctx.shadowColor = "#ff3300";
              ctx.shadowBlur = 20;
            } else if (obj.type === TILE.ENEMY) {
              ctx.shadowColor = "#ff6600";
              ctx.shadowBlur = 14;
            } else if (obj.type === TILE.CHEST) {
              ctx.shadowColor = "#ffcc00";
              ctx.shadowBlur = 12;
            } else if (obj.type === TILE.EXIT) {
              ctx.shadowColor = "#00ffcc";
              ctx.shadowBlur = 12;
            } else ctx.shadowBlur = 0;

            ctx.font = `${Math.floor(ts * 0.75)}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(icon, px + ts / 2, py + ts / 2);
            ctx.shadowBlur = 0;

            if (
              isVisible &&
              (obj.type === TILE.ENEMY || obj.type === TILE.BOSS)
            ) {
              ctx.globalAlpha = 1;
              ctx.font = `bold ${Math.floor(ts * 0.25)}px sans-serif`;
              ctx.fillStyle = obj.type === TILE.BOSS ? "#ff4400" : "#ffaa88";
              ctx.textAlign = "center";
              ctx.textBaseline = "alphabetic";
              ctx.fillText(
                obj.type === TILE.BOSS ? "BOSS" : "적",
                px + ts / 2,
                py + ts - 2,
              );
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#ffffff";
            ctx.textBaseline = "middle";
          }
        }
      }
    }

    // 플레이어
    const ppx = this.playerX * ts - this.cameraX + ts / 2;
    const ppy = this.playerY * ts - this.cameraY + ts / 2;
    const r = ts * 0.38;

    ctx.shadowColor = "rgba(200,152,14,0.6)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#c8980e";
    ctx.beginPath();
    ctx.arc(ppx, ppy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = `${Math.floor(ts * 0.55)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const playerIcons = { night: "⚔", mage: "🔮", archer: "🏹" };
    ctx.fillText(playerIcons[this.game.player?.type] || "⚔", ppx, ppy);
  }

  _renderMinimap() {
    const minimapEl = document.getElementById("dungeonMinimap");
    if (!minimapEl) return;
    const mCtx = minimapEl.getContext("2d");
    const { map, objects, width, height } = this.mapData;
    const mts = 6;
    minimapEl.width = width * mts;
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
          if (obj.type === TILE.ENEMY) color = "#8a2020";
          else if (obj.type === TILE.BOSS) color = "#cc3300";
          else if (obj.type === TILE.CHEST) color = "#6a6a20";
          else if (obj.type === TILE.EXIT) color = "#1a5050";
        }
        mCtx.fillStyle = color;
        mCtx.fillRect(tx * mts, ty * mts, mts, mts);
      }
    }

    mCtx.fillStyle = "#FFD700";
    mCtx.fillRect(this.playerX * mts, this.playerY * mts, mts, mts);
  }

  // ★ 도시 탐험 특수 타일 배치
  _placeCityTiles() {
    const rooms = this.mapData.rooms;
    if (!rooms || rooms.length < 3) return;
    const objects = this.mapData.objects;

    // 상점 타일 (NPC로 표시, 접근 시 상점 오픈)
    const shopRoom = rooms[1];
    const shopKey = `${shopRoom.x + Math.floor(shopRoom.w / 2)},${shopRoom.y + Math.floor(shopRoom.h / 2)}`;
    objects.set(shopKey, {
      type: TILE.CHEST,
      subtype: "shop",
      label: "🏪 상점",
    });

    // NPC 타일 (접근 시 대화/퀘스트)
    const npcRoom = rooms[2];
    const npcKey = `${npcRoom.x + Math.floor(npcRoom.w / 2)},${npcRoom.y + Math.floor(npcRoom.h / 2)}`;
    objects.set(npcKey, { type: TILE.CHEST, subtype: "npc", label: "💬 NPC" });
  }

  // ★ 현재 맵 상태 저장 (전투 전 호출)
  saveState() {
    // ★ objects(Map)를 직렬화해서 저장 (참조 공유 방지)
    const objectsArr = Array.from(this.mapData.objects.entries());
    return {
      mapData: {
        map: this.mapData.map.map((row) => [...row]), // 2D 배열 복사
        rooms: this.mapData.rooms,
        objects: objectsArr, // Map → Array 직렬화
        startX: this.mapData.startX,
        startY: this.mapData.startY,
        width: this.mapData.width,
        height: this.mapData.height,
      },
      playerX: this.playerX,
      playerY: this.playerY,
      revealed: Array.from(this.revealed),
    };
  }

  onDpadPress(dir) {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const d = map[dir];
    if (d) this._tryMove(d[0], d[1]);
  }
}

window.DungeonScene = DungeonScene;
window.generateDungeonMap = generateDungeonMap;
window.TILE = TILE;
