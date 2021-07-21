import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Provider } from '../entity/Provider';
import { getAddressHash } from '../service/crypto';

const providerRouter = express.Router();

providerRouter.get('/:wallet', async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;

  if (typeof wallet === 'undefined') {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const provider = await getRepository(Provider).findOne({
    walletAddressHashed: getAddressHash(wallet),
  });

  return response.send(provider);
});

providerRouter.put('/', async (request: Request, response: Response) => {
  const {
    body: { createTs, updateTs, walletAddress, ..._provider },
  } = request;

  if (typeof walletAddress === 'undefined') {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  console.log(_provider);

  const provider = await getRepository(Provider).findOne({
    walletAddressHashed: getAddressHash(walletAddress),
  });

  if (!provider) {
    return response
      .status(404)
      .send({ message: 'Tried to update inexistent provider' });
  }

  const updated = getRepository(Provider).update(
    { id: provider.id },
    {
      ..._provider,
    }
  );

  return response.send(updated);
});

providerRouter.post(
  '/:wallet',
  async (request: Request, response: Response) => {
    const {
      params: { wallet },
    } = request;

    if (!wallet) {
      return response.status(400).send({ message: 'Missing wallet' });
    }

    const walletAddressHashed = getAddressHash(wallet);

    const exists = await getRepository(Provider).findOne({
      where: { walletAddressHashed },
    });

    if (exists) {
      return response.status(400).send({ message: 'Provider already exists' });
    }

    const provider = new Provider();
    provider.walletAddressHashed = walletAddressHashed;

    return response.send(await getRepository(Provider).save(provider));
  }
);

// providerRouter.post('/test_delete_all', async (request: Request, response: Response) => {
//     await getRepository(Cid).delete({});
//     await getRepository(Filter).delete({});
//     await getRepository(Provider).delete({});
//     response.send({});
// });

export default providerRouter;
