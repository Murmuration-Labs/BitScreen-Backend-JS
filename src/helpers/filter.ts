import { Brackets, getRepository } from 'typeorm';
import { Filter } from '../entity/Filter';
import { FilterItem, GetFiltersPagedProps } from '../entity/interfaces';
import { Provider_Filter } from '../entity/Provider_Filter';

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

const generateRequests = () => {
  const totalRequestsBlocked = Math.ceil(Math.random() * 500) + 100;
  const totalCidsFiltered =
    totalRequestsBlocked -
    Math.ceil(Math.random() * (totalRequestsBlocked - 50));

  return {
    totalRequestsBlocked,
    totalCidsFiltered,
  };
};

// export const mockDealsData = (
//   periodType: PeriodType,
//   periodInterval: PeriodInterval
// ) => {
//   const dealsData = [];

//   let startDate = moment.unix(periodInterval.startDate / 1000);
//   let endDate = moment.unix(periodInterval.endDate / 1000);
//   switch (periodType) {
//     case PeriodType.daily:
//       const days = [];
//       const days2 = [];
//       const interim = startDate.clone();
//       while (endDate > interim || interim.format('D') === endDate.format('D')) {
//         days.push(interim.format('DD.MM'));
//         interim.add(1, 'day');
//       }

//       const dayDifference = endDate
//         .endOf('day')
//         .diff(startDate.startOf('day'), 'days');
//       for (let i = 0; i <= dayDifference; i += 1) {
//         const interim = startDate.clone();
//         const date = interim.add(i, 'days').format('DD.MM');
//         days2.push(date);

//         const { totalRequestsBlocked, totalCidsFiltered } = generateRequests();

//         const entry = {
//           date,
//           totalRequestsBlocked,
//           totalCidsFiltered,
//         };
//         dealsData.push(entry);
//       }
//       break;

//     case PeriodType.monthly:
//       const months = [];
//       while (
//         endDate > startDate ||
//         startDate.format('M') === endDate.format('M')
//       ) {
//         months.push(startDate.format('MM.YYYY'));
//         startDate.add(1, 'month');
//       }

//       const { totalRequestsBlocked, totalCidsFiltered } = generateRequests();

//       for (let i = 0; i < months.length; i += 1) {
//         const entry = {
//           date: months[i],
//           totalRequestsBlocked,
//           totalCidsFiltered,
//         };
//         dealsData.push(entry);
//       }
//       break;

//     case PeriodType.yearly:
//       const years = [];
//       while (
//         endDate > startDate ||
//         startDate.format('Y') === endDate.format('Y')
//       ) {
//         years.push(startDate.format('YYYY'));
//         startDate.add(1, 'year');
//       }
//       for (let i = 0; i < years.length; i += 1) {
//         const { totalRequestsBlocked, totalCidsFiltered } = generateRequests();

//         const entry = {
//           date: years[i],
//           totalRequestsBlocked,
//           totalCidsFiltered,
//         };
//         dealsData.push(entry);
//       }
//       break;
//   }
//   console.log(dealsData);
//   return dealsData;
// };
