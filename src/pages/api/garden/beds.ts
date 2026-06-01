import type { APIRoute } from "astro";
import {
  toGardenBedInsertPayload,
  toGardenBedResponse,
  validateCreateGardenBedInput,
  type GardenBedRow,
} from "@/lib/garden-beds";
import { createClient } from "@/lib/supabase";

const gardenBedColumns =
  "id,user_id,name,area_m2,last_weeded_at,weed_level,estimated_minutes,mulch_depth_cm,created_at,updated_at";

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

  const beds = (data as GardenBedRow[]).map(toGardenBedResponse);
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

  return json({ bed: toGardenBedResponse(data) }, 201);
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
