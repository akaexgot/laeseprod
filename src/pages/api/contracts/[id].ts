import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { generateContractPDF, getInvoiceClientFieldKeys, replacePlaceholders } from '../../../lib/contracts';
import { sendContractCompletedOwnerEmail, sendContractFinalizedEmail } from '../../../lib/resend';
import { sendOwnerNotification } from '../../../lib/notifications';

export const GET: APIRoute = async ({ params }) => {
    const { id } = params;
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });
    if (!id) return new Response(JSON.stringify({ error: 'ID de contrato requerido' }), { status: 400 });

    const { data, error } = await supabase
        .from('contracts')
        .select('id, status, payment_status, pdf_url, invoice_url, invoice_number, paid_at, updated_at')
        .eq('id', id)
        .single();

    if (error || !data) {
        return new Response(JSON.stringify({ error: 'Contrato no encontrado' }), { status: 404 });
    }

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

/**
 * PUT - Update contract with client data and signature
 */
export const PUT: APIRoute = async ({ params, request }) => {
    const { id } = params;
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { client_email, client_phone, client_data, signature_svg, status } = await request.json();

        if (!id || !client_data || !signature_svg || !client_email || !client_phone) {
            return new Response(JSON.stringify({ error: 'Faltan datos requeridos (Email, Teléfono o Datos Fiscales)' }), { status: 400 });
        }

        // 1. Fetch current contract details
        const { data: contract, error: fetchErr } = await supabase
            .from('contracts')
            .select('*, contract_templates(*)')
            .eq('id', id)
            .single();

        if (fetchErr || !contract) {
            return new Response(JSON.stringify({ error: 'Contrato no encontrado' }), { status: 404 });
        }

        if (contract.status === 'completed' || contract.status === 'paid') {
            return new Response(JSON.stringify({ error: 'El contrato ya está procesado y no puede modificarse.' }), { status: 400 });
        }

        // 2. Prepare update data
        const isBillable = contract.is_billable;
        const newStatus = isBillable ? 'pending_payment' : 'completed';
        const requiredClientFields = [
            ...(contract.contract_templates?.client_fields || []),
            ...(isBillable ? getInvoiceClientFieldKeys() : [])
        ];
        const missingClientFields = [...new Set(requiredClientFields)]
            .filter((field) => !client_data?.[field]?.trim?.());

        if (missingClientFields.length > 0) {
            return new Response(JSON.stringify({
                error: isBillable
                    ? 'Faltan datos fiscales para emitir la factura.'
                    : 'Faltan datos requeridos para completar el contrato.'
            }), { status: 400 });
        }

        const { data: updated, error: updateErr } = await supabase
            .from('contracts')
            .update({
                client_email,
                client_phone,
                client_data,
                signature_svg,
                status: newStatus,
                payment_status: 'unpaid',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // 3. Post-signing logic
        if (!isBillable) {
            // If No payment required, generate PDF and send email NOW
            try {
                // Prepare HTML content for PDF
                const merged = { 
                    ...contract.admin_data, 
                    ...client_data,
                    CLIENT_EMAIL: client_email,
                    CLIENT_PHONE: client_phone
                };
                const fullHtml = replacePlaceholders(contract.contract_templates.content, merged);
                
                // Generate PDF
                const pdfBuffer = await generateContractPDF(
                    `Contrato: ${contract.title || 'Servicios Audiovisuales'}`,
                    fullHtml,
                    signature_svg
                );

                const fileName = `contrato_${id}.pdf`;
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('contracts')
                    .upload(fileName, Buffer.from(pdfBuffer), {
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

                const { error: pdfUpdateErr } = await supabase
                    .from('contracts')
                    .update({
                        pdf_url: pdfUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (pdfUpdateErr) throw pdfUpdateErr;
                updated.pdf_url = pdfUrl;

                // Send Email to Client and Owner
                const clientName = client_data.NOMBRE || client_data.CLIENTE_NOMBRE_FISCAL || client_email;
                await sendContractFinalizedEmail(client_email, clientName, pdfBuffer);
                await sendContractCompletedOwnerEmail(
                    client_email,
                    clientName,
                    contract.title || contract.contract_templates?.title || 'Contrato LaesePROD',
                    pdfBuffer
                );

                // Pushover Notification
                await sendOwnerNotification(
                    `✅ Contrato Finalizado`,
                    `El cliente ${client_email} ha firmado: ${contract.title}. Copia enviada por email.`
                );
            } catch (postErr) {
                console.error('Error in post-signing process (non-billable):', postErr);
                // We don't return error to user because the signature was saved correctly
            }
        } else {
            // If billable, just notify the admin that a signature happened and payment is pending
            await sendOwnerNotification(
                `✍️ Contrato Firmado (Pago Pendiente)`,
                `Cliente: ${client_email}\nContrato: ${contract.title}\nMonto: ${contract.amount_to_pay}€.\nEsperando pago vía Stripe.`
            );
        }

        return new Response(JSON.stringify(updated), { status: 200 });
    } catch (e: any) {
        console.error('Error updating contract:', e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
