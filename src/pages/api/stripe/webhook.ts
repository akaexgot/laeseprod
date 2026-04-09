import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';
import { generateContractPDF, replacePlaceholders } from '../../../lib/contracts';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24-preview' as any
});

const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response('Supabase error', { status: 500 });

    const sig = request.headers.get('stripe-signature');
    if (!sig || !endpointSecret) return new Response('Missing signature or secret', { status: 400 });

    let event: Stripe.Event;

    try {
        const body = await request.text();
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.CheckoutSession;
        const contractId = session.metadata?.contract_id;

        if (contractId) {
            // 1. Fetch full contract data
            const { data: contract } = await supabase
                .from('contracts')
                .select('*, contract_templates(*)')
                .eq('id', contractId)
                .single();

            if (contract) {
                // 2. Generate PDF
                const mergedData = { ...contract.admin_data, ...contract.client_data };
                const finalHtml = replacePlaceholders(contract.contract_templates.content, mergedData);
                const pdfBuffer = await generateContractPDF(contract.contract_templates.title, finalHtml, contract.signature_svg);

                // 3. Upload to Supabase Storage (Bucket 'contracts')
                // Note: Ensure project has a public bucket named 'contracts'
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
                        pdf_url: pdfUrl || null
                    })
                    .eq('id', contractId);

                // 5. Send notification email (Optional: Add actual logic here)
                console.log(`Contract ${contractId} completed and paid! PDF: ${pdfUrl}`);
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
};
