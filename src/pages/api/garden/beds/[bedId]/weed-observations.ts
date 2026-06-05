import type { APIRoute } from "astro";
import {
  toWeedObservationInsertPayload,
  toWeedObservationResponse,
  validateCreateWeedObservationInput,
  type WeedObservationRow,
} from "@/lib/weed-observations";
import { createClient } from "@/lib/supabase";

const weedObservationColumns =
  "id,bed_id,user_id,observed_at,weed_catalog_slug,weed_name,weed_category,growth_stage,coverage,severity,spreads_by_rhizomes,spreads_by_stolons,spreads_by_tubers,regrows_from_root_fragments,prolific_seed_producer,fast_regrowth,note,created_at,updated_at";

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured." }, 503);
  }

  const user = context.locals.user;
  if (!user) {
    return json({ error: "Authentication required." }, 401);
  }

  const bedId = getBedId(context);
  if (!bedId) {
    return json({ observations: [] });
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

  const bedId = getBedId(context)?.trim();
  if (!bedId) {
    return json({ error: "Garden bed id is required." }, 400);
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

function getBedId(context: Parameters<APIRoute>[0]): string | undefined {
  if (context.params.bedId) return context.params.bedId;

  const segments = context.url.pathname.split("/").filter(Boolean);
  const observationsIndex = segments.lastIndexOf("weed-observations");
  if (observationsIndex <= 0) return undefined;

  return segments[observationsIndex - 1];
}
