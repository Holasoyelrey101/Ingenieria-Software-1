// Project-level declarations to allow CSS imports and Vite env types
declare module '*.css'

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_API_URL?: string
  readonly VITE_API_LOGISTICA?: string
  readonly VITE_API_INVENTARIO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
