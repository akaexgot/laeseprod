import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { generateInvoicePDF } from '../../../lib/contracts';
import { getNextInvoiceNumber } from '../../../lib/invoices';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function parseAmount(value: unknown) {
    const amount = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function getStoragePathFromPublicUrl(url: string) {
    try {
        const parsed = new URL(url);
        const marker = '/storage/v1/object/public/contracts/';
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex === -1) return null;
        return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    } catch {
        return null;
    }
}

export const GET: APIRoute = async () => {
    const supabase = getServiceSupabase();
    if (!supabase) return json({ error: 'Supabase no configurado' }, 500);

    const { data, error } = await supabase
        .from('manual_invoices')
        .select('*')
        .order('issue_date', { ascending: false })
        .order('invoice_number', { ascending: false });

    if (error) return json({ error: error.message }, 500);
    return json(data || []);
};

export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return json({ error: 'Supabase no configurado' }, 500);

    try {
        const body = await request.json();
        const clientName = String(body.client_name || '').trim();
        const clientCif = String(body.client_cif || '').trim();
        const clientAddress = String(body.client_address || '').trim();
        const clientEmail = String(body.client_email || '').trim();
        const concept = String(body.concept || '').trim();
        const paymentMethod = String(body.payment_method || 'Transferencia bancaria').trim();
        const notes = String(body.notes || '').trim();
        const issueDate = body.issue_date ? new Date(`${body.issue_date}T12:00:00`) : new Date();
        const amount = parseAmount(body.amount);

        if (!clientName || !concept || amount <= 0) {
            return json({ error: 'Cliente, concepto e importe son obligatorios.' }, 400);
        }

        if (Number.isNaN(issueDate.getTime())) {
            return json({ error: 'La fecha de factura no es valida.' }, 400);
        }

        const invoiceNumber = await getNextInvoiceNumber(supabase);
        const invoiceBuffer = await generateInvoicePDF({
            invoiceNumber,
            issueDate,
            clientName,
            clientCif,
            clientAddress,
            concept,
            amount,
            contractId: 'manual',
            paymentMethod,
        });

        const fileName = `factura_${invoiceNumber}_manual.pdf`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('contracts')
            .upload(fileName, Buffer.from(invoiceBuffer), {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadErr) throw uploadErr;

        let invoiceUrl = '';
        if (uploadData) {
            const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
            invoiceUrl = urlData.publicUrl;
        }
        if (!invoiceUrl) throw new Error('No se pudo generar la URL publica de la factura');

        const { data, error } = await supabase
            .from('manual_invoices')
            .insert({
                invoice_number: invoiceNumber,
                invoice_url: invoiceUrl,
                client_name: clientName,
                client_cif: clientCif || null,
                client_address: clientAddress || null,
                client_email: clientEmail || null,
                concept,
                amount,
                payment_method: paymentMethod,
                issue_date: issueDate.toISOString().slice(0, 10),
                notes: notes || null,
            })
            .select()
            .single();

        if (error) throw error;
        return json(data, 201);
    } catch (e: any) {
        return json({ error: e.message || 'No se pudo crear la factura.' }, 500);
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return json({ error: 'Supabase no configurado' }, 500);

    try {
        const { id } = await request.json();
        if (!id) return json({ error: 'Falta el ID de la factura.' }, 400);

        const { data: invoice, error: fetchError } = await supabase
            .from('manual_invoices')
            .select('id, invoice_url')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!invoice) return json({ error: 'Factura manual no encontrada.' }, 404);

        const storagePath = getStoragePathFromPublicUrl(invoice.invoice_url || '');
        if (storagePath) {
            const { error: storageError } = await supabase.storage
                .from('contracts')
                .remove([storagePath]);
            if (storageError) {
                console.error('No se pudo borrar el PDF de la factura manual:', storageError.message);
            }
        }

        const { error: deleteError } = await supabase
            .from('manual_invoices')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;
        return json({ success: true });
    } catch (e: any) {
        return json({ error: e.message || 'No se pudo eliminar la factura.' }, 500);
    }
};
