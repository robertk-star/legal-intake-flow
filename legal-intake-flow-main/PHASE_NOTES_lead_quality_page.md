# Lead Quality Process Page

Added a public marketing page for firms that want to understand why Legal Intake Flow leads are different from basic form-fill disability leads.

## New page

- `/lead-quality`

## Updated navigation

- Added `Lead Quality` to the public header.
- Added `Lead Quality` to the public footer.
- Added homepage links to the lead quality page.
- Added a For Attorneys call-to-action link to the lead quality page.

## Setup

- SQL migration needed: No
- Vercel ENV needed: No

## Verification

- `npm run tsc` passed with zero errors.
- `npm run build` could not complete locally because the environment could not reach Google Fonts. The failure was from `next/font` fetching Inter and Playfair Display, not from the new code.
