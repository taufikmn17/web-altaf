import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !supabaseKey) return null;

  if (!supabaseClient) {
    supabaseClient = createClient(url, supabaseKey, {
      realtime: {
        params: { eventsPerSecond: 20 },
      },
    });
  }

  return supabaseClient;
}
