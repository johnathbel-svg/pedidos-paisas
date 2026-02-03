'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function registerClient(formData: FormData) {
    // DIRECT CLIENT INITIALIZATION (Bypassing SSR helper to ensure connection)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const documentId = formData.get("documentId") as string;
    const address = formData.get("address") as string; // Optional

    if (!firstName || !lastName || !phone) {
        return { success: false, message: "Nombre, apellido y teléfono son obligatorios." };
    }

    // Prepare parameters for RPC
    const rpcParams = {
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone,
        p_document_id: documentId || null,
        p_address: address || null
    };

    // Call the RPC function
    const { data, error } = await supabase.rpc('register_new_client', rpcParams);

    if (error) {
        console.error("RPC Error:", error);
        return { success: false, message: `System Error: ${error.message}` };
    }

    // Handle application-level errors from the function
    if (data && data.success === false) {
        return { success: false, message: data.message };
    }

    return { success: true, message: "¡Registro exitoso!" };
}
