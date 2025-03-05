import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Configuración para manejar rutas en desarrollo
    historyApiFallback: true,
  },
  preview: {
    // Configuración para manejar rutas en preview
    historyApiFallback: true,
  },
  build: {
    // Asegurarse de que los estilos CSS se incluyan en el bundle
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});