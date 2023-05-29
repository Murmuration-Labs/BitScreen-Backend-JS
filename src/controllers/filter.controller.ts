import { Request, Response } from 'express';
import { CID } from 'multiformats/cid';
import { In, getRepository } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Deal } from '../entity/Deal';
import { Filter } from '../entity/Filter';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Config } from '../entity/Settings';
import { Visibility } from '../entity/enums';
import { getExistingCids } from '../service/cid.service';
import { generateRandomToken } from '../service/crypto';
import {
  addFilteringToFilterQuery,
  addPagingToFilterQuery,
  addSortingToFilterQuery,
  adjustNetworksOnIndividualFilter,
  adjustNetworksOnMultipleFilters,
  checkForSameNameFilters,
  getDeclinedDealsCount,
  getFilterById,
  getFilterByShareId,
  getFiltersPaged,
  getFiltersWithCid,
  getOwnedFilterById,
  getOwnedFiltersBaseQuery,
  getPublicFilterDetailsBaseQuery,
  getPublicFiltersBaseQuery,
} from '../service/filter.service';
import { getActiveProvider } from '../service/provider.service';
import { getProviderFilterCount } from '../service/provider_filter.service';
import { Network } from '../entity/Network';
import { NetworkType } from '../entity/interfaces';

export const get_filter_count = async (
  request: Request,
  response: Response
) => {
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

  const count = await getOwnedFiltersBaseQuery(provider.id)
    .getCount()
    .catch((err) => {
      return response.status(400).send(JSON.stringify(err));
    });

  return response.send({
    count,
  });
};

export const get_public_filters = async (
  request: Request,
  response: Response
) => {
  const { query } = request;
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

  const page = parseInt((query.page as string) || '0');
  const per_page = parseInt((query.per_page as string) || '5');
  const q = query.q as string;
  const sort = JSON.parse((query.sort as string) || '{}');
  const providerId = provider.id.toString();

  const alias = 'filter';

  const baseQuery = getPublicFiltersBaseQuery(alias, providerId);

  const params = {
    q: `%${q}%`,
  };

  const withFiltering = !q
    ? baseQuery
    : addFilteringToFilterQuery(alias, baseQuery, params);

  const count = await withFiltering.getCount().catch((err) => {
    response.status(400).send(JSON.stringify(err));
  });

  const withSorting =
    !sort || !Object.keys(sort).length
      ? withFiltering
      : addSortingToFilterQuery(alias, withFiltering, sort);

  const withPaging = addPagingToFilterQuery(alias, withSorting, page, per_page);

  let filters = null;
  try {
    filters = await withPaging
      .loadAllRelationIds({ relations: ['provider_Filters', 'cids'] })
      .getRawAndEntities();
  } catch (err) {
    return response.status(400).send(err);
  }

  if (!filters) {
    return response.send({ data: [], sort, page, per_page, count });
  }

  const data = adjustNetworksOnMultipleFilters(
    filters.entities.map(({ provider_Filters, cids, provider, ...f }, idx) => ({
      ...f,
      isImported: !!parseInt(filters.raw[idx].isImported),
      cids: cids.length,
      subs: provider_Filters.length,
      provider,
      providerId: provider.id,
      providerName: provider.businessName,
      providerCountry: provider.country,
    }))
  );

  return response.send({ data, sort, page, per_page, count });
};

export const get_public_filter_details = async (
  req: Request,
  res: Response
) => {
  const shareId = req.params.shareId;
  const { identificationKey, identificationValue } = req.body;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return res.status(404).send({
      message: 'Provider not found!',
    });
  }

  const providerId = provider.id.toString();

  const data = await getPublicFilterDetailsBaseQuery(
    shareId,
    providerId
  ).getRawAndEntities();

  if (!data || !data.entities[0]) {
    return res
      .status(404)
      .send({ message: `Cannot find filter with shareId ${shareId}` });
  }

  const filter = data.entities[0];

  const isOrphan = filter.provider_Filters
    ? filter.provider_Filters.every(
        (pf) => pf.provider.id !== filter.provider.id
      )
    : true;

  if (isOrphan) {
    return res.status(403).send({
      message: `You do not have access to filter with shareId ${shareId}`,
    });
  }

  return res.send({
    filter: adjustNetworksOnIndividualFilter(filter),
    provider,
    isImported: !!parseInt(data.raw[0].isImported),
    cidsCount: data.raw[0].cidsCount,
  });
};

