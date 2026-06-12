---
date: 2026-06-05T19:07:40+02:00
researcher: Codex
git_commit: 5ac43f30f391c470ca9a670f0a84012bdeba71c3
branch: feat/weed-observations-priority
repository: garden-weed-planner
topic: "Weed observations priority"
tags: [research, codebase, garden-beds, priority, weed-observations]
status: complete
last_updated: 2026-06-05
last_updated_by: Codex
last_updated_note: "Added follow-up research for precision weed-observation algorithm"
---

# Research: Weed observations priority

**Date**: 2026-06-05T19:07:40+02:00
**Researcher**: Codex
**Git Commit**: 5ac43f30f391c470ca9a670f0a84012bdeba71c3
**Branch**: feat/weed-observations-priority
**Repository**: garden-weed-planner

## Research Question

For roadmap slice S-03 (`weed-observations-priority`), what existing code, data model, API routes, UI patterns, and prior decisions should shape a plan for adding weed observations and making them affect bed priority?

## Summary

The app already has a protected `/garden` workflow where authenticated users create beds and see a computed priority queue. Priority is currently derived only from fields on `garden_beds`: `weed_level`, `last_weeded_at`, `area_m2`, `estimated_minutes`, and `mulch_depth_cm`. S-03 should extend this with a user-owned child table for weed observations, a nested bed-scoped API similar to the existing plants API, and a small UI section in each queue card for adding/listing observations.

The main architectural choice is how observations affect priority. Two viable alternatives are:

1. **Compute observation impact server-side when listing beds**: fetch observations with the bed list or summarize per bed, then decorate queue items with an observation score. This keeps `GET /api/garden/beds` as the queue source but requires query/API changes.
2. **Persist/update aggregate fields on `garden_beds`**: store latest/highest observation severity or observation-derived score on the parent bed. This can make listing simpler but introduces update policy/trigger complexity and risks stale aggregates.

For the MVP, the safer fit is alternative 1: keep observations as append-only child records and compute their effect in the existing priority helper path.

## Detailed Findings

### Product and roadmap scope

- PRD FR-005 requires manual weed observations with weed type, date, severity/coverage, and note; it explicitly says observations affect priority (`context/foundation/prd.md:65-66`).
- PRD priority logic says observations affect urgency through severity/coverage and weed type (`context/foundation/prd.md:81-83`).
- The roadmap defines S-03 as “dodawać obserwacje chwastów i widzieć ich wpływ na priorytet rabaty,” depending on F-01 and S-01 (`context/foundation/roadmap.md:100-109`).
- S-03 should stay away from S-04: marking a bed weeded and lowering priority is a separate slice (`context/foundation/roadmap.md:115-116`).

### Existing data model and RLS pattern

- `garden_beds` already stores the baseline priority inputs: area, last weeded date, weed level, estimated minutes, and mulch depth (`supabase/migrations/20260601120000_create_garden_beds.sql:1-17`).
- `garden_beds` has authenticated select/insert RLS scoped by `user_id = auth.uid()` (`supabase/migrations/20260601120000_create_garden_beds.sql:23-35`).
- The existing plant child table is the best pattern for S-03: `garden_bed_plants` has `bed_id`, `user_id`, constraints, per-bed indexes, RLS, and an insert policy that checks parent bed ownership (`supabase/migrations/20260605130000_create_garden_bed_plants.sql:1-49`).
- There are currently no update/delete RLS policies for either beds or plants. S-03 can remain add/list only to avoid introducing broader write permissions.

### Priority calculation path

- `src/lib/garden-beds.ts` owns priority domain logic and queue decoration. It exports queue item/result types with `priority`, `priority_label`, `priority_score`, `suggested_weed_at`, and `priority_confidence` (`src/lib/garden-beds.ts:43-57`).
- Current priority intervals are fixed by weed level: low 21 days, medium 14 days, high 7 days (`src/lib/garden-beds.ts:67-74`).
- Current scoring combines weed level, elapsed days, area, estimated minutes, and mulch depth (`src/lib/garden-beds.ts:214-220`). Observation scoring should be added near this path, not in the React component.
- Queue sorting uses priority severity, suggested date, weed-level severity, and created date (`src/lib/garden-beds.ts:278-284`). If observations change score/priority, the existing sorting can continue to work.
- `priority_confidence` currently means all optional bed inputs are present (`src/lib/garden-beds.ts:272-275`). S-03 needs a decision: observations are optional context, or missing observations also make confidence partial.

