import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Provider } from '../entity/Provider';

const providerRouter = express.Router();

providerRouter.get('/', async (request: Request, response: Response) => {
  const providers = await getRepository(Provider).find();

  response.send(providers);
});

providerRouter.post('/', async (request: Request, response: Response) => {
  const provider = new Provider();

  const {
    body: {
      fileCoinAddress,
      businessName,
      website,
      email,
      contactPerson,
      address,
      country,
    },
  } = request;

  await getRepository(Provider).save(provider);

  response.send(provider);
});

// providerRouter.post('/test_delete_all', async (request: Request, response: Response) => {
//     await getRepository(Cid).delete({});
//     await getRepository(Filter).delete({});
//     await getRepository(Provider).delete({});
//     response.send({});
// });

export default providerRouter;