export const get_owned_filters = async (req, res) => {
  const { query } = req;
  const page = parseInt((query.page as string) || '0');
  const per_page = parseInt((query.perPage as string) || '5');
  const sort = JSON.parse((query.sort as string) || '{}');

  let q = query.q;
  const { identificationKey, identificationValue } = req.body;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return res.status(401).send({
      message: 'Provider not found!',
    });
  }

  let providerId = provider.id.toString();

  q = q ? `%${q.toString().toLowerCase()}%` : q;

  const { filters, count } = await getFiltersPaged({
    providerId,
    q,
    sort,
    page,
    per_page,
  });

  res.send({ filters: adjustNetworksOnMultipleFilters(filters), count });
};

export const get_filter_dashboard = async (req, res) => {
  const { query } = req;
  const page = parseInt((query.page as string) || '0');
  const per_page = parseInt((query.perPage as string) || '5');
  const sort = JSON.parse((query.sort as string) || '{}');
  let q = query.q;
  const { identificationKey, identificationValue } = req.body;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return res.status(404).send({
      message: 'Provider not found!',
    });
  }

  let providerId = provider.id.toString();

  q = q ? `%${q.toString().toLowerCase()}%` : q;

  const { filters, count } = await getFiltersPaged({
    providerId,
    q,
    sort,
    page,
    per_page,
  });

  const dealsDeclined = await getDeclinedDealsCount(providerId);

  let currentlyFiltering = 0;
  let listSubscribers = 0;
  let activeLists = 0;
  let inactiveLists = 0;
  let importedLists = 0;
  let privateLists = 0;
  let publicLists = 0;

  filters.forEach((filter) => {
    if (filter.enabled) {
      currentlyFiltering += filter.cidsCount;
      activeLists += 1;
    }

    if (
      filter.provider.id === provider.id &&
      filter.provider_Filters.length > 0
    ) {
      listSubscribers += filter.provider_Filters.length - 1;
    }

    if (filter.provider.id !== parseInt(providerId)) {
      importedLists += 1;
    }

    if (filter.visibility === Visibility.Private) {
      privateLists += 1;
    }

    if (filter.visibility === Visibility.Public) {
      publicLists += 1;
    }
  });

  inactiveLists = count - activeLists;

  res.send({
    currentlyFiltering,
    listSubscribers,
    dealsDeclined,
    activeLists,
    inactiveLists,
    importedLists,
    privateLists,
    publicLists,
  });
};

export const get_filter = async (request: Request, response: Response) => {
  const shareId = request.params.shareId;
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

  let providerId = provider.id.toString();

  const f = await getRepository(Filter).findOne(
    {
      shareId,
    },
    {
      relations: [
        'cids',
        'provider',
        'provider_Filters',
        'provider_Filters.provider',
        'networks',
      ],
    }
  );

  if (!f) {
    return response.status(404).send({ message: 'Filter not found.' });
  }

  const pf = f.provider_Filters.filter((pf) => {
    return pf.provider.id.toString() === providerId;
  })[0];

  if (!pf) {
    return response
      .status(400)
      .send({ message: 'Filter not found or already deleted.' });
  }
  const filter = { ...f, enabled: pf.active };

  return response.send(adjustNetworksOnIndividualFilter(filter));
};

export const get_shared_filter = async (
  request: Request,
  response: Response
) => {
  const shareId = request.params.shareId as string;
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

  let providerId = provider.id.toString();

  switch (true) {
    case !shareId:
      return response.status(400).send({ message: 'ShareId must be provided' });
  }

  const filter = await getFilterByShareId(shareId, providerId);

  if (!filter) {
    return response
      .status(404)
      .send({ message: `Cannot find filter with id ${shareId}` });
  }

  const providerFilter = await getProviderFilterCount(providerId, filter.id);

  if (providerFilter) {
    return response
      .status(404)
      .send({ message: `Cannot import filter because you already have it` });
  }

  return response.send(adjustNetworksOnIndividualFilter(filter));
};

export const get_filter_by_id = async (
  request: Request,
  response: Response
) => {
  const {
    params: { _id },
  } = request;

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

  let providerId = provider.id.toString();

  const id = _id as string;

  if (!id) {
    return response.status(404).send({
      message: 'Filter not found',
    });
  }

  const ownedFilter = await getOwnedFilterById(id, providerId);

  if (ownedFilter) {
    return response.send(adjustNetworksOnIndividualFilter(ownedFilter));
  }

  const otherFilter = await getFilterById(id);

  if (!otherFilter) {
    return response.status(404).send({
      message: 'Filter not found',
    });
  }

  response.send(adjustNetworksOnIndividualFilter(otherFilter));
};

