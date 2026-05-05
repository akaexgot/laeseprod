/**
 * Cloudinary URL Optimization Utility
 */

export function optimizeCloudinaryVideo(url: string | null | undefined, options: { width?: number; quality?: string; bitRate?: string } = {}) {
    if (!url || !url.includes('cloudinary.com')) return url;

    const { width = 1280, quality = 'auto', bitRate = '3m' } = options;
    
    // Transformations: 
    // f_auto: automatic format (WebM/MP4)
    // q_auto: automatic quality
    // vc_h265: use H.265 if supported
    // w_X: resize
    // br_X: limit bitrate to save bandwidth
    const transformation = `f_auto,q_${quality},vc_h265,w_${width},br_${bitRate}`;
    
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
