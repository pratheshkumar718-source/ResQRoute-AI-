import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dipmxyzpgqhxkoxhnjho.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_N-PSnZAgPAq4gCSD2zAbCw_cVIANwBd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

