"use client";

import * as React from "react";
import { ClipboardPaste, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedData {
    invoices: string[];
    totalValue: number;
    clientName: string;
    observations: string;
}

interface MagicPasteProps {
    onPaste: (data: ParsedData) => void;
    className?: string;
}

export function MagicPaste({ onPaste, className }: MagicPasteProps) {
    const [isHovering, setIsHovering] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleNativePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            parseText(text);
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            setError("No se pudo leer del portapapeles. Intenta Ctrl+V en el campo manual.");
        }
    };

    const parseText = (text: string) => {
        // Basic heuristic regex - needs to be refined based on real data
        const invoiceRegex = /Factura\s*[:#]?\s*([0-9-A-Z]+)/gi;
        const valueRegex = /Total\s*[:$]?\s*([\d,.]+)/i;
        const clientRegex = /Cliente\s*[:]?\s*([A-Za-z\s]+)/i;

        const invoices: string[] = [];
        let match;
        while ((match = invoiceRegex.exec(text)) !== null) {
            if (match[1]) invoices.push(match[1]);
        }

        // Try to find total value
        const valueMatch = valueRegex.exec(text);
        let totalValue = 0;
        if (valueMatch && valueMatch[1]) {
            // Remove currency symbols and normalize decimal
            const cleanValue = valueMatch[1].replace(/[$,]/g, "");
            totalValue = parseFloat(cleanValue);
        }

        // Default heuristics if regex fails (simple number detection for invoices if labeled differently)
        // For now, we return what we found

        if (invoices.length === 0 && totalValue === 0) {
            setError("No se detectaron datos de facturación válidos en el texto.");
            return;
        }

        setError(null);
        onPaste({
            invoices,
            totalValue: isNaN(totalValue) ? 0 : totalValue,
            clientName: clientRegex.exec(text)?.[1]?.trim() || "",
            observations: text.slice(0, 200) // Store snippet as generic observation or raw text
        });
    };

    return (
        <div className={cn("grid gap-4", className)}>
            <button
                onClick={handleNativePaste}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className={cn(
                    "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center transition-all hover:bg-muted/50 hover:border-primary/50",
                    isHovering && "scale-[1.01]"
                )}
            >
                <div className="rounded-full bg-background p-4 shadow-sm ring-1 ring-inset ring-gray-900/5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ClipboardPaste className="h-8 w-8" />
                </div>
                <div className="mt-4 flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-foreground">
                        Pegado Mágico
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Haz clic aquí para pegar y detectar datos automáticamente
                    </p>
                </div>
            </button>
            {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
