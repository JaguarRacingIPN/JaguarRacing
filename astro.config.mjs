import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://www.jaguarracing.tech', 

  output: 'server', 
  adapter: vercel(),

  prefetch: {
    prefetchAll: false,         
    defaultStrategy: 'viewport' 
  },

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },

  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});