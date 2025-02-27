import { Request, Response } from 'express';
import { processNotification, MLNotification } from '../services/webhooks';

/**
 * Controlador para el endpoint de webhooks de MercadoLibre
 */
export const handleMercadoLibreWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Webhook recibido:', req.body);
    
    // Validar que la solicitud tenga el formato esperado
    if (!req.body || !req.body.resource) {
      console.error('Formato de webhook inválido');
      return res.status(400).json({ error: 'Formato de webhook inválido' });
    }
    
    // Procesar la notificación
    const notification: MLNotification = {
      resource: req.body.resource,
      user_id: req.body.user_id,
      topic: req.body.topic,
      application_id: req.body.application_id,
      attempts: req.body.attempts,
      sent: req.body.sent,
      received: new Date().toISOString()
    };
    
    // Procesar la notificación de forma asíncrona
    // Respondemos inmediatamente para evitar timeouts
    processNotification(notification).catch(err => {
      console.error('Error al procesar notificación:', err);
    });
    
    // Responder con éxito
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error en webhook handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};