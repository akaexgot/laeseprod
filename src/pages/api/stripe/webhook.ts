import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';
import {
    INVOICE_START_NUMBER,
    generateContractPDF,
    generateInvoicePDF,
    replacePlaceholders,
} from '../../../lib/contracts';
import { sendContractFinalizedEmail } from '../../../lib/resend';
import { sendOwnerNotification } from '../../../lib/notifications';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24-preview' as any
});

const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

async function getNextInvoiceNumber(supabase: ReturnType<typeof getServiceSupabase>) {
    if (!supabase) return INVOICE_START_NUMBER;

    const { data, error } = await supabase
        .from('contracts')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data?.invoice_number) return INVOICE_START_NUMBER;
    return Math.max(Number(data.invoice_number) + 1, INVOICE_START_NUMBER);
}

export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response('Supabase error', { status: 500 });

    const sig = request.headers.get('stripe-signature');
    if (!sig || !endpointSecret) {
        console.error('Missing Stripe signature or webhook secret');
        return new Response('Missing signature or secret', { status: 400 });
    }

    let event: Stripe.Event;

    try {
        const body = await request.text();
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractId = session.metadata?.contract_id;

        if (contractId) {
            // 1. Fetch full contract data
            const { data: contract, error: fetchErr } = await supabase
                .from('contracts')
                .select('*, contract_templates(*)')
                .eq('id', contractId)
                .single();

            if (fetchErr || !contract) {
                console.error(`Contract ${contractId} not found in webhook`);
                return new Response('Contract not found', { status: 404 });
            }

            try {
                // 2. Generate PDF
                const mergedData = { 
                    ...contract.admin_data, 
                    ...contract.client_data,
                    CLIENT_EMAIL: contract.client_email,
                    CLIENT_PHONE: contract.client_phone
                };
                const finalHtml = replacePlaceholders(contract.contract_templates.content, mergedData);
                const pdfBuffer = await generateContractPDF(contract.title || 'Contrato', finalHtml, contract.signature_svg);

                const paidAt = new Date();
                const invoiceNumber = await getNextInvoiceNumber(supabase);
                const invoiceBuffer = await generateInvoicePDF({
                    invoiceNumber,
                    issueDate: paidAt,
                    clientName: contract.client_data?.CLIENTE_NOMBRE_FISCAL || contract.client_data?.NOMBRE || contract.client_email,
                    clientCif: contract.client_data?.CLIENTE_CIF || '',
                    clientAddress: contract.client_data?.CLIENTE_DIRECCION || '',
                    concept: contract.contract_templates?.title || contract.title || 'Servicios audiovisuales',
                    amount: Number(contract.amount_to_pay || 0),
                    contractId,
                });

                // 3. Upload to Supabase Storage (Bucket 'contracts')
                const fileName = `contrato_${contractId}.pdf`;
                const contractFileBuffer = Buffer.from(pdfBuffer);
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('contracts')
                    .upload(fileName, contractFileBuffer, {
                        contentType: 'application/pdf',
                        upsert: true
                    });

                if (uploadErr) throw uploadErr;

                let pdfUrl = '';
                if (uploadData) {
                    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
                    pdfUrl = urlData.publicUrl;
                }
                if (!pdfUrl) throw new Error('No se pudo generar la URL publica del contrato');

                const invoiceFileName = `factura_${invoiceNumber}_contrato_${contractId}.pdf`;
                const invoiceFileBuffer = Buffer.from(invoiceBuffer);
                const { data: invoiceUploadData, error: invoiceUploadErr } = await supabase.storage
                    .from('contracts')
                    .upload(invoiceFileName, invoiceFileBuffer, {
                        contentType: 'application/pdf',
                        upsert: true
                    });

                if (invoiceUploadErr) throw invoiceUploadErr;

                let invoiceUrl = '';
                if (invoiceUploadData) {
                    const { data: invoiceUrlData } = supabase.storage.from('contracts').getPublicUrl(invoiceFileName);
                    invoiceUrl = invoiceUrlData.publicUrl;
                }
                if (!invoiceUrl) throw new Error('No se pudo generar la URL publica de la factura');

                // 4. Send notification email to client with PDF and invoice
                if (contract.client_email) {
                    await sendContractFinalizedEmail(
                        contract.client_email, 
                        contract.client_data?.NOMBRE || contract.client_data?.CLIENTE_NOMBRE_FISCAL || 'Cliente', 
                        pdfBuffer,
                        invoiceBuffer,
                        invoiceNumber
                    );
                }

                // 5. Update status and PDF URL after Resend accepts the email
                const { error: updateErr } = await supabase
                    .from('contracts')
                    .update({ 
                        status: 'completed',
                        pdf_url: pdfUrl || null,
                        invoice_number: invoiceNumber,
                        invoice_url: invoiceUrl || null,
                        invoice_issued_at: paidAt.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contractId);

                if (updateErr) throw updateErr;

                // 6. Pushover Notification to Owner
                await sendOwnerNotification(
                    `💰 Pago RECIBIDO - Contrato Finalizado`,
                    `El cliente ${contract.client_email} ha pagado ${contract.amount_to_pay}€. El contrato ${contract.title} ya está firmado y archivado. Factura #${invoiceNumber} generada.`
                );

            } catch (err) {
                console.error(`Error processing contract ${contractId} in webhook:`, err);
                return new Response('Error processing checkout session', { status: 500 });
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
};
