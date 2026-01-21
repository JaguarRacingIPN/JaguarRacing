import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless'; // O el adaptador que uses

export default defineConfig({
  output: 'server', // IMPORTANTE para usar APIs dinámicas
  adapter: vercel(),
});