'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function registerClient(formData: FormData) {
    // TEMPORARY: Using Service Role to bypass persistent schema cache issues
    // TODO: Revert to anon key once PostgREST cache is resolved
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const documentId = formData.get("documentId") as string;
    const address = formData.get("address") as string; // Optional

    if (!firstName || !lastName || !phone) {
        return { success: false, message: "Nombre, apellido y teléfono son obligatorios." };
    }

    // Auto-generate full_name
    const fullName = `${firstName} ${lastName}`.trim().toUpperCase();

    // Direct insert (bypassing RPC due to cache issues)
    const { error } = await supabase
        .from('clients')
        .insert({
            first_name: firstName.toUpperCase(),
            last_name: lastName.toUpperCase(),
            full_name: fullName,
            phone: phone,
            document_id: documentId || null,
            address: address?.toUpperCase() || null,
        });

    if (error) {
        console.error("Error registering client:", error);
        return { success: false, message: `Error: ${error.message}` };
    }

    return { success: true, message: "¡Registro exitoso!" };
}
