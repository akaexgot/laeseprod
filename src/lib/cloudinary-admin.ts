import crypto from 'node:crypto';

type DeleteResult = {
    deleted: boolean;
    publicId?: string;
    skippedReason?: string;
};

export function getCloudinaryPublicId(url: string | null | undefined): string | null {
    if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) return null;

    const uploadPath = url.split('/upload/')[1]?.split(/[?#]/)[0];
    if (!uploadPath) return null;

    const segments = uploadPath.split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicIdSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;

    if (publicIdSegments.length === 0) return null;

    const lastSegment = publicIdSegments[publicIdSegments.length - 1];
    publicIdSegments[publicIdSegments.length - 1] = lastSegment.replace(/\.[a-z0-9]+$/i, '');

    return decodeURIComponent(publicIdSegments.join('/'));
}

export async function deleteCloudinaryImage(url: string | null | undefined): Promise<DeleteResult> {
    const publicId = getCloudinaryPublicId(url);
    if (!publicId) return { deleted: false, skippedReason: 'not-cloudinary' };

    const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME || import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || import.meta.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || import.meta.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary no está configurado para eliminar archivos.');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json().catch(() => ({})) as { result?: string; error?: { message?: string } };

    if (!response.ok || (data.result && !['ok', 'not found'].includes(data.result))) {
        throw new Error(data.error?.message || `Cloudinary no pudo eliminar la imagen (${data.result || response.status}).`);
    }

    return { deleted: data.result === 'ok', publicId };
}
