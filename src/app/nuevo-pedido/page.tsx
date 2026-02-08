"use client";

import * as React from "react";
import { MapPin, Save, Printer, RefreshCw, Loader2, Truck, Store, User, Phone, Hash, ShoppingBag, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientSearch } from "@/components/ClientSearch";
import { Client } from "@/types/order";
import { processInvoiceEvent } from "@/app/actions/invoices"; // Import server action
import { toast } from "sonner";
import Link from "next/link";

const generateOrderId = () => `PED-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}A`;

// Define Product Interface
interface ProductItem {
    name: string;
    qty: number;
    price: number;
    type: string;
}

export default function PedidosPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventId = searchParams.get('eventId');

    const [orderId, setOrderId] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);
    const [isLoadingEvent, setIsLoadingEvent] = React.useState(false);

    // Values
    const [deliveryType, setDeliveryType] = React.useState<"DOMICILIO" | "TIENDA">("DOMICILIO");

    // Data
    const [inv1Code, setInv1Code] = React.useState("");
    const [inv1Value, setInv1Value] = React.useState("");
    const [inv2Code, setInv2Code] = React.useState("");
    const [inv2Value, setInv2Value] = React.useState("");
    const [products, setProducts] = React.useState<ProductItem[]>([]);

    const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
    const [clientName, setClientName] = React.useState("");
    const [deliveryAddress, setDeliveryAddress] = React.useState("");
    const [observations, setObservations] = React.useState("");

    React.useEffect(() => {
        setOrderId(generateOrderId());

        if (eventId) {
            loadInvoiceEvent(eventId);
        }
    }, [eventId]);

    const loadInvoiceEvent = async (id: string) => {
        setIsLoadingEvent(true);
        const { data, error } = await supabase
            .from('invoice_events')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error loading event:", error);
            toast.error("No se pudo cargar la información de la factura.");
        } else if (data) {
            setInv1Code(data.invoice_number_1 || "");
            setInv1Value(data.invoice_value_1?.toString() || "");
            setInv2Code(data.invoice_number_2 || "");
            setInv2Value(data.invoice_value_2?.toString() || "");
            if (data.products && Array.isArray(data.products)) {
                setProducts(data.products);
            }
            toast.success("Datos pre-cargados correctamente.");
        }
        setIsLoadingEvent(false);
    };

    const totalValue = React.useMemo(() => {
        // Prefer sum of products if available and matches invoices?
        // Or just trust the manual values? 
        // Let's stick to the manual invoice values as source of truth for the money connection
        const v1 = parseFloat(inv1Value.replace(/[^0-9.]/g, "") || "0");
        const v2 = parseFloat(inv2Value.replace(/[^0-9.]/g, "") || "0");
        return v1 + v2;
    }, [inv1Value, inv2Value]);

    const resetForm = () => {
        if (eventId) {
            router.push('/nuevo-pedido'); // clear params
        } else {
            setOrderId(generateOrderId());
            setInv1Code("");
            setInv1Value("");
            setInv2Code("");
            setInv2Value("");
            setProducts([]);
            setSelectedClient(null);
            setClientName("");
            setDeliveryAddress("");
            setObservations("");
            setDeliveryType("DOMICILIO");
        }
    };

    const handleSaveOrder = async () => {
        if (!clientName || totalValue <= 0) {
            toast.warning("Por favor completa el nombre del cliente y verifica los valores.");
            return;
        }

        setIsSaving(true);

        // Helper to format final observations
        let finalObs = observations;
        if (deliveryType === 'DOMICILIO' && deliveryAddress) {
            finalObs = `[ENTREGA EN: ${deliveryAddress}] ${finalObs}`.trim();
        }

        // 1. Create Order
        const { data: orderData, error: orderError } = await supabase.from('orders').insert({
            public_id: orderId,
            client_name: clientName,
            client_id: selectedClient?.id, // Link to client if selected
            total_value: totalValue,
            observations: finalObs,
            status: 'TOMADO',
            delivery_type: deliveryType,
            driver_id: null,
            invoices_data: [
                { code: inv1Code, value: inv1Value },
                { code: inv2Code, value: inv2Value }
            ],
            products: products // Now saving products!
        }).select().single();

        if (orderError) {
            console.error(orderError);
            toast.error(`Error al guardar: ${orderError.message}`);
            setIsSaving(false);
            return;
        }

        // 2. Mark event as processed (if exists)
        if (eventId && orderData) {
            await processInvoiceEvent(eventId, orderData.id);
        }

        setIsSaving(false);
        toast.success("Pedido creado exitosamente");

        // Auto-print receipt
        setTimeout(() => {
            window.print();
            // Redirect after print dialog triggers
            // Note: print() blocks on some browsers, so we can't reliably redirect immediately after without user interaction sometimes.
            // But usually this works.
        }, 100);

        // Give time for print dialog to open before redirecting
        // Or wait for focus return? 
        // Simple approach: Redirect after loop.
        // Actually, if we redirect, print might cancel. Better to stay and let user go back?
        // User flow: "Justo despues... se debe imprimir".
        // Use a longer timeout or rely on user.
        // Let's redirect after 2s which is usually enough to queue print.
        setTimeout(() => {
            router.push("/pedidos");
        }, 1500);
    };

    if (isLoadingEvent) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando datos de factura...</span>
            </div>
        );
    }

    return (
        <div className="grid gap-8 lg:grid-cols-12 max-w-6xl mx-auto py-6 px-4 md:px-0">
            {/* Header */}
            <div className="lg:col-span-12 flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/pedidos" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Nuevo Pedido</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="font-mono bg-brand/10 text-brand-DEFAULT border-brand/20 border px-2 py-0.5 rounded font-bold">{orderId}</span>
                            {eventId && (
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Printer className="w-3 h-3" /> Auto-Captura
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button onClick={resetForm} className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors">
                    <RefreshCw className="h-3 w-3" /> Reiniciar
                </button>
            </div>

            <div className="lg:col-span-7 space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">

                {/* Invoice Inputs */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Invoice 1 */}
                    <div className={cn("space-y-4 rounded-lg border p-4 transition-all bg-card")}>
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Factura 1</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Código</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring uppercase placeholder:normal-case font-mono"
                                value={inv1Code}
                                onChange={(e) => setInv1Code(e.target.value.toUpperCase())}
                                placeholder="Ej: FE-1234"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Valor</label>
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right font-mono text-green-600 font-bold"
                                value={inv1Value}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    setInv1Value(raw);
                                }}
                                placeholder="$ 0"
                            />
                            {inv1Value && <p className="text-xs text-right text-muted-foreground font-mono">${Number(inv1Value).toLocaleString()}</p>}
                        </div>
                    </div>

                    {/* Invoice 2 */}
                    <div className={cn("space-y-4 rounded-lg border p-4 transition-all bg-card")}>
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Factura 2 (Interna)</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Código</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring uppercase placeholder:normal-case font-mono"
                                value={inv2Code}
                                onChange={(e) => setInv2Code(e.target.value.toUpperCase())}
                                placeholder="Ej: INT-999"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Valor</label>
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right font-mono font-bold text-green-600"
                                value={inv2Value}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    setInv2Value(raw);
                                }}
                                placeholder="$ 0"
                            />
                            {inv2Value && <p className="text-xs text-right text-muted-foreground font-mono">${Number(inv2Value).toLocaleString()}</p>}
                        </div>
                    </div>
                </div>

                {/* Products List */}
                <div className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" /> Productos ({products.length})
                        </h3>
                        {/* Future: Add product manually button */}
                    </div>

                    {products.length > 0 ? (
                        <div className="rounded-md border bg-muted/20 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-medium">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Cant</th>
                                        <th className="px-3 py-2 text-left">Producto</th>
                                        <th className="px-3 py-2 text-right">Precio Un.</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {products.map((p, i) => (
                                        <tr key={i} className="hover:bg-muted/30">
                                            <td className="px-3 py-2 font-mono">{p.qty}</td>
                                            <td className="px-3 py-2 font-medium">
                                                {p.name}
                                                {p.type !== 'DIAN' && <span className="text-[10px] text-muted-foreground ml-1 p-0.5 border rounded uppercase">{p.type}</span>}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">${p.price.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right font-mono font-medium">${(p.qty * p.price).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/5">
                            No hay productos detallados.
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Controls */}
            <div className="lg:col-span-5 space-y-6">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm sticky top-24">
                    <div className="flex flex-col space-y-1.5 p-6 border-b bg-muted/20">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">Resumen y Cliente</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Delivery Type Toggle */}
                        <div className="grid grid-cols-2 gap-2 bg-muted/20 p-1 rounded-lg">
                            <button
                                onClick={() => setDeliveryType("DOMICILIO")}
                                className={cn("flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-semibold transition-all", deliveryType === 'DOMICILIO' ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-background/50")}
                            >
                                <Truck className="h-4 w-4" />
                                Domicilio
                            </button>
                            <button
                                onClick={() => setDeliveryType("TIENDA")}
                                className={cn("flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-semibold transition-all", deliveryType === 'TIENDA' ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-background/50")}
                            >
                                <Store className="h-4 w-4" />
                                Recoge en Tienda
                            </button>
                        </div>

                        {/* Client Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Cliente</label>
                            {selectedClient ? (
                                <div className="rounded-md border p-3 bg-blue-50/50 dark:bg-blue-950/20 relative group border-blue-100 dark:border-blue-900">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <div className="font-bold text-sm text-blue-900 dark:text-blue-100">{selectedClient.full_name}</div>
                                            <div className="flex flex-col gap-0.5 mt-1 text-xs text-blue-700 dark:text-blue-300">
                                                {selectedClient.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedClient.phone}</div>}
                                                {selectedClient.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedClient.address}</div>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedClient(null);
                                                setClientName("");
                                                if (deliveryAddress === selectedClient.address) setDeliveryAddress("");
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium bg-white dark:bg-black px-2 py-1 rounded border shadow-sm"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <ClientSearch
                                    onSelect={(client) => {
                                        setSelectedClient(client);
                                        setClientName(client.full_name);
                                        if (client.address) {
                                            setDeliveryAddress(client.address);
                                        }
                                    }}
                                />
                            )}
                        </div>

                        {/* Address Input (Contextual) */}
                        {deliveryType === 'DOMICILIO' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Dirección de Entrega
                                </label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand uppercase placeholder:normal-case font-medium"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value.toUpperCase())}
                                    placeholder="DIRECCIÓN COMPLETA..."
                                />
                            </div>
                        )}

                        {/* Observations */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Observaciones</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand uppercase placeholder:normal-case resize-none"
                                value={observations}
                                onChange={(e) => setObservations(e.target.value.toUpperCase())}
                                placeholder="Escribe aquí observaciones adicionales..."
                            />
                        </div>

                        {/* Total & Action */}
                        <div className="pt-4 border-t flex items-center justify-between">
                            <span className="font-bold text-lg">Total a Pagar</span>
                            <span className="text-2xl font-bold text-brand font-mono">
                                ${totalValue.toLocaleString()}
                            </span>
                        </div>

                        <button
                            onClick={handleSaveOrder}
                            disabled={isSaving}
                            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-brand text-black hover:bg-brand/90 hover:scale-105 active:scale-95 h-12 px-8 shadow-lg shadow-brand/20"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            Crear Pedido e Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {/* PRINT RECEIPT (Hidden on Screen) */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-black font-mono">
                <div className="max-w-[80mm] mx-auto border-2 border-black p-4">
                    <div className="text-center mb-4">
                        <h1 className="text-xl font-bold uppercase">Pedidos Paisas</h1>
                        <p className="text-sm">Ticket de Venta</p>
                        <p className="text-xs mt-1">{new Date().toLocaleString()}</p>
                    </div>

                    <div className="border-b-2 border-dashed border-black my-2"></div>

                    <div className="space-y-1 mb-4 text-sm">
                        <p><strong>Pedido:</strong> {orderId}</p>
                        <p><strong>Cliente:</strong> {clientName}</p>
                        {deliveryType === 'DOMICILIO' && <p><strong>Dir:</strong> {deliveryAddress}</p>}
                        <p><strong>Tel:</strong> {selectedClient?.phone || 'N/A'}</p>
                    </div>

                    <div className="border-b-2 border-dashed border-black my-2"></div>

                    <div className="space-y-2 text-sm">
                        {products.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{p.qty} x {p.name}</span>
                                <span>${(p.price * p.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-b-2 border-dashed border-black my-2"></div>

                    <div className="flex justify-between font-bold text-lg mt-2">
                        <span>TOTAL</span>
                        <span>${totalValue.toLocaleString()}</span>
                    </div>

                    {observations && (
                        <div className="mt-4 text-xs italic">
                            NB: {observations}
                        </div>
                    )}

                    <div className="text-center mt-6 text-xs">
                        <p>¡Gracias por su compra!</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    .print\\:block, .print\\:block * { visibility: visible; }
                    .print\\:block { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
                }
            `}</style>
        </div>
    );
}
