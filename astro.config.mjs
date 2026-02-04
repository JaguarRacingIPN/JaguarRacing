import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server', //Para usas APIS dinamicas 
  adapter: vercel(),

  // Enable prefetching for faster navigation
  prefetch: {
    prefetchAll: false,          // Only prefetch links with data-astro-prefetch
    defaultStrategy: 'viewport'  // Prefetch when links enter viewport
  },

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },

  // --- CORRECCIÓN PARA WINDOWS / VITE ---
  // Esto le da permiso a Vite para servir las fuentes desde node_modules
  // y elimina los errores rojos de "outside of Vite serving allow list".
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});