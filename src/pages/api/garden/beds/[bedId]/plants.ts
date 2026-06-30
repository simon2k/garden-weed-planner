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
    return json({ error: "Supabase nie jest skonfigurowany." }, 503);
  }

  const user = context.locals.user;
  if (!user) {
    return json({ error: "Zaloguj się, aby kontynuować." }, 401);
  }

  const bedId = context.params.bedId;
  if (!bedId || !isUuid(bedId)) {
    return json({ error: "Nie znaleziono rabaty." }, 404);
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
    return json({ error: "Nie udało się wczytać roślin dla tej rabaty." }, 500);
  }

  return json({ plants: (data as BedPlantRow[]).map(toBedPlantResponse) });
};

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase nie jest skonfigurowany." }, 503);
  }

  const user = context.locals.user;
  if (!user) {
    return json({ error: "Zaloguj się, aby kontynuować." }, 401);
  }

  const bedId = context.params.bedId;
  if (!bedId || !isUuid(bedId)) {
    return json({ error: "Nie znaleziono rabaty." }, 404);
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
    return json({ error: "Nie udało się dodać rośliny do tej rabaty." }, 500);
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
    return { success: false, error: "Treść żądania musi być poprawnym JSON-em." };
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
    return { success: false, status: 500, error: "Nie udało się sprawdzić dostępu do rabaty." };
  }

  if (!data) {
    return { success: false, status: 404, error: "Nie znaleziono rabaty." };
  }

  return { success: true };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
