import React, { useState, useEffect } from 'react';
import { getNotifications, MLNotification } from '../services/webhooks';
import { Bell } from 'lucide-react';

const NotificationsList: React.FC = () => {
  const [notifications, setNotifications] = useState<MLNotification[]>([]);
  
  // Actualizar notificaciones cada 30 segundos
  useEffect(() => {
    const fetchNotifications = () => {
      const currentNotifications = getNotifications();
      setNotifications(currentNotifications);
    };
    
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Obtener etiqueta para el tipo de notificación
  const getTopicLabel = (topic: string) => {
    switch (topic) {
      case 'orders':
        return 'Orden';
      case 'questions':
        return 'Pregunta';
      case 'items':
        return 'Producto';
      default:
        return topic;
    }
  };
  
  // Obtener color para el tipo de notificación
  const getTopicColor = (topic: string) => {
    switch (topic) {
      case 'orders':
        return 'bg-green-100 text-green-800';
      case 'questions':
        return 'bg-blue-100 text-blue-800';
      case 'items':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Bell size={24} className="text-blue-600 mr-2" />
        <h2 className="text-xl font-medium text-gray-800">Notificaciones recientes</h2>
      </div>
      
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay notificaciones recientes</p>
          <p className="text-gray-400 text-sm mt-2">
            Las notificaciones aparecerán aquí cuando MercadoLibre envíe actualizaciones
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification, index) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTopicColor(notification.topic)}`}>
                    {getTopicLabel(notification.topic)}
                  </span>
                  <p className="text-gray-800 font-medium mt-2">
                    Recurso: {notification.resource}
                  </p>
                </div>
                <p className="text-gray-500 text-sm">
                  {formatDate(notification.received)}
                </p>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>Usuario: {notification.user_id}</p>
                <p>Intentos: {notification.attempts}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsList;