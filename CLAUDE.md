# CLAUDE.md

This repository contains a **personal house-bills website** built from the spreadsheet source used to split utility costs between residents.

The goal is to convert the existing Excel workflow into a **static website deployable on GitHub Pages**, while preserving the original logic for:
- electricity (`luz`)
- gas (`gás`)
- water (`água`)
- optional internet/network monthly fixed cost (`net` / `meo` when present)
- date ranges for each bill
- daily presence / weighted occupancy per resident
- per-utility totals, parts, and euro-per-part
- per-person monthly breakdowns
- comparison charts across months

## Working style

- Use **conventional commits** for all git commits.
- **Do not add Claude as a co-author** in commits, PRs, generated files, or commit trailers.
- Prefer small, reviewable commits.
- Before making major structural changes, explain the plan briefly in the PR / task notes.
- Keep code readable and strongly typed where possible.

## Commit format

Use this style:
- `feat: add monthly bill import parser`
- `fix: correct gas split when resident joins mid-cycle`
- `refactor: extract occupancy calculation helpers`
- `docs: update github pages deployment steps`
- `test: add coverage for weighted split rules`
- `chore: configure eslint and prettier`

Allowed conventional commit types:
- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `build`
- `ci`
- `perf`

## Product intent

Build a personal website that reproduces the spreadsheet behavior in a clearer interface.

The site should allow the user to:
1. browse monthly bills
2. view totals by utility and by person
3. inspect bill date windows
4. understand how each resident contributed during each billing period
5. compare months with charts
6. optionally add or edit months locally in the repo data files

This is a **personal project**, not a SaaS product. Keep the scope practical.

## Hosting constraints

The website must work on **GitHub Pages**, so prefer a **static-first architecture**.

This means:
- no required backend
- no server database
- no server-side secrets
- all core functionality must run from static assets
- data should live in versioned files such as JSON under the repo

If a dynamic feature is proposed, also provide a static-compatible alternative.

## Recommended architecture

Use a **monorepo**.

Suggested structure:

```text
/
  apps/
    web/                # GitHub Pages site
  packages/
    bills-core/         # calculation engine and shared types
    ui/                 # reusable presentational components if needed
  data/
    months/             # normalized monthly JSON files
    summary/            # derived summary JSON if useful
  scripts/
    import-xlsx/        # spreadsheet-to-JSON conversion scripts
    validate-data/      # schema and consistency checks
  docs/
    screenshots/
```

## Recommended stack

Preferred option:
- `apps/web`: **Astro** or **Vite + React**
- `packages/bills-core`: TypeScript library with all calculation rules
- charts: `recharts` or `chart.js`
- tables: simple React tables, avoid overengineering
- validation: `zod`
- tests: `vitest`
- formatting/linting: `prettier` + `eslint`

### Why

This project is ideal for:
- static deployment
- JSON-backed data
- deterministic calculations
- easy chart rendering
- easy GitHub Pages publishing

## Source spreadsheet understanding

The original workbook contains:
- a `Resumo` sheet with month-level summaries
- one sheet per month
- each month includes utility sections for electricity, gas, and water
- each utility has:
  - bill total amount
  - billing start date
  - billing end date
  - daily occupancy / weight rows for residents
  - a calculated total of `partes`
  - a calculated `euro/parte`
- there are resident rows like `Vinicius`, `Julia`, `Henrique`, plus empty placeholder rows
- some months contain different weights, for example `1.2` for some residents and `1.0` for others
- some residents join or leave during the billing interval, so the split is **date-sensitive**
- the summary sheet aggregates monthly utility totals and per-person averages / totals

## Critical business rules

Preserve these rules unless the user explicitly changes them:

1. **Each utility has its own billing window**
   - Electricity, gas, and water may use different start and end dates in the same month.

2. **Splits are based on daily weights**
   - A resident may have a weight like `1.0` or `1.2` on a given day.
   - Empty cells mean the resident is not participating for that day.

3. **Total parts for a utility**
   - For each day in the billing range, sum all resident weights.
   - Sum those daily totals across the utility billing window.
   - That produces `partes` for the utility.

4. **Euro per part**
   - `euroPerPart = utilityTotal / totalParts`

5. **Per-person utility share**
   - For each resident, sum that resident’s daily weights across the utility billing window.
   - Multiply by `euroPerPart`.

6. **Per-person monthly total**
   - Sum electricity + gas + water shares.
   - Add fixed internet/network share if the month includes it.

7. **Summary page**
   - Must show cross-month comparisons for totals and/or per-person totals.

8. **Missing or zero-value months**
   - Keep zeros explicit when a bill is absent or not yet entered.
   - Do not silently fabricate values.

## Data modeling guidance

Create a normalized format instead of reproducing spreadsheet cell references.

Example shape:

