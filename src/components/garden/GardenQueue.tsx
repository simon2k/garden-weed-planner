import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CalendarDays, Clock, Loader2, Map, Plus, Sprout } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
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

const initialFormState: FormState = {
  name: "",
  weed_level: "medium",
  area_m2: "",
  last_weeded_at: "",
  estimated_minutes: "",
  mulch_depth_cm: "",
};

export function GardenQueue() {
  const [beds, setBeds] = useState<GardenBedQueueItem[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

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
              <QueueCard key={bed.id} bed={bed} position={index + 1} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

interface TextFieldProps {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  min?: string;
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

function QueueCard({ bed, position }: { bed: GardenBedQueueItem; position: number }) {
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

      <p className="mt-3 text-xs text-blue-100/50">Priority score: {bed.priority_score}</p>
    </li>
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

function validateForm(form: FormState): { success: boolean; errors: Partial<Record<keyof FormState, string>> } {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.name.trim()) errors.name = "Bed name is required.";
  if (!weedLevelOptions.some((option) => option.value === form.weed_level)) errors.weed_level = "Choose a weed level.";
  if (!isBlankOrNumber(form.area_m2, { min: 0, exclusiveMin: true })) errors.area_m2 = "Area must be greater than 0.";
  if (!isBlankOrInteger(form.estimated_minutes, 1))
    errors.estimated_minutes = "Estimated minutes must be a positive whole number.";
  if (!isBlankOrNumber(form.mulch_depth_cm, { min: 0 })) errors.mulch_depth_cm = "Mulch depth cannot be negative.";

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

function priorityClassName(priority: GardenBedQueueItem["priority"]): string {
  if (priority === "urgent") return "bg-red-400/20 text-red-100 ring-1 ring-red-300/30";
  if (priority === "soon") return "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30";
  return "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/30";
}

function formatOptionalNumber(value: number | null, unit: string): string {
  return value === null ? "Not set" : `${value} ${unit}`;
}

function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00Z`));
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
