/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Dev builds only: the window title naming the dev slot and branch */
  readonly TASKDN_DEV_TITLE?: string
}
