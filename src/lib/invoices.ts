import { INVOICE_START_NUMBER } from './contracts';

type SupabaseService = {
    from: (table: string) => any;
};

async function getMaxInvoiceNumber(supabase: SupabaseService, table: string) {
    const { data, error } = await supabase
        .from(table)
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data?.invoice_number) return null;
    return Number(data.invoice_number);
}

export async function getNextInvoiceNumber(supabase: SupabaseService) {
    const [contractNumber, manualNumber] = await Promise.all([
        getMaxInvoiceNumber(supabase, 'contracts'),
        getMaxInvoiceNumber(supabase, 'manual_invoices'),
    ]);
    const currentMax = Math.max(
        contractNumber || 0,
        manualNumber || 0,
        INVOICE_START_NUMBER - 1
    );

    return currentMax + 1;
}
