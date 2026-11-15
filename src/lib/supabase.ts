import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabase = Boolean(url && key)
export const supabase = hasSupabase ? createClient(url!, key!) : null

export type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null }
