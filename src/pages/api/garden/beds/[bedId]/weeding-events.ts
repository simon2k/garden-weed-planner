import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { toWeedingEventResponse, type WeedingEventRow } from "@/lib/weeding-events";

const weedingEventColumns = "id,bed_id,user_id,weeded_at,duration_minutes,note,created_at,updated_at";

export const GET: APIRoute = async (context) => {
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
    .from("garden_bed_weeding_events")
    .select(weedingEventColumns)
    .eq("bed_id", bedId)
    .eq("user_id", user.id)
    .order("weeded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: "Unable to list weeding events for this garden bed." }, 500);
  }

  return json({ events: (data as WeedingEventRow[]).map(toWeedingEventResponse) });
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
  const eventsIndex = segments.lastIndexOf("weeding-events");
  if (eventsIndex <= 0) return undefined;

  return segments[eventsIndex - 1];
}
