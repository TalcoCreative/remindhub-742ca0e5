
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oqdixbdanmajbrzqluxk.supabase.co";
const supabaseKey = "sb_publishable_vn4-0LdWB1GMI9jCK2B1rw_riVTSWZJ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkForms() {
    console.log('Connecting to Supabase...');

    // Try to insert a test form
    const { data: insertData, error: insertError } = await supabase.from('forms').insert({
        name: 'Test Form Script',
        slug: 'test-form-script',
        platform: 'web',
        is_active: true
    }).select().maybeSingle();

    if (insertError) {
        console.error('INSERT FAILED (RLS likely blocking):', insertError);
    } else {
        console.log('INSERT SUCCESS:', insertData);
    }

    // Check forms again
    const { data, error } = await supabase.from('forms').select('*');
    if (error) {
        console.error('Error fetching forms:', error);
        return;
    }
    console.log('Forms found:', data);
}

checkForms();
