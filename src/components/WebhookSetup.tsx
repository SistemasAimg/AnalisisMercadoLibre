import React, { useState } from 'react';
import { setupWebhooks } from '../services/webhooks';
import { isAuthenticated } from '../services/auth';
import { AlertCircle, CheckCircle, Settings } from 'lucide-react';

interface WebhookSetupProps {
  applicationId: string;
}

const WebhookSetup: React.FC<WebhookSetupProps> = ({ applicationId }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Determinar la URL de callback basada en el entorno
  const callbackUrl = window.location.origin;
  
  const handleSetupWebhooks = async () => {
    if (!isAuthenticated()) {
      setStatus('error');
      setError('Debes iniciar sesión para configurar los webhooks');
      return;
    }
    
    setStatus('loading');
    
    try {
      const success = await setupWebhooks(applicationId, callbackUrl);
      
      if (success) {
        setStatus('success');
      } else {
        setStatus('error');
        setError('No se pudieron configurar los webhooks');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <Settings size={24} className="text-blue-600 mr-2" />
        <h2 className="text-xl font-medium text-gray-800">Configuración de Webhooks</h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Configura los webhooks para recibir notificaciones en tiempo real de MercadoLibre.
        Esto permitirá a la aplicación recibir actualizaciones sobre órdenes, preguntas y cambios en tus publicaciones.
      </p>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-blue-700">
          <strong>URL de Callback:</strong> {callbackUrl}/api/webhooks/mercadolibre
        </p>
      </div>
      
      {status === 'success' && (
        <div className="bg-green-50 p-4 rounded-lg mb-6 flex items-start">
          <CheckCircle size={20} className="text-green-500 mr-2 mt-0.5" />
          <div>
            <p className="text-green-700 font-medium">Webhooks configurados correctamente</p>
            <p className="text-green-600 mt-1">
              La aplicación ahora recibirá notificaciones en tiempo real de MercadoLibre.
            </p>
          </div>
        </div>
      )}
      
      {status === 'error' && (
        <div className="bg-red-50 p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle size={20} className="text-red-500 mr-2 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error al configurar webhooks</p>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      <button
        onClick={handleSetupWebhooks}
        disabled={status === 'loading'}
        className={`px-4 py-2 rounded-lg ${
          status === 'loading'
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } transition-colors`}
      >
        {status === 'loading' ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Configurando...
          </span>
        ) : (
          'Configurar Webhooks'
        )}
      </button>
    </div>
  );
};

export default WebhookSetup;