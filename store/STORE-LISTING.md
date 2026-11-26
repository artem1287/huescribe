# Huescribe: Chrome Web Store kit

Everything in this folder goes into the Chrome Web Store Developer Dashboard. Nothing here needs filling in: copy each block into the matching field.

## What's in the kit

| File | Where it goes |
|---|---|
| `huescribe.zip` | Package tab → Upload new package |
| `icon-store-128.png` | Store listing → Store icon (128×128, artwork 96×96 with 16 px clear padding) |
| `screenshot-1.png` … `screenshot-3.png` | Store listing → Screenshots (1280×800, in this order) |
| `promo-small-440x280.png` | Store listing → Small promo tile |
| `promo-marquee-1400x560.png` | Store listing → Marquee promo tile (optional, needed to be featured) |
| `huescribe-website.zip` | Your website host (see step 2) |

## Step by step

1. **Developer account.** Open the Chrome Web Store Developer Dashboard (chrome.google.com/webstore/devconsole) with the Google account that should own Huescribe. Accept the developer agreement and pay the one-time registration fee ($5 at the time of writing; the dashboard shows the current amount). Verify the contact email it asks for: Google sends review notices there, and it's how people reach you from the listing's Support tab.
2. **Put the website online** (the listing needs a privacy policy link). Unzip `huescribe-website.zip` and drag the folder onto app.netlify.com/drop (or any static host). Your privacy policy is then at `https://<your-site>/privacy.html`.
3. **Add the item.** In the dashboard: Add new item → upload `huescribe.zip`.
4. **Store listing tab.** Paste the texts below and upload the images.
5. **Privacy tab.** Paste the answers below and the privacy policy link from step 2.
6. **Distribution tab.** Visibility: Public. Regions: all. Pricing: free.
7. **Submit for review.** Reviews usually take a few days, sometimes longer for extensions that can read all sites. You'll get an email either way.
8. **After it's live,** the "Add Huescribe to Chrome" buttons on the website already work: they open a Chrome Web Store search for Huescribe.

## Store listing

**Name** (comes from the package, 52 of 75 characters): Huescribe: Copy Any Website's Design as an AI Prompt

**Summary** (comes from the package, 132 of 132 characters):
Copy colors, fonts, layout and animations from any website as a ready-to-paste prompt for Claude Code, Cursor, Lovable, v0 and Bolt.

**Category:** Developer Tools
**Language:** English

**Description:**

```
See a website design you love? Copy it into your own site with AI, without copying the site.

Huescribe is a free Chrome side panel that turns any part of a website into a ready-to-paste AI prompt. Click a pricing table, a hero section, a navbar or a button with a great hover effect, choose what you want from it (colors, fonts, layout or motion), and Huescribe writes a precise design prompt for the AI coding app you build with: Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt, Windsurf, GitHub Copilot, Gemini or Replit.

HOW IT WORKS
1. Click anything on a web page. Arrow keys grow the pick to a whole section; drag a box around any area.
2. Choose what to take: colors, fonts, layout, motion. Take only what you need; your site keeps the rest of its own style.
3. Copy the prompt and paste it into your AI app. Collect several parts first and they go out as one prompt.

WHAT IT READS FROM A WEBSITE
• Color palette, gradients and contrast, with the exact hex values
• Typography: font families, sizes, weights, line height and letter spacing, mapped onto the fonts you already use
• Layout and spacing: grid and flex columns, gaps, padding, widths and how it changes on mobile
• Hover effects, button presses and CSS animations, with their timing and easing
• Scroll effects and motion you record by using the page
• Shadows, borders and corner radius: the small design details that make a UI feel finished

WHY PEOPLE USE IT
• Vibe coding with real references instead of "make it look like that site"
• Front-end developers and indie hackers who want a component that matches a design they saw
• Designers who want to hand an AI exact styles instead of screenshots
• Anyone rebuilding a landing page, pricing page, dashboard or portfolio with AI

BORROW IDEAS, NOT PAGES
Huescribe describes design. It never copies a site's text, photos, logos or code, and the prompt tells your AI app to keep your own words, images and brand.

FREE AND PRIVATE
Sign in once with Google; your name and email stay in this browser. No API key, no analytics and no Huescribe server. Everything runs in your browser; the prompt goes only to your clipboard. Huescribe reads a page only when you pick something there and switches off when you close the panel.

Available in 15 languages, including English, Español, Português, Français, Deutsch, Русский, 日本語, 한국어 and 中文. Open it with the toolbar icon or Alt+Shift+P.
```

