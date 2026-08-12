/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) || 'https://ulzcqypxfvexjpnxuxgo.supabase.co'
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) || (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 'sb_publishable_9co-50aMwmxNnE1Bd5Ou3Q_IuTdSZtD'


export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true },
})

