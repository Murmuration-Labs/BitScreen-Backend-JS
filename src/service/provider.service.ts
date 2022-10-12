import { Cid } from 'entity/Cid';
import { Deal } from 'entity/Deal';
import { Filter } from 'entity/Filter';
import { Provider_Filter } from 'entity/Provider_Filter';
import { Config } from 'entity/Settings';
import { getRepository, IsNull, Not } from 'typeorm';
import { Provider } from '../entity/Provider';
import { getAddressHash } from './crypto';

export const addTextToNonce = (nonce, walletAddress) => {
  const customMessage = `Welcome to BitScreen!
    
    Your authentication status will be reset after 1 week.
    
    Wallet address:
    ${walletAddress}
    
    Nonce:
    ${nonce}
    `;

  return customMessage;
};

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
  wallet: string,
  relations: Array<keyof Provider> = []
) => {
  return getActiveProvider(
    'walletAddressHashed',
    getAddressHash(wallet),
    relations
  );
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
