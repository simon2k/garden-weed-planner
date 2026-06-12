---
project: Garden Weed Planner
version: 1
status: draft
created: 2026-05-31
updated: 2026-06-12
prd_version: 1
main_goal: speed
top_blocker: none
---

# Roadmap: Garden Weed Planner

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Garden Weed Planner pomaga osobie zarządzającej wieloma rabatami zdecydować, które miejsca wymagają najpilniejszego pielenia. Wartość produktu nie polega na samej dacie ostatniego pielenia, tylko na połączeniu daty, poziomu zachwaszczenia, przewidywanego czasu pracy, powierzchni, kory i obserwacji chwastów w jedną czytelną kolejkę pracy.

## North star

**S-01: Użytkownik może dodać rabaty z podstawowymi danymi i zobaczyć kolejkę według pilności** — to north star, czyli najmniejszy przepływ od początku do końca, który pokazuje, czy produkt faktycznie pomaga wybrać pierwszą rabatę do pielenia.

> North star oznacza tutaj najmniejszy wycinek produktu, którego działające dostarczenie potwierdza główną hipotezę produktu — dlatego trafia tak wcześnie, jak pozwalają zależności.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                                                                                                      | Prerequisites | PRD refs                                                    | Status   |
| ---- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------- | -------- |
| F-01 | user-scoped-garden-records | (foundation) minimalny kontrakt danych dla rabat, priorytetów i izolacji użytkownika jest gotowy do użycia przez pierwszą pionową ścieżkę | —             | Access Control, Non-Functional Requirements: data isolation | finished |
| S-01 | priority-bed-queue         | dodać rabaty z podstawowymi danymi i zobaczyć kolejkę według pilności z sugerowaną datą                                                   | F-01          | US-01, FR-001, FR-002, FR-004, FR-006, FR-007               | done     |
| S-02 | bed-plant-list             | prowadzić listę roślin posadzonych na rabacie jako kontekst decyzji o pieleniu                                                            | F-01, S-01    | FR-003                                                      | done     |
| S-03 | weed-observations-priority | dodawać obserwacje chwastów i widzieć ich wpływ na priorytet rabaty                                                                       | F-01, S-01    | US-01, FR-005, FR-006, FR-007                               | done     |
| S-04 | mark-bed-weeded            | oznaczyć rabatę jako wypieloną, zapisać czas pracy i notatkę, a potem zobaczyć niższy priorytet                                           | F-01, S-01    | FR-008, FR-006, FR-007                                      | finished |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                            | Chain                    | Note                                                                                          |
| ------ | -------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| A      | Kolejka priorytetów              | `F-01` → `S-01`          | Najkrótsza ścieżka do używalnego MVP przy celu `speed`.                                       |
| B      | Kontekst i aktualizacja pilności | `S-02` / `S-03` / `S-04` | Równoległe rozszerzenia po pierwszej kolejce; każde wzmacnia decyzję, ale nie blokuje startu. |

## Baseline

What's already in place in the codebase as of `2026-05-31` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro SSR pages, React auth islands, shared UI components, and Tailwind styling are present in `src/pages/` and `src/components/`.
- **Backend / API:** partial — server routes exist for auth only; product API/page handlers for garden records are not present yet.
- **Data:** partial — Supabase config exists, but app tables/migrations for rabaty, observations, and weeding history are absent.
- **Auth:** present — Supabase SSR client, sign-in/sign-up/sign-out routes, and protected-route middleware are present.
- **Deploy / infra:** present — Cloudflare Workers config and GitHub Actions validation/deploy flow are present.
- **Observability:** partial — platform observability is enabled, but no app-level product logging or error tracking is wired.

## Foundations

### F-01: Minimalny kontrakt danych użytkownika

- **Outcome:** (foundation) minimalny kontrakt danych dla rabat, priorytetów i izolacji użytkownika jest gotowy do użycia przez pierwszą pionową ścieżkę.
- **Change ID:** user-scoped-garden-records
- **PRD refs:** Access Control, Non-Functional Requirements: data isolation
- **Unlocks:** S-01, S-02, S-03, S-04; verification path for per-user data isolation
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sekwencjonowane przed pierwszą ścieżką, bo bez trwałych danych i izolacji użytkowników kolejka rabat nie jest bezpiecznie planowalna.
- **Status:** finished

## Slices

### S-01: Kolejka rabat według pilności

