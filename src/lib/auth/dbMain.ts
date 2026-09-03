import { createClient } from '@supabase/supabase-js';

const mainDbUrl = process.env.DATABASE_MAIN_SUPABASE_URL || '';
const mainDbServiceKey = process.env.DATABASE_MAIN_SERVICE_ROLE_KEY || '';

if (!mainDbUrl || !mainDbServiceKey) {
  console.warn('[Database 1] Warning: DATABASE_MAIN_SUPABASE_URL or DATABASE_MAIN_SERVICE_ROLE_KEY is not defined in environment variables.');
}

export const supabaseMain = createClient(
  mainDbUrl,
  mainDbServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
