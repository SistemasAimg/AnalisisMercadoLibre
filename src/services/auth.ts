import axios from 'axios';
import Cookies from 'js-cookie';

// Constantes para la autenticación
const CLIENT_ID = import.meta.env.VITE_ML_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_ML_REDIRECT_URI || window.location.origin + '/auth/callback';
const API_BASE_URL = 'https://api.mercadolibre.com';

// Nombres de las cookies
const ACCESS_TOKEN_COOKIE = 'ml_access_token';
const REFRESH_TOKEN_COOKIE = 'ml_refresh_token';
const TOKEN_EXPIRY_COOKIE = 'ml_token_expiry';
const USER_ID_COOKIE = 'ml_user_id';

// Interfaz para el token
export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  user_id?: number;
}

/**
 * Obtiene la URL de autorización para iniciar el flujo OAuth
 */
export const getAuthUrl = (): string => {
  // Asegurarse de que CLIENT_ID no esté vacío
  if (!CLIENT_ID) {
    console.error('CLIENT_ID no está definido');
  }
  
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
};

/**
 * Intercambia el código de autorización por un token de acceso
 */
export const exchangeCodeForToken = async (code: string): Promise<AuthToken> => {
  try {
    const response = await axios.post('/api/auth/token', { code });
    const token = response.data;
    saveToken(token);
    return token;
  } catch (error) {
    console.error('Error al obtener el token:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('Detalles del error:', error.response.data);
      throw new Error(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
};

/**
 * Refresca el token de acceso usando el refresh token
 */
export const refreshAccessToken = async (): Promise<AuthToken | null> => {
  const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE);
  
  if (!refreshToken) {
    console.log('No hay refresh token disponible');
    return null;
  }

  try {
    const response = await axios.post('/api/auth/refresh', {
      refresh_token: refreshToken
    });

    const token = response.data;
    saveToken(token);
    return token;
  } catch (error) {
    console.error('Error al refrescar el token:', error);
    clearToken();
    return null;
  }
};

/**
 * Guarda el token en cookies
 */
export const saveToken = (token: AuthToken): void => {
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + token.expires_in);

  Cookies.set(ACCESS_TOKEN_COOKIE, token.access_token, {
    expires: expiryDate,
    secure: true,
    sameSite: 'strict'
  });

  Cookies.set(REFRESH_TOKEN_COOKIE, token.refresh_token, {
    expires: 30, // 30 días
    secure: true,
    sameSite: 'strict'
  });

  Cookies.set(TOKEN_EXPIRY_COOKIE, expiryDate.toISOString(), {
    expires: expiryDate,
    secure: true,
    sameSite: 'strict'
  });

  if (token.user_id) {
    Cookies.set(USER_ID_COOKIE, token.user_id.toString(), {
      expires: 30, // 30 días
      secure: true,
      sameSite: 'strict'
    });
  }
};

/**
 * Limpia los tokens almacenados
 */
export const clearToken = (): void => {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  Cookies.remove(REFRESH_TOKEN_COOKIE);
  Cookies.remove(TOKEN_EXPIRY_COOKIE);
  Cookies.remove(USER_ID_COOKIE);
};

/**
 * Verifica si el token ha expirado
 */
export const isTokenExpired = (): boolean => {
  const expiryStr = Cookies.get(TOKEN_EXPIRY_COOKIE);
  if (!expiryStr) return true;
  
  const expiry = new Date(expiryStr);
  const now = new Date();
  return now > expiry;
};

/**
 * Obtiene el token de acceso actual, refrescándolo si es necesario
 */
export const getAccessToken = async (): Promise<string | null> => {
  const accessToken = Cookies.get(ACCESS_TOKEN_COOKIE);
  const tokenExpiry = Cookies.get(TOKEN_EXPIRY_COOKIE);
  const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE);

  if (!accessToken) {
    return null;
  }

  // Si el token está expirado y tenemos refresh token, intentamos refrescarlo
  if (tokenExpiry && new Date(tokenExpiry) <= new Date() && refreshToken) {
    try {
      const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
      const newToken = response.data;
      saveToken(newToken);
      return newToken.access_token;
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      // Si falla el refresh, limpiamos las cookies
      Cookies.remove(ACCESS_TOKEN_COOKIE);
      Cookies.remove(REFRESH_TOKEN_COOKIE);
      Cookies.remove(TOKEN_EXPIRY_COOKIE);
      Cookies.remove(USER_ID_COOKIE);
      return null;
    }
  }

  return accessToken;
};

/**
 * Obtiene el ID del usuario autenticado
 */
export const getUserId = (): string | null => {
  return Cookies.get(USER_ID_COOKIE) || null;
};

/**
 * Verifica si el usuario está autenticado
 */
export const isAuthenticated = (): boolean => {
  const hasToken = !!Cookies.get(ACCESS_TOKEN_COOKIE);
  return hasToken;
};

/**
 * Cierra la sesión del usuario
 */
export const logout = (): void => {
  clearToken();
  window.location.href = '/';
};