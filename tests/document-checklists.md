# Document checklist smoke test

Run `node tests/document-checklists.mjs` from the repository root. It validates all navigation targets, JSON structure, unique item titles, answer options, and draft metadata without dependencies.

Start Document with `pnpm --filter document run dev`, then run `node tests/document-checklists.mjs http://localhost:5200` to also check both route aliases and served JSON. This checks HTTP delivery; perform the interaction checks below separately.

## Browser checks

1. On the home page, verify Boundary and ALTA remain listed and all eight new drafts appear. Open each and confirm its title, WIP indicator, sections, and references.
2. For each draft, change a required item from No to Yes and back. Verify the not-met count updates. Enter a denial reason and verify it remains attached to that item. Exercise Yes, No, and N/A on an optional item.
3. Open Export PDF, enter reviewer, job number, date, and multiline comments, then choose Download PDF. Verify the downloaded file has the checklist/job filename, title, draft status, reviewer details, summary counts, all sections, answer statuses, references, denial reasons, and page numbers. Confirm long content wraps across pages. There should be no browser print dialog.
4. Repeat in light and dark mode. Check radio controls, notes, reviewer form, and downloaded PDF for readability.
5. Use client-side navigation and browser back/forward between two drafts after changing answers and notes. Verify each newly entered checklist starts with its default answers, empty notes/reviewer data, and no pending export. Also test the legacy `/office/checklists/` aliases.
6. Visit `/checklists/not-a-checklist`, verify the error, then navigate to a valid checklist and confirm recovery. With throttled loading, switch checklists rapidly and verify the final title/content matches the route.

## PDF exporter smoke samples

Run `node tests/document-checklist-pdf.mjs` with Node 22.18+ (native TypeScript support) and installed workspace dependencies. It generates Topographic, ALTA, Minor Plat, and long-content stress samples under `sites/document/dist/pdf-smoke/`. Open these to verify pagination and text. The production build clears this temporary directory.

Check all three radio states, keyboard focus, denial-input contrast, date control, modal labels, placeholders, and buttons in both themes. During export the download/cancel buttons should be disabled; if export fails, the modal should remain open with an error and entered details preserved for retry.

## Content sources and conventions

Reviewed 2026-09-17 against official sources:

- [Current Chapter 5J-17 rule index](https://flrules.org/gateway/ChapterHome.asp?Chapter=5J-17)
- [General map/report requirements, 5J-17.051](https://ccmedia.fdacs.gov/content/download/21299/file/5J-17.051.pdf)
- [Boundary and description/sketch requirements, 5J-17.052](https://ccmedia.fdacs.gov/content/download/21300/file/5J-17.052.pdf)
- [Florida Statutes, Chapter 177](https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0177/0177.html)
- [Plat supporting survey/title documents, 177.041](https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0177/Sections/0177.041.html)
- [Dedication and review, 177.081](https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0177/Sections/0177.081.html)
- [Recording plat content, 177.091](https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0177/Sections/0177.091.html)

The eight entries remain WIP drafts for professional content review. Regulatory entries are concise review prompts, not verbatim rules or exhaustive compliance determinations. `QA review` denotes practical checks; `Local requirements—verify` requires project-specific confirmation. Wetland content concerns locating supplied delineation. Minor Plat assumes no statewide eligibility threshold or automatic exemption from applicable plat requirements. Boundary and ALTA source files are unchanged.