export const edit_filter = async (req, res) => {
  const {
    body: {
      identificationKey,
      identificationValue,
      providerId,
      loginType,
      updated,
      created,
      cids,
      notes,
      isBulkSelected,
      cidsCount,
      provider_Filters,
      provider,
      ...updatedFilter
    },
    params: { id },
  } = req;

  if (!id) {
    return res
      .status(400)
      .send({ message: 'Please provide an ID for the filter to be updated' });
  }

  if (
    !updatedFilter.networks ||
    !Array.isArray(updatedFilter.networks) ||
    !updatedFilter.networks.length
  ) {
    return res.status(400).send({
      message: 'Bad request - network key does is invalid!',
    });
  }

  const networks = await getRepository(Network).find();

  const updatedNetworks: Network[] = [];

  for (const network of updatedFilter.networks) {
    if (!Object.keys(NetworkType).includes(network)) {
      return res.status(400).send({
        message: 'Bad request - network key contains invalid networks!',
      });
    }

    updatedNetworks.push(networks.find((el) => el.networkType === network));
  }

  const filterToEdit = await getRepository(Filter).findOne(id, {
    relations: ['provider'],
  });

  if (!filterToEdit) {
    return res.status(404).send({
      message: 'Filter list does not exist!',
    });
  }

  if (filterToEdit.provider.id !== providerId) {
    return res.status(404).send({
      message: 'Filter not owned by you!',
    });
  }

  let cidsArray: Array<{
    cid: string;
    refUrl: string;
  }> = cids;

  if (cidsArray) {
    if (!Array.isArray(cidsArray)) {
      return res.status(400).send({
        message: 'Sent cids are not valid.',
      });
    }

    if (cidsArray.length) {
      const cidStrings = cidsArray.map((x) => x.cid);
      for (const cid of cidStrings) {
        try {
          CID.parse(cid);
        } catch (e) {
          return res.status(400).send({
            message: `CID "${cid}" does not have a valid CIDv0/v1 format.`,
          });
        }
      }

      const existingCids = await getExistingCids(cidsArray);

      if (existingCids.length) {
        const valuesOfExistingCids = existingCids.map((e) => e.cid);
        cidsArray = cidsArray.filter(
          (e) => !valuesOfExistingCids.includes(e.cid)
        );
        const promiseArray = existingCids.map((cid) => {
          cid.filters = [...cid.filters, filterToEdit];
          return getRepository(Cid).save(cid);
        });

        await Promise.all(promiseArray);
      }

      if (cidsArray.length) {
        await Promise.all(
          cidsArray.map((x) => {
            const cid = new Cid();

            cid.setCid(x.cid);
            cid.refUrl = x.refUrl;
            cid.filters = [filterToEdit];

            return getRepository(Cid).save(cid);
          })
        );
      }
    }
  }

  await getRepository(Filter).update(id, {
    ...updatedFilter,
    networks: updatedNetworks,
  });

  res.status(200).send(await getRepository(Filter).findOne(id));
};

export const create_filter = async (request: Request, response: Response) => {
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

  const sameNameFilter = await checkForSameNameFilters(data.name);

  if (sameNameFilter) {
    return response.status(400).send({
      message:
        'A filter with the same name already exists for this account, please choose another!',
    });
  }

  if (
    !data.networks ||
    !Array.isArray(data.networks) ||
    !data.networks.length
  ) {
    return response.status(400).send({
      message: 'Bad request - network key does is invalid!',
    });
  }

  const filter = new Filter();

  filter.name = data.name;
  filter.description = data.description;
  filter.visibility = data.visibility;
  filter.provider = provider;
  filter.enabled = data.enabled;
  filter.networks = [];

  const networks = await getRepository(Network).find();

  for (const network of data.networks) {
    if (!Object.keys(NetworkType).includes(network)) {
      return response.status(400).send({
        message: 'Bad request - network key contains invalid networks!',
      });
    }

    filter.networks.push(networks.find((el) => el.networkType === network));
  }

  // generate shareId
  let shareId: string, existing: Filter;
  do {
    shareId = generateRandomToken(4);
    existing = await getRepository(Filter).findOne({
      shareId,
    });
  } while (existing);

  filter.shareId = shareId;

  const createdFilter = await getRepository(Filter).save(filter);

  let cidsArray: Array<{
    cid: string;
    refUrl: string;
  }> = data.cids;

  if (cidsArray) {
    if (!Array.isArray(cidsArray)) {
      return response.status(400).send({
        message: 'Sent cids are not valid.',
      });
    }

    if (cidsArray.length) {
      const cidStrings = cidsArray.map((x) => x.cid);
      for (const cid of cidStrings) {
        try {
          CID.parse(cid);
        } catch (e) {
          return response.status(400).send({
            message: `CID "${cid}" does not have a valid CIDv0/v1 format.`,
          });
        }
      }

      const existingCids = await getExistingCids(cidsArray);

      if (existingCids.length) {
        const valuesOfExistingCids = existingCids.map((e) => e.cid);
        cidsArray = cidsArray.filter(
          (e) => !valuesOfExistingCids.includes(e.cid)
        );
        const promiseArray = existingCids.map((cid) => {
          cid.filters = [...cid.filters, filter];
          return getRepository(Cid).save(cid);
        });

        await Promise.all(promiseArray);
      }

      if (cidsArray.length) {
        const promiseArray = cidsArray.map((x) => {
          const cid = new Cid();

          cid.setCid(x.cid);
          cid.refUrl = x.refUrl;
          cid.filters = [filter];
          return getRepository(Cid).save(cid);
        });

        await Promise.all(promiseArray);
      }
    }
  }

  const providerFilter = new Provider_Filter();
  providerFilter.provider = provider;
  providerFilter.filter = createdFilter;
  providerFilter.active = true;
  providerFilter.notes = data.notes || '';

  await getRepository(Provider_Filter).save(providerFilter);

  const config = await getRepository(Config).findOne({
    provider: provider,
  });

  const configOptions = JSON.parse(config.config);
  configOptions.bitscreen = true;
  config.config = JSON.stringify(configOptions);

  await getRepository(Config).save(config);

  response.send(filter);
};

