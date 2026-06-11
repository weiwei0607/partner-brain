import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react')) return 'react'
          if (id.includes('dexie')) return 'db'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
