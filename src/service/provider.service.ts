import { getRepository } from 'typeorm';
import { Complaint } from '../entity/Complaint';
import { Provider } from '../entity/Provider';

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
    .setParameter('minerId', minerId)
    .getOne();
};

export const getProviderById = (id: string) => {
  return getRepository(Provider)
    .createQueryBuilder('p')
    .andWhere('p.id = :id')
    .setParameter('id', id)
    .getOne();
};

export const getProviderComplaintsCount = async (id: string) => {
  const res = await getRepository(Provider)
    .createQueryBuilder('p')
    .addSelect('COUNT(*) numComplaints')
    .leftJoin(Complaint, 'c', 'c.assessorId = p.id')
    .andWhere('p.id = :id')
    .andWhere('c.status > 0')
    .setParameter('id', id)
    .groupBy('p.id')
    .getRawOne();

  return Object.assign(
    {},
    ...Object.keys(res).map((key) => ({ [key.replace(/^p_/, '')]: res[key] }))
  );
};
