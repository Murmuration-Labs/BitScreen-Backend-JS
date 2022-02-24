import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import { Application } from 'express';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import cidRouter from './router/cid';
import configRouter from './router/config';
import filterRouter from './router/filter';
import providerRouter from './router/provider';
import providerFilterRouter from './router/provider_filter';
import dealRouter from './router/deal';
import complaintRouter from "./router/complaint";
import * as expressPinoLogger from "express-pino-logger";
import { logger } from "./service/logger";
import ipfsRouter from "./router/ipfs";

const PORT = process.env.PORT || 3030;

createConnection()
  .then(async (connection) => {
    logger.info('Successfully initialized DB connection');
  })
  .catch((error) => logger.error(error));

const play = async () => {
  const app: Application = express();

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.raw());
  app.use(bodyParser.text());
  app.use(expressPinoLogger({logger}));

  app.get('/ping', (req, res) => res.send('pong'));

  app.use('/provider', providerRouter);
  app.use('/provider-filter', providerFilterRouter);
  app.use('/config', configRouter);
  app.use('/filter', filterRouter);
  app.use('/cid', cidRouter);
  app.use('/deals', dealRouter);
  app.use('/complaints', complaintRouter);
  app.use('/ipfs', ipfsRouter);

  app.listen(PORT, () => {
    logger.info(`Successfully started Express server on port ${PORT}`);
  });
};

(async () => {
  await play();
})();