### Existing API patterns

- `GET /api/garden/beds` requires Supabase config and authenticated `context.locals.user`, filters by `user_id`, then returns `toSortedGardenBedQueue(data)` (`src/pages/api/garden/beds.ts:13-35`). This is the likely integration point for observation-aware priority.
- `POST /api/garden/beds` validates request JSON before Supabase insert and returns a decorated queue item (`src/pages/api/garden/beds.ts:38-67`). S-03 should preserve this response shape or deliberately document additions.
- The plants API provides a strong nested child-resource template: validate `bedId`, verify parent bed ownership, list or insert child rows, and return safe JSON errors (`src/pages/api/garden/beds/[bedId]/plants.ts:15-92`).
- Ownership verification returns 404 for missing or non-owned beds, avoiding information leaks (`src/pages/api/garden/beds/[bedId]/plants.ts:116-133`). Weed observations should reuse this behavior.

### Existing UI patterns

- `/garden` is already protected and renders the `GardenQueue` React island (`src/pages/garden.astro:1-29`; `src/middleware.ts:4`). No new protected page is needed if observations are added inside this page.
- The queue island loads beds from `/api/garden/beds`, tracks queue summary, and renders cards from the returned queue items (`src/components/garden/GardenQueue.tsx:115-153`, `src/components/garden/GardenQueue.tsx:451-505`).
- The plant UI already implements a reusable pattern for expanding a bed card, lazy-loading nested data, handling per-bed loading/error/form state, and posting child records (`src/components/garden/GardenQueue.tsx:197-331`).
- Queue cards currently show priority label, confidence, suggested date, raw metrics, and priority score (`src/components/garden/GardenQueue.tsx:589-644`). S-03 can add observation context near the plant section without changing the page-level layout.
- Client-side validation helpers convert form strings to JSON numbers/null before API calls (`src/components/garden/GardenQueue.tsx:821-895`). Observation forms should follow this because server validators reject wrong primitive types.

### Validation/date semantics

- The current lesson says date fields must explicitly decide whether past, today, and future dates are valid; “last occurrence” fields must accept only past dates including today (`context/foundation/lessons.md:5-10`).
- `validateCreateGardenBedInput` checks date format but currently does not reject future `last_weeded_at` dates (`src/lib/garden-beds.ts:141-145`). S-03 should avoid repeating that gap for observation dates.
- Weed observation date semantics are likely “observed at,” so the plan should require past-or-today only, not future.

### Historical context from prior changes

- F-01 intentionally excluded observations and created only the garden bed foundation (`context/changes/user-scoped-garden-records/plan.md:23-30`).
- S-01 intentionally excluded weed observations and kept priority computed, not persisted (`context/changes/priority-bed-queue/plan.md:29-30`, `context/changes/priority-bed-queue/plan.md:358`).
- S-01’s key implementation rule was to keep form-string conversion in the React island because the API expects real JSON numbers (`context/changes/priority-bed-queue/plan.md:41`).
- S-02 intentionally made plants display-only and not priority-affecting (`context/changes/bed-plant-list/plan.md:5`, `context/changes/bed-plant-list/plan.md:303`). This contrast matters: S-03 child records do affect priority.

## Code References

- `src/lib/garden-beds.ts:43-57` - queue item and priority result contract.
- `src/lib/garden-beds.ts:67-83` - fixed intervals and threshold constants.
- `src/lib/garden-beds.ts:190-220` - priority decoration and score calculation path.
- `src/lib/garden-beds.ts:278-284` - queue sort tie-breakers.
- `src/pages/api/garden/beds.ts:13-35` - authenticated bed list endpoint and queue decoration.
- `src/pages/api/garden/beds/[bedId]/plants.ts:15-92` - nested add/list API pattern for child records.
- `src/components/garden/GardenQueue.tsx:197-331` - lazy-loaded child section state and POST flow.
- `src/components/garden/GardenQueue.tsx:570-793` - queue card and child section rendering pattern.
- `supabase/migrations/20260605130000_create_garden_bed_plants.sql:1-49` - child table, indexes, RLS, and parent ownership policy pattern.

