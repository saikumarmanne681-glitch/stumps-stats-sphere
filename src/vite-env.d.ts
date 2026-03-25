/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APPS_SCRIPT_URL_DEV?: string;
  readonly VITE_APPS_SCRIPT_URL_QA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
