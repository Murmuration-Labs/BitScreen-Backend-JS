import {getRepository, SelectQueryBuilder} from "typeorm";
import {Filter} from "../entity/Filter";
import {Cid} from "../entity/Cid";
import {Provider_Filter} from "../entity/Provider_Filter";
import {Visibility} from "../entity/enums";


export const getLocalCid = async (_filterId: number, _providerId: number, _cid: string) => {
    return getRepository(Cid)
        .createQueryBuilder('c')
        .select(['c', 'f.id', 'f.shareId', 'f.name'])
        .innerJoin('c.filter', 'f')
        .andWhere('f.id != :_filterId', { _filterId })
        .andWhere('f.provider = :_providerId', { _providerId })
        .andWhere('c.cid ilike :_cid', { _cid })
        .getMany()
}

export const getCidsForProviderBaseQuery = (_providerId: number) => {
    return getRepository(Cid)
        .createQueryBuilder('c')
        .select('c.cid', 'cid')
        .addSelect('c.hashedCid', 'hashedCid')
        .innerJoin('c.filter', 'f')
        .innerJoin(Provider_Filter, 'pv', 'pv.filter = f.id')
        .andWhere('pv.provider = :_providerId', {_providerId})
        .andWhere('pv.active is TRUE')
}

export const getBlockedCidsForProvider = (_providerId: number) => {
    return getCidsForProviderBaseQuery(_providerId)
        .leftJoin('(' + getOverridenCidsForProviderQuery(_providerId).getQuery() + ')', 'over', 'over.cid = c.cid')
        .andWhere('over.cid is NULL')
        .andWhere('f.visibility != :visibility')
        .setParameter('visibility', Visibility.Exception)
        .getRawMany()
        .then((cids) => {
            return cids.map((cid) => cid.hashedCid)
        })
}

export const getOverridenCidsForProviderQuery = (_providerId: number) => {
    return getCidsForProviderBaseQuery(_providerId)
        .andWhere('f.visibility = :visibility')
        .setParameter('visibility', Visibility.Exception)
}
