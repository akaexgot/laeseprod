import { describe, it, expect } from 'vitest';
import { buildProjectScreens, toYouTubeEmbed, getVideoId } from '../display';

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

  it('extracts shorts id and converts to embed', () => {
    const url = 'https://www.youtube.com/shorts/ZYXWVUTSRQP';
    expect(getVideoId(url)).toBe('ZYXWVUTSRQP');
    expect(toYouTubeEmbed(url)).toBe('https://www.youtube.com/embed/ZYXWVUTSRQP?rel=0');
  });

  it('returns null for invalid urls', () => {
    expect(getVideoId('not a url')).toBe(null);
    expect(toYouTubeEmbed('')).toBe(null);
  });
});
