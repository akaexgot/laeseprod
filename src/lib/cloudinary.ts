/**
 * Cloudinary URL Optimization Utility
 */

export function optimizeCloudinaryVideo(url: string | null | undefined, options: { width?: number; quality?: string; bitRate?: string } = {}) {
    if (!url || !url.includes('cloudinary.com')) return url;

    const { width = 1920, quality = 'auto:best', bitRate = '6m' } = options;
    
    // Let Cloudinary pick the best compatible format/codec for each browser.
    // Forcing H.265 can render as a black video on unsupported clients.
    const transformation = `f_auto,q_${quality},w_${width},br_${bitRate}`;
    
    if (url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/${transformation}/`);
    }
    
    return url;
}

export function optimizeCloudinaryImage(url: string | null | undefined, width: number = 800) {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    const transformation = `f_auto,q_auto,w_${width}`;
    
    if (url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/${transformation}/`);
    }
    
    return url;
}
