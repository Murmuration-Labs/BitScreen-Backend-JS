import { getRepository, IsNull } from 'typeorm';
import validator from 'validator';
import { Cid } from '../entity/Cid';
import { Deal } from '../entity/Deal';
import { Filter } from '../entity/Filter';
import { AccountType, Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Config } from '../entity/Settings';
import { getAddressHash } from './crypto';
import { isNotObject } from './util.service';

export const getProviderByMinerId = (minerId: string) => {
  return getRepository(Provider)
    .createQueryBuilder('p')
    .andWhere('p.minerId = :minerId')
    .andWhere('p.deletedAt is NULL')
    .setParameter('minerId', minerId)
    .getOne();
};

export const getActiveProvider = (
  identificationKey: string,
  identificationValue: string,
  relations: Array<string> = []
) => {
  return getRepository(Provider).findOne(
    {
      [identificationKey]: identificationValue,
      deletedAt: IsNull(),
    },
    relations.length ? { relations } : null
  );
};

export const getActiveProviderByEmail = (
  email: string,
  relations: Array<keyof Provider> = []
) => {
  return getActiveProvider('loginEmail', email, relations);
};

export const getActiveProviderByWallet = (
  hashedWallet: string,
  relations: Array<keyof Provider> = []
) => {
  return getActiveProvider('walletAddressHashed', hashedWallet, relations);
};

export const getActiveProviderById = (
  providerId: number | string,
  relations: Array<string> = []
) => {
  return getRepository(Provider).findOne(
    {
      id: typeof providerId === 'string' ? parseInt(providerId) : providerId,
    },
    relations.length ? { relations } : null
  );
};

export const softDeleteProvider = async (provider: Provider) => {
  let cidIds = [];
  let providerFilterIds = [];
  const filterIds = [];
  const dealIds = provider.deals.map((deal) => deal.id);

  for (const filter of provider.filters) {
    if (filter.provider.id !== provider.id) {
      continue;
    }
    filterIds.push(filter.id);
    cidIds = cidIds.concat(filter.cids.map((cid) => cid.id));
    providerFilterIds = providerFilterIds.concat(
      filter.provider_Filters.map((pf) => pf.id)
    );
  }

  for (const providerFilter of provider.provider_Filters) {
    if (!providerFilterIds.includes(providerFilter.id)) {
      providerFilterIds.push(providerFilter.id);
    }
  }

  const config = await getRepository(Config).findOne({
    where: {
      provider,
    },
  });

  if (dealIds.length) {
    await getRepository(Deal).delete(dealIds);
  }

  if (cidIds.length) {
    await getRepository(Cid).delete(cidIds);
  }

  if (providerFilterIds.length) {
    await getRepository(Provider_Filter).delete(providerFilterIds);
  }

  if (filterIds.length) {
    await getRepository(Filter).delete(filterIds);
  }

  await getRepository(Config).delete(config.id);

  provider.deletedAt = new Date();
  await getRepository(Provider).save(provider);
};

// used to check if information sent on the put route of the provider contains proper data
// i.e. there wasn't any other information sent that was not related to that type of update type (defined by ProviderDataToUpdate enum)
export const isProviderUpdateDataCorrect = (updateData: any) => {
  const { config, provider } = updateData;

  if (!config && !provider) {
    return {
      success: false,
      message: 'Request data is not correct',
    };
  }

  if (config) {
    if (isNotObject(config)) {
      return {
        success: false,
        message: 'The config key of the request data is not an object',
      };
    }
    const objectKeysConfig = Object.keys(config);
    if (objectKeysConfig.length !== 3) {
      return {
        success: false,
        message: 'Config object contains more keys than it should',
      };
    }

    for (let i = 0; i < objectKeysConfig.length; i++) {
      if (!['bitscreen', 'import', 'share'].includes(objectKeysConfig[i])) {
        return {
          success: false,
          message: 'Config object contains keys that should not be part of it',
        };
      }
    }
  }

  if (provider) {
    if (isNotObject(provider)) {
      return {
        success: false,
        message: 'The provider key of the request data is not an object',
      };
    }
    const objectKeysProvider = Object.keys(provider);
    for (let i = 0; i < objectKeysProvider.length; i++) {
      if (
        ![
          'contactPerson',
          'businessName',
          'website',
          'email',
          'address',
          'country',
          'minerId',
        ].includes(objectKeysProvider[i])
      ) {
        return {
          success: false,
          message:
            'Provider object contains keys that should not be part of it',
        };
      }
    }
  }

  return {
    success: true,
    message: '',
  };
};

// used to check if the data sent for the provider-config pair is valid
export const isProviderConfigDataValid = (
  providerData: Partial<{
    address: string;
    contactPerson: string;
    website: string;
    email: string;
    country: string;
    minerId: string;
    businessName: string;
  }>,
  configData: Partial<{
    bitscreen: boolean;
    share: boolean;
    import: boolean;
  }>,
  currentProviderData: Provider,
  currentConfigData: {
    bitscreen: boolean;
    import: boolean;
    share: boolean;
  }
) => {
  if (
    currentProviderData.accountType === AccountType.Assessor &&
    (!providerData.contactPerson ||
      !providerData.businessName ||
      !providerData.website ||
      !providerData.email ||
      !providerData.address ||
      !providerData.country)
  ) {
    return {
      success: false,
      message: 'Assessor type account must provide all required information',
    };
  }

  if (currentProviderData.accountType === AccountType.NodeOperator) {
    if (
      !configData.bitscreen &&
      !currentConfigData.bitscreen &&
      (currentConfigData.import ||
        currentConfigData.share ||
        configData.import ||
        configData.share)
    ) {
      return {
        success: false,
        message:
          'In order to enable sharing / importing functionalities you must first enable the BitScreen lists functionality',
      };
    }

    if (
      (configData.import || currentConfigData.import) &&
      (!providerData.country || !providerData.minerId || !providerData.email)
    ) {
      return {
        success: false,
        message:
          'Node operator type account must provide country, miner id and email to activate filter list importing',
      };
    }

    if (
      (configData.share || currentConfigData.share) &&
      !configData.import &&
      !currentConfigData.import
    ) {
      return {
        success: false,
        message:
          'In order to activate the sharing lists functionality you must first activate the importing lists functionality',
      };
    }

    if (
      (configData.share || currentConfigData.share) &&
      (!providerData.contactPerson ||
        !providerData.businessName ||
        !providerData.address ||
        !providerData.website)
    ) {
      return {
        success: false,
        message:
          'Node operator type account must provide contact person, business name, address and website to activate filter list sharing',
      };
    }
  }

  if (providerData.website && !validator.isURL(providerData.website)) {
    return {
      success: false,
      message: 'Provided website is not a valid URL',
    };
  }

  if (providerData.email && !validator.isEmail(providerData.email)) {
    return {
      success: false,
      message: 'Provided email is not a valid email address',
    };
  }

  return {
    success: true,
    message: '',
  };
};
