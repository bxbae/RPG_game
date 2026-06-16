// ═══════════════════════════════════════════════════
//  마왕 토벌 — Service Worker
//  전략: Cache First (게임 리소스) + Network First (외부)
// ═══════════════════════════════════════════════════

const CACHE_NAME    = "rpg-v1";
const STATIC_CACHE  = "rpg-static-v1";
const DYNAMIC_CACHE = "rpg-dynamic-v1";

// ── 핵심 파일 (반드시 캐시) ──────────────────────────
const CORE_FILES = [
  "./index.html",
  "./rpg-main.css",
  "./models.js",
  "./managers.js",
  "./achievement-system.js",
  "./battle-manager.js",
  "./dungeon-scene.js",
  "./battle-scene.js",
  "./town-scene.js",
  "./dialogue-scene.js",
  "./game.js",
  "./manifest.json",
];

// ── 이미지 파일 ──────────────────────────────────────
const IMAGE_FILES = [
  "./images/TOWN_MAP.png",
  "./images/Dungeon_Entrance.png",
  "./images/dungeon_interior.png",
  "./images/Dungeon_BOSS_ROOM.png",
  "./images/Abyss_Dungeon.png",
  "./images/BANK.png",
  "./images/victory_with_colleagues.png",
  "./images/inability_to_fight.png",
  "./images/pub_night.png",
  "./images/town_bustling.png",
  "./images/town_prosperity.png",
  "./images/festival_1.png",
  "./images/forest_exploration_day.png",
  // 플레이어 SD
  "./images/sd_knight.png",
  "./images/sd_knight_attack_1.png",
  "./images/sd_knight_attack_2.png",
  "./images/sd_knight_walk_1.png",
  "./images/sd_knight_walk_2.png",
  "./images/SD__Magician.png",
  "./images/sd_magician_attack_1.png",
  "./images/sd_magician_attack_2.png",
  "./images/sd_magician_walk_1.png",
  "./images/sd_magician_walk_2.png",
  "./images/SD_Tanker.png",
  "./images/SD_Tanker_attack_1.png",
  "./images/SD_Tanker_attack_2.png",
  "./images/SD_Tanker_walk_1.png",
  "./images/SD_Tanker_walk_2.png",
  "./images/sd_archer_attack_1.png",
  "./images/sd_archer_attack_2.png",
  "./images/sd_archer_walk_1.png",
  "./images/sd_archer_walk_2.png",
  "./images/SD_Archer_shot.png",
  // 동료 SD
  "./images/sd_healer.png",
  "./images/sd_healer_walk_1.png",
  "./images/sd_healer_walk_2.png",
  "./images/SD_healer_attack_1.png",
  "./images/SD_healer_attack_2.png",
  "./images/sd_merchant.png",
  // 스킬컷
  "./images/Night_skill_cut.png",
  "./images/wizard_skill_cut.png",
  "./images/tanker_skill_cut.png",
  "./images/Elf_Archer_skill_cut.png",
  "./images/healer_skill_cut.png",
  // 몬스터
  "./images/sd_slime.png",
  "./images/sd_goblin.png",
  "./images/sd_skeleton.png",
  "./images/sd_orc.png",
  "./images/sd_orc2.png",
  "./images/sd_guardian.png",
  "./images/sd_demon.png",
  "./images/sd_abyss_mage.png",
  "./images/sd_Dungeon_Guardian.png",
  "./images/sd_Demon.png",
  "./images/sd_Adversary.png",
  // 포트레이트
  "./images/portrait_Knight.png",
  "./images/portrait_magician.png",
  "./images/portrait_archer.png",
  "./images/portrait_tanker.png",
  "./images/portrait_healer.png",
  "./images/portrait_mage_party.png",
  "./images/portrait_dealer.png",
];

// ── 사운드 파일 ──────────────────────────────────────
const SOUND_FILES = [
  "./sounds/bgm_town.ogg",
  "./sounds/bgm_dungeon.mp3",
  "./sounds/bgm_boss.wav",
  "./sounds/bgm_shop.wav",
  "./sounds/sfx_sword.mp3",
  "./sounds/sfx_magic.mp3",
  "./sounds/sfx_arrow.mp3",
  "./sounds/sfx_heal.wav",
  "./sounds/sfx_levelup.wav",
  "./sounds/sfx_levelup_party.mp3",
  "./sounds/sfx_monster.wav",
  "./sounds/sfx_chest.mp3",
  "./sounds/sfx_victory.mp3",
];

const ALL_CACHE = [...CORE_FILES, ...IMAGE_FILES, ...SOUND_FILES];

// ══════════════════════════════════════════════════
//  install — 핵심 파일 사전 캐시
// ══════════════════════════════════════════════════
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      // 핵심 JS/CSS만 필수 캐시 (실패 시 설치 중단)
      return cache.addAll(CORE_FILES).then(() => {
        // 이미지/사운드는 선택적 캐시 (없어도 설치 계속)
        const optionalFiles = [...IMAGE_FILES, ...SOUND_FILES];
        return Promise.allSettled(
          optionalFiles.map(url =>
            cache.add(url).catch(e =>
              console.warn("[SW] Optional cache failed:", url, e)
            )
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// ══════════════════════════════════════════════════
//  activate — 구버전 캐시 정리
// ══════════════════════════════════════════════════
self.addEventListener("activate", event => {
  const VALID = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !VALID.includes(k))
          .map(k => {
            console.log("[SW] 구버전 캐시 삭제:", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ══════════════════════════════════════════════════
//  fetch — Cache First 전략
// ══════════════════════════════════════════════════
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // 외부 요청(Google Fonts 등)은 Network First
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // 게임 리소스: Cache First → 없으면 Network → 동적 캐시 저장
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // 유효한 응답만 캐시
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // 완전 오프라인 + 캐시 없음 → 빈 응답
        console.warn("[SW] 오프라인 fetch 실패:", request.url);
      });
    })
  );
});

// ══════════════════════════════════════════════════
//  메시지 — 캐시 강제 갱신
// ══════════════════════════════════════════════════
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
