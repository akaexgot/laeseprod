import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any // Use a stable version
});

type EuBankTransferCountry = 'DE' | 'FR' | 'IE' | 'NL';
type CheckoutSessionCreateParams = NonNullable<Parameters<typeof stripe.checkout.sessions.create>[0]>;
type CheckoutPaymentMethod = string;

const SUPPORTED_BANK_TRANSFER_COUNTRIES = new Set(['DE', 'FR', 'IE', 'NL']);
const configuredBankTransferCountry = (import.meta.env.STRIPE_BANK_TRANSFER_COUNTRY || 'DE').toUpperCase();
const BANK_TRANSFER_COUNTRY: EuBankTransferCountry = SUPPORTED_BANK_TRANSFER_COUNTRIES.has(configuredBankTransferCountry)
    ? configuredBankTransferCountry as EuBankTransferCountry
    : 'DE';
const CARD_AND_VISIBLE_WALLETS: CheckoutPaymentMethod[] = ['card', 'link'];
const ENABLED_VISIBLE_METHODS: CheckoutPaymentMethod[] = [...CARD_AND_VISIBLE_WALLETS, 'klarna', 'bizum'];

async function createStripeCustomer(contract: any) {
    const customer = await stripe.customers.create({
        email: contract.client_email,
        name: contract.client_data?.CLIENTE_NOMBRE_FISCAL || contract.client_data?.NOMBRE || undefined,
        phone: contract.client_phone || undefined,
        metadata: {
            contract_id: contract.id
        }
    });

    return customer.id;
}

async function getValidStripeCustomerId(contract: any) {
    if (!contract.stripe_customer_id) return createStripeCustomer(contract);

    try {
        const customer = await stripe.customers.retrieve(contract.stripe_customer_id);
        if ('deleted' in customer && customer.deleted) {
            return createStripeCustomer(contract);
        }

        return customer.id;
    } catch (error: any) {
        if (error?.type === 'StripeInvalidRequestError' || error?.code === 'resource_missing') {
            return createStripeCustomer(contract);
        }

        throw error;
    }
}

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

        if (!contract.client_email || !contract.signature_svg || contract.status !== 'pending_payment') {
            return new Response(JSON.stringify({ error: 'El contrato debe estar firmado antes de iniciar el pago.' }), { status: 400 });
        }

        const stripeCustomerId = await getValidStripeCustomerId(contract);

        // 2. Create Stripe Session
        const siteUrl = import.meta.env.PUBLIC_SITE_URL || url.origin;
        const baseSessionParams: Omit<CheckoutSessionCreateParams, 'payment_method_options' | 'payment_method_types'> = {
            customer: stripeCustomerId,
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
            success_url: `${siteUrl}/contrato/${contract_id}?status=processing`,
            cancel_url: `${siteUrl}/contrato/${contract_id}?status=cancel`,
            payment_intent_data: {
                receipt_email: contract.client_email,
                metadata: {
                    contract_id: contract.id
                }
            },
            metadata: {
                contract_id: contract.id
            }
        };

        const checkoutAttempts: Array<{
            label: string;
            payment_method_types: CheckoutPaymentMethod[];
            payment_method_options?: CheckoutSessionCreateParams['payment_method_options'];
        }> = [
            {
                label: 'card-link-klarna-bizum-bank-transfer',
                payment_method_types: [...ENABLED_VISIBLE_METHODS, 'customer_balance'],
                payment_method_options: {
                    customer_balance: {
                        funding_type: 'bank_transfer',
                        bank_transfer: {
                            type: 'eu_bank_transfer',
                            eu_bank_transfer: {
                                country: BANK_TRANSFER_COUNTRY
                            }
                        }
                    }
                }
            },
            {
                label: 'card-link-klarna-bizum',
                payment_method_types: ENABLED_VISIBLE_METHODS
            },
            {
                label: 'card-link-bizum',
                payment_method_types: [...CARD_AND_VISIBLE_WALLETS, 'bizum']
            },
            {
                label: 'card-link',
                payment_method_types: CARD_AND_VISIBLE_WALLETS
            },
            {
                label: 'card',
                payment_method_types: ['card']
            }
        ];

        let session: Stripe.Checkout.Session | null = null;
        let selectedPaymentMethods: CheckoutPaymentMethod[] = ['card'];
        let lastStripeError: unknown = null;

        for (const attempt of checkoutAttempts) {
            try {
                session = await stripe.checkout.sessions.create({
                    ...baseSessionParams,
                    payment_method_types: attempt.payment_method_types as CheckoutSessionCreateParams['payment_method_types'],
                    ...(attempt.payment_method_options ? { payment_method_options: attempt.payment_method_options } : {})
                });
                selectedPaymentMethods = attempt.payment_method_types;
                if (attempt.label !== checkoutAttempts[0].label) {
                    console.error(`Stripe checkout created with fallback methods (${attempt.label}).`);
                }
                break;
            } catch (stripeError: any) {
                lastStripeError = stripeError;
                console.error(`Stripe checkout attempt failed (${attempt.label}):`, stripeError?.message || stripeError);
            }
        }

        if (!session) {
            throw lastStripeError instanceof Error ? lastStripeError : new Error('No se pudo crear la sesion de pago.');
        }

        // 3. Update contract with Stripe references
        await supabase
            .from('contracts')
            .update({
                payment_id: session.id,
                stripe_customer_id: stripeCustomerId,
                payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
                payment_status: 'pending',
                payment_method: selectedPaymentMethods.includes('customer_balance') ? null : selectedPaymentMethods.join(','),
                updated_at: new Date().toISOString()
            })
            .eq('id', contract_id);

        return new Response(JSON.stringify({
            url: session.url,
            paymentMethods: selectedPaymentMethods
        }), { status: 200 });
    } catch (e: any) {
        console.error('Stripe Session Error:', e);
        return new Response(JSON.stringify({ 
            error: `Stripe Error: ${e.message || 'Error desconocido'}` 
        }), { status: 500 });
    }
};
