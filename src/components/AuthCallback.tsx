import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../services/auth';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;
    
    const handleCallback = async () => {
      try {
        // Obtener el código de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No se recibió el código de autorización');
        }
        
        // Intercambiar el código por un token
        await exchangeCodeForToken(code);
        
        if (isMounted) {
          setStatus('success');
          
          // Iniciar cuenta regresiva para redirección
          let count = 5;
          setCountdown(count);
          
          timer = setInterval(() => {
            count -= 1;
            
            if (isMounted) {
              setCountdown(count);
            }
            
            if (count <= 0) {
              clearInterval(timer);
              navigate('/', { replace: true });
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error en el callback:', err);
        
        if (isMounted) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Error desconocido durante la autenticación');
        }
      }
    };

    handleCallback();
    
    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Loader size={48} className="text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Autenticando...</h2>
            <p className="text-gray-600">
              Estamos procesando tu inicio de sesión con MercadoLibre.
              Por favor, espera un momento.
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">¡Autenticación exitosa!</h2>
            <p className="text-gray-600 mb-4">
              Has iniciado sesión correctamente con tu cuenta de MercadoLibre.
            </p>
            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg mb-4">
              Serás redirigido a la página principal en <span className="font-bold">{countdown}</span> segundos...
            </div>
            <button 
              onClick={() => navigate('/', { replace: true })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir al inicio ahora
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Error de autenticación</h2>
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
              <p className="font-medium">Ocurrió un problema durante la autenticación:</p>
              <p className="mt-1">{error || 'Error desconocido'}</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/', { replace: true })}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Volver al inicio
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;