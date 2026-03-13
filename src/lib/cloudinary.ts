/**
 * Cloudinary URL helpers
 * Preferred: YouTube. Cloudinary as fallback for self-hosted videos/images.
 */

const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || '';

/** Build an optimized Cloudinary image URL */
export function cloudinaryImage(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    crop?: string;
} = {}): string {
    const {
        width,
        height,
        quality = 80,
        format = 'auto',
        crop = 'fill'
    } = options;

    const transforms: string[] = [`f_${format}`, `q_${quality}`];
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (crop) transforms.push(`c_${crop}`);

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`;
}

/** Build an optimized Cloudinary video URL */
export function cloudinaryVideo(publicId: string, options: {
    width?: number;
    quality?: number;
    format?: string;
} = {}): string {
    const {
        width,
        quality = 70,
        format = 'auto'
    } = options;

    const transforms: string[] = [`f_${format}`, `q_${quality}`];
    if (width) transforms.push(`w_${width}`);

    return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms.join(',')}/${publicId}`;
}

/** Get thumbnail from Cloudinary video */
export function cloudinaryVideoThumb(publicId: string, options: {
    width?: number;
    height?: number;
    seconds?: number;
} = {}): string {
    const { width = 600, height = 400, seconds = 1 } = options;
    return `https://res.cloudinary.com/${cloudName}/video/upload/w_${width},h_${height},c_fill,so_${seconds}/f_jpg/${publicId}`;
}
