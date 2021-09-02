import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Filter } from '../entity/Filter';
import { Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';
import { verifyAccessToken } from '../service/jwt';

const providerFilterRouter = express.Router();

providerFilterRouter.post(
  '/',
  verifyAccessToken,
  async (request: Request, response: Response) => {
    const data = request.body;
    // checks for both null and undefined
    if (typeof data.providerId == null) {
      return response
        .status(400)
        .send({ message: 'Please provide a providerId.' });
    }
    // checks for both null and undefined
    if (typeof data.filterId == null) {
      return response
        .status(400)
        .send({ message: 'Please provide a filterId.' });
    }

    const providerEntity = await getRepository(Provider).findOne(
      data.providerId
    );

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
  }
);

providerFilterRouter.put(
  '/:providerId/:filterId',
  verifyAccessToken,
  async (request, response) => {
    const {
      body: { created, updated, ...updatedProviderFilter },
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

    const filter = await getRepository(Filter).findOne(filterId, {
      relations: [
        'provider',
        'provider_Filters',
        'provider_Filters.provider',
        'provider_Filters.filter',
      ],
    });
    if (!filter) {
      return response.status(404).send({});
    }

    const target = filter.provider_Filters.filter(
      (pf) =>
        pf.filter.id === filter.id && pf.provider.id === parseInt(providerId)
    )[0];

    if (!target) {
      return response.status(404).send({});
    }

    const isOrphan = !filter.provider_Filters.some(
      (pf) => pf.provider.id === filter.provider.id
    );

    target.active = isOrphan ? false : updatedProviderFilter.active;
    target.notes = updatedProviderFilter.notes;

    await getRepository(Provider_Filter)
      .update(target.id, target)
      .catch((err) => response.status(500).send(err));

    response.send(await getRepository(Provider_Filter).findOne(target.id));
  }
);

providerFilterRouter.put(
  '/:filterId/shared/enabled',
  verifyAccessToken,
  async (request, response) => {
    const {
      body: { providerId, enabled },
      params: { filterId },
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

    const filter = await getRepository(Filter).findOne(filterId, {
      relations: ['provider'],
    });
    if (!filter) {
      return response.status(404).send({});
    }

    if (provider.id !== filter.provider.id) {
      return response.status(403).send({
        message:
          'Only the creator of the filter can change the enablement for all the subscribers.',
      });
    }

    await getRepository(Filter)
      .update(filter.id, { ...filter, enabled })
      .catch((err) => response.status(500).send(err));

    const allProviderFilters = await getRepository(Provider_Filter).find({
      where: {
        filter,
      },
    });

    allProviderFilters.forEach(async (providerFilter) => {
      await getRepository(Provider_Filter)
        .update(providerFilter.id, { ...providerFilter, active: enabled })
        .catch((err) => response.status(500).send(err));
    });

    response.send(await getRepository(Filter).findOne(filter.id));
  }
);

providerFilterRouter.delete(
  '/:providerId/:filterId',
  verifyAccessToken,
  async (request: Request, response: Response) => {
    const {
      params: { providerId, filterId },
    } = request;

    // checks for both null and undefined
    if (!providerId) {
      return response
        .status(400)
        .send({ message: 'Please provide a providerId.' });
    }
    // checks for both null and undefined
    if (!filterId) {
      return response
        .status(400)
        .send({ message: 'Please provide a filterId.' });
    }

    const provider = await getRepository(Provider).findOne(providerId);
    if (!provider) {
      return response.status(404).send({});
    }

    const filter = await getRepository(Filter).findOne(filterId, {
      relations: ['provider'],
    });
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

    if (parseInt(providerId) === filter.provider.id) {
      const updated = (
        await getRepository(Provider_Filter).find({
          filter: {
            id: filter.id,
          },
        })
      ).map((e) => ({ ...e, active: false }));

      console.log(updated);

      await Promise.all(
        updated.map((e) =>
          getRepository(Provider_Filter).update(e.id, { ...e })
        )
      );

      await getRepository(Filter).update(filter.id, {
        ...filter,
        enabled: false,
      });
    }

    await getRepository(Provider_Filter).delete(id);

    return response.send({});
  }
);

export default providerFilterRouter;
