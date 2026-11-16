import { createClient } from '@supabase/supabase-js'

const url = 'https://rselyhcyxsuwkhbjyofh.supabase.co'
const key = 'sb_publishable_lkz-5Tv7cRpQWSCGCJ_irA_1qCkO5V8'

export const hasSupabase = Boolean(url && key)
export const supabase = hasSupabase ? createClient(url!, key!) : null

export type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null }
