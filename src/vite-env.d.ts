/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CODEX_API_KEY: string;
  readonly VITE_HELIUS_RPC_URL: string;
  readonly VITE_SOLANA_PRIVATE_KEY: string;
  readonly VITE_JUPITER_REFERRAL_ACCOUNT?: string;
  readonly VITE_JITO_BLOCK_ENGINE_URL?: string;
  readonly VITE_JITO_TIP_ACCOUNT?: string;
  readonly VITE_JITO_TIP_LAMPORTS?: string;
  readonly VITE_DRY_RUN?: 'true' | 'false' | '';
  readonly VITE_DRY_RUN_RESULT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
