// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://videomarketingsevilla.com',
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: node({
    mode: 'standalone'
  }),
  security: {
    checkOrigin: false
  }
});

// Force restart to rebuild Tailwind CSS cache
