import type { APIRoute } from "astro";
import {
  toWeedObservationInsertPayload,
  toWeedObservationResponse,
  validateCreateWeedObservationInput,
  type WeedObservationRow,
} from "@/lib/weed-observations";
import { createClient } from "@/lib/supabase";

const gardenBedColumns = "id";
const weedObservationColumns =
  "id,bed_id,user_id,observed_at,weed_catalog_slug,weed_name,weed_category,growth_stage,coverage,severity,spreads_by_rhizomes,spreads_by_stolons,spreads_by_tubers,regrows_from_root_fragments,prolific_seed_producer,fast_regrowth,note,created_at,updated_at";

type SupabaseClient = NonNullable<ReturnType<typeof createClient>>;

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured." }, 503);
  }

  const user = context.locals.user;
  if (!user) {
    return json({ error: "Authentication required." }, 401);
  }

  const bedId = context.params.bedId;
  if (!bedId || !isUuid(bedId)) {
    return json({ error: "Garden bed not found." }, 404);
  }

  const ownsBed = await verifyBedOwnership(supabase, bedId, user.id);
  if (!ownsBed.success) {
    return json({ error: ownsBed.error }, ownsBed.status);
  }

  const { data, error } = await supabase
    .from("garden_bed_weed_observations")
    .select(weedObservationColumns)
    .eq("bed_id", bedId)
    .eq("user_id", user.id)
    .order("observed_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: "Unable to list weed observations for this garden bed." }, 500);
  }

  return json({ observations: (data as WeedObservationRow[]).map(toWeedObservationResponse) });
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

  const bedId = context.params.bedId;
  if (!bedId || !isUuid(bedId)) {
    return json({ error: "Garden bed not found." }, 404);
  }

  const ownsBed = await verifyBedOwnership(supabase, bedId, user.id);
  if (!ownsBed.success) {
    return json({ error: ownsBed.error }, ownsBed.status);
  }

  const body = await readJson(context.request);
  if (!body.success) {
    return json({ error: body.error }, 400);
  }

  const validation = validateCreateWeedObservationInput(body.data);
  if (!validation.success) {
    return json({ error: validation.error }, 400);
  }

  const insertPayload = toWeedObservationInsertPayload(validation.data, bedId, user.id);
  const { data, error } = await supabase
    .from("garden_bed_weed_observations")
    .insert(insertPayload)
    .select(weedObservationColumns)
    .single();

  if (error) {
    return json({ error: "Unable to create weed observation for this garden bed." }, 500);
  }

  return json({ observation: toWeedObservationResponse(data) }, 201);
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

type OwnershipResult = { success: true } | { success: false; status: 404 | 500; error: string };

async function verifyBedOwnership(supabase: SupabaseClient, bedId: string, userId: string): Promise<OwnershipResult> {
  const { data, error } = await supabase
    .from("garden_beds")
    .select(gardenBedColumns)
    .eq("id", bedId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { success: false, status: 500, error: "Unable to verify garden bed ownership." };
  }

  if (!data) {
    return { success: false, status: 404, error: "Garden bed not found." };
  }

  return { success: true };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
