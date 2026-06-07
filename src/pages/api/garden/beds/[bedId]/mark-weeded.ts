import type { APIRoute } from "astro";
import { toGardenBedQueueItem } from "@/lib/garden-beds";
import { createClient } from "@/lib/supabase";
import { toWeedingEventResponse, validateMarkBedWeededInput, type WeedingEventRow } from "@/lib/weeding-events";

const gardenBedColumns =
  "id,user_id,name,area_m2,last_weeded_at,weed_level,estimated_minutes,mulch_depth_cm,created_at,updated_at";
const weedingEventColumns = "id,bed_id,user_id,weeded_at,duration_minutes,note,created_at,updated_at";

interface MarkGardenBedWeededResult {
  event_id: string;
  bed_id: string;
}

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

  const rpcResponse = (await supabase.rpc("mark_garden_bed_weeded", {
    p_bed_id: bedId,
    p_weeded_at: validation.data.weeded_at,
    p_duration_minutes: validation.data.duration_minutes,
    p_note: validation.data.note ?? null,
  })) as { data: unknown; error: unknown };

  const result = readMarkGardenBedWeededResult(rpcResponse.data);
  if (rpcResponse.error || !result) {
    console.error("mark_garden_bed_weeded RPC failed", {
      bedId,
      error: rpcResponse.error,
      hasResult: Boolean(result),
    });
    return json({ error: "Unable to record weeding event for this garden bed." }, 500);
  }

  const [bedData, eventData] = await Promise.all([
    fetchOwnedGardenBed(supabase, result.bed_id, user.id),
    fetchOwnedWeedingEvent(supabase, result.event_id, user.id),
  ]);

  if (!bedData || !eventData) {
    console.error("Unable to load mark-weeding response data", {
      bedId: result.bed_id,
      eventId: result.event_id,
      hasBed: Boolean(bedData),
      hasEvent: Boolean(eventData),
    });
    return json({ error: "Unable to load this garden bed after recording the weeding event." }, 500);
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

function readMarkGardenBedWeededResult(value: unknown): MarkGardenBedWeededResult | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: readonly unknown[] = value;
  const first = items[0];
  if (!isRecord(first)) return null;
  if (typeof first.event_id !== "string" || typeof first.bed_id !== "string") return null;
  return { event_id: first.event_id, bed_id: first.bed_id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchOwnedGardenBed(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  bedId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("garden_beds")
    .select(gardenBedColumns)
    .eq("id", bedId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function fetchOwnedWeedingEvent(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string,
): Promise<WeedingEventRow | null> {
  const { data, error } = await supabase
    .from("garden_bed_weeding_events")
    .select(weedingEventColumns)
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function getBedId(context: Parameters<APIRoute>[0]): string | undefined {
  if (context.params.bedId) return context.params.bedId;

  const segments = context.url.pathname.split("/").filter(Boolean);
  const actionIndex = segments.lastIndexOf("mark-weeded");
  if (actionIndex <= 0) return undefined;

  return segments[actionIndex - 1];
}
