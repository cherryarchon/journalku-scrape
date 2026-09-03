import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRole) {
  console.warn('[Web C Auth] Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRole,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
