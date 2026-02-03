'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function registerClient(formData: FormData) {
    const supabase = await createClient();

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

    // Insert into clients
    const { error } = await supabase
        .from('clients')
        .insert({
            first_name: firstName.toUpperCase(),
            last_name: lastName.toUpperCase(),
            full_name: fullName,
            phone: phone,
            document_id: documentId || null,
            address: address?.toUpperCase() || null,
            email: null, // Not asking for email to reduce friction
            notes: 'Registro via QR Tienda'
        });

    if (error) {
        console.error("Error registering client:", error);
        // Expose the actual error message for debugging
        return { success: false, message: `Error: ${error.message || error.details || "Desconocido"}` };
    }

    return { success: true, message: "¡Registro exitoso!" };
}
