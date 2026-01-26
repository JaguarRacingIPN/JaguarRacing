import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server', //Para usas APIS dinamicas 
  adapter: vercel(),

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