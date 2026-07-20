/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

interface ImportMetaEnv {
  readonly VITE_OKAPI_URL: string
  readonly VITE_TENANT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
