
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from .env.local
const supabaseUrl = 'https://cthnlvjkkkatkypdpkvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0aG5sdmpra2thdGt5cGRwa3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MzgwODMsImV4cCI6MjA4NTExNDA4M30.uDgf39wCWLOcHxrEnXJSAVJiUnH9bjQ-fBrxC0Iy3Hk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection to:', supabaseUrl);

    try {
        // 1. Try to select
        const { data: selectData, error: selectError } = await supabase
            .from('clients')
            .select('count')
            .limit(1);

        if (selectError) {
            console.error('SELECT Error:', selectError.message);
            return;
        } else {
            console.log('SELECT Success. Table is visible.');
        }

        // 2. Try to insert (Correctly this time)
        const fakePhone = `300${Math.floor(Math.random() * 10000000)}`;
        const { data: insertData, error: insertError } = await supabase
            .from('clients')
            .insert({
                first_name: 'Debug',
                last_name: 'Bot',
                full_name: 'DEBUG BOT', // Providing the required field
                phone: fakePhone,
                notes: 'Debug Script Success'
            });

        if (insertError) {
            console.error('INSERT Error:', insertError.message);
        } else {
            console.log('INSERT Success! Public registration is working locally.');
        }
    } catch (err) {
        console.error("Critical Exception:", err);
    }
}

testConnection();
