import { getRepository, SelectQueryBuilder } from 'typeorm';
import { Filter } from '../entity/Filter';
import { Cid } from '../entity/Cid';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Visibility } from '../entity/enums';

export const getLocalCid = async (
  _filterId: number,
  _providerId: number,
  _cid: string,
  isException: boolean
) => {
  let query = getRepository(Cid)
    .createQueryBuilder('c')
    .select(['c', 'f.id', 'f.shareId', 'f.name'])
    .innerJoin('c.filters', 'f')
    .innerJoin(Provider_Filter, 'pv', 'pv.filter = f.id')
    .andWhere('f.id != :_filterId', { _filterId })
    .andWhere('f.provider = :_providerId', { _providerId })
    .andWhere('c.cid ilike :_cid', { _cid })
    .andWhere('pv.provider = :_providerId', { _providerId });

  if (isException) {
    query = query.andWhere('f.visibility != :visibility');
  } else {
    query = query.andWhere('f.visibility = :visibility');
  }

  query = query.setParameter('visibility', Visibility.Exception);
  return query.getMany();
};

export const getCidsForProviderBaseQuery = (_providerId: number) => {
  return getRepository(Cid)
    .createQueryBuilder('c')
    .select('c.cid', 'cid')
    .addSelect('c.hashedCid', 'hashedCid')
    .innerJoin('c.filters', 'f')
    .innerJoin(Provider_Filter, 'pv', 'pv.filter = f.id')
    .andWhere('pv.provider = :_providerId', { _providerId })
    .andWhere('pv.active is TRUE');
};

export const getBlockedCidsForProvider = (_providerId: number) => {
  return getCidsForProviderBaseQuery(_providerId)
    .leftJoin(
      '(' + getOverridenCidsForProviderQuery(_providerId).getQuery() + ')',
      'over',
      'over.cid = c.cid'
    )
    .andWhere('over.cid is NULL')
    .andWhere('f.visibility != :visibility')
    .setParameter('visibility', Visibility.Exception)
    .getRawMany()
    .then((cids) => {
      return cids.map((cid) => cid.hashedCid);
    });
};

export const getOverridenCidsForProviderQuery = (_providerId: number) => {
  return getCidsForProviderBaseQuery(_providerId)
    .andWhere('f.visibility = :visibility')
    .setParameter('visibility', Visibility.Exception);
};

export const getCidByProvider = (_providerId: number, _cid: string) => {
  return getCidsForProviderBaseQuery(_providerId)
    .andWhere('c.cid = :cid')
    .setParameter('cid', _cid)
    .getRawMany();
};
