import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Config } from '../entity/Settings';

const configRouter = express.Router();

configRouter.get('/', async (req: Request, res: Response) => {
  const config = await getRepository(Config).findOne();

  if (!config) {
    const newConfig = new Config();
    newConfig.config = JSON.stringify(DEFAULT_CONFIG);

    const dbConfig = await getRepository(Config).save(newConfig);
    return res.send({ id: dbConfig.id, ...JSON.parse(dbConfig.config) });
  }

  return res.send({ id: config.id, ...JSON.parse(config.config) });
});

configRouter.put('/', async (req: Request, res: Response) => {
  const {
    body: { id, ...config },
  } = req;

  if (!config) {
    return res.status(400).end({ message: 'Empty config now allowed.' });
  }

  const existingConfig = await getRepository(Config).findOne();

  if (!existingConfig) {
    const newConfig = new Config();
    newConfig.config = JSON.stringify(config);

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
};

export default configRouter;
