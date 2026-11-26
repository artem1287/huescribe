# Huescribe

Huescribe is a Chrome extension. You pick the parts of any website you like, such as its colors, fonts, layout or motion, and it writes a prompt for your AI app (Claude Code, Cursor, Lovable, v0, Bolt and others). This repository holds the extension, its marketing website and the Chrome Web Store kit.

| Folder | What's in it |
|---|---|
| [`huescribe/`](huescribe) | The extension (Manifest V3, version 10.3.0) in 15 languages. Docs: [user_instructions.md](huescribe/user_instructions.md) (what it does), [tech_instructions.md](huescribe/tech_instructions.md) (how it's built) and [user_commands.md](huescribe/user_commands.md) (change log). |
| [`homepage/`](homepage) | The website. `project/VersionB.dc.html` is the design source and is changed only through the re-runnable scripts in `patches/`. `export/build_site.py` builds it into a static site in 15 languages, with translations in `i18n/site/`. |
| [`store/`](store) | The Chrome Web Store listing in 15 languages, the screenshots and promo images, and the Google sign-in setup steps ([STORE-LISTING.md](store/STORE-LISTING.md)). |

## Build

```sh
# Extension package
cd huescribe && zip -r ../huescribe.zip . -x 'tests/*' 'tools/*' '*.md'

# Website: writes static files (plus _headers with the security policy) into site/
python3 homepage/export/build_site.py homepage/project/VersionB.dc.html site
```

Some scripts and tests still use absolute paths from the original workspace (`/home/claude/...`). Change them to match your checkout before running them.

## Before publishing

Create the Google Cloud OAuth client and put its client ID in `huescribe/manifest.json` under `oauth2.client_id`. The steps are in [store/STORE-LISTING.md](store/STORE-LISTING.md).