- **Outcome:** user can dodać rabaty z podstawowymi danymi i zobaczyć kolejkę według pilności z sugerowaną datą.
- **Change ID:** priority-bed-queue
- **PRD refs:** US-01, FR-001, FR-002, FR-004, FR-006, FR-007
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To najkrótsza ścieżka do wartości MVP; ryzykiem jest wciągnięcie zbyt wielu pól pobocznych zamiast utrzymania minimum potrzebnego do kolejki.
- **Status:** done

### S-02: Lista roślin na rabacie

- **Outcome:** user can prowadzić listę roślin posadzonych na rabacie jako kontekst decyzji o pieleniu.
- **Change ID:** bed-plant-list
- **PRD refs:** FR-003
- **Prerequisites:** F-01, S-01
- **Parallel with:** S-03, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Dodane po pierwszej kolejce, bo rośliny wzbogacają kontekst rabaty, ale nie są konieczne do pierwszego sprawdzenia pilności.
- **Status:** done

### S-03: Obserwacje chwastów wpływające na priorytet

- **Outcome:** user can dodawać obserwacje chwastów i widzieć ich wpływ na priorytet rabaty.
- **Change ID:** weed-observations-priority
- **PRD refs:** US-01, FR-005, FR-006, FR-007
- **Prerequisites:** F-01, S-01
- **Parallel with:** S-02, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Po bazowej kolejce można bezpiecznie rozszerzyć regułę pilności o obserwacje, nie blokując pierwszego używalnego przepływu.
- **Status:** done

### S-04: Oznaczenie rabaty jako wypielonej

- **Outcome:** user can oznaczyć rabatę jako wypieloną, zapisać czas pracy i notatkę, a potem zobaczyć niższy priorytet.
- **Change ID:** mark-bed-weeded
- **PRD refs:** FR-008, FR-006, FR-007
- **Prerequisites:** F-01, S-01
- **Parallel with:** S-02, S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Ten slice domyka cykl pracy po wykonaniu zadania, ale jest drugi względem pierwszego celu: wskazania, co pielić najpierw.
- **Status:** finished

## Backlog Handoff

| Roadmap ID | Change ID                  | Suggested issue title                               | Ready for `/10x-plan` | Notes                                                          |
| ---------- | -------------------------- | --------------------------------------------------- | --------------------- | -------------------------------------------------------------- |
| F-01       | user-scoped-garden-records | Prepare minimal user-scoped garden records contract | yes                   | Run `/10x-plan user-scoped-garden-records`; this unlocks S-01. |
| S-01       | priority-bed-queue         | Build priority-sorted bed queue                     | no                    | Depends on F-01.                                               |
| S-02       | bed-plant-list             | Add plant list per bed                              | no                    | Depends on S-01.                                               |
| S-03       | weed-observations-priority | Add weed observations into priority                 | no                    | Depends on S-01.                                               |
| S-04       | mark-bed-weeded            | Mark bed as weeded and lower priority               | no                    | Depends on S-01.                                               |

## Open Roadmap Questions

Brak. PRD zapisuje: „Brak otwartych pytań na podstawie zaakceptowanego shape-notes.md.”

## Parked

- **Praca zespołowa i przypisywanie zadań** — Why parked: PRD §Non-Goals; MVP obsługuje jednego użytkownika i jego rabaty.
- **Zdjęcia i rozpoznawanie chwastów ze zdjęć** — Why parked: PRD §Non-Goals; obserwacje chwastów są ręcznie wpisywane.
- **Pełny kalendarz zadań ogrodowych** — Why parked: PRD §Non-Goals; system sugeruje termin pielenia, ale nie jest kompletnym plannerem ogrodu.

## Done

- **S-01: user can dodać rabaty z podstawowymi danymi i zobaczyć kolejkę według pilności z sugerowaną datą** — Archived 2026-06-12 → `context/archive/2026-06-02-priority-bed-queue/`. Lesson: —.
- **S-02: user can prowadzić listę roślin posadzonych na rabacie jako kontekst decyzji o pieleniu** — Archived 2026-06-12 → `context/archive/2026-06-05-bed-plant-list/`. Lesson: —.
- **S-03: user can dodawać obserwacje chwastów i widzieć ich wpływ na priorytet rabaty** — Archived 2026-06-12 → `context/archive/2026-06-05-weed-observations-priority/`. Lesson: —.
