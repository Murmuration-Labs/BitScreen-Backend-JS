import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Provider } from '../entity/Provider';
import { Filter } from '../entity/Filter';
import { Provider_Filter } from '../entity/Provider_Filter';
import { getActiveProvider } from '../service/provider.service';

export const create_provider_filter = async (
  request: Request,
  response: Response
) => {
  const data = request.body;
  const { identificationKey, identificationValue } = request.body;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({
      message: 'Provider not found!',
    });
  }

  if (!data.filterId) {
    return response.status(400).send({ message: 'Please provide a filterId.' });
  }

  const filterEntity = await getRepository(Filter).findOne(data.filterId);

  if (!filterEntity) {
    return response.status(404).send({});
  }

  const providerFilter = new Provider_Filter();
  providerFilter.provider = provider;
  providerFilter.filter = filterEntity;
  providerFilter.active = data.active;
  providerFilter.notes = data.notes;

  await getRepository(Provider_Filter).save(providerFilter);

  response.send(providerFilter);
};

export const update_provider_filter = async (request, response) => {
  const {
    body: {
      identificationKey,
      identificationValue,
      loginType,
      created,
      updated,
      ...updatedProviderFilter
    },
    params: { filterId },
  } = request;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({
      message: 'Provider not found!',
    });
  }

  if (!filterId) {
    return response.status(400).send({ message: 'Please provide a filterId.' });
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
    (pf) => pf.filter.id === filter.id && pf.provider.id === provider.id
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
};

export const change_provider_filters_status = async (request, response) => {
  const {
    body: { identificationKey, identificationValue, enabled },
    params: { filterId },
  } = request;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({
      message: 'Provider not found!',
    });
  }

  switch (true) {
    case !filterId:
      return response
        .status(400)
        .send({ message: 'Please provide a filterId.' });
  }

  const filter = await getRepository(Filter).findOne(filterId, {
    relations: ['provider'],
  });
  if (!filter) {
    return response.status(404).send({ message: 'Filter not found' });
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
};

export const delete_provider_filter = async (
  request: Request,
  response: Response
) => {
  const {
    params: { filterId },
    body: { identificationKey, identificationValue },
  } = request;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({
      message: 'Provider not found!',
    });
  }

  const providerId = provider.id;

  if (!filterId) {
    return response.status(400).send({ message: 'Please provide a filterId.' });
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

  if (providerId === filter.provider.id) {
    const updated = (
      await getRepository(Provider_Filter).find({
        filter: {
          id: filter.id,
        },
      })
    ).map((e) => ({ ...e, active: false }));

    await Promise.all(
      updated.map((e) => getRepository(Provider_Filter).update(e.id, { ...e }))
    );

    await getRepository(Filter).update(filter.id, {
      ...filter,
      enabled: false,
    });
  }

  await getRepository(Provider_Filter).delete(id);

  return response.send({});
};
