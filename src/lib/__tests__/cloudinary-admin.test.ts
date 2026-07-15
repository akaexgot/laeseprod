import { describe, expect, it } from 'vitest';
import { getCloudinaryPublicId } from '../cloudinary-admin';

describe('getCloudinaryPublicId', () => {
  it('extracts public id from a standard Cloudinary image URL', () => {
    expect(getCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1712345678/projects/cover.jpg')).toBe('projects/cover');
  });

  it('extracts public id when the URL has query parameters', () => {
    expect(getCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1712345678/projects/cover.webp?_a=123')).toBe('projects/cover');
  });

  it('returns null for non-Cloudinary URLs', () => {
    expect(getCloudinaryPublicId('https://example.com/cover.jpg')).toBeNull();
  });
});
