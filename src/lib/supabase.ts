/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ulzcqypxfvexjpnxuxgo.supabase.co'
const supabaseKey = 'sb_publishable_9co-50aMwmxNnE1Bd5Ou3Q_IuTdSZtD'


export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true },
})

