import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://patkavwagxqpcuvdonha.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdGthdndhZ3hxcGN1dmRvbmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0ODMyNzYsImV4cCI6MjA3MzA1OTI3Nn0.HYXp_rF00JU5jbdeK2xNeM6Q3BJGAdbm_lW27a8hqG8";

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");


