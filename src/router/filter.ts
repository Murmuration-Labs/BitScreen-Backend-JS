import * as express from 'express';
import { Request, Response } from 'express';
import { Brackets, getRepository } from 'typeorm';
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

  console.log(baseQuery.getQueryAndParameters());
  const withFiltering = !q
    ? baseQuery
    : baseQuery.andWhere(
        new Brackets((qb) =>
          qb
            .where(`lower(${alias}.name) like :name`, { name: `%${q}%` })
            .orWhere(`lower(${alias}.description) like :description`, {
              description: `%${q}%`,
            })
        )
      );

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
  const {
    query: { q },
  } = req;

  const query = !q ? null : (q as string).toLowerCase();

  let queryPairs = {};
  if (query) {
    const parts = query.split(';');
    parts.forEach((part) => {
      const pair = part.split('=');
      queryPairs[pair[0]] = pair[1];
    });
  }

  if (!queryPairs['providerid']) {
    return res.status(400).send({ message: 'providerId must be provided' });
  }

  const provider = await getRepository(Provider).findOne(
    queryPairs['providerid']
  );
  if (!provider) {
    return res.status(404).send({});
  }

  let providerFilters = await getRepository(Provider_Filter).find({
    where: {
      provider,
    },
    order: { filter: 'ASC' },
    relations: ['provider', 'filter', 'filter.cids', 'filter.provider'],
  });

  function verifyFieldInQuery(key: string, field: string): boolean {
    if (queryPairs[key]) {
      return field.toLowerCase().indexOf(queryPairs[key]) > -1;
    }
    return true;
  }

  function verifyCidInQuery(cids: Cid[]): boolean {
    if (queryPairs['cid']) {
      return cids.reduce(
        (acc, cid) =>
          acc || cid.cid.toLowerCase().indexOf(queryPairs['cid']) > -1,
        // cid.refUrl.toLowerCase().indexOf(query) > -1,
        false
      );
    }
    return true;
  }

  providerFilters = providerFilters.filter((providerFilter) => {
    return verifyFieldInQuery(
      'providerid',
      providerFilter.provider.id.toString()
    );
  });

  const filters: any = providerFilters.map((providerFilter) => {
    return {
      ...providerFilter.filter,
      notes: providerFilter.notes,
      enabled: providerFilter.active,
      originId:
        providerFilter.provider.id != providerFilter.filter.provider.id
          ? `${serverUri()}/filter/share/` + providerFilter.filter.shareId
          : undefined,
    };
  });

  return res.send(
    filters.filter(({ name, description, shareId, cids }) => {
      return (
        verifyFieldInQuery('name', name) &&
        verifyFieldInQuery('description', description) &&
        verifyFieldInQuery('shareid', shareId) &&
        verifyCidInQuery(cids)
      );
    })
  );
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

    if (!shareId) {
      return response.status(400).send({ message: 'ShareId must be provided' });
    }

    const filter = await getRepository(Filter).findOne(
      {
        shareId,
      },
      {
        // relations: ['cids', 'provider'],
      }
    );

    if (!filter) {
      return response
        .status(404)
        .send({ message: `Cannot find filter with id ${shareId}` });
    }

    response.send(filter);
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
