import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { isAuthenticated, getAuthUrl, logout } from '../services/auth';

const AuthButton: React.FC = () => {
  const authenticated = isAuthenticated();

  const handleAuth = () => {
    if (authenticated) {
      logout();
    } else {
      const authUrl = getAuthUrl();
      console.log('Redirigiendo a URL de autenticación:', authUrl);
      window.location.href = authUrl;
    }
  };

  return (
    <button
      onClick={handleAuth}
      className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
    >
      {authenticated ? (
        <>
          <LogOut size={18} className="mr-2" />
          <span>Cerrar sesión</span>
        </>
      ) : (
        <>
          <LogIn size={18} className="mr-2" />
          <span>Iniciar sesión</span>
        </>
      )}
    </button>
  );
};

export default AuthButton;