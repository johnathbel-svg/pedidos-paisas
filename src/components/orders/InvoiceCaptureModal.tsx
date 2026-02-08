'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, X, Check, ShoppingBag, Printer, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface InvoiceProduct {
    name: string;
    qty: number;
    price: number;
    type: string;
}

export interface InvoiceEvent {
    id: string;
    invoice_number_1: string;
    invoice_value_1: number;
    invoice_number_2?: string;
    invoice_value_2?: number;
    products?: InvoiceProduct[];
    created_at: string;
    status: 'PENDING' | 'PROCESSED' | 'IGNORED';
}

interface InvoiceCaptureModalProps {
    isOpen: boolean;
    data: InvoiceEvent | null;
    onClose: () => void;
    onAccept: (data: InvoiceEvent) => void;
    onIgnore: (id: string) => void;
}

export function InvoiceCaptureModal({ isOpen, data, onClose, onAccept, onIgnore }: InvoiceCaptureModalProps) {
    if (!data || !isOpen) return null;

    const totalValue = (data.invoice_value_1 || 0) + (data.invoice_value_2 || 0);
    const hasSecondInvoice = !!data.invoice_number_2;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Header with Pulse Effect */}
                        <div className="bg-brand/10 p-4 border-b border-brand/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative flex items-center justify-center w-10 h-10 bg-brand text-black rounded-full">
                                    <div className="absolute inset-0 bg-brand rounded-full animate-ping opacity-20"></div>
                                    <Printer className="w-5 h-5 relative z-10" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-foreground">Factura Detectada</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Captura en tiempo real
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Invoice Details Grid */}
                            <div className={`grid ${hasSecondInvoice ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                {/* Invoice 1 (DIAN) */}
                                <div className="p-4 rounded-lg bg-background border border-border relative overflow-hidden group hover:border-brand/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                                        <Receipt className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wide">Factura #1</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-bold text-foreground font-mono">{data.invoice_number_1}</p>
                                        <p className="text-lg font-bold text-green-600 font-mono">
                                            ${data.invoice_value_1?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Invoice 2 (Internal) - Only if exists */}
                                {hasSecondInvoice && (
                                    <div className="p-4 rounded-lg bg-background border border-border relative overflow-hidden group hover:border-brand/50 transition-colors">
                                        <div className="absolute top-2 right-2">
                                            <span className="text-[10px] font-bold bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full uppercase border border-purple-500/20">INTERNAL</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                                            <Receipt className="w-4 h-4" />
                                            <span className="text-xs font-medium uppercase tracking-wide">Factura #2</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xl font-bold text-foreground font-mono">{data.invoice_number_2}</p>
                                            <p className="text-sm font-medium text-green-500 font-mono">
                                                ${data.invoice_value_2?.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Total Value Banner */}
                            <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border border-accent">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground/80 font-medium uppercase tracking-wider">Valor Total Detectado</span>
                                    <span className="text-2xl font-bold text-brand font-mono tracking-tight">${totalValue.toLocaleString()}</span>
                                </div>
                                <div className="bg-brand/10 p-2 rounded-full">
                                    <Check className="w-6 h-6 text-brand" />
                                </div>
                            </div>

                            {/* Products Preview (if available) */}
                            {data.products && data.products.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
                                        <ShoppingBag className="w-3 h-3" />
                                        Productos ({data.products.length})
                                    </h4>
                                    <div className="bg-muted/30 rounded-lg border border-border max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                        {data.products.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 text-sm border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-background border border-border rounded-full text-[10px] font-bold shadow-sm">
                                                        {item.qty}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{item.name}</span>
                                                        {item.type !== 'DIAN' && <span className="text-[10px] text-muted-foreground uppercase">{item.type}</span>}
                                                    </div>
                                                </div>
                                                <span className="font-medium text-foreground font-mono bg-background px-2 py-0.5 rounded border border-border">
                                                    ${(item.price * item.qty).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-lg border border-dashed border-border bg-muted/10 flex items-center justify-center text-sm text-muted-foreground gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>No se detectaron productos detallados</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-muted/30 border-t border-border flex gap-3 justify-end items-center">
                            <button
                                onClick={() => onIgnore(data.id)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-md"
                            >
                                Ignorar
                            </button>
                            <button
                                onClick={() => onAccept(data)}
                                className="flex items-center gap-2 px-6 py-2 bg-brand hover:bg-brand/90 text-black font-bold rounded-md shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                Crear Pedido
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
