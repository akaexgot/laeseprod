/**
 * Admin API — Cloudinary Signature
 * POST /api/admin/cloudinary-sign
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
    const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME || import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.VITE_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || import.meta.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || import.meta.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.error('ERROR: Cloudinary Config Missing in Server:', { 
            cloudName: !!cloudName, 
            apiKey: !!apiKey, 
            apiSecret: !!apiSecret 
        });
        return new Response(JSON.stringify({ 
            error: 'Servidor no configurado para Cloudinary. Verifica las variables de entorno.',
            debug: { cloudName: !!cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret }
        }), { status: 500 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        
        // Cloudinary requires all parameters to be sorted alphabetically
        const sortedParams = Object.keys(body)
            .sort()
            .map(key => `${key}=${body[key]}`)
            .join('&');
        
        const paramsToSign = sortedParams + apiSecret;
        const timestamp = body.timestamp; // Use timestamp from body if present
        
        const signature = crypto
            .createHash('sha1')
            .update(paramsToSign)
            .digest('hex');

        return new Response(JSON.stringify({ 
            signature,
            timestamp,
            api_key: apiKey,
            cloud_name: cloudName
        }), { status: 200 });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
