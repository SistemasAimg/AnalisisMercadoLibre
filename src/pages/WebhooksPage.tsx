import React from 'react';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import WebhookSetup from '../components/WebhookSetup';
import NotificationsList from '../components/NotificationsList';
import { Link } from 'react-router-dom';

const WebhooksPage: React.FC = () => {
  // Aquí deberías obtener el ID de tu aplicación de MercadoLibre
  // desde las variables de entorno o configuración
  const applicationId = import.meta.env.VITE_ML_CLIENT_ID || '';
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/" className="flex items-center text-blue-600 mb-6 hover:text-blue-800">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuración de Notificaciones</h1>
        <p className="text-gray-600">
          Configura y gestiona las notificaciones de MercadoLibre para mantener tu aplicación actualizada en tiempo real.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Settings size={24} className="text-blue-600 mr-2" />
              <h2 className="text-xl font-medium text-gray-800">Guía de Webhooks</h2>
            </div>
            
            <div className="space-y-4 text-gray-600">
              <p>
                Los webhooks permiten a MercadoLibre enviar notificaciones a tu aplicación cuando ocurren eventos.
              </p>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Tipos de notificaciones:</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Órdenes nuevas o actualizadas</li>
                  <li>Preguntas de compradores</li>
                  <li>Cambios en tus publicaciones</li>
                  <li>Mensajes de compradores</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Requisitos:</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Tu aplicación debe estar registrada en MercadoLibre Developers</li>
                  <li>Necesitas permisos adecuados en tu aplicación</li>
                  <li>La URL de callback debe ser accesible públicamente</li>
                </ul>
              </div>
              
              <p>
                <a 
                  href="https://developers.mercadolibre.com.ar/es_ar/notificaciones-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Más información en la documentación oficial →
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <WebhookSetup applicationId={applicationId} />
          <NotificationsList />
        </div>
      </div>
    </div>
  );
};

export default WebhooksPage;