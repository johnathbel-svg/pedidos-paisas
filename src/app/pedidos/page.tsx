"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Order, DeliveryDriver } from "@/types/order";
import { Clock, CheckCircle2, Truck, DollarSign, Plus, MapPin, Store, Receipt, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DriversManagementModal } from "@/components/DriversManagementModal";
import { DateFilter } from "@/components/ui/DateFilter";
import { DriverSelector } from "@/components/ui/DriverSelector";


export default function DashboardPage() {
    const [orders, setOrders] = React.useState<Order[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
    const [isDriversModalOpen, setIsDriversModalOpen] = React.useState(false);
    const [activeDrivers, setActiveDrivers] = React.useState<DeliveryDriver[]>([]);
    const router = useRouter();

    const fetchOrders = async () => {
        setLoading(true);
        const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
        const endOfDay = new Date(`${selectedDate}T23:59:59.999`).toISOString();

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                delivery_drivers (
                    id,
                    full_name
                )
            `)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching orders:", error);
        else setOrders(data as Order[] || []);
        setLoading(false);
    };

    const fetchDrivers = async () => {
        const { data } = await supabase
            .from('delivery_drivers')
            .select('*')
            .eq('is_active', true)
            .order('full_name');
        setActiveDrivers(data as DeliveryDriver[] || []);
    };

    React.useEffect(() => {
        fetchOrders();
    }, [selectedDate]);

    React.useEffect(() => {
        if (isDriversModalOpen) {
            // Refresh main specific data if needed when closing, for now just fetch on open/load
        } else {
            fetchDrivers(); // Update dropdowns when closing modal
        }
    }, [isDriversModalOpen]);

    // Initial fetch of drivers
    React.useEffect(() => {
        fetchDrivers();
    }, []);

    React.useEffect(() => {
        const channel = supabase
            .channel('realtime orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newOrder = payload.new as Order;
                    // Only add if viewing today
                    const today = new Date().toISOString().split('T')[0];
                    if (selectedDate === today) {
                        setTimeout(() => {
                            setOrders(prev => [newOrder, ...prev]);
                        }, 500);
                    }
                } else {
                    // Start refreshing to keep status updated
                    fetchOrders();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedDate]);

    const updateStatus = async (id: string, newStatus: Order['status']) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        if (error) alert("Error updating status");
    };

    const assignDriver = async (orderId: string, driverId: string) => {
        const { error } = await supabase.from('orders').update({ driver_id: driverId === 'unassigned' ? null : driverId }).eq('id', orderId);
        if (error) {
            alert("Error assigning driver");
        } else {
            // Optimistic update
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    const driver = activeDrivers.find(d => d.id === driverId);
                    return {
                        ...o,
                        driver_id: driverId === 'unassigned' ? undefined : driverId,
                        delivery_drivers: driver ? { ...driver } : undefined
                    };
                }
                return o;
            }));
        }
    };

    // Stats
    const stats = {
        total: orders.length,
        despacho: orders.filter(o => o.status === 'DESPACHO').length,
        entregados: orders.filter(o => o.status === 'ENTREGADO').length,
        recaudado: orders
            .filter(o => o.status === 'ENTREGADO')
            .reduce((sum, order) => sum + (Number(order.total_value) || 0), 0)
    };

    if (loading && orders.length === 0) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <DriversManagementModal
                isOpen={isDriversModalOpen}
                onClose={() => setIsDriversModalOpen(false)}
            />

            {/* Sticky Header Section */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b pb-4 pt-4 shadow-sm">
                <div className="container mx-auto max-w-6xl space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-0">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                Pedidos <span className="text-brand text-xs px-2 py-0.5 border border-brand/30 rounded-full">En Vivo</span>
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <DateFilter
                                    date={selectedDate}
                                    onDateChange={setSelectedDate}
                                />
                                <span className="text-xs text-muted-foreground">
                                    {selectedDate === new Date().toISOString().split('T')[0] ? "(Hoy)" : ""}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsDriversModalOpen(true)}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 shadow-sm"
                            >
                                <Users className="mr-2 h-4 w-4" /> Domiciliarios
                            </button>
                            <Link href="/nuevo-pedido" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-brand hover:bg-brand/90 text-black font-bold h-9 px-6 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Pedido
                            </Link>
                        </div>
                    </div>

                    {/* Stats Cards - Compact */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-0">
                        <div className="rounded-lg border bg-card p-3 shadow-sm flex flex-col justify-center items-center">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Tomados</span>
                            <span className="text-xl font-bold">{stats.total}</span>
                        </div>
                        <div className="rounded-lg border bg-orange-950/20 border-orange-900/30 p-3 shadow-sm flex flex-col justify-center items-center">
                            <span className="text-xs font-semibold text-orange-600 uppercase">En Despacho</span>
                            <span className="text-xl font-bold text-orange-500">{stats.despacho}</span>
                        </div>
                        <div className="rounded-lg border bg-green-950/20 border-green-900/30 p-3 shadow-sm flex flex-col justify-center items-center">
                            <span className="text-xs font-semibold text-green-600 uppercase">Entregados</span>
                            <span className="text-xl font-bold text-green-500">{stats.entregados}</span>
                        </div>
                        <div className="rounded-lg border bg-blue-950/20 border-blue-900/30 p-3 shadow-sm flex flex-col justify-center items-center">
                            <span className="text-xs font-semibold text-blue-500 uppercase">Recaudado</span>
                            <span className="text-xl font-bold text-blue-400">${stats.recaudado.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders List & Scrollable Area */}
            <div className="flex-1 container mx-auto max-w-6xl py-6 px-4 md:px-0">
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {orders.map((order) => {
                            let statusColor = "bg-slate-500";
                            let borderColor = "border-slate-500";

                            if (order.status === 'TOMADO') { statusColor = "bg-blue-600"; borderColor = "border-blue-500"; }
                            if (order.status === 'DESPACHO') { statusColor = "bg-orange-500"; borderColor = "border-orange-500"; }
                            if (order.status === 'ENTREGADO') { statusColor = "bg-green-600"; borderColor = "border-green-600"; }

                            return (
                                <motion.div
                                    key={order.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                                    transition={{ duration: 0.8, type: "spring", bounce: 0.3 }} // Slower animation
                                    className={cn(
                                        "group relative rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand/50 hover:bg-accent/5"
                                    )}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0">

                                        {/* Left Status Bar */}
                                        <div className={cn("hidden md:block w-2 h-full absolute left-0 top-0 bottom-0 rounded-l-xl", statusColor)} />

                                        {/* Main Content Area */}
                                        <div className="col-span-12 md:col-span-9 p-5 pl-6 flex flex-col justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border">{order.public_id}</span>
                                                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white tracking-wider shadow-sm", statusColor)}>
                                                        {order.status}
                                                    </span>
                                                    {order.delivery_type && (
                                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border flex items-center gap-1">
                                                            {order.delivery_type === 'DOMICILIO' ? <Truck className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                                                            {order.delivery_type}
                                                        </span>
                                                    )}
                                                    {order.delivery_drivers && (
                                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-200 flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {order.delivery_drivers.full_name}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto md:ml-2">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <h3 className="text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                                                    {order.client_name || "Cliente General"}
                                                </h3>

                                                {order.observations && (
                                                    <p className="text-sm text-muted-foreground mt-1 italic border-l-2 border-brand/50 pl-2">
                                                        {order.observations}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {order.invoices_data && Array.isArray(order.invoices_data) && order.invoices_data.map((inv: any, i: number) => (inv.code || inv.value) && (
                                                    <div key={i} className="flex items-center gap-2 text-xs bg-background border px-3 py-1.5 rounded-md shadow-sm group-hover:border-brand/30 transition-colors">
                                                        <Receipt className="h-3 w-3 text-muted-foreground" />
                                                        <span className="font-mono font-semibold text-foreground">{inv.code}</span>
                                                        {inv.value && <span className="text-money font-bold">(${Number(inv.value).toLocaleString()})</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Action Area */}
                                        <div className="col-span-12 md:col-span-3 bg-muted/10 border-t md:border-t-0 md:border-l p-4 flex flex-col justify-center items-center gap-3">
                                            <div className="text-center">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</span>
                                                <div className="text-2xl font-bold text-money flex items-center justify-center gap-1">
                                                    <DollarSign className="h-5 w-5" />
                                                    {Number(order.total_value).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="w-full space-y-2">
                                                {/* Driver Assignment Dropdown - Only for Delivery orders not yet delivered */}
                                                {order.delivery_type === 'DOMICILIO' && order.status !== 'ENTREGADO' && (
                                                    <div className="w-full">
                                                        <DriverSelector
                                                            drivers={activeDrivers}
                                                            selectedDriverId={order.driver_id}
                                                            onSelect={(driverId) => assignDriver(order.id, driverId)}
                                                        />
                                                    </div>
                                                )}

                                                {order.status === 'TOMADO' && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'DESPACHO')}
                                                        className="w-full bg-brand hover:bg-brand/90 text-black font-semibold py-2 px-4 rounded-md shadow-sm transition-all hover:shadow-md text-sm flex items-center justify-center gap-2 active:scale-95"
                                                    >
                                                        <Truck className="h-4 w-4" /> A Despacho
                                                    </button>
                                                )}
                                                {order.status === 'DESPACHO' && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'ENTREGADO')}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-all hover:shadow-md text-sm flex items-center justify-center gap-2 active:scale-95"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" /> Entregar
                                                    </button>
                                                )}
                                                {order.status === 'ENTREGADO' && (
                                                    <div className="flex items-center justify-center gap-1 text-green-600 font-medium text-sm py-2">
                                                        <CheckCircle2 className="h-4 w-4" /> Completado
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    {orders.length === 0 && <div className="text-center py-20 opacity-50 text-muted-foreground">No hay pedidos para esta fecha.</div>}
                </div>
            </div>
        </div>
    );
}
