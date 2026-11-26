# Huescribe website: how to publish

This folder is the whole website: plain HTML and CSS. There's nothing to fill in and no build step, so you can upload it as it is to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages or your own server).

## Upload

- **Netlify:** drag this folder onto app.netlify.com/drop.
- **Cloudflare Pages:** create a project → "Upload assets" → choose this folder.
- **GitHub Pages:** put the files in a repository and turn on Pages for it.

Then connect a domain in the host's settings if you have one. The site works on any address.

## What's in it

| File | What |
|---|---|
| `index.html` | The homepage |
| `privacy.html`, `terms.html` | Privacy policy and terms of use |
| `assets/` | Fonts (served from the site itself) and the legal pages' styles |
| `images/` | Photos, app screenshots, icons and `share.jpg` (the picture shown when the link is shared) |
| `_headers` | Caching rules for Netlify and Cloudflare Pages (other hosts ignore it) |
| `robots.txt` | Lets search engines and AI assistants (ChatGPT, Claude, Perplexity, Gemini, Copilot) in, naming each crawler |
| `llms.txt`, `llms-full.txt` | A short overview and the full page as plain text, for AI assistants |

## Good to know

- The "Add Huescribe to Chrome" buttons open a Chrome Web Store search for Huescribe, so they work as soon as the listing is live.
- Use `https://<your site>/privacy.html` as the privacy policy link in the Chrome Web Store listing.
- People can reach you through the Support tab of your Chrome Web Store listing, which is where the site sends them.
- The privacy policy and terms match what the extension actually does, but they aren't legal advice.
