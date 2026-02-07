'use server';

import { createClient } from '@/utils/supabase/server';
import type { DailySalesData, RevenueComparison, TopProduct, DeliveryTypeBreakdown, DriverPerformance, MetricsSummary } from '@/types/crm';

/**
 * Analytics Server Actions - Fixed async/await pattern
 */

// ============================================================
// SALES ANALYTICS
// ============================================================

export async function getDailySales(startDate: string, endDate: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_value, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching daily sales:', error);
        throw error;
    }

    // Group by date
    const salesByDate = (data || []).reduce((acc: Record<string, DailySalesData>, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];

        if (!acc[date]) {
            acc[date] = {
                date,
                total_orders: 0,
                total_revenue: 0,
                delivered_orders: 0,
                delivered_revenue: 0
            };
        }

        acc[date].total_orders += 1;
        acc[date].total_revenue += Number(order.total_value) || 0;

        if (order.status === 'ENTREGADO') {
            acc[date].delivered_orders += 1;
            acc[date].delivered_revenue += Number(order.total_value) || 0;
        }

        return acc;
    }, {});

    return Object.values(salesByDate);
}

export async function getRevenueComparison(currentStart: string, currentEnd: string, previousStart: string, previousEnd: string): Promise<RevenueComparison> {
    const supabase = await createClient();

    const [currentData, previousData] = await Promise.all([
        supabase
            .from('orders')
            .select('total_value, status')
            .gte('created_at', currentStart)
            .lte('created_at', currentEnd),
        supabase
            .from('orders')
            .select('total_value, status')
            .gte('created_at', previousStart)
            .lte('created_at', previousEnd)
    ]);

    if (currentData.error || previousData.error) {
        console.error('Error fetching revenue comparison:', currentData.error || previousData.error);
        throw currentData.error || previousData.error;
    }

    const currentTotal = (currentData.data || []).reduce((sum: number, o: any) => sum + (Number(o.total_value) || 0), 0);
    const currentDelivered = (currentData.data || []).filter((o: any) => o.status === 'ENTREGADO').reduce((sum: number, o: any) => sum + (Number(o.total_value) || 0), 0);

    const previousTotal = (previousData.data || []).reduce((sum: number, o: any) => sum + (Number(o.total_value) || 0), 0);
    const previousDelivered = (previousData.data || []).filter((o: any) => o.status === 'ENTREGADO').reduce((sum: number, o: any) => sum + (Number(o.total_value) || 0), 0);

    const percentageChange = previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : 0;

    return {
        current_period: {
            total_revenue: currentTotal,
            delivered_revenue: currentDelivered,
            total_orders: currentData.data?.length || 0
        },
        previous_period: {
            total_revenue: previousTotal,
            delivered_revenue: previousDelivered,
            total_orders: previousData.data?.length || 0
        },
        percentage_change: percentageChange
    };
}

// ============================================================
// PRODUCTS ANALYTICS
// ============================================================

export async function getTopProducts(startDate: string, endDate: string, limit = 10): Promise<TopProduct[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('orders')
        .select('invoices_data, total_value, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'ENTREGADO');

    if (error) {
        console.error('Error fetching top products:', error);
        return [];
    }

    // Parse invoices and count products
    const productStats: Record<string, TopProduct> = {};

    (data || []).forEach((order: any) => {
        const invoices = order.invoices_data || [];
        invoices.forEach((invoice: any) => {
            const productName = invoice.product_name || 'Sin nombre';
            const quantity = Number(invoice.quantity) || 0;
            const price = Number(invoice.price) || 0;

            if (!productStats[productName]) {
                productStats[productName] = {
                    product_name: productName,
                    total_quantity: 0,
                    total_revenue: 0,
                    order_count: 0
                };
            }

            productStats[productName].total_quantity += quantity;
            productStats[productName].total_revenue += quantity * price;
            productStats[productName].order_count += 1;
        });
    });

    return Object.values(productStats)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);
}

// ============================================================
// DELIVERY ANALYTICS
// ============================================================

export async function getDeliveryTypeBreakdown(startDate: string, endDate: string): Promise<DeliveryTypeBreakdown[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('orders')
        .select('delivery_type, total_value, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    if (error) {
        console.error('Error fetching delivery type breakdown:', error);
        return [];
    }

    const breakdown: Record<string, DeliveryTypeBreakdown> = {};

    (data || []).forEach((order: any) => {
        const type = order.delivery_type || 'SIN_TIPO';

        if (!breakdown[type]) {
            breakdown[type] = {
                delivery_type: type,
                total_orders: 0,
                total_revenue: 0,
                delivered_orders: 0
            };
        }

        breakdown[type].total_orders += 1;
        breakdown[type].total_revenue += Number(order.total_value) || 0;

        if (order.status === 'ENTREGADO') {
            breakdown[type].delivered_orders += 1;
        }
    });

    return Object.values(breakdown);
}

