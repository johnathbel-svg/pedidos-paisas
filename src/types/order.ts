
export interface DeliveryDriver {
    id: string;
    full_name: string;
    phone?: string;
    vehicle_plate?: string;
    is_active: boolean;
}

export interface Order {
    id: string; // UUID from Supabase
    public_id: string; // The readable ID e.g. PED-001
    status: 'TOMADO' | 'DESPACHO' | 'ENTREGADO' | 'PAGADO';
    client_name: string;
    total_value: number;
    observations?: string;
    created_at: string;
    delivery_type?: 'DOMICILIO' | 'TIENDA';
    invoices_data?: any[]; // flexible json
    driver_id?: string;
    delivery_drivers?: DeliveryDriver; // For joined queries (singular name because of foreign key relationship usually returns single object)
}

export interface Client {
    id: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    document_id?: string;
    phone?: string;
    email?: string;
    address?: string;
    total_orders: number;
    last_order_date?: string;
}
