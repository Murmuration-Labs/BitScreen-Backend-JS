import { pino } from 'pino';

export const logger = pino({
  name: 'bitscreen-api',
  level: process.env.LOG_LEVEL || 'info',
});
