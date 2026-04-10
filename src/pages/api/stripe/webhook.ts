import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';
import { generateContractPDF, replacePlaceholders } from '../../../lib/contracts';
import { sendContractFinalizedEmail } from '../../../lib/resend';
import { sendOwnerNotification } from '../../../lib/notifications';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24-preview' as any
});

const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

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
        const session = event.data.object as Stripe.CheckoutSession;
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

                // 3. Upload to Supabase Storage (Bucket 'contracts')
                const fileName = `contrato_${contractId}.pdf`;
                const { data: uploadData } = await supabase.storage
                    .from('contracts')
                    .upload(fileName, pdfBuffer, {
                        contentType: 'application/pdf',
                        upsert: true
                    });

                let pdfUrl = '';
                if (uploadData) {
                    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
                    pdfUrl = urlData.publicUrl;
                }

                // 4. Update status and PDF URL
                await supabase
                    .from('contracts')
                    .update({ 
                        status: 'completed',
                        pdf_url: pdfUrl || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contractId);

                // 5. Send notification email to client with PDF
                if (contract.client_email) {
                    await sendContractFinalizedEmail(
                        contract.client_email, 
                        contract.client_data?.NOMBRE || 'Cliente', 
                        pdfBuffer
                    );
                }

                // 6. Pushover Notification to Owner
                await sendOwnerNotification(
                    `💰 Pago RECIBIDO - Contrato Finalizado`,
                    `El cliente ${contract.client_email} ha pagado ${contract.amount_to_pay}€. El contrato ${contract.title} ya está firmado y archivado.`
                );

                console.log(`Contract ${contractId} completed, paid, and notified! PDF: ${pdfUrl}`);
            } catch (err) {
                console.error(`Error processing contract ${contractId} in webhook:`, err);
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
};
