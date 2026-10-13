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
    ("goblin_hit",    "3.png",  "sd_goblin.png",   None),
    ("goblin_dead",   "4.png",  "sd_goblin.png",   None),
    ("skeleton_attack", "5.png", "sd_skeleton.png", None),
    ("skeleton_dead", "6.png",  "sd_skeleton.png", None),
    # 슬라임 시트(7.webp): 맨 아래 줄 5번째(우는 얼굴) = 피격, 맨 위 줄 5번째(납작해진 모습) = 쓰러짐
    ("slime_hit",     "7.webp", "sd_slime.png",    (975, 703, 1252, 975)),
    ("slime_dead",    "7.webp", "sd_slime.png",    (1262, 118, 1520, 322)),
]
LIGHT = 236   # 이 값 이상이면 '흰 배경'으로 본다


def cut_background(rgb):
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
    s = min(bw / pose.width, bh / pose.height)
    pose = pose.resize((max(1, round(pose.width * s)), max(1, round(pose.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    canvas.paste(pose, (bb[0] + (bw - pose.width) // 2, bb[3] - pose.height), pose)   # 발(아래) 기준 정렬
    return canvas


def main():
    src = Path(sys.argv[1])
    out_dir = ROOT / "images" / "monsters"; out_dir.mkdir(exist_ok=True)
    for name, f, base, rect in JOBS:
        im = Image.open(src / f).convert("RGB")
        if rect: im = im.crop(rect)
        res = fit_on_base(cut_background(im), ROOT / "images" / base)
        res.save(out_dir / f"{name}.png", optimize=True)
        print(name, res.size)

if __name__ == "__main__":
    main()
