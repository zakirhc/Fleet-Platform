import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).optional(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
  BOOTSTRAP_ADMIN_SECRET: Joi.string().optional(),
  WHATSAPP_TOKEN_ENCRYPTION_KEY: Joi.string().optional(),
  WHATSAPP_GRAPH_API_VERSION: Joi.string().optional(),
  TRACCAR_API_URL: Joi.string().uri().optional(),
  TRACCAR_API_USER: Joi.string().optional(),
  TRACCAR_API_PASSWORD: Joi.string().optional(),

  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
});
