import * as express from 'express';
import { Request, Response } from 'express';
import { Brackets, getRepository } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Visibility } from '../entity/enums';
import { Filter } from '../entity/Filter';
import { Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';
import { generateRandomToken } from '../service/crypto';

const filterRouter = express.Router();

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
    .innerJoinAndMapOne(
      `${alias}.provider`,
      Provider,
      'p',
      `p.id = ${alias}.provider.id`
    )
    .innerJoin(
      (qb) =>
        qb
          .from(Cid, 'c')
          .select('c.filter.id', 'filterId')
          .addSelect('count(c.id)', 'cidsCount')
          .groupBy('"filterId"'),
      'groupedCids',
      `"groupedCids"."filterId" = ${alias}.id`
    )
    .innerJoin(
      (qb) =>
        qb
          .from(Provider_Filter, 'pf')
          .select('pf.filter.id', 'filterId')
          .addSelect('count(pf.id)', 'subsCount')
          .groupBy('"filterId"'),
      'groupedSubs',
      `"groupedSubs"."filterId" = ${alias}.id`
    )
    .addSelect(`"groupedCids"."cidsCount" as "cidsCound"`)
    .addSelect(`"groupedSubs"."subsCount" as "subsCount"`)
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

  const count = await withFiltering.getCount().catch((err) => {
    response.status(400).send(JSON.stringify(err));
  });

  const mapper = {
    providerName: `p.businessName`,
    providerCountry: `p.country`,
    cids: '"cidsCount"',
    subs: '"subsCount"',
  };

  const withSorting =
    !sort || !Object.keys(sort).length
      ? withFiltering
      : Object.keys(sort).reduce(
          (query, key) =>
            query.orderBy(
              mapper[key] || `${alias}.${key}`,
              'DESC' === `${sort[key]}`.toUpperCase() ? 'DESC' : 'ASC'
            ),
          withFiltering
        );

  const withPaging = withSorting.offset(page * per_page).limit(per_page);

  const filters = await withPaging
    .loadAllRelationIds({ relations: ['provider_Filters', 'cids'] })
    .getMany()
    .catch((err) => {
      response.status(400).end(err);
    });

  if (!filters) {
    return;
  }

  const data = filters.map(({ provider_Filters, cids, provider, ...f }) => ({
    ...f,
    cids: cids.length,
    subs: provider_Filters.length,
    providerName: provider.businessName,
    providerCountry: provider.country,
  }));

  return response.send({ data, sort, page, per_page, count });
});

filterRouter.get(
  '/public/details/:filterId',
  async (req: Request, res: Response) => {
    const filterId = req.params.filterId;
    const providerId = req.query.providerId;

    const filter = await getRepository(Filter)
      .createQueryBuilder('filter')
      .where('filter.id = :filterId', { filterId })
      .andWhere('filter.visibility = :visibility', {
        visibility: Visibility.Public,
      })
      .andWhere('filter.provider.id != :providerId', { providerId })
      .loadAllRelationIds()
      .getOne();

    if (!filter) {
      return res
        .status(404)
        .send({ message: `Cannot find filter with id ${filterId}` });
    }

    const provider = await getRepository(Provider)
      .createQueryBuilder('provider')
      .where('provider.id = :providerId', { providerId: filter.provider })
      .getOne();

    return res.send({ filter, provider });
  }
);

filterRouter.get('/', async (req, res) => {
  let {
    query: { q, providerId, filterId },
  } = req;

  if (!providerId) {
    return res.status(400).send({ message: 'providerId must be provided' });
  }

  providerId = providerId.toString();

  const baseQuery = getRepository(Filter)
    .createQueryBuilder('f')
    .distinct(true)
    .leftJoinAndSelect(
      'f.provider_Filters',
      'p_f',
      'p_f.provider.id = :providerId',
      { providerId }
    )
    .leftJoinAndSelect('p_f.provider', 'prov')
    .leftJoinAndSelect('f.provider', 'p')
    .leftJoin('f.cids', 'c')
    .where('p_f.filter.id = f.id');

  q = q ? `%${q.toString().toLowerCase()}%` : q;

  const withFitlering = q
    ? baseQuery.andWhere(
        new Brackets((qb) =>
          qb
            .orWhere('lower(f.name) like :q', { q })
            .orWhere('lower(f.description) like :q', { q })
            .orWhere(
              `exists (
              select 1 from cid "queryCid" 
              where "queryCid"."filterId" = f.id
              and (
                lower("queryCid"."cid") like :q
              )
            )`,
              { q }
            )
        )
      )
    : baseQuery;

  const filters = await withFitlering
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getMany();

  res.send(filters);
});

