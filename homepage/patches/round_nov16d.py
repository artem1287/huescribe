"""Round nov16d: app screenshots retaken on a sample address (acme.dev) instead of 127.0.0.1."""
import sys
P = "/home/claude/homepage/project/VersionB.dc.html"
B = "/home/claude/homepage/export/build_site.py"
SWAP = (("1be1dd15724759687c9dc604ea2f54f5", "81f93c38d2b7bd14e42096395744091a"),
        ("61b26a5eaa88ab9884237632c301d40f", "659db6cd40cad12a8d670d4a38add19a"),
        ("c070e37e3735e58063a7b2c8aa9d7574", "597d2a742dcc4d9e47334b8dff46bf85"))
for path in (P, B):
    s = open(path, encoding="utf-8").read()
    for a, b in SWAP:
        if a not in s:
            sys.exit(f"{path}: missing {a}")
        s = s.replace(a, b)
    open(path, "w", encoding="utf-8").write(s)
print("ok")
