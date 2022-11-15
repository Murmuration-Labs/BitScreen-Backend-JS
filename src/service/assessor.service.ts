import { Assessor } from '../entity/Assessor';
import { getRepository, IsNull, Not } from 'typeorm';
import { Complaint } from '../entity/Complaint';
import { getAddressHash } from './crypto';
import { Provider } from '../entity/Provider';
import { getActiveProviderById } from './provider.service';

export const getAllAssessors = () => {
  return getRepository(Complaint)
    .query(
      `
      select p."businessName", c."assessorId" as id, a.created, count(c."resolvedOn" is not null OR null) as "resolvedCount"
      from assessor a
      inner join complaint c
      on a.id = c."assessorId"
      inner join provider p
      on a."providerId" = p.id
      where a."deletedAt" is NULL
      group by c."assessorId", p."businessName", a.created;
    `
    )
    .catch((e) => console.log(e));
};

export const getAssessorComplaintsCount = async (id: string) => {
  const res = await getRepository(Assessor)
    .createQueryBuilder('a')
    .addSelect('COUNT(*) numComplaints')
    .leftJoin(Complaint, 'c', 'c.assessorId = a.id')
    .andWhere('a.id = :id')
    .andWhere('c.status > 0')
    .setParameter('id', id)
    .groupBy('a.id')
    .getRawOne();

  return Object.assign(
    {},
    ...Object.keys(res).map((key) => ({ [key.replace(/^p_/, '')]: res[key] }))
  );
};

export const getActiveAssessor = (
  identificationKey: string,
  identificationValue: string,
  relations: Array<keyof Assessor> = []
) => {
  return getRepository(Assessor).findOne({
    join: {
      alias: 'assessor',
      leftJoinAndSelect: { provider: 'assessor.provider' },
    },
    relations,
    where: (qb) => {
      qb.where({
        [identificationKey]: identificationValue,
      }).andWhere('provider."deletedAt" IS NULL');
    },
  });
};

export const getActiveAssessorByEmail = (
  email: string,
  relations: Array<keyof Assessor> = []
) => {
  return getActiveAssessor('loginEmail', email, relations);
};

export const getActiveAssessorByWallet = (
  wallet: string,
  relations: Array<keyof Assessor> = []
) => {
  return getActiveAssessor(
    'walletAddressHashed',
    getAddressHash(wallet),
    relations
  );
};

export const getActiveAssessorByProviderId = (
  providerId: number | string,
  relations: Array<keyof Assessor> = []
) => {
  return getRepository(Assessor).findOne(
    {
      provider: {
        id: typeof providerId === 'string' ? parseInt(providerId) : providerId,
      },
    },
    relations.length ? { relations } : null
  );
};

export const softDeleteAssessor = async (assessor: Assessor) => {
  assessor.loginEmail = null;
  assessor.walletAddressHashed = null;
  const provider = await getActiveProviderById(assessor.provider.id);
  provider.deletedAt = new Date();
  provider.loginEmail = null;
  provider.walletAddressHashed = null;
  await getRepository(Provider).save(provider);
};
