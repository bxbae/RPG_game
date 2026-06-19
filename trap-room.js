// ═══════════════════════════════════════════════════
//  trap-room.js  — 던전 "함정의 방" 기믹 (지뢰찾기 퍼즐)
//  던전 맵에 층마다 1회 고정 등장하는 특수 방.
//  안전한 칸을 모두 열면 층 깊이에 비례한 대량 보상을 얻고,
//  함정(지뢰) 칸을 열면 상태이상(중독/화상)에 걸린다.
// ═══════════════════════════════════════════════════
"use strict";

// ── 던전 유형·층별 퍼즐 난이도 ─────────────────────────
const TRAP_ROOM_CONFIG = {
  forest: { 1:{ rows:5, cols:5, mines:4  }, 2:{ rows:6, cols:6, mines:7  }, 3:{ rows:6, cols:6, mines:9  } },
  normal: { 1:{ rows:6, cols:6, mines:7  }, 2:{ rows:7, cols:7, mines:11 }, 3:{ rows:7, cols:7, mines:14 } },
  abyss:  { 1:{ rows:7, cols:7, mines:12 }, 2:{ rows:8, cols:8, mines:17 }, 3:{ rows:8, cols:8, mines:21 } },
};

// ── 완전 클리어 보상 (층 깊이·던전 위험도에 비례) ───────
const TRAP_ROOM_REWARDS = {
  forest: { 1:{ gold:300,  exp:80,  itemChance:0,    grade:"rare"   }, 2:{ gold:450,  exp:120, itemChance:.25, grade:"rare"   }, 3:{ gold:600,  exp:170, itemChance:.4,  grade:"epic"   } },
  normal: { 1:{ gold:500,  exp:130, itemChance:.3,   grade:"rare"   }, 2:{ gold:750,  exp:190, itemChance:.45, grade:"epic"   }, 3:{ gold:1000, exp:260, itemChance:.6,  grade:"epic"   } },
  abyss:  { 1:{ gold:900,  exp:230, itemChance:.5,   grade:"epic"   }, 2:{ gold:1300, exp:320, itemChance:.7,  grade:"legend" }, 3:{ gold:1800, exp:430, itemChance:.85, grade:"legend" } },
};

// ── 함정 발동 시 페널티 (상태이상) — 던전 위험도에 비례한 기본 지속 턴 ──
const TRAP_PENALTY_BASE_TURNS = { forest:3, normal:4, abyss:5 };

function getTrapRoomConfig(dungeonType, floor) {
  const table = TRAP_ROOM_CONFIG[dungeonType] || TRAP_ROOM_CONFIG.normal;
  return table[floor] || table[Object.keys(table).pop()];
}
function getTrapRoomReward(dungeonType, floor) {
  const table = TRAP_ROOM_REWARDS[dungeonType] || TRAP_ROOM_REWARDS.normal;
  return table[floor] || table[Object.keys(table).pop()];
}

// 직업별 무기 종류 매핑 (battle-manager.js의 기존 매핑에 누락된
// knight/magician까지 정확히 포함)
const TRAP_WEAPON_CLASS = {
  knight:"sword", night:"sword", warrior:"sword",
  magician:"staff", mage:"staff",
  archer:"bow",
};
const TRAP_WEAPON_NAME = { sword:"유적의 검", staff:"유적의 지팡이", bow:"유적의 각궁" };

function generateTrapRoomItem(p, grade, floor, dungeonType) {
  const wClass = TRAP_WEAPON_CLASS[p.type] || "sword";
  const tierMult = { forest:1, normal:1.3, abyss:1.7 }[dungeonType] || 1;
  const attack = Math.round((20 + floor * 8) * tierMult);
  return normalizeItem({
    name: TRAP_WEAPON_NAME[wClass],
    type: "weapon",
    weaponClass: wClass,
    attack, defense: 0,
    class: grade,
    enhance: 0,
  });
}

