import { describe, it, expect } from 'vitest';
import { buildProjectScreens, getVideoId, getVimeoId, normalizeSampleVideos, resolveVideoEmbed, toYouTubeEmbed, toVimeoEmbed } from '../display';

describe('buildProjectScreens', () => {
  it('returns empty array for no projects', () => {
    expect(buildProjectScreens([])).toEqual([]);
  });

  it('puts up to 3 featured first and then full 4-item chunks', () => {
    const projects = [] as any[];
    // 3 featured
    for (let i = 1; i <= 3; i++) projects.push({ id: `f${i}`, featured_home: true });
    // 4 normal
    for (let i = 1; i <= 4; i++) projects.push({ id: `n${i}` });

    const screens = buildProjectScreens(projects);
    expect(screens.length).toBe(2);
    expect(screens[0].length).toBe(3); // featured
    expect(screens[1].length).toBe(4); // full chunk
  });

  it('includes partial final chunk', () => {
    const projects = [] as any[];
    for (let i = 1; i <= 3; i++) projects.push({ id: `f${i}`, featured_home: true });
    // 5 normal -> first chunk of 4 + partial chunk of 1
    for (let i = 1; i <= 5; i++) projects.push({ id: `n${i}` });

    const screens = buildProjectScreens(projects);
    expect(screens.length).toBe(3); // featured + full chunk + partial chunk
    expect(screens[1].length).toBe(4);
    expect(screens[2].length).toBe(1); // the leftover project is now shown
  });
});

describe('getVideoId / toYouTubeEmbed', () => {
  it('extracts watch?v id', () => {
    expect(getVideoId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
  });

  it('extracts youtu.be id', () => {
    expect(getVideoId('https://youtu.be/ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
  });

  it('extracts youtube-nocookie embed id', () => {
    expect(getVideoId('https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0')).toBe('abcdefghijk');
  });

  it('extracts shorts id and converts to embed', () => {
    const url = 'https://www.youtube.com/shorts/ZYXWVUTSRQP';
    expect(getVideoId(url)).toBe('ZYXWVUTSRQP');
    expect(toYouTubeEmbed(url)).toBe('https://www.youtube-nocookie.com/embed/ZYXWVUTSRQP?rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3&disablekb=1&enablejsapi=1');
  });

  it('extracts mobile youtube ids with shared params', () => {
    expect(getVideoId('https://m.youtube.com/watch?si=sharecode123&v=AbCdEfGhIj1')).toBe('AbCdEfGhIj1');
  });

  it('extracts live youtube urls', () => {
    expect(getVideoId('https://www.youtube.com/live/AbCdEfGhIj1?si=sharecode123')).toBe('AbCdEfGhIj1');
  });

  it('returns null for invalid urls', () => {
    expect(getVideoId('not a url')).toBe(null);
    expect(toYouTubeEmbed('')).toBe(null);
  });
});

describe('video embed resolution', () => {
  it('marks youtube shorts as vertical', () => {
    const video = resolveVideoEmbed('https://www.youtube.com/shorts/ZYXWVUTSRQP');
    expect(video?.provider).toBe('youtube');
    expect(video?.orientation).toBe('vertical');
    expect(video?.aspectRatio).toBe('9 / 16');
  });

  it('converts vimeo links to horizontal embeds', () => {
    expect(getVimeoId('https://vimeo.com/123456789')).toBe('123456789');
    expect(toVimeoEmbed('https://player.vimeo.com/video/987654321')).toBe('https://player.vimeo.com/video/987654321?dnt=1');
    const video = resolveVideoEmbed('https://vimeo.com/123456789');
    expect(video?.provider).toBe('vimeo');
    expect(video?.orientation).toBe('horizontal');
  });

  it('converts instagram posts and reels to vertical embeds', () => {
    const reel = resolveVideoEmbed('https://www.instagram.com/reel/ABC123/');
    const post = resolveVideoEmbed('https://www.instagram.com/p/XYZ789/');
    expect(reel?.embedUrl).toBe('https://www.instagram.com/reel/ABC123/embed/');
    expect(post?.embedUrl).toBe('https://www.instagram.com/p/XYZ789/embed/');
    expect(reel?.orientation).toBe('vertical');
    expect(post?.orientation).toBe('vertical');
  });

  it('uses native playback for direct videos and detects vertical hints', () => {
    const horizontal = resolveVideoEmbed('https://cdn.example.com/video.mp4');
    const vertical = resolveVideoEmbed('https://cdn.example.com/reel-portrait.mp4');
    expect(horizontal?.isNative).toBe(true);
    expect(horizontal?.orientation).toBe('horizontal');
    expect(vertical?.orientation).toBe('vertical');
  });

  it('cleans and limits sample videos', () => {
    expect(normalizeSampleVideos([' one ', '', null, 'two', 'three', 'four'])).toEqual(['one', 'two', 'three']);
  });
});
