#!/usr/bin/env python3
"""Fast Trailhead puzzle bank generator using snake paths."""

import json, random
from pathlib import Path

random.seed(42)

OUTDIR = Path(__file__).resolve().parent.parent / "public" / "puzzles"
OUTDIR.mkdir(parents=True, exist_ok=True)

DIFFICULTIES = {
    "tutorial": {"rows": 5, "cols": 5,  "adjacency": 8, "givens_lo": 5, "givens_hi": 7,  "target": 25},
    "easy":     {"rows": 6, "cols": 6,  "adjacency": 8, "givens_lo": 5, "givens_hi": 7,  "target": 50},
    "medium":   {"rows": 8, "cols": 8,  "adjacency": 8, "givens_lo": 6, "givens_hi": 8,  "target": 100},
    "hard":     {"rows":10, "cols":10, "adjacency": 8, "givens_lo": 7, "givens_hi": 10, "target": 300},
    "expert":   {"rows":10, "cols":10, "adjacency": 4, "givens_lo": 10,"givens_hi": 14, "target": 300},
    "master":   {"rows":12, "cols":12, "adjacency": 4, "givens_lo": 12,"givens_hi": 16, "target": 300},
}


def _path_snake(rows, cols, row_forward=True, col_forward=True):
    """Standard row snake."""
    path = []
    for r in range(rows):
        if r % 2 == 0:
            c_range = range(cols) if col_forward else range(cols-1, -1, -1)
        else:
            c_range = range(cols-1, -1, -1) if col_forward else range(cols)
        if not row_forward:
            rr = rows - 1 - r
        else:
            rr = r
        for c in c_range:
            path.append((rr, c))
    return path

def _path_snake_cols(rows, cols, row_forward=True, col_forward=True):
    """Column snake."""
    path = []
    for c in range(cols):
        if c % 2 == 0:
            r_range = range(rows) if row_forward else range(rows-1, -1, -1)
        else:
            r_range = range(rows-1, -1, -1) if row_forward else range(rows)
        if not col_forward:
            cc = cols - 1 - c
        else:
            cc = c
        for r in r_range:
            path.append((r, cc))
    return path

def _reflect_h(path, cols):
    return [(r, cols - 1 - c) for r, c in path]

def _reflect_v(path, rows):
    return [(rows - 1 - r, c) for r, c in path]

def _reverse(path):
    return list(reversed(path))


def _all_variants(rows, cols):
    """Generate unique path variants by combining snake orientations and reflections."""
    seen = set()
    variants = []
    generators = [
        lambda rf, cf: _path_snake(rows, cols, rf, cf),
        lambda rf, cf: _path_snake_cols(rows, cols, rf, cf),
    ]
    for gen in generators:
        for rf in (True, False):
            for cf in (True, False):
                base = gen(rf, cf)
                transforms = [base, _reverse(base)]
                transforms += [_reflect_h(t, cols) for t in transforms]
                transforms += [_reflect_v(t, rows) for t in transforms]
                for t in transforms:
                    key = tuple(t)
                    if key not in seen:
                        seen.add(key)
                        variants.append(t)
    return variants


def _make_givens(path, lo, hi):
    N = len(path)
    count = random.randint(lo, hi)
    indices = set()
    if count >= 2:
        indices.add(0)
        indices.add(N - 1)
    while len(indices) < count:
        cand = random.randint(1, N - 2)
        if all(abs(cand - other) >= 2 for other in indices):
            indices.add(cand)
    # fallback: any remaining without spacing
    pool = [i for i in range(1, N - 1) if i not in indices]
    random.shuffle(pool)
    for i in pool:
        if len(indices) >= count:
            break
        indices.add(i)
    return {path[idx]: idx + 1 for idx in indices}


def generate(diff_key, info):
    rows, cols = info["rows"], info["cols"]
    adjacency = info["adjacency"]
    lo, hi = info["givens_lo"], info["givens_hi"]
    target = info["target"]

    print(f"[{diff_key}] {rows}x{cols} adj={adjacency} target={target} ...")
    variants = _all_variants(rows, cols)
    print(f"  variants={len(variants)}")

    puzzles = []
    seen = set()
    n = 0
    while len(puzzles) < target and n < target * 100:
        n += 1
        path = variants[n % len(variants)]
        givens = _make_givens(path, lo, hi)
        key = (tuple(path), frozenset(givens.items()))
        if key in seen:
            continue
        seen.add(key)
        sol = [0] * (rows * cols)
        for i, (r, c) in enumerate(path):
            sol[r * cols + c] = i + 1
        puzzle = {
            "id": f"{diff_key}-{str(len(puzzles) + 1).zfill(4)}",
            "rows": rows,
            "cols": cols,
            "adjacency": adjacency,
            "givens": [{"x": c, "y": r, "value": v} for (r, c), v in givens.items()],
            "solution": sol,
        }
        puzzles.append(puzzle)
        if len(puzzles) % 50 == 0:
            print(f"  {len(puzzles)}/{target}")

    filename = OUTDIR / f"{diff_key}.json"
    with open(filename, "w") as f:
        json.dump(puzzles, f)
    print(f"  wrote {len(puzzles)} puzzles")
    return puzzles


if __name__ == "__main__":
    for diff_key, info in DIFFICULTIES.items():
        generate(diff_key, info)
    print("Done!")
