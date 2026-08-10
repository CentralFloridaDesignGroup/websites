/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MSAL_CLIENT_ID?: string;
  readonly VITE_MSAL_TENANT_ID?: string;
  readonly VITE_MSAL_REDIRECT_URI?: string;
  readonly VITE_MSAL_SILENT_REDIRECT_URI?: string;
  readonly VITE_API_AUTH_SCOPES?: string;
  readonly VITE_GRAPH_DIRECTORY_SCOPES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
