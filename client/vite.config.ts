import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || (id.includes('/react/') && !id.includes('react-syntax') && !id.includes('recharts'))) return 'react-vendor'
          if (id.includes('framer-motion')) return 'framer-motion'
          if (id.includes('recharts') || id.includes('d3-') || id.includes('/d3/') || id.includes('victory-vendor')) return 'recharts'
          if (id.includes('@carbon/icons-react')) {
            const filename = id.split('/').pop()?.replace('.js', '') ?? ''
            const c = filename.charCodeAt(0)
            if (c <= 70) return 'carbon-icons-af'  // A-F
            if (c <= 78) return 'carbon-icons-gn'  // G-N
            return 'carbon-icons-oz'                // O-Z
          }
          if (id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('prismjs')) return 'syntax-highlighter'
          if (id.includes('socket.io') || id.includes('engine.io')) return 'socketio'
          return 'vendor'
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
