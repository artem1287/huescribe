"""Round nov16f: the three app screenshots show the green icon in the panel header."""
import sys
for path in ("/home/claude/homepage/project/VersionB.dc.html", "/home/claude/homepage/export/build_site.py"):
    s = open(path, encoding="utf-8").read()
    for a, b in (("81f93c38d2b7bd14e42096395744091a", "234d74be6b56d5d32a678c922ca66b5a"),
                 ("659db6cd40cad12a8d670d4a38add19a", "d09001fbd56b069fa30bd8b06abb5f65"),
                 ("597d2a742dcc4d9e47334b8dff46bf85", "5706d7d19c5ddbd598ba368f1da48c09")):
        if a not in s:
            sys.exit(f"{path}: missing {a}")
        s = s.replace(a, b)
    open(path, "w", encoding="utf-8").write(s)
print("ok")
