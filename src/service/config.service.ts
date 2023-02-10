import { Config, ConfigSettings } from '../entity/Settings';
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

export const updateConfig = async (
  configChanges: Partial<ConfigSettings>,
  providerId: number
) => {
  const config = await getConfigByProviderId(providerId);
  config.config = {
    ...JSON.parse(config.config),
    configChanges,
  };

  return getRepository(Config).save(config);
};
