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

const PORT = process.env.PORT || 3030;

createConnection()
  .then(async (connection) => {
    console.log('Successfully initialized DB connection');
  })
  .catch((error) => console.log(error));

const play = async () => {
  const app: Application = express();

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.raw());
  app.use(bodyParser.text());

  app.get('/ping', (req, res) => res.send('pong'));

  app.use('/provider', providerRouter);
  app.use('/provider-filter', providerFilterRouter);
  app.use('/config', configRouter);
  app.use('/filter', filterRouter);
  app.use('/cid', cidRouter);

  app.listen(PORT, () => {
    console.log(`Successfully started Express server on port ${PORT}`);
  });
};

(async () => {
  await play();
})();
