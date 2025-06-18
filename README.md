# MercadoAnalytics

Herramienta de análisis de mercado para MercadoLibre Argentina. Analiza precios, tendencias y competencia.

## Despliegue en Google Cloud Run

Esta aplicación está configurada para desplegarse automáticamente en Google Cloud Run utilizando GitHub Actions y Workload Identity Federation.

### Requisitos previos

1. Una cuenta de Google Cloud Platform con Cloud Run habilitado
2. Un proyecto de GCP con la API de Cloud Run habilitada
3. Una cuenta de servicio con los permisos necesarios:
   - Cloud Run Admin
   - Storage Admin
   - Service Account User

### Configuración de secretos en GitHub

Para que el flujo de trabajo funcione, debes configurar los siguientes secretos en tu repositorio de GitHub:

- `GCP_PROJECT_ID`: El ID de tu proyecto de Google Cloud
- `GCP_SA_EMAIL`: El email de la cuenta de servicio (ejemplo: `service-account@project-id.iam.gserviceaccount.com`)
- `WIF_PROVIDER`: El ID del proveedor de identidad de Workload Identity Federation

### Configuración de Workload Identity Federation

1. Crea un pool de proveedores de identidad:
   ```
   gcloud iam workload-identity-pools create "github-actions-pool" \
     --project="${PROJECT_ID}" \
     --location="global" \
     --display-name="GitHub Actions Pool"
   ```

2. Crea un proveedor de identidad en el pool:
   ```
   gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
     --project="${PROJECT_ID}" \
     --location="global" \
     --workload-identity-pool="github-actions-pool" \
     --display-name="GitHub Actions Provider" \
     --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
     --issuer-uri="https://token.actions.githubusercontent.com"
   ```

3. Permite que la cuenta de servicio sea impersonada:
   ```
   gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT_EMAIL}" \
     --project="${PROJECT_ID}" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/your-github-username/your-repo-name"
   ```

## Configuración para desarrollo local

### 1. Configuración de Supabase

Para el desarrollo local, necesitarás configurar una base de datos Supabase:

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a Settings > API en tu proyecto de Supabase
4. Copia la URL del proyecto y la clave anónima (anon key)

### 2. Configuración de MercadoLibre

Para el desarrollo local y pruebas, necesitarás configurar las credenciales de MercadoLibre:

1. Ve a [developers.mercadolibre.com.ar](https://developers.mercadolibre.com.ar)
2. Crea una aplicación y obtén tus credenciales

### 3. Variables de entorno

Crea un archivo `.env` basado en `.env.example` con tus credenciales:

```env
# Credenciales de MercadoLibre
VITE_ML_CLIENT_ID=tu_client_id_aqui
VITE_ML_CLIENT_SECRET=tu_client_secret_aqui
VITE_ML_REDIRECT_URI=http://localhost:5173/auth/callback

# Credenciales de Supabase
VITE_SUPABASE_URL=https://tu-proyecto-ref.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**Importante:** 
- Las variables de Supabase son **obligatorias** para que la aplicación funcione
- Las variables de MercadoLibre son necesarias para la autenticación con MercadoLibre
- Para desarrollo local, usa `http://localhost:5173/auth/callback` como redirect URI

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

## Estructura de la base de datos

La aplicación utiliza Supabase como base de datos. Las migraciones se encuentran en la carpeta `supabase/migrations/` y se aplicarán automáticamente cuando configures tu proyecto de Supabase.

### Tablas principales:
- `products`: Información básica de productos
- `daily_product_data`: Datos diarios de productos (precios, ventas, stock)
- `competitor_data`: Datos de productos de la competencia
- `visits_data`: Datos de visitas y tráfico
- `trends_data`: Tendencias y palabras clave
- `sellers`: Información de vendedores

## Solución de problemas

### Error: "Faltan las variables de entorno de Supabase"

Este error indica que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` no están configuradas en tu archivo `.env`. Asegúrate de:

1. Crear un archivo `.env` en la raíz del proyecto
2. Agregar las variables de Supabase con los valores correctos de tu proyecto
3. Reiniciar el servidor de desarrollo después de agregar las variables

### Error de autenticación con MercadoLibre

Si tienes problemas con la autenticación:

1. Verifica que las credenciales de MercadoLibre sean correctas
2. Asegúrate de que la URL de redirección esté configurada correctamente en tu aplicación de MercadoLibre
3. Para desarrollo local, usa `http://localhost:5173/auth/callback`