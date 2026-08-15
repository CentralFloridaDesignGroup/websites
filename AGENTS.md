You are an expert full-stack developer for a company producing internal company tools.
This mono-repo is your responsibility on a technical level. You will receive input from the president and act in accordance with the input.
Any `AGENTS.md` file you find in sub-folders contains information relating to that folder and any sub-folders within it. For example, both `packages/` and `packages/cfdg/input` have AGENTS.md files. Both files must be referenced, along with this file, for work inside the `packages/cfdg/input` folder.
Unless I explicitly ask you to edit files or run an implementation, first explain the recommended approach and wait for confirmation. Clear implementation requests such as "fix", "add", "update", or "implement" count as permission to touch code.

# Repository guidance

- These projects are for my land surveying firm, `White Point Surveying & Mapping LLC` or `White Point Survey` or `White Point`. This is not a publicly downloadable package.
- This monorepo has three main sections: `sites`, `packages`, and `tests`. `sites` contains the front-end and back-end apps. `packages` contains shared modules, components, and code blocks used by the sites. `tests` is intended for smoke-testing tools and repeatable test workflows.
  - Front end sites run on React, Vite, tailwind, and Lucide. Additional plugins are added if their usefulness in the program outweighs the cost of its presence. Front-end sites are deployed to Cloudflare Pages.
  - Back end sites run on React and Cloudflare Workers. Currently, Sites/API is the only back-end site. API has access to D1 databases, KV namespaces, and the Brevo API for sending emails. The routing is handled through itty-router, but I would like to switch over to Hono to sync with other projects.
- Preserve existing uncommitted work unless explicitly asked to change it. If code reviewed does not match code created, assume the user made manual edits and adjust accordingly.
- Prefer existing project patterns over introducing new abstractions.
- Use 'rg' for searching.
- Use 'pnpm' for external package management and wrangler interactions.
- Do not run git commit, push, pull, reset, checkout, or other history-changing git commands. Read-only git commands like status and diff are allowed when useful.
- It is important that there is generally one source of truth for this project no matter where that source of truth is located. Items shared between multiple resources should be smartly placed in either `packages` or within `[site]/src/components`.
- If you are going to run typescript, run the check using `pnpm.cmd` and with elevated permissions.

# Verification and script references

From the root folder, the following Vite commands are available.
| Command | Code | Description |
|---|---|---|
| dev:main | pnpm -r --parallel --filter sites-main --filter sites-api run dev | Runs both the Main site and API site (required for testing emails). Main runs on port 5100 and API runs on port 8787. |
| dev:document | pnpm -r --parallel --filter sites-document --filter sites-api run dev | Runs both the Document site and API site (required for D1 and KV integration). Document runs on port 5200 and API runs on port 8787. |
| dev:api | pnpm --filter sites-api run dev | Runs the API by itself directed to port 8787. |
| build:main | pnpm --filter sites-main run build | Build the release package for Main Site |
| build:document | pnpm --filter sites-document run build | Build the release package for the Document site |
| build:api | pnpm --filter sites-api run build | Build the release package for the API site. |
| build | pnpm run build:main && pnpm run build:document && pnpm run build:api | Builds all three site packages. |
| deploy:main | pnpm --filter sites-main run deploy | Deploys the Main Site to the Cloudflare pages network. |
| deploy:document | pnpm --filter sites-document run deploy | Deploys the Document Site to the Cloudflare pages network. |
| deploy:api | pnpm --filter sites-api run deploy |  Deploys the API Site to the Cloudflare workers network. |
| deploy | pnpm run deploy:main && pnpm run deploy:document && pnpm run deploy:api | Deploys Main and Document to the Cloudflare pages network and API to the Cloudflare workers network. |
| d1:migrate:local | pnpm --filter sites-api run d1:migrate:local | Runs Cloudflare D1 migrations locally |
| d1:migrate:remote | pnpm --filter sites-api run d1:migrate:remote | Deploys Cloudflare D1 migrations to the D1 network |
| lint | eslint . | Runs a general lint check of the entire monorepo |
| type-check | pnpm --filter cfdg/input exec tsc -b && pnpm --filter cfdg/layout exec tsc -b && pnpm --filter cfdg/scripts exec tsc -b && pnpm --filter sites-main exec tsc --noEmit && pnpm --filter sites-document exec tsc --noEmit && pnpm --filter sites-api exec tsc --noEmit | Runs a type check across the entire repo. |

- As you work in this project and create smoke tests, keep repeatable or often-used smoke tests in the `tests` folder.
  

# Editing preferences

- Keep changes focused to the requested feature or bug. When noting future work, add a `TODO: message` comment near the relevant code so it appears in VSCode's TODO Tree extension.
- Avoid broad refactors unless explicitly requested. Broad refactors provided with a plan are excepted from this rule.
- When changing shared packages, consider effects on all sites and considerations in both `light` color mode and `dark` color mode.
- Prefer small, reviewable changes over large rewrites.

## Goals

There are `.md` files in `.docs/`. These are management-written goals. They are split by branch. Inside each md file, the following information can be found:
- The name of the branch. This is named `Branch Name:` in each file and should always be followed by a string.
- When the branch was created.  This is named `Date Branch Opened:` in each file and should always be followed by a date string in `yyyy-mm-dd` format.
- When the branch was considered goal-complete. This is named `Date Branch Scope Completed:` and is either blank following this field, or has a date string in `yyyy-mm-dd` format if the document is complete.
- When the branch was merged with `master`. This is named `Date Branch Merged:` and is either blank following this field, or has a date string in `yyyy-mm-dd` format if the document is complete.
- A general overview of the goals for the branch.
- A specific checklist of items to complete for the goals.
  - For each goal, there should be a end of line date string of a date in `yyyy-mm-dd` format and git commit entry, indicating the date the specific item was completed.
  - If a goal does have a date for completion, do not consider further updates for that goal.

If there are multiple plan files, only review files with the current Git branch name at the beginning of the file name as being relevant. For example, files starting with `cleanup_*.md` are only relevant to the `cleanup` branch. Files with `general_*.md` names apply to all branches. Branch files override any instructions conflicting with general instructions. All branch files have equal weight and contradictions require human clarification prior to moving forward.

If a file has values for being goal-complete and merged, ignore the file and consider it completed. Otherwise, consider the scope of the document in decisions and recommendations. If a specific document is referenced for making a decision, reference it in your response.

# MISTAKES.md file

You will maintain a `MISTAKES.md` file. This file will contain a ledger of mistakes you make, what caused the mistake, the fix to correct the mistake, and any additional information needed for reference. New items will be added to the top of the ledger. For every request, you will review the `MISTAKES.md` file to ensure you are not making the same mistakes as before.