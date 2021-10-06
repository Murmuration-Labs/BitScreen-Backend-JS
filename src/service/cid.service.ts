import {getRepository} from "typeorm";
import {Filter} from "../entity/Filter";

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
