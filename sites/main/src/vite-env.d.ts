/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_KEY_TARGET?: 'local' | 'prod';
  readonly VITE_TRANSACTION_EMAIL_API_KEY?: string;
  readonly VITE_TRANSACTION_EMAIL_API_KEY_LOCAL?: string;
  readonly VITE_TRANSACTION_EMAIL_API_KEY_PROD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
