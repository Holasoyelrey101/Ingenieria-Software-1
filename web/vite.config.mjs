import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0',
    open: true,
    watch: {
      usePolling: true
    }
  }
})