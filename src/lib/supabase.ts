import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let _configured: boolean | null = null;

export function isSupabaseConfigured(): boolean {
  if (_configured !== null) return _configured;
  _configured = Boolean(supabaseUrl && supabaseAnonKey);
  if (!_configured) {
    console.warn(
      "Supabase not configured. Copy .env.local.example to .env.local and fill in your credentials."
    );
  }
  return _configured;
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export interface Deck {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  position: number;
}
