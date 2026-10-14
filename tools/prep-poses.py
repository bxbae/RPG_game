#!/usr/bin/env python3
"""몬스터 포즈 이미지 준비 — 흰 배경 그림을 투명 PNG 로 바꾸고, 기본 몬스터 그림과 같은 캔버스에 맞춘다.

사용: python3 tools/prep-poses.py <원본 그림이 있는 폴더>
  · 가장자리에서 이어진 흰색만 투명하게 만든다(몸 안쪽의 밝은 부분은 유지)
  · 기본 그림(images/sd_*.png)의 불투명 영역 안에 비율을 유지한 채 맞추고, 발 위치(아래쪽 가운데)를 같게 둔다
    → 포즈를 바꿔도 몬스터가 커지거나 튀지 않는다
결과: images/monsters/<몬스터>_<포즈>.png  (battle-fx.js 의 MONSTER_POSES 가 참조)
"""
import sys
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
# (출력 이름, 원본 파일, 기본 그림, 잘라낼 영역(없으면 전체))
JOBS = [
    # (출력 이름, 원본 파일, 기본 그림, 잘라낼 영역(없으면 전체))
    # 암흑 늑대 → 화염 여우(13.webp). 본체는 늑대와 같은 캔버스에 맞추고(images/sd_flame_fox.png), 포즈는 그 위에 맞춘다
    ("../sd_flame_fox", "13.webp", "sd_dark_wolf.png", (315, 0, 720, 500)),
    ("fox_atk1", "13.webp", "sd_flame_fox.png", (5, 770, 270, 985)),      # 불꽃 호를 그리며 달리기
    ("fox_atk2", "13.webp", "sd_flame_fox.png", (270, 770, 525, 985)),    # 화염 회오리
    ("fox_atk3", "13.webp", "sd_flame_fox.png", (525, 770, 755, 985)),    # 신속 질주
    ("fox_atk4", "13.webp", "sd_flame_fox.png", (985, 770, 1245, 985)),   # 불꽃 폭발
    # 악마 기사(19.webp) · 고대 드래곤(20·21.webp): 본체를 새 그림으로 교체(기존 그림의 캔버스에 맞춤)하고 포즈를 그 위에 맞춘다
    ("../sd_demon_knight_v2", "19.webp", "sd_demon_knight.png", (5, 5, 560, 695)),
    ("demonknight_atk1", "19.webp", "sd_demon_knight_v2.png", (545, 395, 850, 675)),     # 붉은 베기
    ("demonknight_atk2", "19.webp", "sd_demon_knight_v2.png", (330, 715, 595, 990)),     # 돌진
    ("demonknight_atk3", "19.webp", "sd_demon_knight_v2.png", (590, 715, 845, 990)),     # 소용돌이 베기
    ("demonknight_atk4", "19.webp", "sd_demon_knight_v2.png", (10, 705, 335, 990)),      # 검 내밀기
    ("demonknight_hit",  "19.webp", "sd_demon_knight_v2.png", (835, 410, 1040, 670)),    # 망토로 몸을 웅크림
    ("../sd_dragon_v2", "20.webp", "sd_dragon.png", (10, 5, 535, 435)),
    ("dragon_atk1", "20.webp", "sd_dragon_v2.png", (345, 460, 850, 735)),    # 불꽃 숨결
    ("dragon_atk2", "20.webp", "sd_dragon_v2.png", (0, 755, 360, 1045)),     # 화염 회오리
    ("dragon_atk3", "20.webp", "sd_dragon_v2.png", (375, 760, 705, 1045)),   # 도약
    ("dragon_atk4", "20.webp", "sd_dragon_v2.png", (755, 465, 1250, 740)),   # 날개 펴고 내리꽂기
    ("dragon_hit",  "21.webp", "sd_dragon_v2.png", (435, 555, 895, 885)),    # 고통스러운 포효
    ("dragon_dead", "21.webp", "sd_dragon_v2.png", (10, 625, 450, 890)),     # 쓰러져 엎드림
    # 네메시스(22.jpg): 중립 자세를 본체(images/Nemesis_Lord_of_the_Void.png, 기존 그림이 없어 새로 만든다)로, 피격·공격은 그 위에 맞춘다
    ("../Nemesis_Lord_of_the_Void", "22.jpg", None, (655, 60, 1024, 480)),
    ("nemesis_hit",  "22.jpg", "Nemesis_Lord_of_the_Void.png", (5, 60, 335, 480)),
    ("nemesis_atk1", "22.jpg", "Nemesis_Lord_of_the_Void.png", (335, 60, 665, 480)),
    ("goblin_hit",    "3.png",  "sd_goblin.png",   None),
    ("goblin_dead",   "4.png",  "sd_goblin.png",   None),
    ("goblin_atk1",   "11.webp", "sd_goblin.png",  (30, 395, 350, 680)),     # 베기 + 궤적
    ("goblin_atk2",   "11.webp", "sd_goblin.png",  (340, 415, 640, 680)),    # 돌진
    ("goblin_atk3",   "11.webp", "sd_goblin.png",  (340, 70, 610, 370)),     # 칼 들고 포효
    ("skeleton_attack", "5.png", "sd_skeleton.png", None),
    ("skeleton_dead", "6.png",  "sd_skeleton.png", None),
    # 슬라임 시트(12.webp): 둘째 줄 3번째(칼에 찔림) = 피격, 셋째 줄 4번째(X 눈) = 쓰러짐, 둘째 줄 1·2번째 = 공격
    ("slime_hit",     "12.webp", "sd_slime.png",   (870, 380, 1190, 690)),
    ("slime_dead",    "12.webp", "sd_slime.png",   (1110, 740, 1536, 1000)),
    ("slime_atk1",    "12.webp", "sd_slime.png",   (0, 370, 420, 700)),
    ("slime_atk2",    "12.webp", "sd_slime.png",   (420, 390, 860, 690)),
    # 마법 골렘(8.webp 둘째 줄), 던전 수호자(10.webp), 암흑 기사(9.webp)
    ("golem_atk1",    "8.webp",  "sd_magic_Golem.png", (330, 460, 690, 735)),
    ("golem_atk2",    "8.webp",  "sd_magic_Golem.png", (680, 460, 965, 735)),
    ("golem_atk3",    "8.webp",  "sd_magic_Golem.png", (10, 460, 325, 735)),
    ("guardian_atk1", "10.webp", "sd_Dungeon_Guardian.png", (395, 40, 775, 370)),
    ("guardian_atk2", "10.webp", "sd_Dungeon_Guardian.png", (1120, 30, 1530, 370)),
    ("guardian_atk3", "10.webp", "sd_Dungeon_Guardian.png", (40, 410, 420, 700)),
    ("darkknight_atk1", "9.webp", "sd_guardian.png", (30, 380, 480, 670)),
    ("darkknight_atk2", "9.webp", "sd_guardian.png", (470, 380, 800, 670)),
    ("darkknight_atk3", "9.webp", "sd_guardian.png", (840, 380, 1175, 670)),
    # 뱀파이어(14.webp: 셋째 줄 1·2·3번째 = 베기·도약·마법), 와이번(15.webp: 불꽃 숨결·도약·날아들기)
    ("vampire_atk1", "14.webp", "sd_vampire.png", (10, 670, 285, 965)),
    ("vampire_atk2", "14.webp", "sd_vampire.png", (265, 670, 505, 965)),
    ("vampire_atk3", "14.webp", "sd_vampire.png", (500, 670, 745, 965)),
    # 동굴 박쥐(16.webp: 셋째 줄 1·2·3번째), 미라(17.webp: 둘째 줄 1번째 도약·셋째 줄 1·3번째)
    ("bat_atk1",   "16.webp", "sd_bats.png",  (645, 712, 945, 1010)),
    ("bat_atk2",   "16.webp", "sd_bats.png",  (0, 725, 335, 1010)),
    ("bat_atk3",   "16.webp", "sd_bats.png",  (365, 705, 640, 1010)),
    ("mummy_atk1", "17.webp", "sd_mummy.png", (565, 410, 845, 650)),
    ("mummy_atk2", "17.webp", "sd_mummy.png", (25, 650, 315, 935)),
    ("mummy_atk3", "17.webp", "sd_mummy.png", (645, 650, 935, 935)),
    ("wyvern_atk1",  "15.webp", "sd_wyvern.png",  (585, 400, 950, 695)),
    ("wyvern_atk2",  "15.webp", "sd_wyvern.png",  (345, 700, 665, 940)),
    ("wyvern_atk3",  "15.webp", "sd_wyvern.png",  (575, 960, 895, 1215)),
]
# 몬스터는 화면 오른쪽에서 왼쪽(주인공 파티)을 바라본다. 원본 그림이 오른쪽을 향한 포즈는 좌우를 뒤집는다.
FLIP = {
    "slime_atk1", "slime_atk2", "golem_atk1", "guardian_atk2",
    "demonknight_atk1", "demonknight_atk2", "demonknight_atk3",
    "bat_atk1", "bat_atk2", "bat_atk3", "mummy_atk1", "mummy_atk2", "mummy_atk3",
    "vampire_atk1", "vampire_atk2", "vampire_atk3", "wyvern_atk1", "wyvern_atk3", "dragon_atk4",
}
LIGHT = 236   # 이 값 이상이면 '흰 배경'으로 본다


