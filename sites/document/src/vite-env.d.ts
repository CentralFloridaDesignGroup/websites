/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly DEV: boolean;
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_API_KEY_TARGET?: 'local' | 'prod';
	readonly VITE_MSAL_CLIENT_ID?: string;
	readonly VITE_MSAL_TENANT_ID?: string;
	readonly VITE_MSAL_REDIRECT_URI?: string;
	readonly VITE_COMMENTS_API_KEY?: string;
	readonly VITE_COMMENTS_API_KEY_LOCAL?: string;
	readonly VITE_COMMENTS_API_KEY_PROD?: string;
	readonly VITE_GIS_API_KEY?: string;
	readonly VITE_GIS_API_KEY_LOCAL?: string;
	readonly VITE_GIS_API_KEY_PROD?: string;
	readonly VITE_API_AUTH_SCOPES?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
