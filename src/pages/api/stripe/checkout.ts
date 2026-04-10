import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any // Use a stable version
});

export const POST: APIRoute = async ({ request, url }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const body = await request.json();
        const { contract_id } = body;
        
        if (!contract_id) return new Response(JSON.stringify({ error: 'ID de contrato requerido' }), { status: 400 });

        // 1. Fetch contract data
        const { data: contract, error: cError } = await supabase
            .from('contracts')
            .select('*, contract_templates(title)')
            .eq('id', contract_id)
            .single();

        if (cError || !contract) {
            console.error('Database fetch error:', cError);
            return new Response(JSON.stringify({ error: 'Contrato no encontrado en la base de datos' }), { status: 404 });
        }

        const amountCents = Math.round((contract.amount_to_pay || 0) * 100);
        if (amountCents < 50) {
            return new Response(JSON.stringify({ error: 'El importe debe ser al menos 0.50€ para procesar el pago.' }), { status: 400 });
        }

        // 2. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Pago: ${contract.contract_templates?.title || 'Contrato VideoMarketing Sevilla'}`,
                            description: `Servicio: ${contract.admin_data?.SERVICIO || 'Producción Audiovisual'}`,
                        },
                        unit_amount: amountCents,
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

        // 3. Update contract with session ID
        await supabase.from('contracts').update({ payment_id: session.id }).eq('id', contract_id);

        return new Response(JSON.stringify({ url: session.url }), { status: 200 });
    } catch (e: any) {
        console.error('Stripe Session Error:', e);
        return new Response(JSON.stringify({ 
            error: `Stripe Error: ${e.message || 'Error desconocido'}` 
        }), { status: 500 });
    }
};
