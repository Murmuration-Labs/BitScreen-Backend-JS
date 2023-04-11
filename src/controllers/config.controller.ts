import { Request, Response } from 'express';
import { getActiveProvider } from '../service/provider.service';
import { getRepository } from 'typeorm';
import { Config } from '../entity/Settings';
import {
  addSaferSubToProvider,
  isProviderSubbedToSafer,
  removeSaferSubFromProvider,
} from '../service/filter.service';

export const get_config = async (req: Request, res: Response) => {
  const {
    body: { identificationKey, identificationValue },
  } = req;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return res.status(404).send({
      message: 'Provider not found!',
    });
  }

  const existingConfig = await getRepository(Config).findOne({
    where: {
      provider,
    },
  });

  if (!existingConfig) {
    const newConfig = new Config();
    newConfig.provider = provider;
    newConfig.config = JSON.stringify({
      bitscreen: false,
      import: false,
      share: false,
    });

    const dbConfig = await getRepository(Config).save(newConfig);
    return res.send({
      safer: false,
      ...JSON.parse(dbConfig.config),
    });
  }

  const safer = await isProviderSubbedToSafer(provider.id);

  return res.status(200).send({
    safer,
    ...JSON.parse(existingConfig.config),
  });
};

export const save_config = async (req: Request, res: Response) => {
  const {
    body: { identificationKey, identificationValue, ...config },
  } = req;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return res.status(404).send({
      message: 'Provider not found!',
    });
  }

  if (Object.keys(config).length === 0) {
    return res.status(400).send({ message: 'Empty config not allowed.' });
  }

  const safer: boolean = config?.safer;
  delete config?.safer;

  const existingConfig = await getRepository(Config).findOne({
    where: {
      provider,
    },
  });

  if (!existingConfig) {
    const newConfig = new Config();
    newConfig.provider = provider;
    newConfig.config = JSON.stringify(config);

    const dbConfig = await getRepository(Config).save(newConfig);
    return res.send({ ...JSON.parse(dbConfig.config) });
  }

  await getRepository(Config).update(existingConfig.id, {
    config: JSON.stringify(config),
  });

  if (safer === false) {
    await removeSaferSubFromProvider(provider.id);
  } else if (safer === true) {
    await addSaferSubToProvider(provider.id);
  }
  return res.status(200).send({ ...config });
};
