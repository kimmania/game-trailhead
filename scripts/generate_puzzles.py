#!/usr/bin/env python3
"""Trailhead puzzle generator — fast diverse Hamiltonian paths.

Strategy:
  • 8-way grids: random DFS with diagonal moves (easy, naturally diverse).
  • 4-way grids: deterministic non-row-snake patterns + short-segment permutations.
  • Rich givens (especially on 4-way) so the topology is constrained and deducible.
"""

import json, random
from pathlib import Path

random.seed(42)

OUTDIR = Path(__file__).resolve().parent.parent / "public" / "puzzles"
OUTDIR.mkdir(parents=True, exist_ok=True)

DIFFICULTIES = {
    "tutorial": {"rows": 5, "cols": 5,  "adj": 8, "givens_lo": 5,  "givens_hi": 7,  "target": 25},
    "easy":     {"rows": 6, "cols": 6,  "adj": 8, "givens_lo": 5,  "givens_hi": 7,  "target": 50},
    "medium":   {"rows": 8, "cols": 8,  "adj": 8, "givens_lo": 6,  "givens_hi": 8,  "target": 100},
    "hard":     {"rows":10, "cols":10, "adj": 8, "givens_lo": 7,  "givens_hi": 10, "target": 300},
    "expert":   {"rows":10, "cols":10, "adj": 4, "givens_lo": 14, "givens_hi": 22, "target": 300},
    "master":   {"rows":12, "cols":12, "adj": 4, "givens_lo": 18, "givens_hi": 28, "target": 300},
}

# ── Fast 4-way deterministic patterns (NOT simple row snakes) ──────

def _col_snake(rows, cols):
    """Snake down columns (looks very different from row snake)."""
    path=[]
    for c in range(cols):
        if c%2==0:
            for r in range(rows): path.append((r,c))
        else:
            for r in range(rows-1,-1,-1): path.append((r,c))
    return path

def _wiggle_rows(rows, cols, period=3):
    """Row snake but rows snake in groups, creating vertical "waves"."""
    path=[]
    blocks=[list(range(i,min(i+period,rows))) for i in range(0,rows,period)]
    for bi,b in enumerate(blocks):
        if bi%2==1: b.reverse()
        for r in b:
            if r%2==0:
                for c in range(cols): path.append((r,c))
            else:
                for c in range(cols-1,-1,-1): path.append((r,c))
    return path

def _wiggle_cols(rows, cols, period=3):
    """Column snake but cols snake in groups, creating horizontal "waves"."""
    path=[]
    blocks=[list(range(i,min(i+period,cols))) for i in range(0,cols,period)]
    for bi,b in enumerate(blocks):
        if bi%2==1: b.reverse()
        for c in b:
            if c%2==0:
                for r in range(rows): path.append((r,c))
            else:
                for r in range(rows-1,-1,-1): path.append((r,c))
    return path

