import { Deal, DealType } from '../entity/Deal';
import { getRepository, SelectQueryBuilder } from 'typeorm';
import { Cid } from '../entity/Cid';

export enum BucketSize {
  Daily = 'daily',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export const getCidForProvider = async (providerId: number, cid: string) => {
  return getRepository(Cid)
    .createQueryBuilder('cid')
    .innerJoin('cid.filters', 'f')
    .innerJoin('f.provider_Filters', 'p_v')
    .andWhere('p_v.providerId = :providerId', { providerId: providerId })
    .andWhere('cid.cid = :cidString', { cidString: cid })
    .getOne();
};

export const getStatsBaseQuery = (
  providerId: number
): SelectQueryBuilder<Deal> => {
  return getRepository(Deal)
    .createQueryBuilder('d')
    .select([
      'COUNT(distinct d.cid) as unique_blocked',
      'COUNT(d) as total_blocked',
    ])
    .andWhere('d.providerId = :providerId', { providerId: providerId });
};

export const addStartInterval = (
  query: SelectQueryBuilder<Deal>,
  start
): SelectQueryBuilder<Deal> => {
  query.andWhere("to_char(d.created, 'YYYY-MM-DD') >= :startDate", {
    startDate: start,
  });

  return query;
};

export const addEndInterval = (
  query: SelectQueryBuilder<Deal>,
  end
): SelectQueryBuilder<Deal> => {
  query.andWhere("to_char(d.created, 'YYYY-MM-DD') <= :endDate", {
    endDate: end,
  });

  return query;
};

export const setBucketSize = (
  query: SelectQueryBuilder<Deal>,
  bucketSize
): SelectQueryBuilder<Deal> => {
  switch (bucketSize) {
    case BucketSize.Daily:
      query.addSelect("to_char(d.created, 'YYYY-MM-DD') as key");
      query.groupBy("to_char(d.created, 'YYYY-MM-DD')");
      break;
    case BucketSize.Monthly:
      query.addSelect("to_char(d.created, 'YYYY-MM') as key");
      query.groupBy("to_char(d.created, 'YYYY-MM')");
      break;
    case BucketSize.Yearly:
      query.addSelect("to_char(d.created, 'YYYY') as key");
      query.groupBy("to_char(d.created, 'YYYY')");
      break;
  }

  return query;
};

export const fillDates = (existing, type, start?, end?) => {
  if (!start) {
    start = Object.keys(existing)[0];
  }

  if (!end) {
    end = new Date();
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  let allDates = {};
  switch (type) {
    case BucketSize.Daily:
      allDates = getDays(startDate, endDate);
      break;
    case BucketSize.Monthly:
      allDates = getMonths(startDate, endDate);
      break;
    case BucketSize.Yearly:
      allDates = getYears(startDate, endDate);
      break;
  }

  existing = {
    ...allDates,
    ...existing,
  };

  return existing;
};

const getDays = (start: Date, end: Date) => {
  let result = {};
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    const key =
      d.getFullYear() +
      '-' +
      ('0' + (d.getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + d.getDate()).slice(-2);
    result[key] = {
      unique_count: 0,
      total_count: 0,
      key: key,
    };
  }

  return result;
};

const getMonths = (start: Date, end: Date) => {
  let result = {};
  for (let d = start; d <= end; d.setMonth(d.getMonth() + 1)) {
    const key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    result[key] = {
      unique_count: 0,
      total_count: 0,
      key: key,
    };
  }

  return result;
};

const getYears = (start: Date, end: Date) => {
  let result = {};
  for (let d = start; d <= end; d.setFullYear(d.getFullYear() + 1)) {
    const key = d.getFullYear();
    result[key] = {
      unique_count: 0,
      total_count: 0,
      key: key,
    };
  }

  return result;
};
