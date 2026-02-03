'use server';

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function registerClient(formData: FormData) {
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const documentId = formData.get("documentId") as string;
    const address = formData.get("address") as string;

    if (!firstName || !lastName || !phone) {
        return { success: false, message: "Nombre, apellido y teléfono son obligatorios." };
    }

    // Auto-generate full_name
    const fullName = `${firstName} ${lastName}`.trim().toUpperCase();

    try {
        // Direct PostgreSQL insert (bypassing Supabase REST API)
        await query(
            `INSERT INTO public.clients (first_name, last_name, full_name, phone, document_id, address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                firstName.toUpperCase(),
                lastName.toUpperCase(),
                fullName,
                phone,
                documentId || null,
                address?.toUpperCase() || null,
            ]
        );

        return { success: true, message: "¡Registro exitoso!" };
    } catch (error: any) {
        console.error("Error registering client:", error);

        // Handle duplicate phone number
        if (error.code === '23505') {
            return { success: false, message: "Este número de teléfono ya está registrado." };
        }

        return { success: false, message: `Error: ${error.message}` };
    }
}
