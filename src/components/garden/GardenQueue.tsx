import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CalendarDays, Clock, Leaf, Loader2, Map, Plus, Sprout } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import {
  GROWTH_STAGE_LABELS,
  OBSERVATION_COVERAGE_LABELS,
  POLISH_WEED_CATALOG,
  WEED_CATEGORIES,
  WEED_CATEGORY_LABELS,
  WEED_RISK_TRAIT_LABELS,
  WEED_RISK_TRAITS,
  type GrowthStage,
  type ObservationCoverage,
  type WeedCategory,
  type WeedRiskTrait,
} from "@/lib/weed-observations";
import { cn } from "@/lib/utils";

type WeedLevel = "low" | "medium" | "high";

type BedQueuePriority = "ok" | "soon" | "urgent";

type PriorityConfidence = "complete" | "partial";

interface GardenBedQueueItem {
  id: string;
  name: string;
  area_m2: number | null;
  last_weeded_at: string | null;
  weed_level: WeedLevel;
  estimated_minutes: number | null;
  mulch_depth_cm: number | null;
  created_at: string;
  updated_at: string;
  priority: BedQueuePriority;
  priority_label: string;
  priority_score: number;
  suggested_weed_at: string | null;
  priority_confidence: PriorityConfidence;
  observation_pressure_score: number;
  observation_pressure_label: string;
  observation_count: number;
  observation_reasons: string[];
}

interface BedPlant {
  id: string;
  bed_id: string;
  name: string;
  planted_year: number | null;
  quantity: number | null;
  height_cm: number | null;
  width_cm: number | null;
  created_at: string;
  updated_at: string;
}

interface WeedObservation {
  id: string;
  bed_id: string;
  observed_at: string;
  weed_catalog_slug: string | null;
  weed_name: string | null;
  weed_category: WeedCategory;
  growth_stage: GrowthStage;
  coverage: ObservationCoverage;
  severity: number;
  spreads_by_rhizomes: boolean;
  spreads_by_stolons: boolean;
  spreads_by_tubers: boolean;
  regrows_from_root_fragments: boolean;
  prolific_seed_producer: boolean;
  fast_regrowth: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface WeedingEvent {
  id: string;
  bed_id: string;
  weeded_at: string;
  duration_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

const weedLevelOptions: { value: WeedLevel; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "Mostly under control" },
  { value: "medium", label: "Medium", description: "Needs attention soon" },
  { value: "high", label: "High", description: "Visibly urgent" },
];

interface BedsResponse {
  beds: GardenBedQueueItem[];
}

interface BedResponse {
  bed: GardenBedQueueItem;
}

interface PlantsResponse {
  plants: BedPlant[];
}

interface PlantResponse {
  plant: BedPlant;
}

interface WeedObservationsResponse {
  observations: WeedObservation[];
}

interface WeedObservationResponse {
  observation: WeedObservation;
}

interface WeedingEventsResponse {
  events: WeedingEvent[];
}

interface MarkWeededResponse {
  bed: GardenBedQueueItem;
  event: WeedingEvent;
}

interface ErrorResponse {
  error?: string;
}

interface FormState {
  name: string;
  weed_level: WeedLevel;
  area_m2: string;
  last_weeded_at: string;
  estimated_minutes: string;
  mulch_depth_cm: string;
}

interface PlantFormState {
  name: string;
  planted_year: string;
  quantity: string;
  height_cm: string;
  width_cm: string;
}

interface PlantBedState {
  plants: BedPlant[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  form: PlantFormState;
  fieldErrors: Partial<Record<keyof PlantFormState, string>>;
  hasLoaded: boolean;
}

interface WeedObservationFormState {
  weed_catalog_slug: string;
  weed_name: string;
  observed_at: string;
  weed_category: WeedCategory;
  growth_stage: GrowthStage;
  coverage: ObservationCoverage;
  severity: string;
  spreads_by_rhizomes: boolean;
  spreads_by_stolons: boolean;
  spreads_by_tubers: boolean;
  regrows_from_root_fragments: boolean;
  prolific_seed_producer: boolean;
  fast_regrowth: boolean;
  note: string;
}

interface ObservationBedState {
  observations: WeedObservation[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  form: WeedObservationFormState;
  fieldErrors: Partial<Record<keyof WeedObservationFormState, string>>;
  hasLoaded: boolean;
}

interface WeedingFormState {
  weeded_at: string;
  duration_minutes: string;
  note: string;
}

interface WeedingBedState {
  events: WeedingEvent[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  form: WeedingFormState;
  fieldErrors: Partial<Record<keyof WeedingFormState, string>>;
  hasLoaded: boolean;
}

const initialFormState: FormState = {
  name: "",
  weed_level: "medium",
  area_m2: "",
  last_weeded_at: "",
  estimated_minutes: "",
  mulch_depth_cm: "",
};

const initialPlantFormState: PlantFormState = {
  name: "",
  planted_year: "",
  quantity: "",
  height_cm: "",
  width_cm: "",
};

const initialObservationFormState: WeedObservationFormState = {
  weed_catalog_slug: "",
  weed_name: "",
  observed_at: getTodayIsoDate(),
  weed_category: "unknown",
  growth_stage: "vegetative",
  coverage: "low",
  severity: "3",
  spreads_by_rhizomes: false,
  spreads_by_stolons: false,
  spreads_by_tubers: false,
  regrows_from_root_fragments: false,
  prolific_seed_producer: false,
  fast_regrowth: false,
  note: "",
};

const initialWeedingFormState: WeedingFormState = {
  weeded_at: getTodayIsoDate(),
  duration_minutes: "",
  note: "",
};

const growthStageOptions = Object.entries(GROWTH_STAGE_LABELS) as [GrowthStage, string][];
const coverageOptions = Object.entries(OBSERVATION_COVERAGE_LABELS) as [ObservationCoverage, string][];
const weedCategoryOptions = WEED_CATEGORIES.map((category) => ({
  value: category,
  label: WEED_CATEGORY_LABELS[category],
}));

const currentYear = new Date().getFullYear();

export function GardenQueue() {
  const [beds, setBeds] = useState<GardenBedQueueItem[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [expandedBedIds, setExpandedBedIds] = useState<Set<string>>(new Set());
  const [expandedObservationBedIds, setExpandedObservationBedIds] = useState<Set<string>>(new Set());
  const [expandedWeedingHistoryBedIds, setExpandedWeedingHistoryBedIds] = useState<Set<string>>(new Set());
  const [plantStateByBedId, setPlantStateByBedId] = useState<Record<string, PlantBedState>>({});
  const [observationStateByBedId, setObservationStateByBedId] = useState<Record<string, ObservationBedState>>({});
  const [weedingStateByBedId, setWeedingStateByBedId] = useState<Record<string, WeedingBedState>>({});

  useEffect(() => {
    void loadBeds();
  }, []);

  const queueSummary = useMemo(() => {
    const urgent = beds.filter((bed) => bed.priority === "urgent").length;
    const soon = beds.filter((bed) => bed.priority === "soon").length;
    return { urgent, soon, total: beds.length };
  }, [beds]);

  async function loadBeds() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/garden/beds");
      const payload = (await response.json()) as BedsResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load garden beds.");
      }

      setBeds(payload.beds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load garden beds.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccessMessage(null);
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccessMessage(null);

    const validation = validateForm(form);
    setFieldErrors(validation.errors);
    if (!validation.success) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/garden/beds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreatePayload(form)),
      });
      const payload = (await response.json()) as BedResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create garden bed.");
      }

