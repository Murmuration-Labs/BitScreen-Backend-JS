import * as express from 'express';
import { Request, Response } from 'express';
import { Brackets, getRepository, SelectQueryBuilder } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Visibility } from '../entity/enums';
import { Filter } from '../entity/Filter';
import { Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';
import { generateRandomToken } from '../service/crypto';
import { serverUri } from '../config';

const filterRouter = express.Router();

filterRouter.get('/', async (request: Request, response: Response) => {
  if (!request.query.provider) {
    return response.status(400).send({});
  }

  const provider = await getRepository(Provider).findOne({
    id: parseInt(request.query.provider as string),
  });

  if (!provider) {
    return response.status(404).send({});
  }

  const filters = await getRepository(Filter).find({
    where: {
      provider,
    },
    relations: ['cids'],
  });

  response.send(filters);
});

filterRouter.get('/public', async (request: Request, response: Response) => {
  const { query } = request;
  const page = parseInt((query.page as string) || '0');
  const per_page = parseInt((query.per_page as string) || '5');
  const q = query.q as string;
  const sort = JSON.parse((query.sort as string) || '{}');
  const providerId = query.providerId;

  const alias = 'filter';

  const excludedQuery = `(
	select 1 from provider__filter p_v
	where p_v."providerId" = :providerId
	and p_v."filterId" = ${alias}.id
)`;

  const baseQuery = getRepository(Filter)
    .createQueryBuilder(alias)
    .where(`not exists (${excludedQuery})`, { providerId })
    .andWhere(`${alias}.visibility = :visibility`, {
      visibility: Visibility.Public,
    });

  const cidQuery = `
    exists (
      select 1 from cid 
      where cid."filterId" = ${alias}.id 
      and lower(cid.cid) like lower(:q) 
    )
    `;

  const params = {
    q: `%${q}%`,
  };

  const withFiltering = !q
    ? baseQuery
    : baseQuery.andWhere(
        new Brackets((qb) =>
          qb
            .orWhere(`lower(${alias}.name) like lower(:q)`, params)
            .orWhere(`lower(${alias}.description) like lower(:q)`, params)
            .orWhere(cidQuery, params)
        )
      );

  console.log(withFiltering.getQueryAndParameters());

  const count = await withFiltering.getCount();

  const withSorting =
    !sort || !Object.keys(sort).length
      ? withFiltering
      : Object.keys(sort).reduce(
          (query, key) =>
            query.orderBy(
              `filter.${key}`,
              'DESC' === `${sort[key]}`.toUpperCase() ? 'DESC' : 'ASC'
            ),
          withFiltering
        );

  const withPaging = withSorting
    .skip(page * per_page)
    .take(per_page)
    .loadAllRelationIds();

  const filters = await withPaging.getMany();

  return response.send({ data: filters, sort, page, per_page, count });
});

filterRouter.get('/search', async (req, res) => {
  let {
    query: { q, providerId },
  } = req;

  if (!providerId) {
    return res.status(400).send({ message: 'providerId must be provided' });
  }

  providerId = providerId.toString();

  const provider = await getRepository(Provider).findOne(providerId);
  if (!provider) {
    return res
      .status(404)
      .send({ message: 'Inexistent provider with id: ' + providerId });
  }

  let providerFilters = await getRepository(Provider_Filter).find({
    where: {
      provider,
    },
    order: { filter: 'ASC' },
    relations: ['provider', 'filter', 'filter.cids', 'filter.provider'],
  });

  const filters = providerFilters.map((providerFilter) => {
    return {
      ...providerFilter.filter,
      notes: providerFilter.notes,
      enabled: providerFilter.active,
      originId:
        providerFilter.provider.id !== providerFilter.filter.provider.id
          ? `${serverUri()}/filter/share/` + providerFilter.filter.shareId
          : undefined,
    };
  });

  const query = q ? q.toString().toLowerCase() : '';

  const data = filters.filter(({ name, description, cids }) => {
    return (
      !q ||
      (name || '').toLowerCase().indexOf(query) > -1 ||
      (description || '').toLowerCase().indexOf(query) > -1 ||
      cids.reduce(
        (acc, { cid, refUrl }) =>
          acc ||
          (cid || '').toLowerCase().indexOf(query) > -1 ||
          (refUrl || '').toLowerCase().indexOf(query) > -1,
        false
      )
    );
  });

  return res.send(data);
});

filterRouter.get('/:id', async (request: Request, response: Response) => {
  const id = parseInt(request.params.id);

  const filter = await getRepository(Filter).findOne(id, {
    relations: ['cids'],
  });

  response.send(filter);
});

filterRouter.get(
  '/share/:shareId',
  async (request: Request, response: Response) => {
    const shareId = request.params.shareId as string;
    const providerId = request.query.providerId;

    switch (true) {
      case !shareId:
        return response
          .status(400)
          .send({ message: 'ShareId must be provided' });
      case !providerId:
        return response
          .status(400)
          .send({ message: 'ProviderId must be provided' });
    }

    const filter = await getRepository(Filter)
      .createQueryBuilder('filter')
      .where('filter.shareId = :shareId', { shareId })
      // .andWhere('filter.visibility = :visibility', {
      //   visibility: Visibility.Public,
      // })
      .andWhere('filter.provider.id <> :providerId', { providerId })
      .loadAllRelationIds()
      .getOne();

    console.log(filter);

    if (!filter) {
      return response
        .status(404)
        .send({ message: `Cannot find filter with id ${shareId}` });
    }

    const providerFilter = await getRepository(Provider_Filter)
      .createQueryBuilder('pf')
      .where('pf.provider.id = :providerId', { providerId })
      .andWhere('pf.filter.id = :filterId', { filterId: filter.id })
      .getCount();

    if (providerFilter) {
      return response
        .status(404)
        .send({ message: `Cannot import filter because you already have it` });
    }

    return response.send(filter);
  }
);

filterRouter.put('/:id', async (req, res) => {
  const {
    body: { updated, created, cids, notes, ...updatedFilter },
    params: { id },
  } = req;

  if (!id) {
    return res
      .status(400)
      .send({ message: 'Please provide and ID for the filter to be updated' });
  }

  const _id = id as string;

  await getRepository(Filter)
    .update(_id, updatedFilter)
    .catch((err) => res.status(500).send(err));

  //   const manager = getManager();

  //   console.log(cids.map(({ id }) => id).filter((e) => e));

  //   const exists = await manager
  //     .createQueryBuilder(Cid, 'cid')
  //     .where('cid.id IN (:ids)', {
  //       ids: cids.map(({ id }) => id).filter((e) => e),
  //     })
  //     .getMany();

  //   const existIds = exists.reduce((acc, { id }) => ({ ...acc, [id]: true }), {});

  //   const filter = await getRepository(Filter).findOne(_id);

  //   await Promise.all(
  //     cids.map(({ id, cid, refUrl }) => {
  //       const obj = { cid, refUrl, filter: filter };

  //       return existIds[id]
  //         ? getRepository(Cid).update(id, obj)
  //         : getRepository(Cid).save(obj);
  //     })
  //   );

  res.send(await getRepository(Filter).findOne(_id));
});

filterRouter.post('/', async (request: Request, response: Response) => {
  const data = request.body;
  if (typeof data.providerId !== 'number') {
    return response
      .status(400)
      .send({ message: 'Please provide a providerId.' });
  }

  const provider = await getRepository(Provider).findOne(data.providerId);

  if (!provider) {
    return response.status(404).send({});
  }

  const filter = new Filter();

  filter.name = data.name;
  filter.description = data.description;
  filter.override = data.override;
  filter.visibility = data.visibility;
  filter.provider = provider;
  filter.enabled = data.enabled;

  // generate shareId
  let shareId: string, existing: Filter;
  do {
    shareId = await generateRandomToken(4);
    existing = await getRepository(Filter).findOne({
      shareId,
    });
  } while (existing);

  filter.shareId = shareId;

  await getRepository(Filter).save(filter);

  await Promise.all(
    data.cids.map((x) => {
      const cid = new Cid();

      cid.cid = x.cid;
      cid.refUrl = x.refUrl;
      cid.filter = filter;

      return getRepository(Cid).save(cid);
    })
  );

  response.send(filter);
});

filterRouter.delete('/:id', async (request: Request, response: Response) => {
  const {
    params: { id },
  } = request;

  await getRepository(Cid).delete({
    filter: {
      id: parseInt(id),
    },
  });
  await getRepository(Filter).delete(parseInt(id));

  return response.send({});
});

export default filterRouter;
