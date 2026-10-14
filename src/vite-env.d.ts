/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Hosted download service URL (e.g. https://savetok-api.onrender.com). Empty in dev. */
  readonly VITE_DOWNLOAD_API_URL?: string;
}
