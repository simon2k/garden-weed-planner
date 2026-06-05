import type { APIRoute } from "astro";
import {
  summarizeGardenBedObservationPressure,
  toGardenBedInsertPayload,
  toGardenBedQueueItem,
  toSortedGardenBedQueue,
  validateCreateGardenBedInput,
  type GardenBedObservationSummary,
  type GardenBedRow,
  type WeedObservationPriorityInput,
} from "@/lib/garden-beds";
import { createClient } from "@/lib/supabase";

const gardenBedColumns =
  "id,user_id,name,area_m2,last_weeded_at,weed_level,estimated_minutes,mulch_depth_cm,created_at,updated_at";
const weedObservationPriorityColumns =
  "bed_id,observed_at,growth_stage,coverage,severity,spreads_by_rhizomes,spreads_by_stolons,spreads_by_tubers,regrows_from_root_fragments,prolific_seed_producer,fast_regrowth";
const observationDecayDays = 60;

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured." }, 503);
  }

  const user = context.locals.user;
  if (!user) {
    return json({ error: "Authentication required." }, 401);
  }

  const { data, error } = await supabase
    .from("garden_beds")
    .select(gardenBedColumns)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: "Unable to list garden beds." }, 500);
  }

  const gardenBedRows = data as unknown as GardenBedRow[];

  if (gardenBedRows.length === 0) {
    return json({ beds: [] });
  }

  const bedIds = gardenBedRows.map((bed) => bed.id);
  const observationWindowStart = getObservationWindowStartDate();
  const { data: observations, error: observationsError } = await supabase
    .from("garden_bed_weed_observations")
    .select(weedObservationPriorityColumns)
    .eq("user_id", user.id)
    .in("bed_id", bedIds)
    .gte("observed_at", observationWindowStart);

  if (observationsError) {
    return json({ error: "Unable to load weed observation priority data." }, 500);
  }

  const observationSummaries = buildObservationSummaryMap(observations);
  const beds = toSortedGardenBedQueue(gardenBedRows, observationSummaries);
  return json({ beds });
};

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured." }, 503);
  }

  const user = context.locals.user;
  if (!user) {
    return json({ error: "Authentication required." }, 401);
  }

  const body = await readJson(context.request);
  if (!body.success) {
    return json({ error: body.error }, 400);
  }

  const validation = validateCreateGardenBedInput(body.data);
  if (!validation.success) {
    return json({ error: validation.error }, 400);
  }

  const insertPayload = toGardenBedInsertPayload(validation.data, user.id);
  const { data, error } = await supabase.from("garden_beds").insert(insertPayload).select(gardenBedColumns).single();

  if (error) {
    return json({ error: "Unable to create garden bed." }, 500);
  }

  return json({ bed: toGardenBedQueueItem(data) }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

type JsonReadResult = { success: true; data: unknown } | { success: false; error: string };

async function readJson(request: Request): Promise<JsonReadResult> {
  try {
    return { success: true, data: await request.json() };
  } catch {
    return { success: false, error: "Request body must be valid JSON." };
  }
}

interface WeedObservationPriorityRow extends WeedObservationPriorityInput {
  bed_id: string;
}

function buildObservationSummaryMap(
  observations: readonly WeedObservationPriorityRow[],
): ReadonlyMap<string, GardenBedObservationSummary> {
  const observationsByBedId = new Map<string, WeedObservationPriorityInput[]>();

  for (const observation of observations) {
    const existing = observationsByBedId.get(observation.bed_id) ?? [];
    existing.push(observation);
    observationsByBedId.set(observation.bed_id, existing);
  }

  return new Map(
    [...observationsByBedId.entries()].map(([bedId, bedObservations]) => [
      bedId,
      summarizeGardenBedObservationPressure(bedObservations),
    ]),
  );
}

function getObservationWindowStartDate(): string {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  today.setUTCDate(today.getUTCDate() - observationDecayDays);
  return today.toISOString().slice(0, 10);
}
