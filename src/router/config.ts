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

  if (!providerId) {
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

  if (!providerId) {
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
    newConfig.config = JSON.stringify(config);

    const dbConfig = await getRepository(Config).save(newConfig);
    return res.send({ id: dbConfig.id, ...JSON.parse(dbConfig.config) });
  }

  await getRepository(Config).update(existingConfig.id, {
    config: JSON.stringify(config),
  });

  return res.status(200).send({ id: existingConfig.id, ...config });
});

export default configRouter;