def cut_background(rgb, keep_inner_white=False):
    if rgb.mode == "RGBA" and rgb.split()[3].getextrema()[0] < 200:      # 이미 투명 배경인 시트: 알파를 그대로 쓴다
        return _clean_fragments(rgb)
    a = np.asarray(rgb.convert("RGB")).astype(np.int16)
    h, w, _ = a.shape
    light = a.min(axis=2) >= LIGHT
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    # 몸 사이에 갇힌 '순백' 틈(팔과 무릎 사이 등)도 배경이다. 유령처럼 의도된 밝은 부분은 순백이 아니라서 남는다
    pure = a.min(axis=2) >= (999 if keep_inner_white else 243)
    seen = bg.copy()
    for y0 in range(h):
        for x0 in range(w):
            if pure[y0, x0] and not seen[y0, x0]:
                comp, q2 = [], deque([(y0, x0)]); seen[y0, x0] = True
                while q2:
                    y, x = q2.popleft(); comp.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and pure[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q2.append((ny, nx))
                if len(comp) >= 60:
                    for y, x in comp: bg[y, x] = True
    return _finish(rgb, bg)


def _clean_fragments(rgba):
    al = np.asarray(rgba.split()[3])
    out = _finish(rgba.convert("RGB"), al < 16, keep_alpha=al)
    return out


def _finish(rgb, bg, keep_alpha=None):
    h, w = bg.shape
    # 자른 가장자리에 걸린 이웃 그림의 조각을 지운다(가장 큰 덩어리는 유지)
    fg = ~bg
    lab = np.zeros((h, w), np.int32); comps = []
    for y0 in range(h):
        for x0 in range(w):
            if fg[y0, x0] and not lab[y0, x0]:
                idx = len(comps) + 1; pts, q3 = [], deque([(y0, x0)]); lab[y0, x0] = idx
                while q3:
                    y, x = q3.popleft(); pts.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = idx; q3.append((ny, nx))
                comps.append(pts)
    biggest = max(range(len(comps)), key=lambda i: len(comps[i])) if comps else -1
    for i, pts in enumerate(comps):
        if i != biggest and any(y in (0, h - 1) or x in (0, w - 1) for y, x in pts):
            for y, x in pts: bg[y, x] = True
    if keep_alpha is not None:
        alpha = Image.fromarray(np.where(bg, 0, keep_alpha).astype(np.uint8))              # 원래 알파 유지(가장자리 조각만 제거)
    else:
        alpha = Image.fromarray(((~bg) * 255).astype(np.uint8))
        alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # 흰 테두리 제거 + 부드럽게
    out = rgb.convert("RGBA"); out.putalpha(alpha)
    return out


def trim_pad(pose, margin=0.04):
    """기본 그림이 아직 없을 때: 불투명 영역만 잘라 여백을 붙여 그대로 기본 그림으로 쓴다."""
    pb = pose.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pose = pose.crop(pb)
    mx, my = round(pose.width * margin), round(pose.height * margin)
    out = Image.new("RGBA", (pose.width + 2 * mx, pose.height + 2 * my), (0, 0, 0, 0))
    out.paste(pose, (mx, my), pose)
    return out


def fit_on_base(pose, base_path):
    if base_path is None: return trim_pad(pose)
    base = Image.open(base_path).convert("RGBA")
    bb = base.split()[3].getbbox() or (0, 0, base.width, base.height)
    pb = pose.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pose = pose.crop(pb)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    s = min(bw * 1.1 / pose.width, bh * 1.1 / pose.height, base.width / pose.width, base.height / pose.height)   # 캔버스 밖으로 나가지 않게   # 기본 그림 영역보다 10% 까지는 허용(검·궤적 때문에 몸이 작아지지 않게)
    pose = pose.resize((max(1, round(pose.width * s)), max(1, round(pose.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    x = min(max(0, bb[0] + (bw - pose.width) // 2), base.width - pose.width)
    canvas.paste(pose, (x, max(0, min(bb[3], base.height) - pose.height)), pose)   # 발(아래) 기준 정렬
    return canvas


def main():
    src = Path(sys.argv[1])
    out_dir = ROOT / "images" / "monsters"; out_dir.mkdir(exist_ok=True)
    for name, f, base, rect, *opt in JOBS:
        opts = opt[0] if opt else {}
        im = Image.open(src / f).convert("RGBA")
        if rect: im = im.crop(rect)
        cut = cut_background(im, **opts)
        if name in FLIP: cut = ImageOps.mirror(cut)
        res = fit_on_base(cut, (ROOT / "images" / base) if base else None)
        res.save(out_dir / f"{name}.png", optimize=True)
        print(name, res.size)

if __name__ == "__main__":
    main()
