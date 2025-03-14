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

### Configuración de MercadoLibre (para desarrollo local)

Para el desarrollo local y pruebas, necesitarás configurar las credenciales de MercadoLibre:

1. Crea un archivo `.env` basado en `.env.example` con tus credenciales:
   ```
   VITE_ML_CLIENT_ID=your_client_id_here
   VITE_ML_CLIENT_SECRET=your_client_secret_here
   VITE_ML_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

2. Estas variables son necesarias para la autenticación con MercadoLibre, pero no son requeridas para el despliegue en Cloud Run.

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producciónasdfgh
npm run build
```