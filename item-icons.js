// ═══════════════════════════════════════════════════
//  item-icons.js  — 아이템 아이콘 (실제 이미지 + 인라인 SVG 대체)
//  images/items/ 폴더에 등록된 실제 아트 이미지가 있으면 그것을 쓰고,
//  없으면 종류(type/weaponClass)와 등급(class)에 따라 작은 벡터
//  아이콘을 즉석에서 생성해 대신 보여준다 (이미지가 아직 없는
//  종류/등급의 자리채움이자, 이미지 로드 실패 시 안전한 대체).
//  상점·인벤토리·장비창 등 아이템이 표시되는 모든 곳에서 재사용한다.
// ═══════════════════════════════════════════════════
"use strict";

const ITEM_GRADE_COLOR = {
  normal:   "#b8a888",
  uncommon: "#55cc55",
  rare:     "#4898d8",
  epic:     "#bb66ff",
  legend:   "#d8a820",
  mythic:   "#ff88ff",
};

// 등급이 높을수록(에픽 이상) 은은한 발광 효과를 더해 "특별한 아이템" 느낌을 준다
const ITEM_GLOW_GRADES = { epic:true, legend:true, mythic:true };

// ── 실제 아트 이미지 등록 테이블 ──────────────────────
// 키는 "weaponClass_grade" (예: "sword_legend")처럼 등급까지 구체적으로 적을 수도 있고,
// 등급 구분 없이 "weaponClass"(또는 방어구/투구/물약은 "type")만 적어 모든 등급의
// 공통 이미지로 써도 된다. 조회 시 구체적인 키를 먼저 찾고, 없으면 일반 키로 내려간다.
//
// 참고 자료(업로드된 등급표)는 일반/상급/전설 3단계인데 게임 데이터는
// normal/uncommon/rare/epic/legend/mythic 6단계라서, 2개씩 묶어 매핑했다:
//   일반(normal 자료) → normal, uncommon
//   상급(rare 자료)   → rare, epic
//   전설(legend 자료) → legend, mythic
// 묶인 등급끼리는 같은 그림을 쓰지만, 아이콘의 등급 색 테두리/발광 효과는
// 실제 등급(class) 기준으로 따로 적용되니 시각적 등급 구분은 유지된다.
const ITEM_ICON_IMAGES = {
  // ── 검 / 활 / 지팡이 (무기) ──
  sword_normal:"images/items/weapon_sword_normal.png", sword_uncommon:"images/items/weapon_sword_normal.png",
  sword_rare:  "images/items/weapon_sword_rare.png",   sword_epic:    "images/items/weapon_sword_rare.png",
  sword_legend:"images/items/weapon_sword_legend.png", sword_mythic:  "images/items/weapon_sword_legend.png",

  bow_normal:"images/items/weapon_bow_normal.png", bow_uncommon:"images/items/weapon_bow_normal.png",
  bow_rare:  "images/items/weapon_bow_rare.png",   bow_epic:    "images/items/weapon_bow_rare.png",
  bow_legend:"images/items/weapon_bow_legend.png", bow_mythic:  "images/items/weapon_bow_legend.png",

  staff_normal:"images/items/weapon_staff_normal.png", staff_uncommon:"images/items/weapon_staff_normal.png",
  staff_rare:  "images/items/weapon_staff_rare.png",   staff_epic:    "images/items/weapon_staff_rare.png",
  staff_legend:"images/items/weapon_staff_legend.png", staff_mythic:  "images/items/weapon_staff_legend.png",

  // ── 포션 — 현재 게임엔 회복(HP) 포션만 존재해서 HP 그림으로 매핑.
  //          마나/속도 포션 아이템이 추가되면 potionType 같은 필드로 구분해 확장 가능.
  potion_normal:"images/items/potion_hp_normal.png", potion_uncommon:"images/items/potion_hp_normal.png",
  potion_rare:  "images/items/potion_hp_rare.png",   potion_epic:    "images/items/potion_hp_rare.png",
  potion_legend:"images/items/potion_hp_legend.png", potion_mythic:  "images/items/potion_hp_legend.png",

  // ── 투구 — 직업별로 따로 구분하는 필드(helmetClass)가 아직 없어서
  //          사용자가 골라준 전용 투구 그림(helmet_normal/rare/legend.png)으로 통일.
  //          예전에 쓰던 직업별 기사형 투구 그림은 helmet_검/활/지팡이_등급 키로
  //          그대로 남겨뒀으니, 나중에 직업 구분 필드를 추가하면 바로 쓸 수 있다.
  helmet_normal:"images/items/helmet_normal.png", helmet_uncommon:"images/items/helmet_normal.png",
  helmet_rare:  "images/items/helmet_rare.png",   helmet_epic:    "images/items/helmet_rare.png",
  helmet_legend:"images/items/helmet_legend.png", helmet_mythic:  "images/items/helmet_legend.png",

  helmet_sword_normal:"images/items/helmet_sword_normal.png",
  helmet_sword_rare:  "images/items/helmet_sword_rare.png",
  helmet_sword_legend:"images/items/helmet_sword_legend.png",
  helmet_bow_normal:  "images/items/helmet_bow_normal.png",
  helmet_bow_rare:    "images/items/helmet_bow_rare.png",
  helmet_bow_legend:  "images/items/helmet_bow_legend.png",
  helmet_staff_normal:"images/items/helmet_staff_normal.png",
  helmet_staff_rare:  "images/items/helmet_staff_rare.png",
  helmet_staff_legend:"images/items/helmet_staff_legend.png",

  // ── 갑옷 — 사용자가 골라준 전용 방패 그림(shield_normal/rare/legend.png)으로 통일.
  //          예전에 쓰던 모양별(원형/카이트형/날개형) 방패 그림도 armor_round_*,
  //          armor_kite_*, armor_wing_* 키로 그대로 남겨뒀으니 필요하면 바꿔 쓸 수 있다.
  armor_normal:"images/items/shield_normal.png", armor_uncommon:"images/items/shield_normal.png",
  armor_rare:  "images/items/shield_rare.png",   armor_epic:    "images/items/shield_rare.png",
  armor_legend:"images/items/shield_legend.png", armor_mythic:  "images/items/shield_legend.png",

  armor_round_normal:"images/items/shield_round_normal.png",
  armor_round_rare:  "images/items/shield_round_rare.png",
  armor_round_legend:"images/items/shield_round_legend.png",
  armor_kite_normal: "images/items/shield_kite_normal.png",
  armor_kite_rare:   "images/items/shield_kite_rare.png",
  armor_kite_legend: "images/items/shield_kite_legend.png",
  armor_wing_normal: "images/items/shield_wing_normal.png",
  armor_wing_rare:   "images/items/shield_wing_rare.png",
  armor_wing_legend: "images/items/shield_wing_legend.png",
};

