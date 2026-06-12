---
project: "Garden Weed Planner"
context_type: brownfield
created: 2026-06-12
updated: 2026-06-12
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: 1
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: context type
      decision: brownfield — existing Garden Weed Planner codebase, shaping a deletion/management change
    - topic: deletion scope
      decision: hard delete beds, plants, and weed observations
    - topic: preserved behavior
      decision: preserve existing queue, priority, auth, plant-list, observation, mark-weeded, and user-isolation flows
    - topic: access control
      decision: no auth or role changes; deletion is owner-only
    - topic: deletion confirmation
      decision: confirm before hard delete
    - topic: delivery size
      decision: one-week small slice
    - topic: bed deletion semantics
      decision: deleting a bed cascades to its child plants, weed observations, and weeding history
    - topic: delete UI location
      decision: delete actions appear inline where records are displayed
    - topic: priority semantics
      decision: deleted beds and deleted observations no longer participate in queue or priority calculations
    - topic: compatibility
      decision: preserve existing APIs and UI flows except adding delete capabilities
    - topic: non-goals
      decision: no soft delete/archive/undo, no edit flows, no bulk delete, no team/admin deletion, no audit log/recovery
  frs_drafted: 7
  quality_check_status: accepted
---

# Shape Notes — Garden Weed Planner Management Deletions

Seed idea: dodaj możliwość zarządzania rabatami - usuwanie rabat, usuwanie roślin, usuwanie chwastów/obserwacji

## Current System

Garden Weed Planner is an existing web app for a logged-in solo user managing garden beds. The current product already supports user-scoped garden beds, a priority-sorted bed queue, plant lists per bed, weed observations that influence priority, and marking a bed as weeded with work history.

Tech stack mentioned by existing project context: Astro SSR app, React islands, TypeScript, Tailwind, Supabase auth/database, and Cloudflare deployment.

Current user base: the app is used by the project owner personally.

## Vision & Problem Statement

The current system lets the user add beds, plants, and weed observations, but does not let them remove obsolete, unnecessary, accidental, or test records. This creates clutter and can leave irrelevant data in the garden workflow.

This change adds hard-delete management for beds, plants, and weed observations so the user can clean up records that should no longer exist.

Change category: significant feature / management capability.

Insight: because the app is used personally and the stated need is cleanup of accidental/test/obsolete records, hard delete is acceptable for this slice; the core risk is avoiding accidental breakage of existing queue, priority, auth, plant, observation, and mark-weeded flows.

## User & Persona

Primary persona: the existing logged-in solo Garden Weed Planner user who manages their own garden beds and wants to remove obsolete, accidental, or test records from the app.

## Access Control

No access control changes — current model preserved.

Only the authenticated owner of a bed can delete that bed. Only the authenticated owner of the parent bed can delete plants and weed observations attached to that bed. No admin, guest, team, or shared-access roles are introduced by this change.

## Success Criteria

### Primary

- The authenticated owner can hard-delete obsolete, accidental, or test beds, plants, and weed observations from the garden UI after confirming the destructive action.
- Deleted records disappear from the relevant UI and no longer influence the garden queue or priority calculation.

### Secondary

- Deletion feedback is clear enough that the user knows which record was removed and whether the action succeeded or failed.

### Guardrails

- Existing add/list beds, priority queue ordering, plant lists, weed observations, mark-bed-weeded history, authentication, and user isolation continue to work.
- A destructive delete requires confirmation before the hard delete is performed.
- A user cannot delete another user's beds, plants, or weed observations.

Timeline: this change is scoped as roughly 1 week of delivery work.

## Functional Requirements

- FR-001: Authenticated owner can hard-delete one of their garden beds after confirming the destructive action. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: no counter-argument; it stands as written. Resolution: kept.
- FR-002: Deleting a garden bed also removes its child records, including plants, weed observations, and weeding history attached to that bed. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: no counter-argument; it stands as written. Resolution: kept.
- FR-003: Authenticated owner can hard-delete a plant from one of their beds after confirming the destructive action. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: no counter-argument; it stands as written. Resolution: kept.
- FR-004: Authenticated owner can hard-delete a weed observation from one of their beds after confirming the destructive action. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: deleting observations can rewrite priority history. Resolution: kept; this change is explicitly for cleanup of obsolete, accidental, or test observations, and deleted observations should no longer affect current priority.
- FR-005: Delete actions are available inline where the bed, plant, or weed observation is displayed. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: inline delete actions may clutter already dense bed cards. Resolution: kept; inline access is preferred for direct cleanup, with UI care needed downstream.
- FR-006: Deleted records disappear from the relevant UI and no longer affect the garden queue or priority calculation. Priority: must-have. Change: modified
  > Socrates: Counter-argument considered: no counter-argument; it stands as written. Resolution: kept.
