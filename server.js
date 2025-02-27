import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleMercadoLibreWebhook } from './src/api/webhooks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para parsear JSON
app.use(express.json());

// Endpoint para webhooks de MercadoLibre
app.post('/api/webhooks/mercadolibre', handleMercadoLibreWebhook);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Todas las demás rutas sirven el index.html para el enrutamiento del lado del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});