// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://laeseprod.com',
  output: 'server',

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/environments/RoomEnvironment.js',
        'three/examples/jsm/loaders/GLTFLoader.js',
        'three/examples/jsm/controls/OrbitControls.js',
      ],
    },
  },

  adapter: node({
    mode: 'standalone'
  }),
  security: {
    checkOrigin: false
  }
});

// Force restart to rebuild Tailwind CSS cache
