import type { APIRoute } from "astro";
import { toGardenBedQueueItem } from "@/lib/garden-beds";
import { createClient } from "@/lib/supabase";
import { toWeedingEventInsertPayload, toWeedingEventResponse, validateMarkBedWeededInput } from "@/lib/weeding-events";

const gardenBedColumns =
  "id,user_id,name,area_m2,last_weeded_at,weed_level,estimated_minutes,mulch_depth_cm,created_at,updated_at";
const weedingEventColumns = "id,bed_id,user_id,weeded_at,duration_minutes,note,created_at,updated_at";

export const PATCH: APIRoute = async (context) => {
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

  const validation = validateMarkBedWeededInput(body.data);
  if (!validation.success) {
    return json({ error: validation.error }, 400);
  }

  const insertPayload = toWeedingEventInsertPayload(validation.data, bedId, user.id);
  const { data: eventData, error: eventError } = await supabase
    .from("garden_bed_weeding_events")
    .insert(insertPayload)
    .select(weedingEventColumns)
    .single();

  if (eventError) {
    return json({ error: "Unable to record weeding event for this garden bed." }, 500);
  }

  const { data: bedData, error: bedError } = await supabase
    .from("garden_beds")
    .update({ last_weeded_at: validation.data.weeded_at, weed_level: "low" })
    .eq("id", bedId)
    .eq("user_id", user.id)
    .select(gardenBedColumns)
    .maybeSingle();

  if (bedError || !bedData) {
    return json({ error: "Unable to update this garden bed after recording the weeding event." }, 500);
  }

  return json({
    bed: toGardenBedQueueItem(bedData),
    event: toWeedingEventResponse(eventData),
  });
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
  const actionIndex = segments.lastIndexOf("mark-weeded");
  if (actionIndex <= 0) return undefined;

  return segments[actionIndex - 1];
}