## Architecture Insights

- Shared product logic belongs in `src/lib/`; observation validation, insert/response mapping, and observation score calculation should live there before wiring into API/UI.
- API handlers use uppercase Astro method exports, local JSON helpers, `createClient(context.request.headers, context.cookies)`, and `context.locals.user` auth checks.
- Parent-child resources should use both app-level ownership verification and Supabase RLS. This gives defense in depth and avoids leaking whether another user’s bed exists.
- Priority is currently computed at request time. Keeping observation impact computed avoids a migration to update policies on `garden_beds` and avoids stale priority fields.
- The React island is already large. A plan should consider extracting child sections or shared form helpers if adding observations makes `GardenQueue.tsx` too complex.

## Historical Context (from prior changes)

- `context/changes/user-scoped-garden-records/plan.md` - established user-scoped bed data and explicitly postponed observations.
- `context/changes/priority-bed-queue/plan.md` - established computed priority and queue sorting, while excluding S-03.
- `context/changes/bed-plant-list/plan.md` - established the nested child-resource pattern and clarified that plants do not affect priority.

## Related Research

No prior `research.md` artifacts were found for this change. The relevant planning artifacts are listed above.

## Open Questions

1. What exact observation fields should be stored? PRD mentions weed type, date, severity or coverage, and note; the plan should choose enum/range shapes.
2. How should weed type affect score? Options include simple problem-type enum weights, free-text type with no weight, or a hybrid “type + invasiveness” field.
3. Should observations decay over time? Recent observations may deserve more impact than old ones, but decay adds complexity.
4. Should adding an observation immediately reload the full bed queue so the user sees priority/order change? This is likely necessary for S-03’s “impact on priority” outcome.

## Follow-up Research 2026-06-05T19:14:31+02:00: Precise algorithm for next-weeding date from weed observations

### Follow-up Question

Jak można zrobić precyzyjniejszy algorytm do aktualizacji daty następnego pielenia — np. przez listę chwastów, które szybko odrastają, ilość chwastów rozmnażających się rozłogami, i inne detale, które powodują, że rabatę trzeba szybciej pielić?

### Summary

Najlepszy kierunek dla MVP to nie próbować rozpoznawać każdego gatunku botanicznie, tylko zapisać obserwację jako połączenie:

1. **Co widzę**: typ/nazwa chwastu, data obserwacji, nasilenie, pokrycie, faza rozwoju.
2. **Dlaczego to groźne**: cechy rozmnażania i odrastania, np. rozłogi, kłącza, bulwy, fragmenty korzeni, dużo nasion, szybki odrost.
3. **Jak to wpływa na termin**: obliczyć `weed_observation_pressure_score`, który skraca bazowy interwał pielenia i może wymusić szybszą reakcję od daty najnowszej obserwacji.

Dwie perspektywy projektowe:

- **Prosta i sterowalna**: użytkownik wybiera kategorię chwastu oraz kilka cech ryzyka z checkboxów. Algorytm jest transparentny i łatwy do poprawiania.
- **Bardziej precyzyjna**: repo trzyma słownik gatunków/typów chwastów z domyślnymi cechami, a użytkownik tylko koryguje nasilenie/pokrycie. Lepsze UX, ale większy zakres danych i utrzymania.

Rekomendacja: zacząć od wersji prostej, ale zaprojektować typy tak, żeby później dodać słownik gatunków bez migracji całej logiki.

### External Weed-Management Evidence

- Annual weeds are urgent before flowering/seed set: Iowa State Extension notes that annual weeds rapidly flower and set seed, and should be destroyed while small before producing many seeds. Source: https://yardandgarden.extension.iastate.edu/how-to/how-manage-annual-weeds
- Perennial weeds require below-ground awareness: University of Maine Extension distinguishes annual/biennial/perennial weeds and notes that many perennials spread from bulbs, tubers, rhizomes, or stolons; control must address below-ground structures. Source: https://extension.umaine.edu/piscataquis/home-gardening/basicgarden/understandingweeds/
- Rhizome/root-fragment weeds deserve high risk: University of Nevada Extension describes field bindweed spreading from seed, roots, rhizomes, and fragments, with mature plants difficult to pull without leaving resprouting fragments. Source: https://extension.unr.edu/publication.aspx?PubID=4834
- Tuber-forming weeds deserve high risk: WVU Extension describes yellow nutsedge as spreading through rhizomes, tubers, and viable seeds; one plant can produce more than 1,000 tubers in a growing season. Source: https://extension.wvu.edu/lawn-gardening-pests/weeds/yellow-nutsedge
- Established tuber weeds can make physical methods counterproductive: WVU Extension warns that cultivation can aggravate yellow nutsedge by spreading vegetative propagules. Source: https://extension.wvu.edu/lawn-gardening-pests/weeds/yellow-nutsedge

