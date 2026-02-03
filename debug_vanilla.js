
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from .env.local to avoid dotenv dependency issues
const supabaseUrl = 'https://cthnlvjkkkatkypdpkvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0aG5sdmpra2thdGt5cGRwa3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MzgwODMsImV4cCI6MjA4NTExNDA4M30.uDgf39wCWLOcHxrEnXJSAVJiUnH9bjQ-fBrxC0Iy3Hk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection to:', supabaseUrl);

    try {
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

        // 2. Try to insert
        const fakePhone = `300${Math.floor(Math.random() * 10000000)}`;
        const { data: insertData, error: insertError } = await supabase
            .from('clients')
            .insert({
                first_name: 'Debug',
                last_name: 'Bot',
                phone: fakePhone,
                // notes: 'Debug Script' // Removing notes as it might not be in schema or requires RLS
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
