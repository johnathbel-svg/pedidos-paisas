"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, User, Phone, MapPin, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/order";
import { CreateClientModal } from "./CreateClientModal";

interface ClientSearchProps {
    onSelect: (client: Client) => void;
    className?: string;
}

export function ClientSearch({ onSelect, className }: ClientSearchProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<Client[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);

    // Debounced search
    React.useEffect(() => {
        const searchClients = async () => {
            if (!query || query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, phone, address, document_id, email, total_orders')
                .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,document_id.ilike.%${query}%`)
                .limit(5);

            if (error) {
                console.error("Error searching clients:", error);
            } else {
                setResults(data || []);
            }
            setLoading(false);
        };

        const timeoutId = setTimeout(searchClients, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelect = (client: Client) => {
        setSelectedClient(client);
        onSelect(client);
        setOpen(false);
        setQuery("");
    };

    const handleCreateNew = () => {
        setOpen(false);
        setIsModalOpen(true);
    };

    return (
        <div className={cn("relative z-50", className)}>
            <CreateClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialName={query}
                onSuccess={(newClient) => {
                    handleSelect(newClient);
                }}
            />
            <div className="relative">
                <div className="flex items-center border rounded-md px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all shadow-sm">
                    <Search className="h-4 w-4 text-muted-foreground mr-2" />
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground uppercase"
                        placeholder="BUSCAR CLIENTE POR NOMBRE O TELÉFONO..."
                        value={selectedClient ? selectedClient.full_name : query}
                        onChange={(e) => {
                            setQuery(e.target.value.toUpperCase());
                            setSelectedClient(null); // Clear selection on edit
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => {
                            // Delay hiding to allow click events on the list
                            setTimeout(() => setOpen(false), 200);
                        }}
                    />
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {open && (query.length > 0 || results.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                        {results.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto p-1">
                                {results.map((client) => (
                                    <div
                                        key={client.id}
                                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                                        onClick={() => handleSelect(client)}
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                            {client.full_name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">{client.full_name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                {client.phone && (
                                                    <span className="flex items-center gap-0.5">
                                                        <Phone className="h-3 w-3" /> {client.phone}
                                                    </span>
                                                )}
                                                {client.address && (
                                                    <span className="flex items-center gap-0.5">
                                                        <MapPin className="h-3 w-3" /> {client.address}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {client.total_orders > 0 && (
                                            <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full font-mono">
                                                ★ {client.total_orders}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                {query.length < 2 ? (
                                    <span>Escribe al menos 2 caracteres...</span>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <span>No se encontraron resultados.</span>
                                        <button
                                            onClick={handleCreateNew}
                                            className="flex items-center gap-1 text-primary hover:underline font-medium"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Crear nuevo cliente "{query}"
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
