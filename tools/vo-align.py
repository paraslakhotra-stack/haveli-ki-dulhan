#!/usr/bin/env python3
"""Find where each line starts inside a batch recording.

usage: vo-align.py <batch.txt> <words.json> <starts.json>

batch.txt holds one paragraph per line (as written by `vo-build.mjs scripts`); words.json is the recogniser
output [{w, s, e}]. Lines are matched to recognised words with difflib; each line starts at the first
recognised word that maps into it, and boundaries are snapped to the largest pause between neighbours.
"""
import difflib, json, re, sys

def norm(t):
    t = t.lower().replace("’", "'")
    t = re.sub(r"(\d+)", lambda m: f" {m.group(1)} ", t)
    return [w for w in re.split(r"[^a-z0-9']+", t) if w]

lines = [l for l in open(sys.argv[1], encoding="utf8").read().split("\n\n") if l.strip()]
words = json.load(open(sys.argv[2]))
exp, owner = [], []
for i, l in enumerate(lines):
    for w in norm(l):
        exp.append(w); owner.append(i)
rec, rec_i = [], []
for j, w in enumerate(words):
    for t in norm(w["w"]):
        rec.append(t); rec_i.append(j)

sm = difflib.SequenceMatcher(a=exp, b=rec, autojunk=False)
first = [None] * len(lines)  # first matched recognised word per line
last = [None] * len(lines)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        li, wj = owner[a + k], rec_i[b + k]
        if first[li] is None or wj < first[li]: first[li] = wj
        if last[li] is None or wj > last[li]: last[li] = wj

starts = [0.0]
report = []
for i in range(1, len(lines)):
    lo = last[i - 1] if last[i - 1] is not None else None
    hi = first[i]
    if lo is None or hi is None or hi <= lo:
        report.append(f"!! line {i}: weak anchors (prev last={lo}, first={hi})")
        hi = hi if hi is not None else (lo + 1 if lo is not None else 0)
        lo = hi - 1
    # the boundary is the largest gap between recognised words in (lo, hi]
    best, at = -1, hi
    for j in range(lo + 1, hi + 1):
        gap = words[j]["s"] - words[j - 1]["e"]
        if gap > best: best, at = gap, j
    starts.append(words[at]["s"])
    report.append(f"{i:2d} @{words[at]['s']:7.2f}  gap {best:4.2f}  {' '.join(w['w'] for w in words[at:at+5])!r}  ⇐ {lines[i][:50]!r}")
json.dump(starts, open(sys.argv[3], "w"))
print("\n".join(report))
