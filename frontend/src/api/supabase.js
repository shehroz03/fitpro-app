import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// 🔑 PASTE YOUR SUPABASE CREDENTIALS HERE
// Supabase Dashboard → Settings → API
//   • Project URL   → SUPABASE_URL
//   • anon public   → SUPABASE_ANON_KEY   (NOT the service_role key!)
// ============================================================================
export const SUPABASE_URL = 'https://nlzuqzkxtmqabmwkggpy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5senVxemt4dG1xYWJtd2tnZ3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNzU5MTMsImV4cCI6MjA5NjY1MTkxM30.FtZaMSgFsgqN_Wyn3umm03_mDfvhflH0dtXorHiddXM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
