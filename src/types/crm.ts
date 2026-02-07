// CRM Types
export interface Client {
    id: string;
    created_at: string;
    full_name: string;
    phone?: string;
    email?: string;
    address?: string;
    total_orders: number;
    last_order_date?: string;
    document_id?: string;
    first_name?: string;
    last_name?: string;
    document_type?: string;
    birth_date?: string;
    company_name?: string;
    tax_id?: string;
    customer_type: 'INDIVIDUAL' | 'COMPANY';
    preferred_contact_method: 'PHONE' | 'EMAIL' | 'WHATSAPP';
    credit_limit: number;
    payment_terms?: string;
    assigned_sales_rep_id?: string;
    source: 'DIRECT' | 'AUTO_REGISTRO' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'WEB' | 'PHONE' | 'OTHER';
    status: 'ACTIVE' | 'INACTIVE';
    lifetime_value: number;
    average_order_value: number;
    rfm_score: number;
    rfm_segment?: string;
    last_interaction_date?: string;
    next_follow_up_date?: string;
    metadata?: Record<string, any>;
    updated_at?: string;
}

export interface ClientInteraction {
    id: string;
    client_id: string;
    interaction_type: string;
    interaction_date: string;
    notes?: string;
    created_at: string;
}

export interface ClientNote {
    id: string;
    client_id: string;
    note: string;
    note_type: 'GENERAL' | 'FOLLOW_UP' | 'COMPLAINT' | 'FEEDBACK';
    created_at: string;
    updated_at?: string;
}

export interface ClientTag {
    id: string;
    client_id: string;
    tag: string;
    created_at: string;
}

// Analytics Types
export interface DailySales {
    date: string;
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    in_delivery_orders: number;
    total_revenue: number;
    average_order_value: number;
}

export interface RevenueComparison {
    current: {
        revenue: number;
        orders: number;
        period: 'week' | 'month' | 'year';
        start_date: string;
        end_date: string;
    };
    previous: {
        revenue: number;
        orders: number;
        period: 'week' | 'month' | 'year';
        start_date: string;
        end_date: string;
    };
    change: {
        revenue_percent: number;
        orders_percent: number;
        revenue_absolute: number;
        orders_absolute: number;
    };
}

export interface ProductStat {
    name: string;
    count: number;
    totalValue: number;
}

export interface DeliveryTypeBreakdown {
    DOMICILIO?: {
        count: number;
        revenue: number;
        completed: number;
    };
    TIENDA?: {
        count: number;
        revenue: number;
        completed: number;
    };
}

export interface DriverPerformance {
    id: string;
    name: string;
    total_orders: number;
    completed_orders: number;
    total_revenue: number;
    completion_rate: number;
}

export interface MetricsSummary {
    today: {
        total_orders: number;
        completed_orders: number;
        revenue: number;
    };
    totals: {
        clients: number;
        drivers: number;
    };
}

// Advanced Analytics Types
export interface TopClient {
    client_id: string;
    client_name: string;
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    last_order_date: string;
    rfm_segment?: string;
}

export interface WeekdayPattern {
    day_name: string;
    day_number: number; // 0=Sunday, 6=Saturday
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
}

export interface MonthlyTrend {
    month: string; // 'YYYY-MM'
    month_name: string;
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    new_clients: number;
}

// CRM Dashboard Types
export interface CRMMetrics {
    total_clients: number;
    active_clients: number;
    new_clients_this_month: number;
    avg_lifetime_value: number;
    avg_order_value: number;
    retention_rate: number;
}

export interface ClientSourceDistribution {
    source: string;
    count: number;
    percentage: number;
}

// Re-export existing types
export type { Order, DeliveryDriver } from './order';

