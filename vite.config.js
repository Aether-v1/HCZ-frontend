import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  build: {
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/views/HomeView.vue')) return 'tab-home-view'
          if (id.includes('/src/views/OrdersView.vue')) return 'tab-orders-view'
          if (id.includes('/src/views/ProfileView.vue')) return 'tab-profile-view'
          return undefined
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    allowedHosts: ['your-frontend-domain.com', 'dev.your-domain.com'],
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/tp8api': {
        target: 'https://127.0.0.1',
        changeOrigin: true,
        secure: false,
        headers: {
          Host: 'api.your-domain.com'
        },
        rewrite: (path) => path.replace(/^\/tp8api/, '')
      }
    }
  }
})
