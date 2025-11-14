import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', "robots.txt"],
      manifest: {
        name: 'FinEdu Kids',
        short_name: 'FinEdu',
        description: 'Educação financeira gamificada para jovens e crianças.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFD1D9', 
        theme_color: '#FFD1D9',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] }
    })
  ],
  // server: { port: 5173 }
})