export const remove_cids_from_filter = async (
  request: Request,
  response: Response
) => {
  const data = request.body;
  const { identificationKey, identificationValue } = data;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({
      message: 'Provider not found!',
    });
  }

  const cidsToRemove: Array<number> = request.body.cids;
  const filterId: number = request.body.filterId;

  if (
    !filterId ||
    !cidsToRemove ||
    !Array.isArray(cidsToRemove) ||
    !cidsToRemove.length
  ) {
    return response.status(400).send({
      message: 'Sent data is incorrect!',
    });
  }

  const filter = await getRepository(Filter).findOne(
    {
      id: filterId,
      provider,
    },
    {
      relations: ['cids'],
    }
  );

  if (!filter) {
    return response.status(400).send({
      message: 'Filter does not exist or is not owned by provider!',
    });
  }

  filter.cids = filter.cids.filter((e) => !cidsToRemove.includes(e.id));
  const updatedFilter = await getRepository(Filter).save(filter);

  for (let entry in cidsToRemove) {
    const cidId = cidsToRemove[entry];
    const filters = await getFiltersWithCid(cidId);
    const cid = await getRepository(Cid).findOne(cidId, {
      relations: ['deals'],
    });

    if (cid.deals.length > 0) {
      await getRepository(Deal).delete({
        id: In(cid.deals.map((deal) => deal.id)),
        provider,
      });
    }

    if (!filters.length) {
      await getRepository(Cid).delete({ id: cidId });
    }
  }

  return response.status(200).send(updatedFilter);
};

export const remove_conflicted_cids = async (
  request: Request,
  response: Response
) => {
  const data = request.body;
  const { identificationKey, identificationValue } = data;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({
      message: 'Provider not found!',
    });
  }

  const cidsToRemove: Array<number> = request.body.cids;
  const filtersIds: Array<number> = request.body.filters;

  if (
    !filtersIds ||
    !Array.isArray(filtersIds) ||
    !filtersIds.length ||
    !cidsToRemove ||
    !Array.isArray(cidsToRemove) ||
    !cidsToRemove.length
  ) {
    return response.status(400).send({
      message: 'Sent data is incorrect!',
    });
  }

  const filters = await getRepository(Filter).find({
    where: {
      id: In(filtersIds),
      provider,
    },
    relations: ['cids'],
  });

  if (!filters || !filters.length) {
    return response.status(400).send({
      message: 'No filters found to match sent ids!',
    });
  }

  for (let i = 0; i < filters.length; i++) {
    const filter = filters[i];
    filter.cids = filter.cids.filter((e) => !cidsToRemove.includes(e.id));
    await getRepository(Filter).save(filter);
  }

  for (let entry in cidsToRemove) {
    const cidId = cidsToRemove[entry];
    const filters = await getFiltersWithCid(cidId);
    const cid = await getRepository(Cid).findOne(cidId, {
      relations: ['deals'],
    });

    if (cid.deals.length > 0) {
      await getRepository(Deal).delete({
        id: In(cid.deals.map((deal) => deal.id)),
        provider,
      });
    }

    if (!filters.length) {
      await getRepository(Cid).delete({ id: cidId });
    }
  }

  return response.status(200).send();
};