def _staircase(rows, cols, down_first=True):
    """Diagonal staircase: go right 1, down 1, left 1, down 1..."""
    if rows*cols<=0: return []
    path=[]
    # Build a Hamiltonian path that zig-zags on both axes
    r=0; c=0; dr=1 if down_first else -1; dc=1
    # Use a different approach: snake in 2-row or 2-col blocks
    step=2
    for base in range(0,rows,step):
        block_rows=list(range(base,min(base+step,rows)))
        if (base//step)%2==1: block_rows.reverse()
        for rr in block_rows:
            if rr%2==0:
                for cc in range(cols): path.append((rr,cc))
            else:
                for cc in range(cols-1,-1,-1): path.append((rr,cc))
    # De-pattern: swap random adjacent pairs within same row/col
    for _ in range(len(path)//4):
        i=random.randint(1,len(path)-2)
        a,b=path[i],path[i+1]
        # Only swap if it preserves Hamiltonian property (same row or col)
        if a[0]==b[0] or a[1]==b[1]:
            path[i],path[i+1]=b,a
    return path

def _block_zigzag(rows, cols):
    """2×2 block snake that creates a more complex pattern."""
    path=[]
    bh=2; bw=2
    for bi in range(0,rows,bh):
        for bj in range(0,cols,bw):
            block=[]
            for r in range(bi,min(bi+bh,rows)):
                for c in range(bj,min(bj+bw,cols)):
                    block.append((r,c))
            # Reverse every other block
            if ((bi//bh)+(bj//bw))%2==1:
                block.reverse()
            path.extend(block)
    return path

# ── 2-opt valid mutations (for 8-way only, since it preserves adjacency) ──

def _two_opt(path, adj, tries=2000):
    if adj!=8: return path
    p=list(path)
    for _ in range(tries):
        n=len(p)
        if n<6: break
        i=random.randint(1,n-3); j=random.randint(i+2,n-2)
        A,B,C,D=p[i-1],p[i],p[j],p[j+1]
        # Check if A-C and B-D are adjacent (8-way)
        if max(abs(A[0]-C[0]),abs(A[1]-C[1]))<=1 and max(abs(B[0]-D[0]),abs(B[1]-D[1]))<=1:
            p[i:j+1]=p[i:j+1][::-1]
    return p

# ── 8-way random DFS (naturally diverse, works for ≤8×8) ──────────

def _rand_dfs(rows, cols, max_steps=80_000):
    moves=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
    total=rows*cols
    for _ in range(100):
        start=(random.randrange(rows),random.randrange(cols))
        visited={start}; path=[start]; step=0
        while len(path)<total and step<max_steps:
            r,c=path[-1]
            nbr=[(r+dr,c+dc) for dr,dc in moves if 0<=r+dr<rows and 0<=c+dc<cols and (r+dr,c+dc) not in visited]
            if not nbr:
                if len(path)<=2: break
                visited.remove(path.pop()); step+=1; continue
            # Prefer cells with more onward options (Warnsdorff-like)
            def onw(n):
                rr,cc=n; return sum(1 for dr,dc in moves if 0<=rr+dr<rows and 0<=cc+dc<cols and (rr+dr,cc+dc) not in visited)
            nbr.sort(key=lambda n:(onw(n),random.random()))
            nxt=nbr[0]
            visited.add(nxt); path.append(nxt); step+=1
        if len(path)==total:
            return path
    return None

# ── Transforms ──────────────────────────────────────────────────

def _rev(path): return list(reversed(path))
def _rh(path, cols): return [(r,cols-1-c) for r,c in path]
def _rv(path, rows): return [(rows-1-r,c) for r,c in path]
def _r90(path, rows, cols): return [(c,rows-1-r) for r,c in path]

def _all_xforms(path, rows, cols):
    path=list(path)
    variants=[tuple(path),tuple(_rev(path)),tuple(_rh(path,cols)),tuple(_rv(path,rows))]
    if rows==cols:
        rot=path.copy()
        for _ in range(3):
            rot=[(c,rows-1-r) for r,c in rot]
            variants+=[tuple(rot),tuple(_rev(rot)),tuple(_rh(rot,cols)),tuple(_rv(rot,rows))]
    return list(dict.fromkeys(variants))

# ── Givens ──────────────────────────────────────────────────────

def _make_givens(path, lo, hi):
    N=len(path); count=random.randint(lo,hi)
    idx=set()
    if count>=2: idx.update([0,N-1])
    while len(idx)<count:
        c=random.randint(1,N-2)
        if all(abs(c-o)>=2 for o in idx): idx.add(c)
    pool=[i for i in range(1,N-1) if i not in idx]
    random.shuffle(pool)
    for i in pool:
        if len(idx)>=count: break
        idx.add(i)
    return {tuple(path[i]):i+1 for i in idx}

# ── Build bases per difficulty ──────────────────────────────────

def _build_bases(rows, cols, adj):
    bases=[]
    if adj==4:
        # 4-way: use deterministic non-row-snake patterns
        generators=[
            lambda:_col_snake(rows,cols),
            lambda:_wiggle_rows(rows,cols,2),
            lambda:_wiggle_rows(rows,cols,3),
            lambda:_wiggle_cols(rows,cols,2),
            lambda:_wiggle_cols(rows,cols,3),
            lambda:_staircase(rows,cols,True),
            lambda:_staircase(rows,cols,False),
            lambda:_block_zigzag(rows,cols),
        ]
        for gen in generators:
            p=gen()
            if len(p)==rows*cols:
                bases.append(p)
                # Mutate each a few times with pair swaps to break regularity
                for _ in range(3):
                    m=list(p)
                    for __ in range(len(m)//3):
                        i=random.randint(1,len(m)-2)
                        a,b=m[i],m[i+1]
                        if a[0]==b[0] or a[1]==b[1]:
                            m[i],m[i+1]=b,a
                    bases.append(m)
    else:
        # 8-way: random DFS naturally diverse
        targets={5:50,6:60,8:100,10:120}
        t=targets.get(rows,80)
        found=0; tries=0
        while found<t and tries<t*5:
            tries+=1
            steps={5:20_000,6:30_000,8:50_000,10:100_000}.get(rows,50_000)
            p=_rand_dfs(rows,cols,max_steps=steps)
            if p:
                tp=tuple(p)
                if tp not in {tuple(b) for b in bases}:
                    bases.append(p); found+=1
        # Also add some deterministic patterns for 8-way
        bases+=[_col_snake(rows,cols), _wiggle_rows(rows,cols,2)]
    # dedup
    seen=set(); uniq=[]
    for p in bases:
        t=tuple(p)
        if t not in seen: seen.add(t); uniq.append(p)
    return uniq

# ── Main ──────────────────────────────────────────────────────

def generate(diff_key, info):
    rows,cols=info["rows"],info["cols"]; adj=info["adj"]
    lo,hi=info["givens_lo"],info["givens_hi"]
    target=info["target"]
    print(f"[{diff_key}] {rows}x{cols} adj={adj} target={target} ...")
    bases=_build_bases(rows,cols,adj)
    print(f"  unique bases={len(bases)}")
    all_paths=[]; seen=set()
    for p in bases:
        for v in _all_xforms(p,rows,cols):
            if v not in seen: seen.add(v); all_paths.append(v)
    print(f"  expanded={len(all_paths)}")
    puzzles=[]; pkeys=set(); attempts=0
    while len(puzzles)<target and attempts<target*10:
        attempts+=1
        if not all_paths: continue
        p=random.choice(all_paths)
        g=_make_givens(list(p),lo,hi)
        key=(p,frozenset(g.items()))
        if key in pkeys: continue
        pkeys.add(key)
        sol=[0]*(rows*cols)
        for i,(r,c) in enumerate(p): sol[r*cols+c]=i+1
        puzzles.append({"id":f"{diff_key}-{str(len(puzzles)+1).zfill(4)}","rows":rows,"cols":cols,"adjacency":adj,
            "givens":[{"x":c,"y":r,"value":v} for (r,c),v in g.items()],"solution":sol})
        if len(puzzles)%50==0: print(f"  {len(puzzles)}/{target}")
    filename=OUTDIR/f"{diff_key}.json"
    with open(filename,"w") as f: json.dump(puzzles,f)
    print(f"  wrote {len(puzzles)} puzzles")
    return puzzles

if __name__=="__main__":
    import time
    t0=time.time()
    for d,i in DIFFICULTIES.items(): generate(d,i)
    print(f"Total: {time.time()-t0:.1f}s")
