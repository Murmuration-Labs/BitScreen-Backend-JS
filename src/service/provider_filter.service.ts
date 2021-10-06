import {getRepository} from "typeorm";
import {Provider_Filter} from "../entity/Provider_Filter";

export const getProviderFilterCount = (providerId, filterId) => {
    return getRepository(Provider_Filter)
        .createQueryBuilder('pf')
        .where('pf.provider.id = :providerId', { providerId })
        .andWhere('pf.filter.id = :filterId', { filterId })
        .getCount();
}
