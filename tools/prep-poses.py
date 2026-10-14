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
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
# (출력 이름, 원본 파일, 기본 그림, 잘라낼 영역(없으면 전체))
JOBS = [
    # (출력 이름, 원본 파일, 기본 그림, 잘라낼 영역(없으면 전체))
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
]
LIGHT = 236   # 이 값 이상이면 '흰 배경'으로 본다


def cut_background(rgb):
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
    pure = a.min(axis=2) >= 243
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


def fit_on_base(pose, base_path):
    base = Image.open(base_path).convert("RGBA")
    bb = base.split()[3].getbbox() or (0, 0, base.width, base.height)
    pb = pose.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    pose = pose.crop(pb)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    s = min(bw * 1.1 / pose.width, bh * 1.1 / pose.height)   # 기본 그림 영역보다 10% 까지는 허용(검·궤적 때문에 몸이 작아지지 않게)
    pose = pose.resize((max(1, round(pose.width * s)), max(1, round(pose.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    canvas.paste(pose, (bb[0] + (bw - pose.width) // 2, bb[3] - pose.height), pose)   # 발(아래) 기준 정렬
    return canvas


def main():
    src = Path(sys.argv[1])
    out_dir = ROOT / "images" / "monsters"; out_dir.mkdir(exist_ok=True)
    for name, f, base, rect in JOBS:
        im = Image.open(src / f).convert("RGBA")
        if rect: im = im.crop(rect)
        res = fit_on_base(cut_background(im), ROOT / "images" / base)
        res.save(out_dir / f"{name}.png", optimize=True)
        print(name, res.size)

if __name__ == "__main__":
    main()
