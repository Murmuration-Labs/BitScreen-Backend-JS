import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Filter } from '../entity/Filter';
import { Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';

const providerFilterRouter = express.Router();

providerFilterRouter.post('/', async (request: Request, response: Response) => {
  const data = request.body;
  // checks for both null and undefined
  if (typeof data.providerId == null) {
    return response
      .status(400)
      .send({ message: 'Please provide a providerId.' });
  }
  // checks for both null and undefined
  if (typeof data.filterId == null) {
    return response.status(400).send({ message: 'Please provide a filterId.' });
  }

  const providerEntity = await getRepository(Provider).findOne(data.providerId);

  if (!providerEntity) {
    return response.status(404).send({});
  }

  const filterEntity = await getRepository(Filter).findOne(data.filterId);

  if (!filterEntity) {
    return response.status(404).send({});
  }

  const providerFilter = new Provider_Filter();
  providerFilter.provider = providerEntity;
  providerFilter.filter = filterEntity;
  providerFilter.active = data.active;
  providerFilter.notes = data.notes;

  await getRepository(Provider_Filter).save(providerFilter);

  response.send(providerFilter);
});

providerFilterRouter.put(
  '/:providerId/:filterId',
  async (request, response) => {
    const {
      body: { created, updated, ...updatedProviderFilter },
      params: { providerId, filterId },
    } = request;

    // checks for both null and undefined
    if (typeof providerId == null) {
      console.log('a intrat aici');
      return response
        .status(400)
        .send({ message: 'Please provide a providerId.' });
    }
    // checks for both null and undefined
    if (typeof filterId == null) {
      console.log('a intrat aicis');
      return response
        .status(400)
        .send({ message: 'Please provide a filterId.' });
    }

    const provider = await getRepository(Provider).findOne(providerId);
    if (!provider) {
      return response.status(404).send({});
    }

    const filter = await getRepository(Filter).findOne(filterId);
    if (!filter) {
      return response.status(404).send({});
    }

    const providerFilter = await getRepository(Provider_Filter).findOne({
      where: {
        provider,
        filter,
      },
    });
    const id = providerFilter.id;

    const newProviderFilter = new Provider_Filter();
    newProviderFilter.provider = provider;
    newProviderFilter.filter = filter;
    newProviderFilter.active = updatedProviderFilter.active;
    if (updatedProviderFilter.notes) {
      newProviderFilter.notes = updatedProviderFilter.notes;
    }

    await getRepository(Provider_Filter)
      .update(id, newProviderFilter)
      .catch((err) => response.status(500).send(err));

    response.send(await getRepository(Provider_Filter).findOne(id));
  }
);

providerFilterRouter.delete(
  '/:providerId/:filterId',
  async (request: Request, response: Response) => {
    const {
      params: { providerId, filterId },
    } = request;

    // checks for both null and undefined
    if (typeof providerId == null) {
      return response
        .status(400)
        .send({ message: 'Please provide a providerId.' });
    }
    // checks for both null and undefined
    if (typeof filterId == null) {
      return response
        .status(400)
        .send({ message: 'Please provide a filterId.' });
    }

    const provider = await getRepository(Provider).findOne(providerId);
    if (!provider) {
      return response.status(404).send({});
    }

    const filter = await getRepository(Filter).findOne(filterId);
    if (!filter) {
      return response.status(404).send({});
    }

    const providerFilter = await getRepository(Provider_Filter).findOne({
      where: {
        provider,
        filter,
      },
    });
    const id = providerFilter.id;

    await getRepository(Provider_Filter).delete(id);

    return response.send({});
  }
);

export default providerFilterRouter;