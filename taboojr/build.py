#!/usr/bin/env python3
"""Build Taboo Jr.

Validates src/deck.js, then splices it into src/shell.html to produce the
single self-contained index.html that gets copied to the website.

    python3 build.py
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).parent
deck_src = (ROOT / "src" / "deck.js").read_text(encoding="utf-8")

# Pull out every  ["ANSWER", "t1", ... , "t5"],  line.
row_re = re.compile(r'^\[(.+)\],\s*$', re.M)
str_re = re.compile(r'"((?:[^"\\]|\\.)*)"')

cards, errors, warnings = [], [], []
for lineno, line in enumerate(deck_src.splitlines(), 1):
    if not line.startswith('["'):
        continue
    m = row_re.match(line)
    if not m:
        errors.append(f"line {lineno}: card row doesn't end in '],' — {line[:50]}")
        continue
    parts = str_re.findall(m.group(1))
    if len(parts) != 6:
        errors.append(f"line {lineno}: {parts[0] if parts else '?'} has "
                      f"{len(parts)-1} taboo words, need exactly 5")
        continue
    cards.append((lineno, parts[0], parts[1:]))

# --- checks -------------------------------------------------------------
seen = {}
for lineno, answer, taboos in cards:
    key = answer.upper()
    if key in seen:
        errors.append(f"line {lineno}: duplicate answer {answer!r} "
                      f"(first seen line {seen[key]})")
    seen[key] = lineno

    if answer != answer.upper():
        warnings.append(f"line {lineno}: answer {answer!r} isn't uppercase")

    low = [t.lower() for t in taboos]
    if len(set(low)) != len(low):
        errors.append(f"line {lineno}: {answer} repeats a taboo word")

    a = answer.lower()
    for t in low:
        if t == a:
            errors.append(f"line {lineno}: {answer} lists itself as taboo")
        elif t and (t in a or a in t):
            # Legal, just redundant — you can't say part of the answer anyway.
            warnings.append(f"line {lineno}: {answer} — taboo {t!r} overlaps the answer")

# Words leaned on so hard they stop feeling like clues.
from collections import Counter
overused = Counter(t.lower() for _, _, ts in cards for t in ts)

# --- report -------------------------------------------------------------
for w in warnings:
    print(f"  warn: {w}")
for e in errors:
    print(f" ERROR: {e}", file=sys.stderr)
if errors:
    sys.exit(f"\n{len(errors)} error(s) — index.html NOT written.")

print(f"\n{len(cards)} cards, {len(cards)*5} taboo words, no duplicates.")
print("Most-reused taboo words:",
      ", ".join(f"{w}×{n}" for w, n in overused.most_common(6)))

# --- splice -------------------------------------------------------------
shell = (ROOT / "src" / "shell.html").read_text(encoding="utf-8")
if "/* __DECK__ */" not in shell:
    sys.exit("src/shell.html is missing the /* __DECK__ */ marker.")

out = shell.replace("/* __DECK__ */", deck_src.strip())
(ROOT / "index.html").write_text(out, encoding="utf-8")
kb = len(out.encode("utf-8")) / 1024
print(f"Wrote index.html ({kb:.0f} KB)")