- FR-007: Existing add/list beds, priority queue, plant list, weed observation, mark-bed-weeded, authentication, and user-isolation behavior continues to work unchanged. Priority: must-have. Change: preserved
  > Socrates: Counter-argument considered: preserving all existing flows may increase testing effort. Resolution: kept; this is the core brownfield guardrail for safe deletion.

## User Stories

### US-01: Delete obsolete garden records

- **Given** the authenticated owner is viewing their garden beds, plants, or weed observations
- **When** they choose an inline delete action and confirm the destructive action
- **Then** the selected record is hard-deleted, disappears from the UI, and no longer affects the remaining garden workflow

#### Acceptance Criteria

- Deleting a bed requires confirmation before the bed is removed.
- Deleting a bed removes its child plants, weed observations, and weeding history.
- Deleting a plant or weed observation requires confirmation before removal.
- Deleted weed observations no longer influence bed priority.
- Existing queue, plant list, observation, mark-bed-weeded, authentication, and user-isolation flows continue to work.

## Business Logic

The existing priority rule is preserved, with the deletion delta that deleted beds and deleted weed observations no longer participate in queue or priority calculations because they no longer exist.

Deleting a bed removes the bed from the queue and removes its associated child records from the user's garden data. Deleting a weed observation removes that observation's contribution to the bed's current priority. Deleting a plant removes the plant from the bed context without changing unrelated priority rules.

## Constraints & Preserved Behavior

- Existing authentication and owner-only data isolation must continue to hold for all delete operations.
- Existing add/list bed behavior must continue working after delete support is added.
- Existing priority queue behavior must continue working for remaining beds after a bed or observation is deleted.
- Existing plant list behavior must continue working for remaining plants after a plant is deleted.
- Existing weed observation behavior must continue working for remaining observations after an observation is deleted.
- Existing mark-bed-weeded behavior and weeding history display must continue working for remaining beds.
- Backward compatibility: existing routes and UI flows for creating/listing records should not be removed or renamed as part of this change.
- Data migration: no user-facing migration is expected beyond ensuring delete capability is valid for existing records.

## Non-Functional Requirements

- Delete operations preserve owner isolation: one authenticated user cannot delete another user's beds, plants, or weed observations.
- After a successful delete, the user sees the removed record disappear from the relevant view without needing to manually refresh the page.
- Failed delete attempts show understandable feedback and do not remove the record from the UI as if the delete had succeeded.
- Destructive actions require an explicit confirmation before the record is hard-deleted.

## Product Framing

Product type is unchanged: this remains the existing Garden Weed Planner web app.

User base is unchanged: small-scale personal use by the existing authenticated solo user.

Timing: this deletion-management change is scoped to roughly 1 week of after-hours delivery work, with no hard deadline.

## Non-Goals

- No soft delete, archive, or undo — this change intentionally implements hard delete for cleanup of obsolete, accidental, or test records.
- No edit/update flows — this change adds deletion management only, not editing beds, plants, weed observations, or weeding history.
- No bulk delete — records are deleted one at a time to keep the destructive action deliberate.
- No team, admin, or shared deletion roles — deletion remains owner-only under the existing access model.
- No audit log or recovery history — deleted records are not recoverable through the product UI.

## Quality cross-check

- Access Control: present.
- Business Logic: present; deletion delta is stated against the existing priority rule.
- Project artifacts: present.
- Timeline-cost acknowledgement: present; delivery is scoped to 1 week.
- Non-Goals: present.
- Preserved behavior: present; existing auth, queue, add/list, plant, observation, mark-bed-weeded, and user-isolation flows are explicitly preserved.