filterRouter.get('/:id', async (request: Request, response: Response) => {
  const id = parseInt(request.params.id);

  const filter = await getRepository(Filter).findOne(id, {
    relations: [
      'cids',
      'provider',
      'provider_Filters',
      'provider_Filters.provider',
    ],
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

filterRouter.get('/:_id', async (request: Request, response: Response) => {
  const {
    query: { providerId },
  } = request;

  const {
    params: { _id },
  } = request;

  if (!providerId) {
    return response.status(400).send({
      message: 'Please provide providerId',
    });
  }

  const id = _id as string;

  if (!id) {
    return response.status(404).send({
      message: 'Filter not found',
    });
  }

  const ownedFilter = await getRepository(Filter)
    .createQueryBuilder('f')
    .leftJoinAndSelect('f.provider', 'p')
    .leftJoinAndSelect('f.provider_Filters', 'pf')
    .leftJoinAndSelect('f.cids', 'cids')
    .where('f.id = :id', { id })
    .andWhere('p.id = :providerId', { providerId })
    .getOne();

  if (ownedFilter) {
    return response.send(ownedFilter);
  }

  const otherFilter = await getRepository(Filter)
    .createQueryBuilder('f')
    .leftJoinAndSelect('f.provider', 'p')
    .where('f.id = :id', { id })
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getOne();

  if (!otherFilter) {
    return response.status(404).send({
      message: 'Filter not found',
    });
  }

  response.send(otherFilter);
});

filterRouter.get('/', async (req, res) => {
  let {
    query: { q, providerId },
  } = req;

  if (!providerId) {
    return res.status(400).send({ message: 'providerId must be provided' });
  }

  providerId = providerId.toString();

  const baseQuery = getRepository(Filter)
    .createQueryBuilder('f')
    .distinct(true)
    .leftJoinAndSelect('f.provider_Filters', 'p_f')
    .leftJoinAndSelect('p_f.provider', 'prov')
    .leftJoinAndSelect('f.provider', 'p')
    .leftJoin('f.cids', 'c')
    .where(
      `exists (
      select 1 from provider__filter "pf" 
      where "pf"."filterId" = f.id 
      and "pf"."providerId" = :providerId 
    )`,
      { providerId }
    );

  q = q ? `%${q.toString().toLowerCase()}%` : q;

  const withFitlering = q
    ? baseQuery.andWhere(
        new Brackets((qb) =>
          qb
            .orWhere('lower(f.name) like :q', { q })
            .orWhere('lower(f.description) like :q', { q })
            .orWhere(
              `exists (
              select 1 from cid "queryCid" 
              where "queryCid"."filterId" = f.id
              and (
                lower("queryCid"."cid") like :q
              )
            )`,
              { q }
            )
        )
      )
    : baseQuery;

  const filters = await withFitlering
    .orderBy('f.name')
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getMany();

  res.send(filters);
});

filterRouter.put('/:id', async (req, res) => {
  const {
    body: {
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
      .send({ message: 'Please provide and ID for the filter to be updated' });
  }

  const _id = id as string;

  await getRepository(Filter).update(_id, updatedFilter);
  // .catch((err) => res.status(500).send(JSON.stringify(err)));

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

// filterRouter.delete('/:id', async (request: Request, response: Response) => {
//   const {
//     params: { id },
//   } = request;

//   await getRepository(Cid).delete({
//     filter: {
//       id: parseInt(id),
//     },
//   });
//   await getRepository(Filter).delete(parseInt(id));

//   return response.send({});
// });

export default filterRouter;