export async function getDriverPerformance(startDate: string, endDate: string): Promise<DriverPerformance[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('orders')
        .select(`
      driver_id,
      total_value,
      status,
      delivery_drivers (
        id,
        full_name
      )
    `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('driver_id', 'is', null);

    if (error) {
        console.error('Error fetching driver performance:', error);
        return [];
    }

    const driverStats: Record<string, DriverPerformance> = {};

    (data || []).forEach((order: any) => {
        const driverId = order.driver_id;
        const driverName = order.delivery_drivers?.full_name || 'Desconocido';

        if (!driverStats[driverId]) {
            driverStats[driverId] = {
                driver_id: driverId,
                driver_name: driverName,
                total_deliveries: 0,
                completed_deliveries: 0,
                total_revenue: 0
            };
        }

        driverStats[driverId].total_deliveries += 1;
        driverStats[driverId].total_revenue += Number(order.total_value) || 0;

        if (order.status === 'ENTREGADO') {
            driverStats[driverId].completed_deliveries += 1;
        }
    });

    return Object.values(driverStats)
        .sort((a, b) => b.completed_deliveries - a.completed_deliveries);
}

// ============================================================
// DASHBOARD SUMMARY
// ============================================================

export async function getMetricsSummary(startDate: string, endDate: string): Promise<MetricsSummary> {
    const supabase = await createClient();

    const [ordersData, clientsData, dailyMetricsData] = await Promise.all([
        supabase
            .from('orders')
            .select('total_value, status')
            .gte('created_at', startDate)
            .lte('created_at', endDate),
        supabase
            .from('clients')
            .select('id')
            .gte('created_at', startDate)
            .lte('created_at', endDate),
        supabase
            .rpc('calculate_daily_metrics', {
                p_start_date: startDate,
                p_end_date: endDate
            })
    ]);

    const orders = ordersData.data || [];
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o: any) => o.status === 'ENTREGADO').length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (Number(o.total_value) || 0), 0);
    const deliveredRevenue = orders.filter((o: any) => o.status === 'ENTREGADO').reduce((sum: number, o: any) => sum + (Number(o.total_value) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const newClients = clientsData.data?.length || 0;

    return {
        total_orders: totalOrders,
        delivered_orders: deliveredOrders,
        total_revenue: totalRevenue,
        delivered_revenue: deliveredRevenue,
        average_order_value: averageOrderValue,
        new_clients: newClients
    };
}

// ============================================================
// ADVANCED CLIENT ANALYTICS
// ============================================================

export async function getTopClients(startDate: string, endDate: string, limit = 10) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('orders')
        .select(`
            client_id,
            total_value,
            status,
            created_at,
            clients (
                id,
                full_name,
                rfm_segment
            )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('client_id', 'is', null)
        .eq('status', 'ENTREGADO');

    if (error) {
        console.error('Error fetching top clients:', error);
        return [];
    }

    const clientStats: Record<string, any> = {};

    (data || []).forEach((order: any) => {
        const clientId = order.client_id;
        const clientName = order.clients?.full_name || 'Desconocido';
        const rfmSegment = order.clients?.rfm_segment;

        if (!clientStats[clientId]) {
            clientStats[clientId] = {
                client_id: clientId,
                client_name: clientName,
                total_orders: 0,
                total_revenue: 0,
                last_order_date: order.created_at,
                rfm_segment: rfmSegment
            };
        }

        clientStats[clientId].total_orders += 1;
        clientStats[clientId].total_revenue += Number(order.total_value) || 0;

        if (new Date(order.created_at) > new Date(clientStats[clientId].last_order_date)) {
            clientStats[clientId].last_order_date = order.created_at;
        }
    });

    return Object.values(clientStats)
        .map((client: any) => ({
            ...client,
            average_order_value: client.total_revenue / client.total_orders
        }))
        .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
        .slice(0, limit);
}

// ============================================================
// TEMPORAL PATTERN ANALYTICS
// ============================================================

export async function getWeekdayPatterns(startDate: string, endDate: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_value, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'ENTREGADO');

    if (error) {
        console.error('Error fetching weekday patterns:', error);
        return [];
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const weekdayStats: Record<number, any> = {};

    // Initialize all days
    for (let i = 0; i < 7; i++) {
        weekdayStats[i] = {
            day_number: i,
            day_name: dayNames[i],
            total_orders: 0,
            total_revenue: 0
        };
    }

    (data || []).forEach((order: any) => {
        const dayNumber = new Date(order.created_at).getDay();
        weekdayStats[dayNumber].total_orders += 1;
        weekdayStats[dayNumber].total_revenue += Number(order.total_value) || 0;
    });

    return Object.values(weekdayStats).map((day: any) => ({
        ...day,
        average_order_value: day.total_orders > 0 ? day.total_revenue / day.total_orders : 0
    }));
}

export async function getMonthlyTrends(startDate: string, endDate: string) {
    const supabase = await createClient();

    const [ordersData, clientsData] = await Promise.all([
        supabase
            .from('orders')
            .select('created_at, total_value, status')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .eq('status', 'ENTREGADO'),
        supabase
            .from('clients')
            .select('created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
    ]);

    if (ordersData.error) {
        console.error('Error fetching monthly trends:', ordersData.error);
        return [];
    }

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyStats: Record<string, any> = {};

    (ordersData.data || []).forEach((order: any) => {
        const date = new Date(order.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = {
                month: monthKey,
                month_name: monthName,
                total_orders: 0,
                total_revenue: 0,
                new_clients: 0
            };
        }

        monthlyStats[monthKey].total_orders += 1;
        monthlyStats[monthKey].total_revenue += Number(order.total_value) || 0;
    });

    (clientsData.data || []).forEach((client: any) => {
        const date = new Date(client.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].new_clients += 1;
        }
    });

    return Object.values(monthlyStats)
        .map((month: any) => ({
            ...month,
            average_order_value: month.total_orders > 0 ? month.total_revenue / month.total_orders : 0
        }))
        .sort((a: any, b: any) => a.month.localeCompare(b.month));
}

