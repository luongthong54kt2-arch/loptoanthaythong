/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://jpfnuqanqbonienosxdp.supabase.co'
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZm51cWFucWJvbmllbm9zeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTgzNDgsImV4cCI6MjEwMjA3NDM0OH0.uq_rwjepwJC3QmTZSIL7XpI4HAFbWMilmaRtYWqlics'


export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true },
})

