import { Config } from '../entity/Settings';
import { getRepository } from 'typeorm';

export const getConfigByProviderId = (
  providerId: number | string
): Promise<Config> => {
  return getRepository(Config).findOne({
    provider: {
      id: typeof providerId === 'string' ? parseInt(providerId) : providerId,
    },
  });
};