### Suggested Observation Data Model

Add a child table such as `garden_bed_weed_observations` with:

- `id uuid primary key default gen_random_uuid()`
- `bed_id uuid not null references public.garden_beds(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `observed_at date not null`
- `weed_name text` — optional free text, e.g. “perz”, “powój”, “turzyca/nutsedge”
- `weed_category text not null` — enum-like value:
  - `annual_seed` — annual/seed-bank pressure
  - `creeping_perennial` — rhizomes/stolons/root fragments
  - `tuber_or_bulb` — tubers, bulbs, nutlets
  - `deep_root_perennial` — deep taproot/root reserve
  - `unknown` — fallback
- `growth_stage text not null` — `seedling | vegetative | flowering | seeding`
- `severity integer not null check (severity between 1 and 5)` — visual intensity
- `coverage_percent numeric check (coverage_percent is null or coverage_percent between 0 and 100)`
- trait booleans or an array-like text enum set:
  - `spreads_by_rhizomes`
  - `spreads_by_stolons`
  - `spreads_by_tubers`
  - `regrows_from_root_fragments`
  - `prolific_seed_producer`
  - `fast_regrowth`
- `note text`
- timestamps + RLS matching the plant table pattern.

Validation rule from `context/foundation/lessons.md`: `observed_at` is an occurrence date, so accept only past dates including today; reject future dates.

### Recommended Scoring Model

Keep the current bed score in `src/lib/garden-beds.ts` and add an observation pressure input:

```ts
baseDays = SUGGESTED_WEED_INTERVAL_DAYS[bed.weed_level];
observationPressure = getObservationPressureScore(observations);
adjustedDays = adjustSuggestedInterval(baseDays, observationPressure);
nextByLastWeeded = last_weeded_at + adjustedDays;
nextByObservation = most_recent_observed_at + responseWindowDays(observationPressure);
suggested_weed_at = min(nextByLastWeeded, nextByObservation);
priority_score = existingBedScore + observationPressure;
```

Important: `nextByObservation` matters because a severe observation today should make the queue urgent even if `last_weeded_at` was recent.

### Observation Pressure Score

Use recent observations only, e.g. last 45 or 60 days, then cap to keep the score understandable.

Suggested weights:

| Factor                                  |                         Weight |
| --------------------------------------- | -----------------------------: |
| Severity 1-5                            |          `severity * 6` = 6-30 |
| Coverage                                | `0-25` from percentage buckets |
| Growth stage seedling                   |                              0 |
| Growth stage vegetative                 |                              5 |
| Growth stage flowering                  |                             15 |
| Growth stage seeding                    |                             25 |
| Rhizomes or stolons                     |                             20 |
| Tubers/bulbs/nutlets                    |                             25 |
| Root-fragment regrowth                  |                             20 |
| Prolific seed producer                  |                             15 |
| Fast regrowth after mowing/pulling      |                             15 |
| Multiple risky observations in same bed |                   up to 15 cap |
| Old observation decay                   |     multiply by recency factor |

Recency factor:

```ts
ageDays = daysBetween(observed_at, today);
recency = max(0, 1 - ageDays / 60);
weightedObservation = rawObservationScore * recency;
```

Aggregate:

```ts
observationPressure = min(80, maxObservationScore + repeatPressureBonus);
```

This avoids one bed getting absurd scores while still letting dangerous observations override the baseline.

### Suggested Date Adjustment

Use score bands instead of a complex formula first:

| Observation pressure | Interval change | Response window from newest observation |
| -------------------: | --------------: | --------------------------------------: |
|                 0-14 |       no change |                                    none |
|                15-29 |      20% sooner |                                 14 days |
|                30-49 |      35% sooner |                                  7 days |
|                50-69 |      50% sooner |                                  3 days |
|                70-80 |      65% sooner |                                   1 day |

Implementation sketch:

```ts
function adjustSuggestedInterval(baseDays: number, pressure: number): number {
  if (pressure >= 70) return Math.max(1, Math.round(baseDays * 0.35));
  if (pressure >= 50) return Math.max(2, Math.round(baseDays * 0.5));
  if (pressure >= 30) return Math.max(3, Math.round(baseDays * 0.65));
  if (pressure >= 15) return Math.max(5, Math.round(baseDays * 0.8));
  return baseDays;
}

