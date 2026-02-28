import { z } from 'zod';
import { devLog } from '@/lib/dev-log';

const EnvSchema = z.object({
  VITE_CODEX_API_KEY: z.string().min(1, 'VITE_CODEX_API_KEY is required'),
  VITE_HELIUS_RPC_URL: z
    .string()
    .url('VITE_HELIUS_RPC_URL must be a valid URL'),
  VITE_SOLANA_PRIVATE_KEY: z
    .string()
    .min(1, 'VITE_SOLANA_PRIVATE_KEY is required'),
  VITE_JUPITER_REFERRAL_ACCOUNT: z.string().optional(),
  VITE_JITO_BLOCK_ENGINE_URL: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  VITE_JITO_TIP_ACCOUNT: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  VITE_JITO_TIP_LAMPORTS: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .transform((v) => {
      if (v == null) return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
  VITE_DRY_RUN: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  VITE_DRY_RUN_RESULT: z
    .string()
    .optional()
    .transform((v) =>
      v === 'fail' || v === 'failure' ? ('fail' as const) : ('success' as const)
    ),
});

export type Env = z.infer<typeof EnvSchema>;
export { EnvSchema };

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  devLog.error(
    '[env] Invalid environment configuration:',
    parsed.error.flatten().fieldErrors
  );
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
