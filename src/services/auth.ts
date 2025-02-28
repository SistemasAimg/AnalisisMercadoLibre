import axios from 'axios';
import Cookies from 'js-cookie';

// Constantes para la autenticación
const CLIENT_ID = import.meta.env.VITE_ML_CLIENT_ID || '7074402608653029';
const CLIENT_SECRET = import.meta.env.VITE_ML_CLIENT_SECRET || 'dRtfnoEZN47gvvDUassK1GdKBhUhteVP';
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
  
  console.log('Generando URL de autenticación con CLIENT_ID:', CLIENT_ID);
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
};

/**
 * Intercambia el código de autorización por un token de acceso
 */
export const exchangeCodeForToken = async (code: string): Promise<AuthToken> => {
  try {
    console.log('Intercambiando código por token...');
    console.log('Redirect URI:', REDIRECT_URI);
    console.log('Client ID:', CLIENT_ID);
    
    const response = await axios.post(`${API_BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    console.log('Respuesta de token recibida:', response.status);
    
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
    console.log('Refrescando token...');
    
    const response = await axios.post(`${API_BASE_URL}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
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
  const expiryDate = new Date(new Date().getTime() + token.expires_in * 1000);
  
  Cookies.set(ACCESS_TOKEN_COOKIE, token.access_token, { expires: 1 }); // 1 día
  Cookies.set(REFRESH_TOKEN_COOKIE, token.refresh_token, { expires: 60 }); // 60 días
  Cookies.set(TOKEN_EXPIRY_COOKIE, expiryDate.toISOString(), { expires: 1 });
  
  if (token.user_id) {
    Cookies.set(USER_ID_COOKIE, token.user_id.toString(), { expires: 60 });
  }
  
  console.log('Token guardado correctamente. Expira:', expiryDate);
};

/**
 * Limpia los tokens almacenados
 */
export const clearToken = (): void => {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  Cookies.remove(REFRESH_TOKEN_COOKIE);
  Cookies.remove(TOKEN_EXPIRY_COOKIE);
  Cookies.remove(USER_ID_COOKIE);
  console.log('Tokens eliminados');
};

/**
 * Verifica si el token ha expirado
 */
export const isTokenExpired = (): boolean => {
  const expiryStr = Cookies.get(TOKEN_EXPIRY_COOKIE);
  if (!expiryStr) return true;
  
  const expiry = new Date(expiryStr);
  const now = new Date();
  const isExpired = now > expiry;
  
  if (isExpired) {
    console.log('Token expirado');
  }
  
  return isExpired;
};

/**
 * Obtiene el token de acceso actual, refrescándolo si es necesario
 */
export const getAccessToken = async (): Promise<string | null> => {
  let token = Cookies.get(ACCESS_TOKEN_COOKIE);
  
  if (!token || isTokenExpired()) {
    console.log('Token no disponible o expirado, intentando refrescar...');
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken.access_token;
      console.log('Token refrescado correctamente');
    } else {
      console.log('No se pudo refrescar el token');
      return null;
    }
  }
  
  return token;
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