      await loadBeds();
      setForm(initialFormState);
      setFieldErrors({});
      setSuccessMessage(`${payload.bed.name} added to the queue.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create garden bed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function togglePlantSection(bedId: string) {
    const willExpand = !expandedBedIds.has(bedId);
    setExpandedBedIds((current) => {
      const next = new Set(current);
      if (willExpand) {
        next.add(bedId);
      } else {
        next.delete(bedId);
      }
      return next;
    });

    if (willExpand && !getPlantState(plantStateByBedId, bedId).hasLoaded) {
      await loadPlants(bedId);
    }
  }

  async function loadPlants(bedId: string) {
    setPlantStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getPlantState(current, bedId),
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(`/api/garden/beds/${bedId}/plants`);
      const payload = (await response.json()) as PlantsResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load plants for this bed.");
      }

      setPlantStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getPlantState(current, bedId),
          plants: payload.plants,
          isLoading: false,
          error: null,
          hasLoaded: true,
        },
      }));
    } catch (err) {
      setPlantStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getPlantState(current, bedId),
          isLoading: false,
          error: err instanceof Error ? err.message : "Unable to load plants for this bed.",
          hasLoaded: true,
        },
      }));
    }
  }

  function updatePlantField(bedId: string, field: keyof PlantFormState, value: string) {
    setPlantStateByBedId((current) => {
      const bedState = getPlantState(current, bedId);
      return {
        ...current,
        [bedId]: {
          ...bedState,
          form: { ...bedState.form, [field]: value },
          fieldErrors: { ...bedState.fieldErrors, [field]: undefined },
          error: null,
        },
      };
    });
  }

  async function submitPlant(bedId: string, event: { preventDefault: () => void }) {
    event.preventDefault();
    const bedState = getPlantState(plantStateByBedId, bedId);
    if (bedState.isSubmitting) return;

    const validation = validatePlantForm(bedState.form);
    setPlantStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getPlantState(current, bedId),
        fieldErrors: validation.errors,
        error: null,
      },
    }));
    if (!validation.success) return;

    setPlantStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getPlantState(current, bedId),
        isSubmitting: true,
      },
    }));

    try {
      const response = await fetch(`/api/garden/beds/${bedId}/plants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreatePlantPayload(bedState.form)),
      });
      const payload = (await response.json()) as PlantResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add plant to this bed.");
      }

      setPlantStateByBedId((current) => {
        const currentState = getPlantState(current, bedId);
        return {
          ...current,
          [bedId]: {
            ...currentState,
            plants: [payload.plant, ...currentState.plants],
            form: initialPlantFormState,
            fieldErrors: {},
            error: null,
            isSubmitting: false,
            hasLoaded: true,
          },
        };
      });
    } catch (err) {
      setPlantStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getPlantState(current, bedId),
          isSubmitting: false,
          error: err instanceof Error ? err.message : "Unable to add plant to this bed.",
        },
      }));
    }
  }

  async function toggleObservationSection(bedId: string) {
    const willExpand = !expandedObservationBedIds.has(bedId);
    setExpandedObservationBedIds((current) => {
      const next = new Set(current);
      if (willExpand) {
        next.add(bedId);
      } else {
        next.delete(bedId);
      }
      return next;
    });

    if (willExpand && !getObservationState(observationStateByBedId, bedId).hasLoaded) {
      await loadObservations(bedId);
    }
  }

  async function loadObservations(bedId: string) {
    setObservationStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getObservationState(current, bedId),
        isLoading: true,
        error: null,
        successMessage: null,
      },
    }));

    try {
      const response = await fetch(`/api/garden/beds/${bedId}/weed-observations`);
      const payload = (await response.json()) as WeedObservationsResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load weed observations for this bed.");
      }

      setObservationStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getObservationState(current, bedId),
          observations: payload.observations,
          isLoading: false,
          error: null,
          hasLoaded: true,
        },
      }));
    } catch (err) {
      setObservationStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getObservationState(current, bedId),
          isLoading: false,
          error: err instanceof Error ? err.message : "Unable to load weed observations for this bed.",
          hasLoaded: true,
        },
      }));
    }
  }

  function updateObservationField<K extends keyof WeedObservationFormState>(
    bedId: string,
    field: K,
    value: WeedObservationFormState[K],
  ) {
    setObservationStateByBedId((current) => {
      const bedState = getObservationState(current, bedId);
      return {
        ...current,
        [bedId]: {
          ...bedState,
          form: { ...bedState.form, [field]: value },
          fieldErrors: { ...bedState.fieldErrors, [field]: undefined },
          error: null,
          successMessage: null,
        },
      };
    });
  }

  function selectWeedCatalogEntry(bedId: string, slug: string) {
    const entry = POLISH_WEED_CATALOG.find((item) => item.slug === slug);
    setObservationStateByBedId((current) => {
      const bedState = getObservationState(current, bedId);
      const traitDefaults = Object.fromEntries(
        WEED_RISK_TRAITS.map((trait) => [trait, entry?.default_risk_traits.includes(trait) ?? false]),
      ) as Record<WeedRiskTrait, boolean>;
      return {
        ...current,
        [bedId]: {
          ...bedState,
          form: {
            ...bedState.form,
            ...traitDefaults,
            weed_catalog_slug: slug,
            weed_name: entry?.name ?? bedState.form.weed_name,
            weed_category: entry?.category ?? bedState.form.weed_category,
          },
          fieldErrors: { ...bedState.fieldErrors, weed_catalog_slug: undefined, weed_name: undefined },
          error: null,
          successMessage: null,
        },
      };
    });
  }

  async function submitObservation(bedId: string, event: { preventDefault: () => void }) {
    event.preventDefault();
    const bedState = getObservationState(observationStateByBedId, bedId);
    if (bedState.isSubmitting) return;

    const validation = validateObservationForm(bedState.form);
    setObservationStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getObservationState(current, bedId),
        fieldErrors: validation.errors,
        error: null,
        successMessage: null,
      },
    }));
    if (!validation.success) return;

    setObservationStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getObservationState(current, bedId),
        isSubmitting: true,
      },
    }));

    try {
      const response = await fetch(`/api/garden/beds/${bedId}/weed-observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreateObservationPayload(bedState.form)),
      });
      const payload = (await response.json()) as WeedObservationResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add weed observation to this bed.");
      }

      setObservationStateByBedId((current) => {
        const currentState = getObservationState(current, bedId);
        return {
          ...current,
          [bedId]: {
            ...currentState,
            observations: [payload.observation, ...currentState.observations],
            form: { ...initialObservationFormState, observed_at: getTodayIsoDate() },
            fieldErrors: {},
            error: null,
            successMessage: "Obserwacja dodana — kolejka została odświeżona.",
            isSubmitting: false,
            hasLoaded: true,
          },
        };
      });
      await loadBeds();
    } catch (err) {
      setObservationStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getObservationState(current, bedId),
          isSubmitting: false,
          error: err instanceof Error ? err.message : "Unable to add weed observation to this bed.",
        },
      }));
    }
  }

  async function toggleWeedingHistorySection(bedId: string) {
    const willExpand = !expandedWeedingHistoryBedIds.has(bedId);
    setExpandedWeedingHistoryBedIds((current) => {
      const next = new Set(current);
      if (willExpand) {
        next.add(bedId);
      } else {
        next.delete(bedId);
      }
      return next;
    });

    if (willExpand && !getWeedingState(weedingStateByBedId, bedId).hasLoaded) {
      await loadWeedingEvents(bedId);
    }
  }

  async function loadWeedingEvents(bedId: string) {
    setWeedingStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getWeedingState(current, bedId),
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(`/api/garden/beds/${bedId}/weeding-events`);
      const payload = (await response.json()) as WeedingEventsResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load weeding history for this bed.");
      }

      setWeedingStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getWeedingState(current, bedId),
          events: payload.events,
          isLoading: false,
          error: null,
          hasLoaded: true,
        },
      }));
    } catch (err) {
      setWeedingStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getWeedingState(current, bedId),
          isLoading: false,
          error: err instanceof Error ? err.message : "Unable to load weeding history for this bed.",
          hasLoaded: true,
        },
      }));
    }
  }

  function updateWeedingField<K extends keyof WeedingFormState>(bedId: string, field: K, value: WeedingFormState[K]) {
    setWeedingStateByBedId((current) => {
      const bedState = getWeedingState(current, bedId);
      return {
        ...current,
        [bedId]: {
          ...bedState,
          form: { ...bedState.form, [field]: value },
          fieldErrors: { ...bedState.fieldErrors, [field]: undefined },
          error: null,
          successMessage: null,
        },
      };
    });
  }

  async function submitMarkWeeded(bedId: string, event: { preventDefault: () => void }) {
    event.preventDefault();
    const bedState = getWeedingState(weedingStateByBedId, bedId);
    if (bedState.isSubmitting) return;

    const validation = validateWeedingForm(bedState.form);
    setWeedingStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getWeedingState(current, bedId),
        fieldErrors: validation.errors,
        error: null,
        successMessage: null,
      },
    }));
    if (!validation.success) return;

    setWeedingStateByBedId((current) => ({
      ...current,
      [bedId]: {
        ...getWeedingState(current, bedId),
        isSubmitting: true,
      },
    }));

    try {
      const response = await fetch(`/api/garden/beds/${bedId}/mark-weeded`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toMarkWeededPayload(bedState.form)),
      });
      const payload = (await response.json()) as MarkWeededResponse & ErrorResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record weeding for this bed.");
      }

      setWeedingStateByBedId((current) => {
        const currentState = getWeedingState(current, bedId);
        const events = sortWeedingEvents(
          currentState.hasLoaded ? [payload.event, ...currentState.events] : [payload.event],
        );
        return {
          ...current,
          [bedId]: {
            ...currentState,
            events,
            form: { ...initialWeedingFormState, weeded_at: getTodayIsoDate() },
            fieldErrors: {},
            error: null,
            successMessage: "Weeding recorded — queue refreshed.",
            isSubmitting: false,
            hasLoaded: currentState.hasLoaded,
          },
        };
      });
      await loadBeds();
    } catch (err) {
      setWeedingStateByBedId((current) => ({
        ...current,
        [bedId]: {
          ...getWeedingState(current, bedId),
          isSubmitting: false,
          error: err instanceof Error ? err.message : "Unable to record weeding for this bed.",
        },
      }));
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl"
        noValidate
      >
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold tracking-[0.3em] text-emerald-200/80 uppercase">Add bed</p>
          <h2 className="text-2xl font-bold">Garden bed details</h2>
          <p className="text-sm leading-6 text-blue-100/70">
            Name and weed level are required. Other fields improve priority confidence but may stay blank.
          </p>
        </div>

        <div className="space-y-4">
          <TextField
            id="name"
            label="Bed name"
            value={form.name}
            onChange={(value) => {
              updateField("name", value);
            }}
            placeholder="e.g. Front perennial border"
            error={fieldErrors.name}
            required
          />

          <div>
            <label htmlFor="weed_level" className="mb-1 block text-sm text-blue-100/80">
              Weed level <span className="text-emerald-200">*</span>
            </label>
            <select
              id="weed_level"
              value={form.weed_level}
              onChange={(event) => {
                updateField("weed_level", event.target.value as WeedLevel);
              }}
              className="w-full rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-white transition-colors outline-none focus:ring-2 focus:ring-purple-400"
            >
              {weedLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="area_m2"
              label="Area (m²)"
              value={form.area_m2}
              onChange={(value) => {
                updateField("area_m2", value);
              }}
              type="number"
              min="0.1"
              step="0.1"
              placeholder="12"
              error={fieldErrors.area_m2}
            />
            <TextField
              id="last_weeded_at"
              label="Last weeded"
              value={form.last_weeded_at}
              onChange={(value) => {
                updateField("last_weeded_at", value);
              }}
              type="date"
              max={getTodayIsoDate()}
              error={fieldErrors.last_weeded_at}
            />
            <TextField
              id="estimated_minutes"
              label="Estimated minutes"
              value={form.estimated_minutes}
              onChange={(value) => {
                updateField("estimated_minutes", value);
              }}
              type="number"
              min="1"
              step="1"
              placeholder="45"
              error={fieldErrors.estimated_minutes}
            />
            <TextField
              id="mulch_depth_cm"
              label="Mulch depth (cm)"
              value={form.mulch_depth_cm}
              onChange={(value) => {
                updateField("mulch_depth_cm", value);
              }}
              type="number"
              min="0"
              step="0.5"
              placeholder="3"
              error={fieldErrors.mulch_depth_cm}
            />
          </div>

          <ServerError message={error} />
          {successMessage && (
            <p className="rounded-lg border border-emerald-400/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
              {successMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isSubmitting ? "Adding bed..." : "Add to priority queue"}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-[0.3em] text-emerald-200/80 uppercase">Priority queue</p>
            <h2 className="text-2xl font-bold">Next beds to weed</h2>
            <p className="text-sm text-blue-100/70">
              {queueSummary.total === 0
                ? "Add your first bed to see the queue."
                : `${queueSummary.total} beds · ${queueSummary.urgent} urgent · ${queueSummary.soon} soon`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadBeds()}
            disabled={isLoading}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-4 text-blue-100/80">
            <Loader2 className="size-5 animate-spin" />
            Loading garden beds...
          </div>
        ) : beds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/30 p-6 text-center">
            <Sprout className="mx-auto mb-3 size-8 text-emerald-200" />
            <h3 className="font-semibold">No beds in your queue yet</h3>
            <p className="mt-2 text-sm text-blue-100/70">
              Add a bed with a weed level to start building your weeding priority queue.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {beds.map((bed, index) => (
              <QueueCard
                key={bed.id}
                bed={bed}
                position={index + 1}
                isPlantExpanded={expandedBedIds.has(bed.id)}
                isObservationExpanded={expandedObservationBedIds.has(bed.id)}
                isWeedingHistoryExpanded={expandedWeedingHistoryBedIds.has(bed.id)}
                plantState={getPlantState(plantStateByBedId, bed.id)}
                observationState={getObservationState(observationStateByBedId, bed.id)}
                weedingState={getWeedingState(weedingStateByBedId, bed.id)}
                onTogglePlants={() => void togglePlantSection(bed.id)}
                onToggleObservations={() => void toggleObservationSection(bed.id)}
                onToggleWeedingHistory={() => void toggleWeedingHistorySection(bed.id)}
                onPlantFieldChange={(field, value) => {
                  updatePlantField(bed.id, field, value);
                }}
                onPlantSubmit={(event) => void submitPlant(bed.id, event)}
                onPlantRetry={() => void loadPlants(bed.id)}
                onObservationFieldChange={(field, value) => {
                  updateObservationField(bed.id, field, value);
                }}
                onObservationCatalogSelect={(slug) => {
                  selectWeedCatalogEntry(bed.id, slug);
                }}
                onObservationSubmit={(event) => void submitObservation(bed.id, event)}
                onObservationRetry={() => void loadObservations(bed.id)}
                onWeedingFieldChange={(field, value) => {
                  updateWeedingField(bed.id, field, value);
                }}
                onWeedingSubmit={(event) => void submitMarkWeeded(bed.id, event)}
                onWeedingRetry={() => void loadWeedingEvents(bed.id)}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required,
  min,
  max,
  step,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-blue-100/80">
        {label} {required && <span className="text-emerald-200">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors outline-none focus:ring-2",
          error ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
        )}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-blue-100/80">
        {label} <span className="text-emerald-200">*</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={cn(
          "w-full rounded-lg border bg-slate-950/80 px-3 py-2 text-white transition-colors outline-none focus:ring-2",
          error ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function QueueCard({
  bed,
  position,
  isPlantExpanded,
  isObservationExpanded,
  isWeedingHistoryExpanded,
  plantState,
  observationState,
  weedingState,
  onTogglePlants,
  onToggleObservations,
  onToggleWeedingHistory,
  onPlantFieldChange,
  onPlantSubmit,
  onPlantRetry,
  onObservationFieldChange,
  onObservationCatalogSelect,
  onObservationSubmit,
  onObservationRetry,
  onWeedingFieldChange,
  onWeedingSubmit,
  onWeedingRetry,
}: {
  bed: GardenBedQueueItem;
  position: number;
  isPlantExpanded: boolean;
  isObservationExpanded: boolean;
  isWeedingHistoryExpanded: boolean;
  plantState: PlantBedState;
  observationState: ObservationBedState;
  weedingState: WeedingBedState;
  onTogglePlants: () => void;
  onToggleObservations: () => void;
  onToggleWeedingHistory: () => void;
  onPlantFieldChange: (field: keyof PlantFormState, value: string) => void;
  onPlantSubmit: (event: { preventDefault: () => void }) => void;
  onPlantRetry: () => void;
  onObservationFieldChange: <K extends keyof WeedObservationFormState>(
    field: K,
    value: WeedObservationFormState[K],
  ) => void;
  onObservationCatalogSelect: (slug: string) => void;
  onObservationSubmit: (event: { preventDefault: () => void }) => void;
  onObservationRetry: () => void;
  onWeedingFieldChange: <K extends keyof WeedingFormState>(field: K, value: WeedingFormState[K]) => void;
  onWeedingSubmit: (event: { preventDefault: () => void }) => void;
  onWeedingRetry: () => void;
}) {
  const suggestedDateText = bed.suggested_weed_at
    ? `Suggested next weeding: ${formatDisplayDate(bed.suggested_weed_at)}`
    : "Add last weeded date for a suggested next-weeding date.";
  const priorityClass = `rounded-full px-3 py-1 text-sm font-semibold ${priorityClassName(bed.priority)}`;
  const confidenceClass = `rounded-full px-3 py-1 text-xs font-medium ${
    bed.priority_confidence === "complete" ? "bg-emerald-400/15 text-emerald-100" : "bg-amber-400/15 text-amber-100"
  }`;
  const weedLevel = capitalize(bed.weed_level);
  const area = formatOptionalNumber(bed.area_m2, "m²");
  const workTime = formatOptionalNumber(bed.estimated_minutes, "min");
  const mulch = formatOptionalNumber(bed.mulch_depth_cm, "cm");

  return (
    <li className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-blue-100">
              {position}
            </span>
            <h3 className="text-lg font-semibold">{bed.name}</h3>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-blue-100/70">
            <CalendarDays className="size-4" />
            {suggestedDateText}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className={priorityClass}>{bed.priority_label}</span>
          <span className={confidenceClass}>
            {bed.priority_confidence === "complete" ? "complete confidence" : "partial confidence"}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-blue-100/75 sm:grid-cols-2 lg:grid-cols-4">
        <QueueMetric icon={<Sprout className="size-4" />} label="Weed level" value={weedLevel} />
        <QueueMetric icon={<Map className="size-4" />} label="Area" value={area} />
        <QueueMetric icon={<Clock className="size-4" />} label="Work time" value={workTime} />
        <QueueMetric icon={<Sprout className="size-4" />} label="Mulch" value={mulch} />
      </dl>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-xs text-blue-100/60">
          <p>Priority score: {bed.priority_score}</p>
          {bed.observation_count > 0 && (
            <p>
              Obserwacje chwastów: {bed.observation_pressure_label} (+{bed.observation_pressure_score})
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onToggleObservations}
            className="border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 hover:text-white"
            aria-expanded={isObservationExpanded}
          >
            <Sprout className="size-4" />
            {isObservationExpanded ? "Ukryj obserwacje chwastów" : "Pokaż obserwacje chwastów"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onToggleWeedingHistory}
            className="border-blue-300/30 bg-blue-400/10 text-blue-100 hover:bg-blue-400/20 hover:text-white"
            aria-expanded={isWeedingHistoryExpanded}
          >
            <Clock className="size-4" />
            {isWeedingHistoryExpanded ? "Hide weeding history" : "Weeding history"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onTogglePlants}
            className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20 hover:text-white"
            aria-expanded={isPlantExpanded}
          >
            <Leaf className="size-4" />
            {isPlantExpanded ? "Hide plants" : "Show plants"}
          </Button>
        </div>
      </div>

      <WeedingForm
        bedName={bed.name}
        state={weedingState}
        onFieldChange={onWeedingFieldChange}
        onSubmit={onWeedingSubmit}
      />

      {bed.observation_reasons.length > 0 && (
        <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-950/20 p-3 text-sm text-amber-50">
          Przyspieszono: {bed.observation_reasons.join(", ")}.
        </p>
      )}

      {isWeedingHistoryExpanded && (
        <WeedingHistorySection bedName={bed.name} state={weedingState} onRetry={onWeedingRetry} />
      )}

      {isObservationExpanded && (
        <ObservationSection
          bedName={bed.name}
          state={observationState}
          onFieldChange={onObservationFieldChange}
          onCatalogSelect={onObservationCatalogSelect}
          onSubmit={onObservationSubmit}
          onRetry={onObservationRetry}
        />
      )}

      {isPlantExpanded && (
        <PlantSection
          bedName={bed.name}
          state={plantState}
          onFieldChange={onPlantFieldChange}
          onSubmit={onPlantSubmit}
          onRetry={onPlantRetry}
        />
      )}
    </li>
  );
}

function WeedingForm({
  bedName,
  state,
  onFieldChange,
  onSubmit,
}: {
  bedName: string;
  state: WeedingBedState;
  onFieldChange: <K extends keyof WeedingFormState>(field: K, value: WeedingFormState[K]) => void;
  onSubmit: (event: { preventDefault: () => void }) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-blue-300/15 bg-blue-950/20 p-4" noValidate>
      <div className="mb-3">
        <h4 className="font-semibold text-blue-100">Record completed weeding</h4>
        <p className="text-xs text-blue-100/60">
          Save when {bedName} was weeded, how long it took, and an optional note.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          id={`weeding-date-${bedName}`}
          label="Weeded date"
          value={state.form.weeded_at}
          onChange={(value) => {
            onFieldChange("weeded_at", value);
          }}
          type="date"
          max={getTodayIsoDate()}
          error={state.fieldErrors.weeded_at}
          required
        />
        <TextField
          id={`weeding-duration-${bedName}`}
          label="Duration minutes"
          value={state.form.duration_minutes}
          onChange={(value) => {
            onFieldChange("duration_minutes", value);
          }}
          type="number"
          min="1"
          step="1"
          placeholder="30"
          error={state.fieldErrors.duration_minutes}
          required
        />
        <TextField
          id={`weeding-note-${bedName}`}
          label="Note"
          value={state.form.note}
          onChange={(value) => {
            onFieldChange("note", value);
          }}
          placeholder="optional"
          error={state.fieldErrors.note}
        />
      </div>
      <ServerError message={state.error} />
      {state.successMessage && (
        <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
          {state.successMessage}
        </p>
      )}
      <Button
        type="submit"
        disabled={state.isSubmitting}
        className="mt-3 w-full bg-blue-300 text-slate-950 hover:bg-blue-200"
      >
        {state.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
        {state.isSubmitting ? "Recording weeding..." : "Mark bed weeded"}
      </Button>
    </form>
  );
}

function WeedingHistorySection({
  bedName,
  state,
  onRetry,
}: {
  bedName: string;
  state: WeedingBedState;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-blue-300/15 bg-blue-950/20 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold text-blue-100">Weeding history for {bedName}</h4>
          <p className="text-xs text-blue-100/60">Completion events are loaded on demand for this bed.</p>
        </div>
        {state.error && (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Retry
          </Button>
        )}
      </div>

      {state.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-950/30 p-3 text-sm text-blue-100/75">
          <Loader2 className="size-4 animate-spin" />
          Loading weeding history...
        </div>
      ) : state.error ? (
        <ServerError message={state.error} />
      ) : state.events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-slate-950/25 p-3 text-sm text-blue-100/70">
          No weeding sessions recorded for this bed yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.events.map((event) => (
            <li key={event.id} className="rounded-lg bg-white/5 p-3">
              <p className="font-medium text-white">
                {formatDisplayDate(event.weeded_at)} · {event.duration_minutes} min
              </p>
              {event.note && <p className="mt-2 text-xs text-blue-100/70">{event.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ObservationSection({
  bedName,
  state,
  onFieldChange,
  onCatalogSelect,
  onSubmit,
  onRetry,
}: {
  bedName: string;
  state: ObservationBedState;
  onFieldChange: <K extends keyof WeedObservationFormState>(field: K, value: WeedObservationFormState[K]) => void;
  onCatalogSelect: (slug: string) => void;
  onSubmit: (event: { preventDefault: () => void }) => void;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-950/20 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold text-amber-100">Obserwacje chwastów w rabacie {bedName}</h4>
          <p className="text-xs text-blue-100/60">
            Ostatnie obserwacje mogą przyspieszyć sugerowany termin pielenia i kolejność w kolejce.
          </p>
        </div>
        {state.error && (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Retry
          </Button>
        )}
      </div>

      {state.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-950/30 p-3 text-sm text-blue-100/75">
          <Loader2 className="size-4 animate-spin" />
          Loading weed observations...
        </div>
      ) : state.error ? (
        <ServerError message={state.error} />
      ) : state.observations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-slate-950/25 p-3 text-sm text-blue-100/70">
          Brak obserwacji chwastów dla tej rabaty.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.observations.map((observation) => (
            <li key={observation.id} className="rounded-lg bg-white/5 p-3">
              <p className="font-medium text-white">
                {observation.weed_name ?? WEED_CATEGORY_LABELS[observation.weed_category]} ·{" "}
                {formatDisplayDate(observation.observed_at)}
              </p>
              <p className="mt-1 text-xs text-blue-100/60">{formatObservationDetails(observation)}</p>
              {observation.note && <p className="mt-2 text-xs text-blue-100/70">{observation.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {state.successMessage && (
        <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">
          {state.successMessage}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
        <div>
          <label htmlFor={`weed-catalog-${bedName}`} className="mb-1 block text-sm text-blue-100/80">
            Katalog chwastów
          </label>
          <select
            id={`weed-catalog-${bedName}`}
            value={state.form.weed_catalog_slug}
            onChange={(event) => {
              onCatalogSelect(event.target.value);
            }}
            className="w-full rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-white transition-colors outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Własny / wybierz z listy</option>
            {POLISH_WEED_CATALOG.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name} — {entry.helper_text}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id={`weed-name-${bedName}`}
            label="Nazwa chwastu"
            value={state.form.weed_name}
            onChange={(value) => {
              onFieldChange("weed_name", value);
            }}
            placeholder="np. perz albo nie wiem"
            error={state.fieldErrors.weed_name}
          />
          <TextField
            id={`weed-observed-${bedName}`}
            label="Data obserwacji"
            value={state.form.observed_at}
            onChange={(value) => {
              onFieldChange("observed_at", value);
            }}
            type="date"
            max={getTodayIsoDate()}
            error={state.fieldErrors.observed_at}
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id={`weed-category-${bedName}`}
            label="Kategoria"
            value={state.form.weed_category}
            options={weedCategoryOptions}
            onChange={(value) => {
              onFieldChange("weed_category", value as WeedCategory);
            }}
            error={state.fieldErrors.weed_category}
          />
          <SelectField
            id={`weed-stage-${bedName}`}
            label="Faza wzrostu"
            value={state.form.growth_stage}
            options={growthStageOptions.map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              onFieldChange("growth_stage", value as GrowthStage);
            }}
            error={state.fieldErrors.growth_stage}
          />
          <SelectField
            id={`weed-coverage-${bedName}`}
            label="Pokrycie"
            value={state.form.coverage}
            options={coverageOptions.map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              onFieldChange("coverage", value as ObservationCoverage);
            }}
            error={state.fieldErrors.coverage}
          />
          <TextField
            id={`weed-severity-${bedName}`}
            label="Nasilenie 1-5"
            value={state.form.severity}
            onChange={(value) => {
              onFieldChange("severity", value);
            }}
            type="number"
            min="1"
            max="5"
            step="1"
            error={state.fieldErrors.severity}
            required
          />
        </div>

        <fieldset className="rounded-lg border border-white/15 p-3">
          <legend className="px-1 text-sm text-blue-100/80">Cechy ryzyka</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {WEED_RISK_TRAITS.map((trait) => (
              <label key={trait} className="flex items-start gap-2 text-sm text-blue-100/75">
                <input
                  type="checkbox"
                  checked={state.form[trait]}
                  onChange={(event) => {
                    onFieldChange(trait, event.target.checked);
                  }}
                  className="mt-1"
                />
                {WEED_RISK_TRAIT_LABELS[trait]}
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          id={`weed-note-${bedName}`}
          label="Notatka"
          value={state.form.note}
          onChange={(value) => {
            onFieldChange("note", value);
          }}
          placeholder="opcjonalnie"
          error={state.fieldErrors.note}
        />

        <Button
          type="submit"
          disabled={state.isSubmitting}
          className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200"
        >
          {state.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {state.isSubmitting ? "Dodawanie obserwacji..." : "Dodaj obserwację chwastu"}
        </Button>
      </form>
    </div>
  );
}

function PlantSection({
  bedName,
  state,
  onFieldChange,
  onSubmit,
  onRetry,
}: {
  bedName: string;
  state: PlantBedState;
  onFieldChange: (field: keyof PlantFormState, value: string) => void;
  onSubmit: (event: { preventDefault: () => void }) => void;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-950/20 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold text-emerald-100">Plants in {bedName}</h4>
          <p className="text-xs text-blue-100/60">
            Current height and width are snapshots you enter now; they are not automatically updated.
          </p>
        </div>
        {state.error && (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Retry
          </Button>
        )}
      </div>

      {state.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-950/30 p-3 text-sm text-blue-100/75">
          <Loader2 className="size-4 animate-spin" />
          Loading plants...
        </div>
      ) : state.error ? (
        <ServerError message={state.error} />
      ) : state.plants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-slate-950/25 p-3 text-sm text-blue-100/70">
          No plants recorded for this bed yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.plants.map((plant) => (
            <li key={plant.id} className="rounded-lg bg-white/5 p-3">
              <p className="font-medium text-white">{plant.name}</p>
              <p className="mt-1 text-xs text-blue-100/60">{formatPlantDetails(plant)}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
        <TextField
          id={`plant-name-${bedName}`}
          label="Plant name"
          value={state.form.name}
          onChange={(value) => {
            onFieldChange("name", value);
          }}
          placeholder="e.g. Lavender"
          error={state.fieldErrors.name}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id={`plant-year-${bedName}`}
            label="Planted year"
            value={state.form.planted_year}
            onChange={(value) => {
              onFieldChange("planted_year", value);
            }}
            type="number"
            min="1900"
            max={String(currentYear)}
            step="1"
            placeholder={String(currentYear)}
            error={state.fieldErrors.planted_year}
          />
          <TextField
            id={`plant-quantity-${bedName}`}
            label="Quantity"
            value={state.form.quantity}
            onChange={(value) => {
              onFieldChange("quantity", value);
            }}
            type="number"
            min="1"
            step="1"
            placeholder="3"
            error={state.fieldErrors.quantity}
          />
          <TextField
            id={`plant-height-${bedName}`}
            label="Current height (cm)"
            value={state.form.height_cm}
            onChange={(value) => {
              onFieldChange("height_cm", value);
            }}
            type="number"
            min="0.1"
            step="0.1"
            placeholder="30"
            error={state.fieldErrors.height_cm}
          />
          <TextField
            id={`plant-width-${bedName}`}
            label="Current width (cm)"
            value={state.form.width_cm}
            onChange={(value) => {
              onFieldChange("width_cm", value);
            }}
            type="number"
            min="0.1"
            step="0.1"
            placeholder="25"
            error={state.fieldErrors.width_cm}
          />
        </div>
        <Button
          type="submit"
          disabled={state.isSubmitting}
          className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
        >
          {state.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {state.isSubmitting ? "Adding plant..." : "Add plant"}
        </Button>
      </form>
    </div>
  );
}

function QueueMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <dt className="flex items-center gap-2 text-xs text-blue-100/50">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-medium text-white">{value}</dd>
    </div>
  );
}

function getPlantState(source: Record<string, PlantBedState>, bedId: string): PlantBedState {
  return (
    source[bedId] ?? {
      plants: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      form: initialPlantFormState,
      fieldErrors: {},
      hasLoaded: false,
    }
  );
}

function getObservationState(source: Record<string, ObservationBedState>, bedId: string): ObservationBedState {
  return (
    source[bedId] ?? {
      observations: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      successMessage: null,
      form: { ...initialObservationFormState, observed_at: getTodayIsoDate() },
      fieldErrors: {},
      hasLoaded: false,
    }
  );
}

function getWeedingState(source: Record<string, WeedingBedState>, bedId: string): WeedingBedState {
  return (
    source[bedId] ?? {
      events: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      successMessage: null,
      form: { ...initialWeedingFormState, weeded_at: getTodayIsoDate() },
      fieldErrors: {},
      hasLoaded: false,
    }
  );
}

function validateForm(form: FormState): { success: boolean; errors: Partial<Record<keyof FormState, string>> } {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.name.trim()) errors.name = "Bed name is required.";
  if (!weedLevelOptions.some((option) => option.value === form.weed_level)) errors.weed_level = "Choose a weed level.";
  if (!isBlankOrNumber(form.area_m2, { min: 0, exclusiveMin: true })) errors.area_m2 = "Area must be greater than 0.";
  if (!isBlankOrInteger(form.estimated_minutes, 1))
    errors.estimated_minutes = "Estimated minutes must be a positive whole number.";
  if (!isBlankOrNumber(form.mulch_depth_cm, { min: 0 })) errors.mulch_depth_cm = "Mulch depth cannot be negative.";
  if (form.last_weeded_at && !isPastOrTodayDate(form.last_weeded_at)) {
    errors.last_weeded_at = "Last weeded date must be today or in the past.";
  }

  return { success: Object.keys(errors).length === 0, errors };
}

function validatePlantForm(form: PlantFormState): {
  success: boolean;
  errors: Partial<Record<keyof PlantFormState, string>>;
} {
  const errors: Partial<Record<keyof PlantFormState, string>> = {};

  if (!form.name.trim()) errors.name = "Plant name is required.";
  if (!isBlankOrIntegerInRange(form.planted_year, 1900, currentYear))
    errors.planted_year = `Planted year must be from 1900 through ${currentYear}.`;
  if (!isBlankOrInteger(form.quantity, 1)) errors.quantity = "Quantity must be a positive whole number.";
  if (!isBlankOrNumber(form.height_cm, { min: 0, exclusiveMin: true }))
    errors.height_cm = "Current height must be greater than 0.";
  if (!isBlankOrNumber(form.width_cm, { min: 0, exclusiveMin: true }))
    errors.width_cm = "Current width must be greater than 0.";

  return { success: Object.keys(errors).length === 0, errors };
}

function validateWeedingForm(form: WeedingFormState): {
  success: boolean;
  errors: Partial<Record<keyof WeedingFormState, string>>;
} {
  const errors: Partial<Record<keyof WeedingFormState, string>> = {};

  if (!isPastOrTodayDate(form.weeded_at)) {
    errors.weeded_at = "Weeding date must be today or in the past.";
  }
  if (!isRequiredInteger(form.duration_minutes, 1)) {
    errors.duration_minutes = "Duration must be a positive whole number.";
  }
  if (form.note.length > 0 && !form.note.trim()) {
    errors.note = "Note cannot be empty.";
  }

  return { success: Object.keys(errors).length === 0, errors };
}

function validateObservationForm(form: WeedObservationFormState): {
  success: boolean;
  errors: Partial<Record<keyof WeedObservationFormState, string>>;
} {
  const errors: Partial<Record<keyof WeedObservationFormState, string>> = {};

  if (!isPastOrTodayDate(form.observed_at)) {
    errors.observed_at = "Data obserwacji musi być dzisiejsza albo z przeszłości.";
  }
  if (!WEED_CATEGORIES.includes(form.weed_category)) errors.weed_category = "Wybierz kategorię chwastu.";
  if (!growthStageOptions.some(([value]) => value === form.growth_stage)) errors.growth_stage = "Wybierz fazę wzrostu.";
  if (!coverageOptions.some(([value]) => value === form.coverage)) errors.coverage = "Wybierz pokrycie.";
  if (!isRequiredIntegerInRange(form.severity, 1, 5)) errors.severity = "Nasilenie musi być liczbą od 1 do 5.";
  if (form.weed_name.length > 0 && !form.weed_name.trim()) errors.weed_name = "Nazwa nie może być pusta.";
  if (form.note.length > 0 && !form.note.trim()) errors.note = "Notatka nie może być pusta.";

  return { success: Object.keys(errors).length === 0, errors };
}

function toCreatePayload(form: FormState) {
  return {
    name: form.name.trim(),
    weed_level: form.weed_level,
    area_m2: toOptionalNumber(form.area_m2),
    last_weeded_at: form.last_weeded_at || null,
    estimated_minutes: toOptionalNumber(form.estimated_minutes),
    mulch_depth_cm: toOptionalNumber(form.mulch_depth_cm),
  };
}

function toCreatePlantPayload(form: PlantFormState) {
  return {
    name: form.name.trim(),
    planted_year: toOptionalNumber(form.planted_year),
    quantity: toOptionalNumber(form.quantity),
    height_cm: toOptionalNumber(form.height_cm),
    width_cm: toOptionalNumber(form.width_cm),
  };
}

function toMarkWeededPayload(form: WeedingFormState) {
  return {
    weeded_at: form.weeded_at,
    duration_minutes: Number(form.duration_minutes),
    note: form.note.trim() || null,
  };
}

function toCreateObservationPayload(form: WeedObservationFormState) {
  return {
    observed_at: form.observed_at,
    weed_catalog_slug: form.weed_catalog_slug || null,
    weed_name: form.weed_name.trim() || null,
    weed_category: form.weed_category,
    growth_stage: form.growth_stage,
    coverage: form.coverage,
    severity: Number(form.severity),
    spreads_by_rhizomes: form.spreads_by_rhizomes,
    spreads_by_stolons: form.spreads_by_stolons,
    spreads_by_tubers: form.spreads_by_tubers,
    regrows_from_root_fragments: form.regrows_from_root_fragments,
    prolific_seed_producer: form.prolific_seed_producer,
    fast_regrowth: form.fast_regrowth,
    note: form.note.trim() || null,
  };
}

function toOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  return Number(value);
}

function isBlankOrNumber(value: string, options: { min: number; exclusiveMin?: boolean }): boolean {
  if (value.trim() === "") return true;
  const number = Number(value);
  if (!Number.isFinite(number)) return false;
  return options.exclusiveMin ? number > options.min : number >= options.min;
}

function isBlankOrInteger(value: string, min: number): boolean {
  if (value.trim() === "") return true;
  const number = Number(value);
  return Number.isInteger(number) && number >= min;
}

function isBlankOrIntegerInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return true;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function isRequiredInteger(value: string, min: number): boolean {
  if (value.trim() === "") return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min;
}

function isRequiredIntegerInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function isPastOrTodayDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || value !== date.toISOString().slice(0, 10)) return false;
  return value <= getTodayIsoDate();
}

function priorityClassName(priority: GardenBedQueueItem["priority"]): string {
  if (priority === "urgent") return "bg-red-400/20 text-red-100 ring-1 ring-red-300/30";
  if (priority === "soon") return "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30";
  return "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/30";
}

function formatOptionalNumber(value: number | null, unit: string): string {
  return value === null ? "Not set" : `${value} ${unit}`;
}

function formatPlantDetails(plant: BedPlant): string {
  const details = [
    plant.planted_year ? `planted ${plant.planted_year}` : null,
    plant.quantity ? `qty ${plant.quantity}` : null,
    plant.height_cm ? `current height ${plant.height_cm} cm` : null,
    plant.width_cm ? `current width ${plant.width_cm} cm` : null,
  ].filter(Boolean);

  return details.length > 0 ? details.join(" · ") : "No optional details set.";
}

function sortWeedingEvents(events: readonly WeedingEvent[]): WeedingEvent[] {
  return [...events].sort((a, b) => {
    const weededAtOrder = b.weeded_at.localeCompare(a.weeded_at);
    if (weededAtOrder !== 0) return weededAtOrder;
    return compareIsoDateTimeDescending(a.created_at, b.created_at);
  });
}

function compareIsoDateTimeDescending(a: string, b: string): number {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);

  if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
    return b.localeCompare(a);
  }

  return bTime - aTime;
}

function formatObservationDetails(observation: WeedObservation): string {
  const traits = WEED_RISK_TRAITS.filter((trait) => observation[trait]).map((trait) => WEED_RISK_TRAIT_LABELS[trait]);
  const details = [
    WEED_CATEGORY_LABELS[observation.weed_category],
    GROWTH_STAGE_LABELS[observation.growth_stage],
    OBSERVATION_COVERAGE_LABELS[observation.coverage],
    `nasilenie ${observation.severity}/5`,
    ...traits,
  ];

  return details.join(" · ");
}

function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00Z`));
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
