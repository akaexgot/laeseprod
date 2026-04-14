/**
 * Admin API — Cloudinary Upload
 * POST /api/admin/upload
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
    const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME || import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || import.meta.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || import.meta.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        return new Response(JSON.stringify({ error: 'Cloudinary not configured' }), { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const folder = (formData.get('folder') as string) || 'logos';

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        
        // Generate signature
        // Params must be alphabetized for signature
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto
            .createHash('sha1')
            .update(paramsToSign)
            .digest('hex');

        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', file);
        cloudinaryFormData.append('folder', folder);
        cloudinaryFormData.append('timestamp', timestamp.toString());
        cloudinaryFormData.append('api_key', apiKey);
        cloudinaryFormData.append('signature', signature);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
            {
                method: 'POST',
                body: cloudinaryFormData,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({ error: data.error?.message || 'Upload failed' }), { status: response.status });
        }

        return new Response(JSON.stringify({ 
            url: data.secure_url,
            public_id: data.public_id,
            pages: data.pages || 1,
            format: data.format || 'jpg'
        }), { status: 200 });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
