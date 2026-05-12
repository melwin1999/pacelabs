import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser use (safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side seeding/admin tasks (powerful)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);