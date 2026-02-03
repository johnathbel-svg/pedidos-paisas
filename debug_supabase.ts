
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection to:', supabaseUrl);

    // 1. Try to select to check visibility
    const { data: selectData, error: selectError } = await supabase
        .from('clients')
        .select('count')
        .limit(1);

    if (selectError) {
        console.error('SELECT Error:', selectError.message);
    } else {
        console.log('SELECT Success. Table is visible.');
    }

    // 2. Try to insert (Simulate Public Form)
    const fakePhone = `300${Math.floor(Math.random() * 10000000)}`;
    const { data: insertData, error: insertError } = await supabase
        .from('clients')
        .insert({
            first_name: 'Debug',
            last_name: 'Bot',
            phone: fakePhone,
            request_origin: 'debug_script'
        });

    if (insertError) {
        console.error('INSERT Error:', insertError.message);
        if (insertError.message.includes('schema cache')) {
            console.log("CRITICAL: Confirmed Schema Cache Issue.");
        }
    } else {
        console.log('INSERT Success! Public registration is working locally.');
    }
}

testConnection();
