# Priority Bed Queue — Plan Brief

> Full plan: `context/changes/priority-bed-queue/plan.md`

## What & Why

Build S-01: a logged-in user can add garden beds with basic data and see a queue ordered by weeding urgency. This is the north-star MVP slice because it proves whether the app helps users decide which bed to weed first.

## Starting Point

F-01 already created and verified `garden_beds`, RLS isolation, domain validation, and `GET/POST /api/garden/beds`. The current app has auth, protected `/dashboard`, React auth forms, but no garden page, queue UI, priority algorithm, or suggested-date behavior. `Topbar` currently renders only from `Welcome.astro`, so authenticated navigation must be made visible from the app flow when `/garden` is added.

## Desired End State

A logged-in user opens `/garden`, adds beds, and sees each bed ordered in a priority queue with `OK`, `wkrótce`, or `pilne`. Each item shows a fixed-interval suggested next-weeding date by weed level and a confidence marker when optional inputs are incomplete.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Priority algorithm | Rule-based score | Fast, transparent, and adjustable for MVP. |
| Suggested date | Fixed interval by weed level | Keeps date behavior simple and predictable in S-01. |
| Missing fields | Allow with degraded confidence | Lets users start quickly without hiding incomplete beds. Missing `last_weeded_at` adds no elapsed-days score boost, but other inputs still affect priority. |
| UI route | Protected `/garden` page with React island | Clean future garden home and handles JSON-number form conversion well. |
| Computed fields | Pure helpers in `src/lib/garden-beds.ts`, not persisted | Avoids migration and keeps logic reusable. |
| Sorting | Priority → suggested date → weed level → created date | Produces a deterministic queue using visible data. Missing suggested dates sort after real dates within the same priority bucket. |
| Verification | Auth + add 3 beds + order/date/confidence/isolation smoke | Covers the core value without repeating all F-01 checks. |

## Scope

**In scope:**

- Priority/date/confidence helpers in `src/lib/garden-beds.ts`.
- Decorated `GET` and `POST /api/garden/beds` responses.
- Protected `/garden` Astro page.
- Authenticated navigation to `/garden`, with `Topbar` rendered in the app flow or moved into a shared authenticated shell/layout.
- React island for add-bed form, queue fetch, queue display, and refresh after create.
- Manual smoke evidence recorded in `change.md`.

**Out of scope:**

- Persisted priority/date columns or DB migration.
- Update/delete beds.
- Plant lists, weed observations, and weeding history.
- Calendar/task-planner behavior.
- New automated test runner.

## Architecture / Approach

`garden_beds` remains the durable source of raw inputs. `src/lib/garden-beds.ts` computes queue fields from those inputs. Missing `last_weeded_at` returns `suggested_weed_at: null`, degrades confidence, and contributes no elapsed-days boost while still scoring weed level and other available inputs. `GET /api/garden/beds` returns decorated, sorted queue items; `POST` validates and creates a bed, then returns the decorated item. `/garden` mounts a React island that fetches, submits JSON, and renders the queue.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Priority Domain Helpers | Priority labels, fixed date intervals, score, confidence, sorting | Heuristic may be unclear unless thresholds are documented. |
| 2. Decorated Garden Beds API | Queue-ready API responses | Accidentally duplicating logic outside the domain module. |
| 3. Protected `/garden` Page Shell | Protected route and discoverable page | Forgetting middleware protection or adding a link to `Topbar` without rendering it in the authenticated app flow. |
| 4. React Add Form and Queue Island | Interactive add + queue UI | Sending numeric form values as strings to JSON API. |
| 5. Verification and Handoff | Gates and manual smoke evidence | Manual isolation/order checks may be skipped. |

**Prerequisites:** F-01 implemented and migration applied to the target Supabase environment.
**Estimated effort:** ~3 focused sessions across 5 phases.

## Open Risks & Assumptions

- Priority scoring is intentionally heuristic and should be adjusted after real garden usage.
- Suggested-date intervals by weed level are fixed for speed, even though PRD inputs include more nuance.
- Incomplete beds remain visible; missing suggested dates intentionally sort after known dates within the same priority bucket.
- No test runner exists, so helper correctness depends on manual review and smoke checks for now.

## Success Criteria (Summary)

- User A can add low/medium/high beds and see them sorted by priority on `/garden`.
- Queue items show priority, suggested date or missing-date message, and degraded confidence for incomplete data.
- User B cannot see user A's beds; `npx astro sync`, `npm run lint`, and `npm run build` pass.
