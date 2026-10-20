export const ENV = {
  ADAPTER_MODE: (import.meta.env.VITE_STORAGE_ADAPTER as 'mock' | 'supabase') || 'mock',
  SUPABASE_URL: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  SUPABASE_ANON_KEY: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  IS_PROD: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
} as const;
