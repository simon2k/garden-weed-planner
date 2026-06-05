import type { APIRoute } from "astro";
import {
  toBedPlantInsertPayload,
  toBedPlantResponse,
  validateCreateBedPlantInput,
  type BedPlantRow,
} from "@/lib/bed-plants";
import { createClient } from "@/lib/supabase";

const gardenBedColumns = "id";
const bedPlantColumns = "id,bed_id,user_id,name,planted_year,quantity,height_cm,width_cm,created_at,updated_at";

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
  if (!bedId) {
    return json({ error: "Garden bed not found." }, 404);
  }

  const ownsBed = await verifyBedOwnership(supabase, bedId, user.id);
  if (!ownsBed.success) {
    return json({ error: ownsBed.error }, ownsBed.status);
  }

  const { data, error } = await supabase
    .from("garden_bed_plants")
    .select(bedPlantColumns)
    .eq("bed_id", bedId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: "Unable to list plants for this garden bed." }, 500);
  }

  return json({ plants: (data as BedPlantRow[]).map(toBedPlantResponse) });
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
  if (!bedId) {
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

  const validation = validateCreateBedPlantInput(body.data);
  if (!validation.success) {
    return json({ error: validation.error }, 400);
  }

  const insertPayload = toBedPlantInsertPayload(validation.data, bedId, user.id);
  const { data, error } = await supabase
    .from("garden_bed_plants")
    .insert(insertPayload)
    .select(bedPlantColumns)
    .single();

  if (error) {
    return json({ error: "Unable to create plant for this garden bed." }, 500);
  }

  return json({ plant: toBedPlantResponse(data) }, 201);
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
