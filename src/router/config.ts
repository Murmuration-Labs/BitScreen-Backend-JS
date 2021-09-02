import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Config } from '../entity/Settings';
import { Provider } from '../entity/Provider';

const configRouter = express.Router();

configRouter.get('/:providerId', async (req: Request, res: Response) => {
  const {
    params: { providerId },
  } = req;

  // checks for both null and undefined
  if (typeof providerId == null) {
    return res.status(400).send({ message: 'Please provide a providerId.' });
  }

  const provider = await getRepository(Provider).findOne(providerId);
  if (!provider) {
    return res.status(404).send({});
  }

  const config = await getRepository(Config).findOne({
    where: {
      provider,
    },
  });

  if (!config) {
    return res.status(404).send({});
  }

  return res.send({ id: config.id, ...JSON.parse(config.config) });
});

configRouter.put('/', async (req: Request, res: Response) => {
  const {
    body: { providerId, ...config },
  } = req;

  // checks for both null and undefined
  if (typeof providerId == null) {
    return res.status(400).send({ message: 'Please provide a providerId.' });
  }

  const provider = await getRepository(Provider).findOne(providerId);
  if (!provider) {
    return res.status(404).send({});
  }

  if (!config) {
    return res.status(400).end({ message: 'Empty config now allowed.' });
  }

  const existingConfig = await getRepository(Config).findOne({
    where: {
      provider,
    },
  });

  if (!existingConfig) {
    const newConfig = new Config();
    newConfig.provider = provider;
    newConfig.config = JSON.stringify(DEFAULT_CONFIG);

    const dbConfig = await getRepository(Config).save(newConfig);
    return res.send({ id: dbConfig.id, ...JSON.parse(dbConfig.config) });
  }

  await getRepository(Config).update(existingConfig.id, {
    config: JSON.stringify(config),
  });

  return res.status(200).send({ id: existingConfig.id, ...config });
});

const DEFAULT_CONFIG = {
  bitscreen: false,
  import: false,
  share: false,
};

export default configRouter;