function _lookupItemImage(item) {
  const type   = item?.type || "";
  const wClass = item?.weaponClass || "";
  const grade  = item?.class || "normal";
  const baseKey = wClass || type;
  if (!baseKey) return null;
  return ITEM_ICON_IMAGES[`${baseKey}_${grade}`] || ITEM_ICON_IMAGES[baseKey] || null;
}

let _itemIconUid = 0;

// 종류별 벡터 모양만 생성 (실제 이미지가 없을 때의 대체용)
function _buildShapeSVG(item, size) {
  const type   = item?.type || "misc";
  const wClass = item?.weaponClass || "";
  const grade  = item?.class || "normal";
  const color  = ITEM_GRADE_COLOR[grade] || ITEM_GRADE_COLOR.normal;
  const glow   = !!ITEM_GLOW_GRADES[grade];
  const uid    = `ii${_itemIconUid++}`;

  let shape;
  if (type === "weapon" && wClass === "sword") {
    shape = `
      <line x1="12" y1="2"   x2="12" y2="15"   stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="6.5" y1="13.5" x2="17.5" y2="13.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="15"  x2="12" y2="21"   stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  } else if (type === "weapon" && wClass === "staff") {
    shape = `
      <line x1="12" y1="7" x2="12" y2="22" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="4.3" r="3.1" fill="${color}"/>`;
  } else if (type === "weapon" && wClass === "bow") {
    shape = `
      <path d="M8 2.5 Q18 12 8 21.5" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <line x1="8" y1="2.5" x2="8" y2="21.5" stroke="${color}" stroke-width="1.1" opacity=".55"/>
      <line x1="3" y1="12"  x2="17" y2="12"  stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`;
  } else if (type === "weapon") {
    // weaponClass 미지정 무기 (보스 드랍 등) — 범용 검 아이콘
    shape = `
      <line x1="12" y1="2"   x2="12" y2="15"   stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="6.5" y1="13.5" x2="17.5" y2="13.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="15"  x2="12" y2="21"   stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  } else if (type === "armor") {
    shape = `
      <path d="M12 2 L20 6 L18.3 21 L5.7 21 L4 6 Z" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="12" y1="6" x2="12" y2="17" stroke="${color}" stroke-width="1.1" opacity=".5"/>`;
  } else if (type === "helmet") {
    shape = `
      <path d="M4.5 14.5 A7.5 7.5 0 0 1 19.5 14.5 L19.5 18.5 L4.5 18.5 Z" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="4.5" y1="14.5" x2="19.5" y2="14.5" stroke="${color}" stroke-width="1.4"/>`;
  } else if (type === "potion") {
    shape = `
      <path d="M10 3 H14 V7.2 L17.6 17.8 A2 2 0 0 1 15.7 20.5 H8.3 A2 2 0 0 1 6.4 17.8 L10 7.2 Z" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/>
      <line x1="9" y1="3" x2="15" y2="3" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="8.3" y1="14.5" x2="15.7" y2="14.5" stroke="${color}" stroke-width="1.1" opacity=".5"/>`;
  } else if (type === "key") {
    shape = `
      <circle cx="8" cy="7" r="4" fill="none" stroke="${color}" stroke-width="2"/>
      <line x1="11" y1="10" x2="20" y2="19" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="15" y1="14" x2="17.2" y2="16.2" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="17.5" y1="16.5" x2="19.7" y2="18.7" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    // 알 수 없는 종류 — 보석 모양 기본 아이콘
    shape = `<path d="M12 2 L20 9 L12 22 L4 9 Z" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
  }

  const glowDefs = glow ? `
    <filter id="${uid}g" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>` : "";
  const glowAttr = glow ? `filter="url(#${uid}g)"` : "";

  return `<svg class="item-icon-svg" width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
    <defs>${glowDefs}</defs>
    <g ${glowAttr}>${shape}</g>
  </svg>`;
}

