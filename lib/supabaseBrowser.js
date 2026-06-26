// Browser-side Supabase client, used only by the admin login UI.
import { createClient } from "@supabase/supabase-js";

// Trim — a stray newline/space (common when pasting into a hosting dashboard)
// lands in the apikey/Authorization header and makes fetch throw "Invalid value".
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

let client = null;

export function browserConfigured() {
  return Boolean(URL && ANON);
}

export function getBrowserClient() {
  if (!browserConfigured()) return null;
  if (!client) {
    client = createClient(URL, ANON);
  }
  return client;
}
