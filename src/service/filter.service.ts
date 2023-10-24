import {
  Brackets,
  SelectQueryBuilder,
  getManager,
  getRepository,
} from 'typeorm';
import { Deal, DealStatus } from '../entity/Deal';
import { Filter } from '../entity/Filter';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Visibility } from '../entity/enums';
import { FilterItem, GetFiltersPagedProps } from '../entity/interfaces';

export const getFiltersBaseQuery = () => {
  return getRepository(Filter)
    .createQueryBuilder('f')
    .leftJoin('f.networks', 'n')
    .addSelect('n.networkType')
    .leftJoinAndSelect('f.provider', 'p');
};

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
    .leftJoin('f.networks', 'n')
    .addSelect('n.networkType')
    .andWhere('f.id = :id', { filterId })
    .getOne();
};

export const getFilterById = (filterId) => {
  return getFiltersBaseQuery()
    .where('f.id = :id', { filterId })
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getOne();
};

export const getPublicFiltersBaseQuery = (
  alias: string,
  providerId
): SelectQueryBuilder<Filter> => {
  return getFiltersBaseQuery()
    .leftJoin(
      (qb) =>
        qb
          .from(Filter, 'subqueryFilter')
          .innerJoin('subqueryFilter.cids', 'cidLink')
          .select('subqueryFilter.id', 'filterId')
          .addSelect('COUNT("cidLink"."cid")', 'cidsCount')
          .groupBy('subqueryFilter.id'),
      'groupedCids',
      `"groupedCids"."filterId" = ${alias}.id`
    )
    .innerJoin(
      Provider_Filter,
      'owner_pf',
      '"owner_pf"."providerId" = "f"."providerId" and "owner_pf"."filterId" = "f"."id" and "owner_pf"."active" is true'
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
          select * from "cid" 
          inner join "filter_cids_cid" 
          on "filter_cids_cid"."cidId" = "cid"."id" and "filter_cids_cid"."filterId" = ${alias}."id"
          and lower("cid"."cid") like lower(:q)
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
  return getFiltersBaseQuery()
    .leftJoinAndSelect('f.provider_Filters', 'pf')
    .leftJoinAndSelect('pf.provider', 'pf_p')
    .addSelect((subQuery) => {
      return subQuery
        .select('count(c.id)')
        .from(Filter, 'filter')
        .leftJoin('filter.cids', 'c')
        .where('filter.shareId = :shareId', { shareId });
    }, 'cidsCount')
    .addSelect((subQuery) => {
      return subQuery
        .select('count(p_v.id)')
        .from(Provider_Filter, 'p_v')
        .where('p_v.providerId = :providerId', { providerId })
        .andWhere(`p_v.filterId = f.id`)
        .andWhere(`f.provider.id != :providerId`, { providerId });
    }, 'isImported')
    .where('f.shareId = :shareId', { shareId })
    .andWhere('f.visibility IN (:...visibility)', {
      visibility: [Visibility.Public, Visibility.Shared],
    });
};

export const getFiltersPaged = async ({
  providerId,
  q,
  network,
  sort,
  page,
  per_page,
}: GetFiltersPagedProps) => {
  const baseQuery = getFiltersBaseQuery()
    .distinct(true)
    .innerJoin(Provider_Filter, 'own_p_f', 'own_p_f.filter.id = f.id')
    .andWhere('own_p_f.providerId = :providerId', { providerId })
    .leftJoinAndSelect('f.provider_Filters', 'p_f', 'p_f.filter.id = f.id')
    .leftJoinAndSelect('p_f.provider', 'prov')
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

  if (network) {
    baseQuery
      .andWhere('n.networkType = :network')
      .setParameter('network', network);
  }

  const withFiltering = q
    ? baseQuery.andWhere(
        new Brackets((qb) =>
          qb
            .orWhere('lower(f.name) like :q', { q })
            .orWhere('lower(f.description) like :q', { q })
            .orWhere(
              `exists (
                select * from cid "queryCid"
                  inner join "filter_cids_cid" 
                  on "filter_cids_cid"."cidId" = "queryCid"."id" and "filter_cids_cid"."filterId" = f."id"
                  and lower("queryCid"."cid") like lower(:q)
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
  return getFiltersBaseQuery()
    .where('f.shareId = :shareId', { shareId })
    .andWhere('f.provider.id <> :providerId', { providerId })
    .loadAllRelationIds()
    .getOne();
};

export const getPublicFiltersByCid = (cid: string) => {
  return getFiltersBaseQuery()
    .innerJoin('f.cids', 'c')
    .andWhere('f.visibility = :visibility')
    .andWhere('c.cid = :cid')
    .setParameter('visibility', Visibility.Public)
    .setParameter('cid', cid)
    .getMany();
};

export const isProviderSubbedToSafer = async (providerId) => {
  const entityManager = getManager();

  const result = await entityManager.query(`
      SELECT * FROM provider_filter
      WHERE "providerId"=${providerId} AND "filterId"=(
        SELECT filter.id FROM filter JOIN provider on filter."providerId" = provider.id
          WHERE provider."walletAddressHashed"='f580515d3eec96db2d555131e675a45c4f59248d3d63bf32d13cf9b2b01fedb6'
          AND filter.name='Safer'
      );
  `);

  return result.length > 0;
};

export const addSaferSubToProvider = async (providerId) => {
  const entityManager = getManager();

  await entityManager.query(`
      INSERT INTO provider_filter (created, "providerId", "filterId")
      VALUES ((SELECT NOW()), ${providerId}, (
        SELECT filter.id FROM filter JOIN provider on filter."providerId" = provider.id
          WHERE provider."walletAddressHashed"='f580515d3eec96db2d555131e675a45c4f59248d3d63bf32d13cf9b2b01fedb6'
          AND filter.name='Safer'
      ));
  `);
};

export const removeSaferSubFromProvider = async (providerId) => {
  const entityManager = getManager();

  await entityManager.query(`
      DELETE FROM provider_filter
      WHERE "providerId"=${providerId} AND "filterId"=(
        SELECT filter.id FROM filter JOIN provider on filter."providerId" = provider.id
          WHERE provider."walletAddressHashed"='f580515d3eec96db2d555131e675a45c4f59248d3d63bf32d13cf9b2b01fedb6'
          AND filter.name='Safer'
      );
  `);
};

export const checkForSameNameFilters = (name: string) => {
  return getRepository(Filter)
    .createQueryBuilder('f')
    .where('LOWER(f.name) = LOWER(:name)', { name })
    .getOne();
};

export const getFilterWithProvider = (
  filterId: number,
  relations: Array<keyof Filter>
): Promise<Filter | undefined> => {
  return getRepository(Filter).findOne({
    where: {
      id: filterId,
    },
    relations,
  });
};

export const getFiltersWithCid = (id: number): Promise<Array<Filter>> => {
  const query = getRepository(Filter)
    .createQueryBuilder('f')
    .leftJoin('f.cids', 'c')
    .where('c.id = :cid')
    .setParameter('cid', id);

  return query.getMany();
};

export const adjustNetworksOnMultipleFilters = (filters: Partial<Filter>[]) => {
  return filters.map((filter) => adjustNetworksOnIndividualFilter(filter));
};

export const adjustNetworksOnIndividualFilter = (filter: Partial<Filter>) => {
  const updatedFilter = {
    ...filter,
    networks: filter.networks.map((e) => e.networkType),
  };

  return updatedFilter;
};