**Why it's written this way (search):** the store's search weighs the name most, then the summary, then the description. The name now carries the phrase people type ("copy website design", "AI prompt"); the summary carries the five things it copies and the top AI apps by name; the description repeats each feature in the words people search for (color palette, typography, CSS animations, hover effects, vibe coding, landing page) once, with no keyword lists. Google's rules suspend listings for repeated or unrelated keywords, so nothing is repeated just for search.

## Google sign-in setup (once, about 10 minutes, before the first upload that ships it)
1. **Upload a draft first** (step 3 above) so the item has its ID. In the dashboard: *Package → View public key*. Copy the key into `manifest.json` as `"key": "<that key>"` (keeps the same ID when you load the unpacked copy).
2. **Google Cloud Console** (console.cloud.google.com) with the same Google account → create a project "Huescribe".
3. *APIs & Services → OAuth consent screen*: External, app name Huescribe, your support email, the website and privacy policy links. Scopes: only `openid`, `email`, `profile` (these need no Google verification). Publish the app (status "In production").
4. *Credentials → Create credentials → OAuth client ID → Chrome Extension*. Item ID: the ID from step 1. Copy the client ID.
5. In `manifest.json`, replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with it. Rebuild the zip and upload. Until this is done the panel says "Google sign-in isn't set up in this copy of Huescribe yet."

## Privacy tab

**Single purpose:**
Huescribe turns parts of a website the user picks into a written design prompt (colors, fonts, layout and motion) that the user pastes into an AI coding app.

**Permission justifications:**

- **activeTab:** Lets Huescribe draw the picking outline on the tab the user is looking at and take a screenshot of the visible tab, cropped to the part the user picked, so the panel can show a small picture of it.
- **scripting:** Adds the picking outline and the design reader to the page only after the user opens the Huescribe panel, and removes them when the panel closes.
- **storage:** Keeps the user's list of picked parts (session storage, cleared when the browser closes) and their settings, such as the chosen AI app and their own standing instructions, on their device.
- **sidePanel:** Opens Huescribe as a panel next to the page, so the user can pick parts while seeing the site.
- **identity:** Lets the user sign in with their Google account (Chrome's own Google sign-in window) to use Huescribe. Only the basic profile (name, email, photo) is read, once, and kept on the user's device; it is not sent anywhere else.
- **Host permission (all sites):** The user can pick design details on any website they choose. Huescribe reads the part they pick and downloads that page's own CSS files to describe the design accurately. It does nothing on a page until the user opens the panel and picks something there.

**Are you using remote code?** No, I am not using remote code. (All scripts are inside the package.)

**Data usage: what user data do you plan to collect?** Tick **Personally identifiable information** (name, email address, from Google sign-in). Nothing is sent to the developer: the profile and everything Huescribe reads stay in the browser, and the prompt goes only to the clipboard. Ticking it is the safe answer, because the extension handles that data even though it keeps it on the device.

**Certifications:** Tick all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://<your-site>/privacy.html` (from step 2).

## Test instructions for the reviewer (optional field)

```
Sign in with any Google account when the panel asks (one click). Then open any website, click the Huescribe icon (or press Alt+Shift+P) to open the side panel, then click a section of the page. Choose Colors and Layout, press "Add to my list", then "Copy prompt". The prompt is on the clipboard.
```
