import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

const gardenBedColumns = "id";

export const DELETE: APIRoute = async (context) => {
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

  const { data, error } = await supabase
    .from("garden_beds")
    .delete()
    .eq("id", bedId)
    .eq("user_id", user.id)
    .select(gardenBedColumns)
    .maybeSingle();

  if (error) {
    return json({ error: "Unable to delete garden bed." }, 500);
  }

  if (!data) {
    return json({ error: "Garden bed not found." }, 404);
  }

  return json({ deleted_bed_id: bedId });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getBedId(context: Parameters<APIRoute>[0]): string | undefined {
  if (context.params.bedId) return context.params.bedId;

  const segments = context.url.pathname.split("/").filter(Boolean);
  const bedsIndex = segments.lastIndexOf("beds");
  if (bedsIndex < 0 || bedsIndex + 1 >= segments.length) return undefined;

  return segments[bedsIndex + 1];
}
