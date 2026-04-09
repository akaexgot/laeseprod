import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24-preview' as any
});

export const POST: APIRoute = async ({ request, url }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { contract_id } = await request.json();
        if (!contract_id) return new Response(JSON.stringify({ error: 'ID de contrato requerido' }), { status: 400 });

        // 1. Fetch contract data
        const { data: contract, error: cError } = await supabase
            .from('contracts')
            .select('*, contract_templates(title)')
            .eq('id', contract_id)
            .single();

        if (cError || !contract) return new Response(JSON.stringify({ error: 'Contrato no encontrado' }), { status: 404 });

        // 2. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Pago: ${contract.contract_templates.title}`,
                            description: `Servicio: ${contract.admin_data.SERVICIO || 'Producción Audiovisual'}`,
                        },
                        unit_amount: Math.round(contract.amount_to_pay * 100), // Stripe uses cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${url.origin}/contrato/${contract_id}?status=success`,
            cancel_url: `${url.origin}/contrato/${contract_id}?status=cancel`,
            metadata: {
                contract_id: contract.id
            }
        });

        // 3. Update contract with session ID (optional but good for tracking)
        await supabase.from('contracts').update({ payment_id: session.id }).eq('id', contract_id);

        return new Response(JSON.stringify({ url: session.url }), { status: 200 });
    } catch (e: any) {
        console.error('Stripe error:', e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
