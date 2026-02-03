"use client";

import * as React from "react";
import { SequentialPaste, type PasteStep } from "@/components/sequential-paste";
import { MapPin, Save, Printer, RefreshCw, Loader2, Truck, Store, User, Phone, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ClientSearch } from "@/components/ClientSearch";
import { Client } from "@/types/order";

const generateOrderId = () => `PED-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}A`;

export default function PedidosPage() {
    const router = useRouter();
    const [orderId, setOrderId] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);
    const [step, setStep] = React.useState<PasteStep>("INV1_CODE");
    const [deliveryType, setDeliveryType] = React.useState<"DOMICILIO" | "TIENDA">("DOMICILIO");

    // Invoice 1
    const [inv1Code, setInv1Code] = React.useState("");
    const [inv1Value, setInv1Value] = React.useState("");

    // Invoice 2
    const [inv2Code, setInv2Code] = React.useState("");
    const [inv2Value, setInv2Value] = React.useState("");

    // General
    const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
    const [clientName, setClientName] = React.useState("");
    const [deliveryAddress, setDeliveryAddress] = React.useState("");
    const [observations, setObservations] = React.useState("");

    React.useEffect(() => {
        setOrderId(generateOrderId());
    }, []);

    const totalValue = React.useMemo(() => {
        const v1 = parseFloat(inv1Value.replace(/[^0-9.]/g, "") || "0");
        const v2 = parseFloat(inv2Value.replace(/[^0-9.]/g, "") || "0");
        return v1 + v2;
    }, [inv1Value, inv2Value]);

    const handleStepComplete = (current: PasteStep, value: string) => {
        switch (current) {
            case "INV1_CODE":
                setInv1Code(value);
                setStep("INV1_VALUE");
                break;
            case "INV1_VALUE":
                // Basic clean up of currency symbols if copied
                const cleanVal1 = value.replace(/[$,]/g, "");
                if (!isNaN(parseFloat(cleanVal1))) {
                    setInv1Value(cleanVal1);
                    setStep("INV2_CODE");
                }
                break;
            case "INV2_CODE":
                setInv2Code(value);
                setStep("INV2_VALUE");
                break;
            case "INV2_VALUE":
                const cleanVal2 = value.replace(/[$,]/g, "");
                if (!isNaN(parseFloat(cleanVal2))) {
                    setInv2Value(cleanVal2);
                    setStep("DONE"); // Skip client for now or make it next
                }
                break;
            case "CLIENT":
                setClientName(value);
                setStep("DONE");
                break;
        }
    };

    const resetForm = () => {
        setOrderId(generateOrderId());
        setInv1Code("");
        setInv1Value("");
        setInv2Code("");
        setInv2Value("");
        setInv2Value("");
        setSelectedClient(null);
        setClientName("");
        setDeliveryAddress("");
        setObservations("");
        setStep("INV1_CODE");
        setDeliveryType("DOMICILIO");
    };

    const handleSaveOrder = async () => {
        if (!clientName || totalValue <= 0) {
            alert("Por favor completa el nombre del cliente y verifica los valores.");
            return;
        }

        setIsSaving(true);

        // Helper to format final observations
        let finalObs = observations;
        if (deliveryType === 'DOMICILIO' && deliveryAddress) {
            finalObs = `[ENTREGA EN: ${deliveryAddress}] ${finalObs}`.trim();
        }

        const { error } = await supabase.from('orders').insert({
            public_id: orderId,
            client_name: clientName, // Keep sending name for backward compatibility/simplicity
            total_value: totalValue,
            observations: finalObs,
            status: 'TOMADO',
            delivery_type: deliveryType,
            invoices_data: [
                { code: inv1Code, value: inv1Value },
                { code: inv2Code, value: inv2Value }
            ]
        });

        setIsSaving(false);

        if (error) {
            console.error(error);
            // Show the actual error message from Supabase to help debugging
            alert(`Error al guardar: ${error.message || "Verifica la conexión"}`);
        } else {
            // Success
            router.push("/pedidos"); // Redirect to dashboard
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-12 max-w-6xl mx-auto">
            <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Nuevo Pedido</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="font-mono bg-brand/10 text-brand-DEFAULT border-brand/20 border px-2 py-0.5 rounded font-bold">{orderId}</span>
                        </div>
                    </div>
                    <button onClick={resetForm} className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors">
                        <RefreshCw className="h-3 w-3" /> Reiniciar
                    </button>
                </div>

                {/* Minimalist Sequential Paster */}
                <SequentialPaste
                    currentStep={step}
                    onStepComplete={handleStepComplete}
                    onReset={resetForm}
                    autoStart={true}
                    className="mb-4"
                />

                <div className="grid gap-6 md:grid-cols-2 animate-in slide-in-from-bottom-4 duration-500 fade-in">
                    {/* Invoice 1 */}
                    <div className={cn("space-y-4 rounded-lg border p-4 transition-all", step === "INV1_CODE" || step === "INV1_VALUE" ? "ring-1 ring-brand bg-brand/5 border-brand/20" : "bg-card")}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Factura 1</h3>
                            {inv1Code && inv1Value && <span className="text-green-500 text-xs">✓ Completado</span>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Código</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring uppercase placeholder:normal-case"
                                value={inv1Code}
                                onChange={(e) => setInv1Code(e.target.value.toUpperCase())}
                                placeholder="Ej: F-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Valor</label>
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right font-mono"
                                value={inv1Value ? `$ ${parseFloat(inv1Value.replace(/[^0-9.]/g, '')).toLocaleString()}` : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    setInv1Value(raw);
                                }}
                                placeholder="$ 0"
                            />
                        </div>
                    </div>

                    {/* Invoice 2 */}
                    <div className={cn("space-y-4 rounded-lg border p-4 transition-all", step === "INV2_CODE" || step === "INV2_VALUE" ? "ring-1 ring-brand bg-brand/5 border-brand/20" : "bg-card")}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Factura 2</h3>
                            {inv2Code && inv2Value && <span className="text-green-500 text-xs">✓ Completado</span>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Código</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring uppercase placeholder:normal-case"
                                value={inv2Code}
                                onChange={(e) => setInv2Code(e.target.value.toUpperCase())}
                                placeholder="Ej: F-101"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Valor</label>
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right font-mono"
                                value={inv2Value ? `$ ${parseFloat(inv2Value.replace(/[^0-9.]/g, '')).toLocaleString()}` : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    setInv2Value(raw);
                                }}
                                placeholder="$ 0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm sticky top-6">
                    <div className="flex flex-col space-y-1.5 p-6 border-b bg-muted/20">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">Resumen</h3>
                        <span className="text-xs text-muted-foreground">Detalles finales del pedido</span>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Tipo de Entrega</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setDeliveryType("DOMICILIO")}
                                    className={cn("flex flex-col items-center justify-center gap-1 rounded-md border-2 p-3 text-xs font-semibold transition-all hover:bg-muted", deliveryType === 'DOMICILIO' ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-muted/50 text-muted-foreground")}
                                >
                                    <Truck className="h-4 w-4" />
                                    Domicilio
                                </button>
                                <button
                                    onClick={() => setDeliveryType("TIENDA")}
                                    className={cn("flex flex-col items-center justify-center gap-1 rounded-md border-2 p-3 text-xs font-semibold transition-all hover:bg-muted", deliveryType === 'TIENDA' ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-muted/50 text-muted-foreground")}
                                >
                                    <Store className="h-4 w-4" />
                                    Recoge en Tienda
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Cliente</label>
                            {selectedClient ? (
                                <div className="rounded-md border p-3 bg-muted/30 relative group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-sm">{selectedClient.full_name}</div>
                                            <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                                                {selectedClient.document_id && (
                                                    <div className="flex items-center gap-1">
                                                        <Hash className="h-3 w-3" /> {selectedClient.document_id}
                                                    </div>
                                                )}
                                                {selectedClient.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {selectedClient.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedClient(null);
                                                setClientName("");
                                                setDeliveryAddress("");
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                    {selectedClient.total_orders > 0 && (
                                        <div className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full inline-block font-medium">
                                            {selectedClient.total_orders} pedidos anteriores
                                        </div>
                                    )}
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

                        {deliveryType === 'DOMICILIO' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <label className="text-sm font-medium leading-none flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" /> Dirección de Entrega
                                </label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase placeholder:normal-case"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value.toUpperCase())}
                                    placeholder="DIRECCIÓN COMPLETA..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Observaciones</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase placeholder:normal-case"
                            value={observations}
                            onChange={(e) => setObservations(e.target.value.toUpperCase())}
                            placeholder="OPCIONAL..."
                        />
                    </div>

                    <div className="pt-4 border-t flex items-center justify-between">
                        <span className="font-bold">Total</span>
                        <span className="text-xl font-bold text-primary">
                            ${totalValue.toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="p-6 pt-0 flex flex-col gap-3">
                    <button
                        onClick={handleSaveOrder}
                        disabled={isSaving}
                        className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Crear Pedido (TOMADO)
                    </button>
                    <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8">
                        <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo
                    </button>
                </div>
            </div>
        </div>
    );
}
