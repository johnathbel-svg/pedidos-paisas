'use server';

import { createClient } from '@/utils/supabase/server';

export async function processInvoiceEvent(eventId: string, orderId: string) {
    const supabase = await createClient();

    // 1. Mark event as processed
    const { error } = await supabase
        .from('invoice_events')
        .update({ status: 'PROCESSED' })
        .eq('id', eventId);

    if (error) {
        console.error('Error processing invoice event:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function ignoreInvoiceEvent(eventId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('invoice_events')
        .update({ status: 'IGNORED' })
        .eq('id', eventId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
