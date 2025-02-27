import axios from 'axios';
import { getAccessToken } from './auth';

// Interfaz para las notificaciones de MercadoLibre
export interface MLNotification {
  resource: string;
  user_id: number;
  topic: string;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
}

// Almacén temporal de notificaciones (en una aplicación real, usarías una base de datos)
const notifications: MLNotification[] = [];

/**
 * Procesa una notificación de MercadoLibre
 */
export const processNotification = async (notification: MLNotification): Promise<void> => {
  try {
    console.log('Procesando notificación:', notification);
    
    // Guardar la notificación en el almacén temporal
    notifications.push(notification);
    
    // Obtener detalles del recurso si es necesario
    if (notification.resource && notification.topic) {
      const token = await getAccessToken();
      
      if (!token) {
        console.error('No hay token disponible para procesar la notificación');
        return;
      }
      
      // Obtener detalles del recurso
      const response = await axios.get(`https://api.mercadolibre.com${notification.resource}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log(`Detalles del recurso ${notification.topic}:`, response.data);
      
      // Aquí puedes implementar lógica específica según el tipo de notificación
      switch (notification.topic) {
        case 'orders':
          // Procesar notificación de órdenes
          console.log('Nueva orden recibida:', response.data);
          break;
        case 'questions':
          // Procesar notificación de preguntas
          console.log('Nueva pregunta recibida:', response.data);
          break;
        case 'items':
          // Procesar notificación de items
          console.log('Cambio en item:', response.data);
          break;
        default:
          console.log(`Notificación de tipo ${notification.topic} recibida`);
      }
    }
  } catch (error) {
    console.error('Error al procesar la notificación:', error);
  }
};

/**
 * Obtiene todas las notificaciones almacenadas
 */
export const getNotifications = (): MLNotification[] => {
  return [...notifications];
};

/**
 * Configura las notificaciones en MercadoLibre
 * Esta función debe llamarse después de que el usuario se autentique
 */
export const setupWebhooks = async (applicationId: string, callbackUrl: string): Promise<boolean> => {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      console.error('No hay token disponible para configurar webhooks');
      return false;
    }
    
    // Temas para los que queremos recibir notificaciones
    const topics = ['orders', 'questions', 'items'];
    
    // Configurar cada tema
    for (const topic of topics) {
      const response = await axios.post(
        `https://api.mercadolibre.com/applications/${applicationId}/topics`,
        {
          topic_id: topic,
          callback_url: `${callbackUrl}/api/webhooks/mercadolibre`,
          status: 'active'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Webhook configurado para ${topic}:`, response.data);
    }
    
    return true;
  } catch (error) {
    console.error('Error al configurar webhooks:', error);
    return false;
  }
};