function responseWindowDays(pressure: number): number | null {
  if (pressure >= 70) return 1;
  if (pressure >= 50) return 3;
  if (pressure >= 30) return 7;
  if (pressure >= 15) return 14;
  return null;
}
```

Example: a bed with medium weeds has base interval 14 days. If the user observes a tuber-forming, fast-regrowing weed with severity 4 and 40% coverage today, the pressure can land above 70. The suggested date becomes either `last_weeded_at + 5 days` or `today + 1 day`, whichever is earlier.

### Mapping to Current Code

- Extend `GardenBedPriorityResult` and `GardenBedQueueItem` in `src/lib/garden-beds.ts:43-57` with optional observation fields, e.g. `observation_pressure_score`, `observation_pressure_label`, and possibly `observation_count`.
- Change `getSuggestedWeedAt(lastWeededAt, weedLevel)` (`src/lib/garden-beds.ts:178-188`) to accept an optional observation summary, or add a new helper and keep the old one as baseline.
- Change `calculatePriorityScore` (`src/lib/garden-beds.ts:214-220`) to add `getObservationPressureScore(summary)`.
- Change `toSortedGardenBedQueue` (`src/lib/garden-beds.ts:210-211`) to accept a map of observation summaries by bed ID, e.g. `toSortedGardenBedQueue(beds, observationSummaryByBedId)`.
- Update `GET /api/garden/beds` (`src/pages/api/garden/beds.ts:13-35`) to load observations or summaries for the listed bed IDs, then pass summaries into queue decoration.
- Add nested endpoints mirroring plants: `GET/POST /api/garden/beds/[bedId]/weed-observations`, following ownership checks from `src/pages/api/garden/beds/[bedId]/plants.ts:15-92`.
- In `GardenQueue.tsx`, adding an observation should reload the full bed queue after successful POST, because priority label/order/suggested date may change.

### Two Viable Algorithm Alternatives

#### Alternative A: Transparent trait-checkbox scoring

The user chooses `weed_category`, `growth_stage`, severity, coverage, and risk traits. The algorithm uses fixed weights.

Pros:

- Easy to explain in UI: “Earlier because: tubers + high coverage + flowering.”
- Small database and no maintained weed catalog.
- Works even when the user does not know the exact species.

Cons:

- More manual input.
- User may over/under-select traits.

#### Alternative B: Weed catalog + observation override

The app stores a small local catalog, e.g. bindweed, quackgrass/perz, nutsedge/turzyca, creeping Charlie/bluszczyk, dandelion, lambsquarters/komosa. Each has default risk traits and weights; the user can override severity/coverage.

Pros:

- Better UX and more precise defaults.
- Easier to keep scoring consistent.

Cons:

- More product scope.
- Catalog needs localization and botanical accuracy.
- Unknown weeds still need fallback.

Recommended MVP compromise: implement Alternative A now, but let `weed_name` remain free text and `weed_category`/traits drive scoring. Later add a catalog that pre-fills these fields.

### Open Questions for Planning

1. Czy użytkownik ma znać dokładny gatunek chwastu, czy wystarczy kategoria i cechy ryzyka?
2. Czy `coverage_percent` ma być liczbą 0-100, czy prostszym enumem `low | medium | high`?
3. Czy stara obserwacja powinna wygasać po 45, 60, czy 90 dniach?
4. Czy pokazywać użytkownikowi wyjaśnienie typu: “Przyspieszono o 50%, bo: rozłogi, wysokie pokrycie, faza kwitnienia”?
5. Czy po oznaczeniu rabaty jako wypielonej w S-04 obserwacje mają zostać historycznie, ale przestać wpływać na bieżący termin?
