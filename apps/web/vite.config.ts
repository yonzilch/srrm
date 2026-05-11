import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5174,
  },
  define: {
    'import.meta.env.VITE_API_BASE': JSON.stringify(
      process.env.VITE_API_BASE || 'http://localhost:8787'
    ),
  },
});
