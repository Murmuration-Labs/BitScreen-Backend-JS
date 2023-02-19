import {
  Brackets,
  getRepository,
  SelectQueryBuilder,
  getManager,
} from 'typeorm';
import { Filter } from '../entity/Filter';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Visibility } from '../entity/enums';
import { FilterItem, GetFiltersPagedProps } from '../entity/interfaces';
import { Deal, DealStatus } from '../entity/Deal';

export const getOwnedFiltersBaseQuery = (
  providerId: number
): SelectQueryBuilder<Filter> => {
  return getRepository(Filter)
    .createQueryBuilder('f')
    .where('f.provider.id = :providerId', {
      providerId,
    });
};

export const getOwnedFilterById = (filterId, providerId) => {
  return getOwnedFiltersBaseQuery(providerId)
    .leftJoinAndSelect('f.provider', 'p')
    .leftJoinAndSelect('f.provider_Filters', 'pf')
    .leftJoinAndSelect('f.cids', 'cids')
    .andWhere('f.id = :id', { filterId })
    .getOne();
};

export const getFilterById = (filterId) => {
  return getRepository(Filter)
    .createQueryBuilder('f')
    .leftJoinAndSelect('f.provider', 'p')
    .where('f.id = :id', { filterId })
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getOne();
};

export const getPublicFiltersBaseQuery = (
  alias: string,
  providerId
): SelectQueryBuilder<Filter> => {
  return getRepository(Filter)
    .createQueryBuilder(alias)
    .leftJoinAndSelect(`${alias}.provider`, `p`)
    .innerJoin(
      Provider_Filter,
      'owner_pf',
      '"owner_pf"."providerId" = "filter"."providerId" and "owner_pf"."filterId" = "filter"."id" and "owner_pf"."active" is true'
    )
    .leftJoin(
      (qb) =>
        qb
          .select('subqueryFilter.id', 'filterId')
          .addSelect('COUNT(cid)', 'cidsCount')
          .from(Filter, 'subqueryFilter')
          .innerJoin('subqueryFilter.cids', 'cid')
          .groupBy('subqueryFilter.id'),
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
    .addSelect(`"groupedCids"."cidsCount" as "cidsCount"`)
    .addSelect(`"groupedSubs"."subsCount" as "subsCount"`)
    .addSelect((subQuery) => {
      return subQuery
        .select('count(p_v.id)')
        .from(Provider_Filter, 'p_v')
        .where('p_v.providerId = :providerId', { providerId })
        .andWhere(`p_v.filterId = ${alias}.id`)
        .andWhere(`p.id <> :providerId`, { providerId });
    }, 'isImported')
    .andWhere(`${alias}.visibility = :visibility`, {
      visibility: Visibility.Public,
    });
};

export const addFilteringToFilterQuery = (
  alias: string,
  baseQuery: SelectQueryBuilder<Filter>,
  params
): SelectQueryBuilder<Filter> => {
  const cidQuery = `
        exists (
          select 1 from cid 
          where cid."filterId" = ${alias}.id 
          and lower(cid.cid) like lower(:q) 
        )
    `;

  baseQuery.andWhere(
    new Brackets((qb) =>
      qb
        .orWhere(`lower(${alias}.name) like lower(:q)`, params)
        .orWhere(`lower(${alias}.description) like lower(:q)`, params)
        .orWhere(`lower(p.businessName) like lower(:q)`, params)
        .orWhere(cidQuery, params)
    )
  );

  return baseQuery;
};

export const addSortingToFilterQuery = (
  alias: string,
  baseQuery: SelectQueryBuilder<Filter>,
  sort
): SelectQueryBuilder<Filter> => {
  const mapper = {
    providerId: `p.id`,
    providerName: `p.businessName`,
    providerCountry: `p.country`,
    cids: 'COALESCE("cidsCount", 0)',
    subs: 'COALESCE("subsCount", 0)',
  };

  return Object.keys(sort).reduce(
    (query, key) =>
      query.orderBy(
        mapper[key] || `${alias}.${key}`,
        'DESC' === `${sort[key]}`.toUpperCase() ? 'DESC' : 'ASC'
      ),
    baseQuery
  );
};

export const addPagingToFilterQuery = (
  alias: string,
  baseQuery: SelectQueryBuilder<Filter>,
  page,
  perPage
): SelectQueryBuilder<Filter> => {
  return baseQuery.offset(page * perPage).limit(perPage);
};

export const getPublicFilterDetailsBaseQuery = (
  shareId,
  providerId
): SelectQueryBuilder<Filter> => {
  return getRepository(Filter)
    .createQueryBuilder('filter')
    .leftJoinAndSelect('filter.provider', 'p')
    .leftJoinAndSelect('filter.provider_Filters', 'pf')
    .leftJoinAndSelect('pf.provider', 'pf_p')
    .leftJoinAndSelect('filter.cids', 'c')
    .addSelect((subQuery) => {
      return subQuery
        .select('count(p_v.id)')
        .from(Provider_Filter, 'p_v')
        .where('p_v.providerId = :providerId', { providerId })
        .andWhere(`p_v.filterId = filter.id`)
        .andWhere(`filter.provider.id != :providerId`, { providerId });
    }, 'isImported')
    .where('filter.shareId = :shareId', { shareId })
    .andWhere('filter.visibility IN (:...visibility)', {
      visibility: [Visibility.Public, Visibility.Shared],
    });
};

export const getFiltersPaged = async ({
  providerId,
  q,
  sort,
  page,
  per_page,
}: GetFiltersPagedProps) => {
  const baseQuery = getRepository(Filter)
    .createQueryBuilder('f')
    .distinct(true)
    .innerJoin(Provider_Filter, 'own_p_f', 'own_p_f.filter.id = f.id')
    .andWhere('own_p_f.providerId = :providerId', { providerId })
    .leftJoinAndSelect('f.provider_Filters', 'p_f', 'p_f.filter.id = f.id')
    .leftJoinAndSelect('p_f.provider', 'prov')
    .leftJoinAndSelect('f.provider', 'p')
    .leftJoin('f.cids', 'c')
    .addSelect((subQuery) => {
      return subQuery
        .select('active')
        .from(Provider_Filter, 'p_f_2')
        .where('p_f_2.providerId = :providerId', { providerId })
        .andWhere(`p_f_2.filterId = f.id`);
    }, 'active')
    .leftJoin(
      (qb) =>
        qb
          .select('subqueryFilter.id', 'filterId')
          .addSelect('COUNT(cid)', 'cidsCount')
          .from(Filter, 'subqueryFilter')
          .innerJoin('subqueryFilter.cids', 'cid')
          .groupBy('subqueryFilter.id'),
      'groupedCids',
      `"groupedCids"."filterId" = f.id`
    )
    .addSelect('COALESCE("groupedCids"."cidsCount", 0)')
    .innerJoin(
      (qb) =>
        qb
          .from(Provider_Filter, 'pf')
          .select('pf.filter.id', 'filterId')
          .addSelect('count(pf.id)', 'subsCount')
          .groupBy('"filterId"'),
      'groupedSubs',
      `"groupedSubs"."filterId" = f.id`
    )
    .addSelect('COALESCE("groupedSubs"."subsCount", 0)')
    .orderBy({ active: 'DESC', 'f.name': 'ASC' });

  const withFiltering = q
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

  const count = await withFiltering.getCount();

  const mapper = {
    name: 'f.name',
    enabled: 'f.enabled',
    cids: 'COALESCE("groupedCids"."cidsCount", 0)',
    subs: 'COALESCE("groupedSubs"."subsCount", 0)',
  };

  const withSorting =
    !sort || !Object.keys(sort).length
      ? withFiltering
      : Object.keys(sort).reduce(
          (query, key) =>
            mapper[key]
              ? query.orderBy(
                  mapper[key],
                  'DESC' === `${sort[key]}`.toUpperCase() ? 'DESC' : 'ASC'
                )
              : query,
          withFiltering
        );

  let data = await withSorting
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getMany();

  data = getPage(data, page, per_page);

  const newTypeData = data as FilterItem[];

  const filters = newTypeData.map((f) => {
    const pf = f.provider_Filters.filter((pf) => {
      return pf.provider.id.toString() === providerId;
    })[0];
    return { ...f, enabled: pf.active };
  });

  return {
    count,
    filters,
  };
};

export const getPage = (
  filters: Filter[],
  page: number,
  per_page: number
): Filter[] => {
  const offset = page * per_page;
  let finalIndex = offset + per_page;
  if (offset > filters.length) {
    return [];
  }

  if (finalIndex > filters.length) {
    finalIndex = filters.length;
  }

  return filters.slice(offset, finalIndex);
};

export const getDeclinedDealsCount = (providerId) => {
  return getRepository(Deal)
    .createQueryBuilder('deal')
    .where('deal.provider.id = :providerId', { providerId })
    .andWhere('deal.status = :dealStatus', { dealStatus: DealStatus.Rejected })
    .getCount();
};

export const getFilterByShareId = (shareId, providerId) => {
  return getRepository(Filter)
    .createQueryBuilder('filter')
    .where('filter.shareId = :shareId', { shareId })
    .andWhere('filter.provider.id <> :providerId', { providerId })
    .loadAllRelationIds()
    .getOne();
};

export const getPublicFiltersByCid = (cid: string) => {
  return getRepository(Filter)
    .createQueryBuilder('filter')
    .innerJoin('filter.cids', 'c')
    .andWhere('filter.visibility = :visibility')
    .andWhere('c.cid = :cid')
    .setParameter('visibility', Visibility.Public)
    .setParameter('cid', cid)
    .getMany();
};

export const isProviderSubbedToSafer = async (providerId) => {
  const entityManager = getManager();

  const result = await entityManager.query(`
      SELECT * FROM provider_filter
      WHERE "providerId"=${providerId} AND "filterId"=(SELECT id FROM filter WHERE name='Safer');
  `);

  return result.length > 0;
};

export const addSaferSubToProvider = async (providerId) => {
  const entityManager = getManager();

  await entityManager.query(`
      INSERT INTO provider_filter (created, "providerId", "filterId")
      VALUES ((SELECT NOW()), ${providerId}, (SELECT id FROM filter WHERE name='Safer'));
  `);
};

export const removeSaferSubFromProvider = async (providerId) => {
  const entityManager = getManager();

  await entityManager.query(`
      DELETE FROM provider_filter
      WHERE "providerId"=${providerId} AND "filterId"=(SELECT id FROM filter WHERE name='Safer');
  `);
};

export const checkForSameNameFilters = (name: string) => {
  return getRepository(Filter)
    .createQueryBuilder('filter')
    .where('LOWER(filter.name) = LOWER(:name)', { name })
    .getOne();
};
