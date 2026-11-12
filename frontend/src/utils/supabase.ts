import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gsnnpzbzdevsuupywwco.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_jquA18Nza_fQUXBprO50WA_459EATHD';

export const supabase = createClient(supabaseUrl, supabaseKey);
