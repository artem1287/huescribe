# Rules for this repository

- **Docs:** each project keeps three files: `user_instructions.md` (every visible feature), `tech_instructions.md` (stack, modules, data flow, pitfalls) and `user_commands.md` (a dated log). Update them in the same change as the code.
- **Language:** code comments are in English.
- **Errors:** anything that can fail tells the user what happened in plain words and logs the details for the developer.
- **Layout:** front ends work from 320px wide, and touch targets are at least 44×44px.
- **Style:** shadcn-like, with Lucide icons as inline SVG. No emoji icons.
- **Website:** change `homepage/project/VersionB.dc.html` only through a new script in `homepage/patches/`. Then rebuild, and add the translations in `homepage/i18n/site/`.
- **Testing:** test before delivering. Check the front end in a real browser, covering both states and widths of 320, 390 and 1440px.
- **.gitignore:** keep it up to date.
