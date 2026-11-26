# PromptLift: 50 search terms (Nov 15, 2026)

Built from what similar Chrome extensions and design-to-code tools use in their store listings and pages, and how people describe the task. Search volumes were not measured: the Semrush account had no API units left for this request, so the terms are grouped by intent and ordered by how directly they describe PromptLift, not by volume.

Where each one is used on the site: T = title, D = meta description, H = hero line, S = section headings and lines, F = FAQ, A = image descriptions, L = structured data.

## What it is (core)
1. website design to prompt (T, H, L)
2. AI prompt from a website (T, H)
3. design prompt (S, F, L)
4. AI prompt generator for web design (L)
5. Chrome extension (H, D)
6. Chrome extension for designers (D)
7. Chrome extension for developers (D)
8. website to prompt (H)
9. UI to prompt (F)
10. component to prompt (F)

## The AI tools people use
11. Claude Code (H, D, F, A)
12. Cursor (H, D, F)
13. Lovable (H, D, F)
14. v0 (H, D, F)
15. Bolt (H, D, F)
16. ChatGPT (D)
17. AI coding tool (S, F)
18. AI coding assistant (F)
19. AI website builder (F)
20. vibe coding (D, F, L)

## What it reads from a page
21. color palette (S, F, L)
22. color palette extractor (L)
23. fonts on a website (F)
24. font finder (L)
25. typography (S, F)
26. layout and spacing (S, F)
27. CSS animations (S)
28. hover effects (S, F)
29. design tokens (L)
30. CSS inspector (F, L)

## What people want to do
31. redesign my website with AI (F)
32. web design inspiration (S, L)
33. recreate a website design (F, in spirit; "borrow ideas")
34. improve website design with AI (F)
35. landing page design (sample sites)
36. pricing page design (demo, F)
37. hero section design (F)
38. design for vibe coding (F)
39. no-code website design (F: "Do I need to know how to code?")
40. AI design to code (F)

## Comparisons and alternatives
41. screenshot to code (F)
42. DevTools alternative (F)
43. CSS inspector alternative (F)
44. CSS Peeper alternative (not on the site: naming a competitor; use in a blog post instead)
45. design handoff (not used)
46. extract CSS from a website (not used: describes raw code, which PromptLift avoids)
47. design system extractor (not used)

## Phrases with "copy" (high-intent, left out on purpose)
48. copy website design
49. copy CSS from a website
50. clone website with AI

Now on the site (Nov 15, second pass), in the use-case card "Copy website design? Borrow it instead", which steers from copying to borrowing ideas.

## 15 unique terms (added Nov 15, second pass)
51. website style transfer
52. design brief generator
53. AI-ready design brief
54. design reference for AI
55. make my website look like another site
56. match a website’s style
57. Cursor design prompt
58. Claude Code design prompt
59. Lovable design prompt
60. v0 design prompt
61. Bolt design prompt
62. hover effect inspector
63. animation inspector
64. style guide from any website
65. UI inspiration to code

## Where they all live now
- The new section "One extension, a lot of uses" (nine cards on the modular grid) carries the terms that weren't on the page yet, each in a plain sentence: terms 4, 6, 7, 9, 10, 17–19, 21–24, 29, 31, 33–37, 38, 40–51 and 52–65.
- Every one of the 65 is in the page's visible text; the build checks this (patches/round_nov15k.py fails if one goes missing).
- Earlier "not used" notes for 44–47 no longer apply: all four are in the "For designers and developers" and "An AI-ready design brief" cards.

## AI search and assistants (added 2026-11-19)

Semrush had no API units, so these come from what ranks and what similar extensions call themselves: the Chrome Web Store and dev.to listings for "copy any UI component into Cursor / Claude Code" tools, and the vibe-coding guides that tell people to give the AI "a real visual reference" or a DESIGN.md file.

| Term people and AI answers use | Where it is on the page |
|---|---|
| design reference for AI / visual reference | Comparison section title and lead, FAQ "generic" answer |
| DESIGN.md, AGENTS.md, Cursor rule (.cursor/rules) | FAQ "Can I save the prompt as a DESIGN.md…", comparison table |
| design system extractor / design token extractor | Comparison table column, FAQ "How is it different from DESIGN.md generators…" |
| copy UI component to AI / component copier | Comparison table column, structured-data keywords |
| generic vibe-coded look / AI slop | FAQ "How do I stop my vibe-coded site from looking generic?" |
| no account, no API key | FAQ "Does it need an account or an API key?", llms.txt |
| Codex, Replit, Google Stitch, Figma Make, Windsurf | FAQ "Does it work with Codex, Replit…" |
| how to turn a website design into an AI prompt | HowTo structured data (the three steps) |

Machine-readable files for assistants: `llms.txt` (hand-written overview, homepage/export/llms.txt) and `llms-full.txt` (the page as markdown, rebuilt by build_site.py through llms_full.py). robots.txt names the AI search crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot and others) and allows them. The site doesn't claim a price anywhere, since none is set.

## 2026-11-19 update
The uses and comparison sections were removed for brevity. 12 of the 65 phrases are still in visible text; the rest live only in the meta keywords and structured data, which search engines weigh far less.