```ts
export type ResidentName = string;

export type UtilityType = 'electricity' | 'gas' | 'water';

export interface UtilityBill {
  type: UtilityType;
  label: string;
  total: number;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  notes?: string | null;
}

export interface ResidentDailyWeights {
  resident: ResidentName;
  days: Record<string, number | null>; // ISO date -> weight
}

export interface MonthlyBillData {
  monthId: string; // ex: 2026-03
  monthLabel: string; // ex: Março 2026
  utilities: UtilityBill[];
  residents: ResidentDailyWeights[];
  internetFixedCost?: number | null;
}
```

However, because each utility can have a different date range, the implementation should internally derive utility-specific daily slices per resident.

## Import strategy

Do not hardcode spreadsheet cell addresses throughout the app.

Instead:
1. create a one-time or repeatable import script under `scripts/import-xlsx`
2. convert the spreadsheet into normalized JSON files
3. validate the generated JSON
4. make the website consume only the normalized JSON

### Import expectations

The importer should:
- read the `Resumo` sheet
- read each monthly sheet
- ignore placeholder residents like `null` if they are not real people
- preserve notes such as `Novo gás` when present
- convert Excel dates safely into ISO strings
- preserve month ordering
- generate deterministic JSON output

## UI expectations

The website should feel like a clean personal dashboard.

Minimum pages / sections:

### 1. Home / Summary
- monthly cards with total amount
- totals by utility
- chart for utility totals by month
- chart for per-person totals by month
- optional chart for utility cost trend

### 2. Monthly detail page
- month header and billing dates
- utility summary cards
- per-person breakdown table
- utility-by-utility detail
- resident participation overview

### 3. Calculation transparency
- show enough detail that the split is explainable
- include:
  - total bill amount
  - total parts
  - euro per part
  - resident weighted parts
  - resident final share

### 4. Data management docs
- short instructions on how to add a new month via JSON or by rerunning the importer

## UX guidance

- Use a light, calm dashboard style.
- Prioritize legibility over decoration.
- Make charts understandable at a glance.
- Prefer clear labels like `Electricity`, `Gas`, `Water`, `Internet`.
- Show currency in euros with locale-aware formatting.
- Show dates in a consistent Portuguese-friendly format.
- Highlight when a resident only participated for part of a billing period.

## GitHub Pages compatibility

If using Astro or Vite:
- configure base path correctly for GitHub Pages
- ensure asset paths are compatible with subpath deployment
- document deployment in `README.md`
- use GitHub Actions for automatic deployment

## Testing requirements

Add tests for the calculation engine before polishing the UI.

Must cover:
- equal split with 2 residents
- weighted split with `1.2` vs `1.0`
- resident joining mid-period
- resident absent for full period
- zero total bill
- multiple utilities with different date windows
- per-person monthly total aggregation
- importer stability for existing workbook structure

## Definition of done

A task is only complete when:
- calculations are correct
- static build works locally
- GitHub Pages deployment config is ready
- the UI displays summary and monthly details
- charts render correctly
- data for the provided workbook is represented correctly
- documentation is updated

## Implementation priorities

Preferred order:

1. scaffold monorepo
2. implement normalized types
3. build importer from workbook to JSON
4. implement calculation engine in `packages/bills-core`
5. add unit tests for calculation rules
6. build summary page
7. build monthly detail page
8. add charts
9. configure GitHub Pages deployment
10. refine styling and docs

## Important coding rules

- Keep calculation logic out of UI components.
- Put all split math in `packages/bills-core`.
- Avoid duplicating formulas between pages.
- Prefer pure functions for calculations.
- Avoid hidden magic numbers.
- Use descriptive names for billing periods and resident weights.
- Keep imported raw data and derived data separate.

## Things to avoid

- Do not embed spreadsheet formulas directly in the frontend.
- Do not recreate the workbook layout cell-by-cell in HTML.
- Do not require a backend just to display data.
- Do not mix parsing logic with rendering logic.
- Do not add Claude as co-author anywhere.

## Useful derived helpers

Create helpers like:
- `getUtilityDateRange()`
- `getDailyTotalWeight()`
- `getResidentWeightedParts()`
- `getUtilityEuroPerPart()`
- `getResidentUtilityShare()`
- `getMonthlyResidentTotal()`
- `buildMonthlySummary()`

## Documentation expectations

The repository should eventually include:
- `README.md` with setup, dev, build, deploy
- `CLAUDE.md` with these working rules
- notes on how the spreadsheet maps to JSON
- notes on GitHub Pages constraints

## When making decisions

Choose the option that:
1. preserves the spreadsheet calculation behavior
2. keeps the project static-hostable on GitHub Pages
3. keeps the code simple to maintain for a personal project
4. makes the bill split easy to audit visually

If a requirement is ambiguous, favor **calculation correctness and transparency** over extra features.
