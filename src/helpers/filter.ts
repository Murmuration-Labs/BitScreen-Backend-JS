import { ParsedQs } from 'qs';
import { Brackets, getRepository, Timestamp } from 'typeorm';
import { Visibility } from '../entity/enums';
import { Filter } from '../entity/Filter';
import { Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';

interface GetFiltersPagedProps {
  providerId: string;
  q: string | ParsedQs | string[] | ParsedQs[];
  sort: {
    [key: string]: string;
  };
  page: number;
  per_page: number;
}

interface FilterItem extends Filter {
  enabled: boolean;
  id: number;
  name: string;
  description: string;
  override: boolean;
  visibility: Visibility;
  shareId: string;
  provider: Provider;
  provider_Filters: Provider_Filter[];
  cidsCount: number;
  created: Date;
  updated: Date;
}

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
    .leftJoinAndSelect('f.provider_Filters', 'p_f', 'p_f.filter.id = f.id')
    .leftJoinAndSelect('p_f.provider', 'prov')
    .leftJoinAndSelect('f.provider', 'p')
    .leftJoin('f.cids', 'c')
    .addSelect((subQuery) => {
      return subQuery
        .select('active')
        .from(Provider_Filter, 'p_f')
        .where('p_f.providerId = :providerId', { providerId })
        .andWhere(`p_f.filterId = f.id`);
    }, 'active')
    .where(
      `exists (
      select 1 from provider_filter "pf" 
      where "pf"."filterId" = f.id 
      and "pf"."providerId" = :providerId 
    )`,
      { providerId }
    )
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

  const result = withSorting.offset(page * per_page).limit(per_page);

  const data = await result
    .loadRelationCountAndMap('f.cidsCount', 'f.cids')
    .getMany();

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
