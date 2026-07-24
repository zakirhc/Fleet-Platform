const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

/**
 * Production deployments should set CORS_ORIGINS to a comma-separated list
 * of public frontend origins. An empty list is intentional: same-origin Nginx
 * requests do not need CORS and must not grant cross-origin access.
 */
export const corsOrigins = (() => {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured?.length) return configured;
  return process.env.NODE_ENV === 'production' ? [] : developmentOrigins;
})();