// item: { type, weaponClass?, class? } — SHOP_ITEMS/인벤토리/장비 아이템 모두 동일 구조
// size: 아이콘 한 변 픽셀 크기 (정사각형)
// 실제 이미지가 등록돼 있으면 그 이미지를(등급 색 테두리/발광 포함) 보여주고,
// 없거나 로드에 실패하면 자동으로 벡터 아이콘으로 대체된다.
function getItemIconSVG(item, size = 26) {
  const grade = item?.class || "normal";
  const color = ITEM_GRADE_COLOR[grade] || ITEM_GRADE_COLOR.normal;
  const glow  = !!ITEM_GLOW_GRADES[grade];

  const imgSrc = _lookupItemImage(item);
  if (imgSrc) {
    const fallbackSvg = _buildShapeSVG(item, size);
    const fallbackUri = "data:image/svg+xml," + encodeURIComponent(fallbackSvg);
    const glowStyle = glow ? `box-shadow:0 0 5px ${color}99;` : "";
    return `<span class="item-icon-img" style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:${size}px;height:${size}px;border:1.5px solid ${color}88;border-radius:5px;background:rgba(0,0,0,.3);overflow:hidden;${glowStyle}">
      <img src="${imgSrc}" alt="" style="width:88%;height:88%;object-fit:contain;" onerror="this.onerror=null;this.src='${fallbackUri}';this.style.width='100%';this.style.height='100%';"/>
    </span>`;
  }

  return _buildShapeSVG(item, size);
}

// 아이콘 + 텍스트를 한 줄로 묶어주는 헬퍼 (장비창 등에서 자주 쓰는 패턴)
// textHTML: 아이콘 옆에 표시할 이미 만들어진 HTML 문자열 (예: 색상이 입혀진 이름)
function wrapItemIconText(item, textHTML, size = 18) {
  return `<span style="display:inline-flex;align-items:center;gap:5px;">${getItemIconSVG(item, size)}${textHTML}</span>`;
}

window.ITEM_GRADE_COLOR  = ITEM_GRADE_COLOR;
window.ITEM_ICON_IMAGES  = ITEM_ICON_IMAGES;
window.getItemIconSVG    = getItemIconSVG;
window.wrapItemIconText  = wrapItemIconText;
