import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind to all local network interfaces so devices on the same Wi-Fi can
    // use the development server through this computer's IPv4 address.
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy uploaded document links (IDs, forms, etc.) to the backend
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
