"""Check a translation file against its source.

python3 check_translation.py <source.json> <lang.json>
Source: [{"id", "text", ...}]. Translation: {"id": "text"}. Reports missing ids, unknown ids, marker
mismatches (⟨0⟩, ⟨/0⟩, ⟨1/⟩ must appear exactly as in the source), {placeholders} that differ, and strings
left identical to English (a warning only: names and short terms may legitimately stay).
Exit code 1 when there is an error.
"""
import json
import re
import sys
from collections import Counter

src = json.load(open(sys.argv[1], encoding="utf-8"))
tr = json.load(open(sys.argv[2], encoding="utf-8"))
ids = {s["id"]: s["text"] for s in src}
errors, same = [], []
for i, text in ids.items():
    if i not in tr:
        errors.append(f"missing {i}: {text[:60]!r}")
        continue
    t = tr[i]
    forms = list(t.values()) if isinstance(t, dict) else [t]  # plural entries: {one, few, many, other…}
    if isinstance(t, dict) and "other" not in t:
        errors.append(f"plural without 'other' in {i}")
    if not forms or any(not isinstance(f, str) or not f.strip() for f in forms):
        errors.append(f"empty {i}")
        continue
    for f in forms:
        for pat, what in ((r"⟨/?\d+/?⟩", "markers"), (r"\{[a-zA-Z0-9_]+\}", "placeholders")):
            a, b = Counter(re.findall(pat, text)), Counter(re.findall(pat, f))
            if what == "placeholders" and isinstance(t, dict):
                a, b = set(a), set(b)  # a plural form may drop {n} ("one item") but must add nothing new
                if not b <= a: errors.append(f"unknown placeholder in {i}: {f[:50]!r}")
                continue
            if a != b:
                errors.append(f"{what} differ in {i}: {text[:50]!r} -> {f[:50]!r}")
        if isinstance(t, str) and t.strip() == text.strip() and len(text) > 12:
            same.append(text[:50])
for i in tr:
    if i not in ids:
        errors.append(f"unknown id {i}")
print(f"{len(ids)} strings, {len(errors)} errors, {len(same)} left in English")
for e in errors[:40]:
    print("ERROR", e)
for s in same[:15]:
    print("same", repr(s))
sys.exit(1 if errors else 0)
