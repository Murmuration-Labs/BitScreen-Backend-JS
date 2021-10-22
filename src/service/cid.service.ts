import {getRepository, SelectQueryBuilder} from "typeorm";
import {Filter} from "../entity/Filter";
import {Cid} from "../entity/Cid";
import {Provider_Filter} from "../entity/Provider_Filter";
import {Visibility} from "../entity/enums";

export const getLocalCidCount = async (_filterId: number, _providerId: number, _cid: string) => {
    return getRepository(Filter)
        .createQueryBuilder('f')
        .where('f.id <> :_filterId', { _filterId })
        .andWhere('f.provider.id = :_providerId', { _providerId })
        .andWhere(
            `
                exists (
                  select 1 from cid 
                  where cid."filterId" = f.id 
                  and cid.cid like :_cid 
                )
            `,
            { _cid }
        )
        .getCount();
}

export const getRemoteCidCount = async (_filterId: number, _providerId: number, _cid: string) => {
    return getRepository(Filter)
        .createQueryBuilder('f')
        .where('f.id <> :_filterId', { _filterId })
        .andWhere('f.provider.id <> :_providerId', { _providerId })

        .andWhere(
            `
              exists (
                select 1 from provider_filter p_v
                where p_v."providerId" = :_providerId
                and p_v."filterId" = f.id
              )
          `,
            { _providerId }
        )
        .andWhere(
            `
                exists (
                  select 1 from cid 
                  where cid."filterId" = f.id 
                  and cid.cid like :_cid 
                )
            `,
            { _cid }
        )
        .getCount();
}

export const getCidsForProviderBaseQuery = (_providerId: number) => {
    return getRepository(Cid)
        .createQueryBuilder('c')
        .select('c.cid', 'cid')
        .innerJoin('c.filter', 'f')
        .innerJoin(Provider_Filter, 'pv', 'pv.filter = f.id')
        .andWhere('pv.provider = :_providerId', {_providerId})
}

export const getBlockedCidsForProvider = (_providerId: number) => {
    return getCidsForProviderBaseQuery(_providerId)
        .leftJoin('(' + getOverridenCidsForProviderQuery(_providerId).getQuery() + ')', 'over', 'over.cid = c.cid')
        .andWhere('over.cid is NULL')
        .andWhere('f.visibility != :visibility')
        .setParameter('visibility', Visibility.Exception)
        .getRawMany()
        .then((cids) => {
            return cids.map((cid) => cid.cid)
        })
}

export const getOverridenCidsForProviderQuery = (_providerId: number) => {
    return getCidsForProviderBaseQuery(_providerId)
        .andWhere('f.visibility = :visibility')
        .setParameter('visibility', Visibility.Exception)
}
