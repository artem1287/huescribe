"""Round nov24a: Huescribe now asks to sign in with Google, so the site no longer says "No account"."""
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
R = [
    ("Everything runs in your browser. No account, nothing sent to a server. This website sets no cookies.",
     "Everything runs in your browser. Sign in once with Google; your name and email stay on your device, and nothing is sent to a server. This website sets no cookies."),
    ('"Runs in the browser with no account and no server"', '"Runs in the browser; sign in with Google, nothing sent to a server"'),
]
for a, b in R:
    if a in s:
        s = s.replace(a, b)
    elif b not in s:
        raise SystemExit(f"not found: {a[:60]}")
open(P, "w", encoding="utf-8").write(s)
print("round_nov24a applied")
