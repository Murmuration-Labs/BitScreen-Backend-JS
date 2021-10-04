import {Brackets, getRepository, SelectQueryBuilder} from "typeorm";
import {Filter} from "../entity/Filter";
import {Cid} from "../entity/Cid";
import {Provider_Filter} from "../entity/Provider_Filter";
import {Visibility} from "../entity/enums";
import {FilterItem, GetFiltersPagedProps} from "../entity/interfaces";
import {Deal, DealStatus} from "../entity/Deal";

export const getOwnedFiltersBaseQuery = (providerId: number): SelectQueryBuilder<Filter> => {
    return getRepository(Filter)
        .createQueryBuilder('f')
        .where('f.provider.id = :providerId', {
            providerId,
        });
}

export const getOwnedFilterById = (filterId, providerId) => {
    return getOwnedFiltersBaseQuery(providerId)
        .leftJoinAndSelect('f.provider', 'p')
        .leftJoinAndSelect('f.provider_Filters', 'pf')
        .leftJoinAndSelect('f.cids', 'cids')
        .andWhere('f.id = :id', { filterId })
        .getOne()
}

export const getFilterById = (filterId) => {
    return getRepository(Filter)
        .createQueryBuilder('f')
        .leftJoinAndSelect('f.provider', 'p')
        .where('f.id = :id', { filterId })
        .loadRelationCountAndMap('f.cidsCount', 'f.cids')
        .getOne();
}

export const getPublicFiltersBaseQuery = (alias: string, providerId): SelectQueryBuilder<Filter> => {
    return getRepository(Filter)
        .createQueryBuilder(alias)
        .leftJoinAndSelect(`${alias}.provider`, `p`)
        .leftJoin(
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
}

export const addFilteringToFilterQuery = (alias: string, baseQuery: SelectQueryBuilder<Filter>, params): SelectQueryBuilder<Filter> => {
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

    return baseQuery
}

export const addSortingToFilterQuery = (alias: string, baseQuery: SelectQueryBuilder<Filter>, sort): SelectQueryBuilder<Filter> => {
    const mapper = {
        providerId: `p.id`,
        providerName: `p.businessName`,
        providerCountry: `p.country`,
        cids: '"cidsCount"',
        subs: '"subsCount"',
    };

    return Object.keys(sort).reduce(
        (query, key) =>
            query.orderBy(
                mapper[key] || `${alias}.${key}`,
                'DESC' === `${sort[key]}`.toUpperCase() ? 'DESC' : 'ASC'
            ),
        baseQuery
    );
}

export const addPagingToFilterQuery = (alias: string, baseQuery: SelectQueryBuilder<Filter>, page, perPage): SelectQueryBuilder<Filter> => {
    return baseQuery.offset(page * perPage).limit(perPage);
}

export const getPublicFilterDetailsBaseQuery = (shareId: number, providerId: number): SelectQueryBuilder<Filter> => {
    return getRepository(Filter)
        .createQueryBuilder('filter')
        .addSelect((subQuery) => {
            return subQuery
                .select('count(p_v.id)')
                .from(Provider_Filter, 'p_v')
                .where('p_v.providerId = :providerId', { providerId })
                .andWhere(`p_v.filterId = filter.id`)
                .andWhere(`filter.provider.id != :providerId`, { providerId });
        }, 'isImported')
        .where('filter.shareId = :shareId', { shareId })
        .andWhere('filter.visibility = :visibility', {
            visibility: Visibility.Public,
        })
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

export const getDeclinedDealsCount = (providerId) => {
    return getRepository(Deal)
        .createQueryBuilder('deal')
        .where('deal.provider.id = :providerId', { providerId })
        .andWhere('deal.status = :dealStatus', { dealStatus: DealStatus.Rejected })
        .getCount();
}

export const getFilterByShareId = (shareId, providerId) => {
    return getRepository(Filter)
        .createQueryBuilder('filter')
        .where('filter.shareId = :shareId', { shareId })
        .andWhere('filter.provider.id <> :providerId', { providerId })
        .loadAllRelationIds()
        .getOne();
}
