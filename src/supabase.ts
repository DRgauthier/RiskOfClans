import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmnxjrenokqomwawvygy.supabase.co';
const supabaseKey = 'sb_publishable_5KIePmCb4VJvdBAnknT-MQ_myzDGjNR'; // Anon key from memory

export const supabase = createClient(supabaseUrl, supabaseKey);