// ── 지뢰찾기 퍼즐 엔진 (순수 로직, DOM 의존 없음) ────────
// 첫 클릭 안전 보장: 지뢰는 첫 reveal() 호출 시점에 배치되며,
// 클릭한 칸과 그 8방향 인접 칸은 지뢰 배치에서 제외된다.
class MinesweeperPuzzle {
  constructor(rows, cols, mineCount) {
    this.rows = rows;
    this.cols = cols;
    this.mineCount = Math.min(mineCount, rows * cols - 9); // 안전 영역 확보
    this.totalSafe = rows * cols - this.mineCount;
    this.revealedCount = 0;
    this.finished = false;
    this.exploded = false;
    this._minesPlaced = false;
    this.grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push({ mine:false, revealed:false, adjacent:0 });
      this.grid.push(row);
    }
  }

  _placeMines(safeR, safeC) {
    const forbidden = new Set();
    for (let dr=-1; dr<=1; dr++)
      for (let dc=-1; dc<=1; dc++) {
        const r = safeR+dr, c = safeC+dc;
        if (r>=0 && r<this.rows && c>=0 && c<this.cols) forbidden.add(`${r},${c}`);
      }
    let placed = 0;
    let guard = 0;
    while (placed < this.mineCount && guard < 100000) {
      guard++;
      const r = Math.floor(Math.random()*this.rows);
      const c = Math.floor(Math.random()*this.cols);
      const key = `${r},${c}`;
      if (forbidden.has(key) || this.grid[r][c].mine) continue;
      this.grid[r][c].mine = true;
      placed++;
    }
    for (let r=0; r<this.rows; r++) {
      for (let c=0; c<this.cols; c++) {
        if (this.grid[r][c].mine) continue;
        let cnt = 0;
        for (let dr=-1; dr<=1; dr++)
          for (let dc=-1; dc<=1; dc++) {
            if (dr===0 && dc===0) continue;
            const nr=r+dr, nc=c+dc;
            if (nr>=0 && nr<this.rows && nc>=0 && nc<this.cols && this.grid[nr][nc].mine) cnt++;
          }
        this.grid[r][c].adjacent = cnt;
      }
    }
    this._minesPlaced = true;
  }

  // 칸 열기 — { exploded, cleared, cells:[{r,c,mine,adjacent}] } 반환
  reveal(r, c) {
    if (this.finished) return { exploded:false, cleared:false, cells:[] };
    if (this.grid[r][c].revealed) return { exploded:false, cleared:false, cells:[] };
    if (!this._minesPlaced) this._placeMines(r, c);

    const cells = [];
    const stack = [[r,c]];
    const visited = new Set();

    while (stack.length) {
      const [cr, cc] = stack.pop();
      const key = `${cr},${cc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const cur = this.grid[cr][cc];
      if (cur.revealed) continue;
      cur.revealed = true;
      cells.push({ r:cr, c:cc, mine:cur.mine, adjacent:cur.adjacent });

      if (cur.mine) {
        this.exploded = true;
        this.finished = true;
        return { exploded:true, cleared:false, cells };
      }
      this.revealedCount++;

      if (cur.adjacent === 0) {
        for (let dr=-1; dr<=1; dr++)
          for (let dc=-1; dc<=1; dc++) {
            if (dr===0 && dc===0) continue;
            const nr=cr+dr, nc=cc+dc;
            if (nr>=0 && nr<this.rows && nc>=0 && nc<this.cols && !this.grid[nr][nc].revealed) {
              stack.push([nr,nc]);
            }
          }
      }
    }

    if (this.revealedCount >= this.totalSafe) {
      this.finished = true;
      return { exploded:false, cleared:true, cells };
    }
    return { exploded:false, cleared:false, cells };
  }

  remainingSafe() { return this.totalSafe - this.revealedCount; }
}

window.MinesweeperPuzzle  = MinesweeperPuzzle;
window.TRAP_ROOM_CONFIG   = TRAP_ROOM_CONFIG;
window.TRAP_ROOM_REWARDS  = TRAP_ROOM_REWARDS;

// ── 함정의 방 전용 CSS 1회 주입 ────────────────────────
(function injectTrapRoomCSS() {
  if (document.getElementById("trapRoomCSS")) return;
  const s = document.createElement("style");
  s.id = "trapRoomCSS";
  s.textContent = `
    #trapRoomOverlay{position:fixed;inset:0;z-index:9000;display:none;
      align-items:center;justify-content:center;background:rgba(5,0,10,.86);}
    .tr-box{background:#0e0a14;border:2px solid #8844cc;border-radius:8px;
      padding:22px 24px;max-width:94vw;max-height:92vh;overflow-y:auto;
      text-align:center;box-shadow:0 0 40px rgba(136,68,204,.4);}
    .tr-title{color:#cc99ff;font-size:1.1rem;font-weight:700;margin-bottom:6px;}
    .tr-sub{color:var(--text-dim);font-size:.72rem;margin-bottom:14px;line-height:1.6;}
    .tr-info{display:flex;justify-content:center;gap:18px;font-size:.74rem;
      color:var(--text-dim);margin-bottom:12px;}
    .tr-info b{color:#cc99ff;}
    .tr-grid{display:grid;gap:3px;margin:0 auto 14px;justify-content:center;}
    .tr-cell{width:34px;height:34px;display:flex;align-items:center;justify-content:center;
      background:#241830;border:1px solid #3a2850;border-radius:3px;cursor:pointer;
      font-weight:700;font-size:.85rem;color:#d8c8f0;transition:.1s;user-select:none;}
    .tr-cell:hover{background:#332040;}
    .tr-cell.tr-open{background:#1a1418;border-color:#2a2030;cursor:default;}
    .tr-cell.tr-open:hover{background:#1a1418;}
    .tr-cell.tr-mine{background:#4a1020;border-color:#a82020;cursor:default;}
    .tr-cell.tr-n1{color:#5599ff;} .tr-cell.tr-n2{color:#55cc55;} .tr-cell.tr-n3{color:#ff5555;}
    .tr-cell.tr-n4{color:#3355aa;} .tr-cell.tr-n5{color:#aa3333;} .tr-cell.tr-n6{color:#33aa88;}
    .tr-cell.tr-n7{color:#cccccc;} .tr-cell.tr-n8{color:#ff99cc;}
    .tr-result{min-height:22px;font-size:.82rem;margin-bottom:10px;}
    .tr-final{margin:4px 0 14px;padding:12px;background:rgba(255,255,255,.04);
      border:1px solid #4a2e60;border-radius:6px;}
    .tr-final-title{font-size:1.05rem;font-weight:700;margin-bottom:6px;}
    .tr-final-line{font-size:.74rem;color:var(--text-dim);margin-bottom:3px;}
    .tr-btn-row{display:flex;gap:8px;justify-content:center;}
    .tr-btn{background:#1a1020;border:1px solid #8844cc;color:#cc99ff;padding:9px 18px;
      cursor:pointer;font-family:inherit;font-size:.78rem;border-radius:4px;transition:.15s;}
    .tr-btn:hover{background:#2a1840;}
    .tr-btn-quiet{border-color:var(--border2);color:var(--text-dim);}
    .tr-btn-quiet:hover{background:rgba(255,255,255,.06);}
  `;
  document.head.appendChild(s);
})();

// ── DungeonScene 연동 ──────────────────────────────────

// 함정의 방 입장
DungeonScene.prototype._openTrapRoom = function (x, y) {
  const game = this.game, p = game.player;
  const floor = this.floor, dungeonType = this.dungeonType;
  const cfg = getTrapRoomConfig(dungeonType, floor);

  this._trapRoomActive = true;
  this._trapPuzzle = new MinesweeperPuzzle(cfg.rows, cfg.cols, cfg.mines);

  let overlay = document.getElementById("trapRoomOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "trapRoomOverlay";
    overlay.innerHTML = `
      <div class="tr-box">
        <div class="tr-title">🕳 함정의 방</div>
        <div class="tr-sub" id="trRoomDesc"></div>
        <div class="tr-info">
          <span>남은 안전 칸: <b id="trRemain">0</b></span>
          <span>지뢰: <b id="trMineCount">0</b></span>
        </div>
        <div class="tr-grid" id="trGrid"></div>
        <div class="tr-result" id="trResultMsg"></div>
        <div class="tr-final" id="trFinalMsg" style="display:none;"></div>
        <div class="tr-btn-row" id="trBtnRow">
          <button class="tr-btn tr-btn-quiet" id="trGiveUpBtn">🚪 포기하고 나가기</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  const descEl = document.getElementById("trRoomDesc");
  if (descEl) {
    const dungeonLabel = window.DUNGEON_LABELS?.[dungeonType] || "던전";
    descEl.textContent = `${dungeonLabel} ${floor}층 — 안전한 칸을 모두 찾아내면 큰 보상이, 함정을 밟으면 저주가 따른다.`;
  }
  document.getElementById("trMineCount").textContent = cfg.mines;
  document.getElementById("trResultMsg").textContent = "칸을 눌러 안전한 길을 찾아보세요.";
  const finalMsg = document.getElementById("trFinalMsg");
  if (finalMsg) finalMsg.style.display = "none";
  const btnRow = document.getElementById("trBtnRow");
  if (btnRow) btnRow.innerHTML = `<button class="tr-btn tr-btn-quiet" id="trGiveUpBtn">🚪 포기하고 나가기</button>`;
  document.getElementById("trGiveUpBtn")?.addEventListener("click", () => this._closeTrapRoom());

  this._trRenderGrid();
  overlay.style.display = "flex";
};

// 그리드 DOM 빌드 (한 번만) + 상태 동기화
DungeonScene.prototype._trRenderGrid = function () {
  const puzzle = this._trapPuzzle;
  if (!puzzle) return;
  const gridEl = document.getElementById("trGrid");
  if (!gridEl) return;

  gridEl.style.gridTemplateColumns = `repeat(${puzzle.cols}, 34px)`;
  gridEl.innerHTML = "";

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "tr-cell";
      cellEl.dataset.r = r;
      cellEl.dataset.c = c;
      cellEl.textContent = "";
      cellEl.addEventListener("click", () => this._trCellClick(r, c));
      gridEl.appendChild(cellEl);
    }
  }
  document.getElementById("trRemain").textContent = puzzle.remainingSafe();
};

// 칸 클릭 처리
DungeonScene.prototype._trCellClick = function (r, c) {
  const puzzle = this._trapPuzzle;
  if (!puzzle || puzzle.finished) return;

  const result = puzzle.reveal(r, c);
  if (!result.cells.length) return;

  const gridEl = document.getElementById("trGrid");
  result.cells.forEach(cell => {
    const cellEl = gridEl?.querySelector(`[data-r="${cell.r}"][data-c="${cell.c}"]`);
    if (!cellEl) return;
    if (cell.mine) {
      cellEl.classList.add("tr-open", "tr-mine");
      cellEl.textContent = "💣";
    } else {
      cellEl.classList.add("tr-open");
      if (cell.adjacent > 0) {
        cellEl.classList.add(`tr-n${cell.adjacent}`);
        cellEl.textContent = cell.adjacent;
      }
    }
  });

  const remainEl = document.getElementById("trRemain");
  if (remainEl) remainEl.textContent = puzzle.remainingSafe();

  if (result.exploded) {
    this._trFailRoom();
  } else if (result.cleared) {
    this._trClearRoom();
  }
};

// 실패 — 함정 발동 (상태이상 부여, 보상 없음)
DungeonScene.prototype._trFailRoom = function () {
  const game = this.game, p = game.player;
  const dungeonType = this.dungeonType, floor = this.floor;

  const statusType = Math.random() < 0.5 ? "poison" : "burn";
  const turns = (TRAP_PENALTY_BASE_TURNS[dungeonType] || 4) + (floor - 1);
  game.battleManager?.applyStatus(p, statusType, turns, game, "플레이어");

  document.getElementById("trResultMsg").textContent = "💥 함정이 발동했다...";

  const statusLabel = statusType === "poison" ? "🟢 중독" : "🔥 화상";
  const finalMsg = document.getElementById("trFinalMsg");
  if (finalMsg) {
    finalMsg.style.display = "block";
    finalMsg.innerHTML = `
      <div class="tr-final-title" style="color:#ff6666;">💀 함정 발동</div>
      <div class="tr-final-line">${statusLabel} ${turns}턴 — 다음 전투에서 피해를 입습니다</div>`;
  }
  document.getElementById("trBtnRow").innerHTML = `<button class="tr-btn" id="trCloseBtn">닫기</button>`;
  document.getElementById("trCloseBtn")?.addEventListener("click", () => this._closeTrapRoom());

  game.save?.();
};

// 성공 — 클리어 보상 지급
DungeonScene.prototype._trClearRoom = function () {
  const game = this.game, p = game.player;
  const dungeonType = this.dungeonType, floor = this.floor;
  const reward = getTrapRoomReward(dungeonType, floor);

  p.money += reward.gold;
  const lvUp = p.gainExp ? p.gainExp(reward.exp) : false;

  let itemLine = "";
  if (Math.random() < reward.itemChance) {
    const item = generateTrapRoomItem(p, reward.grade, floor, dungeonType);
    p.inventory.push(item);
    itemLine = `<div class="tr-final-line">🎁 ${item.name} (${item.class}) 획득!</div>`;
  }

  p._trapRoomClears = (p._trapRoomClears || 0) + 1;
  if (dungeonType === "abyss") p._trapAbyssClear = true;
  game.achievementManager?.check?.(game);

  document.getElementById("trResultMsg").textContent = "✨ 모든 안전한 길을 찾아냈다!";
  const finalMsg = document.getElementById("trFinalMsg");
  if (finalMsg) {
    finalMsg.style.display = "block";
    finalMsg.innerHTML = `
      <div class="tr-final-title" style="color:#ffd700;">🏆 함정의 방 클리어!</div>
      <div class="tr-final-line">💰 +${reward.gold.toLocaleString()}G &nbsp; ⭐ +${reward.exp}EXP</div>
      ${itemLine}
      ${lvUp ? `<div class="tr-final-line">🎉 레벨 업! Lv.${p.level}</div>` : ""}`;
  }
  document.getElementById("trBtnRow").innerHTML = `<button class="tr-btn" id="trCloseBtn">닫기</button>`;
  document.getElementById("trCloseBtn")?.addEventListener("click", () => this._closeTrapRoom());

  game.save?.();
};

// 모달 닫기 — 던전 이동 재개
DungeonScene.prototype._closeTrapRoom = function () {
  const overlay = document.getElementById("trapRoomOverlay");
  if (overlay) overlay.style.display = "none";
  this._trapRoomActive = false;
  this._trapPuzzle = null;
};
