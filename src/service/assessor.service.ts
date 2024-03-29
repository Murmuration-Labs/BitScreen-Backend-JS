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
      select p."businessName", p."deletedAt", c."assessorId" as id, a.created, count(c."resolvedOn") as "resolvedCount"
      from assessor a
      inner join complaint c
      on a.id = c."assessorId"
      inner join provider p
      on a."providerId" = p.id
      where c."resolvedOn" is NOT NULL
      group by c."assessorId", p."businessName", a.created, p."deletedAt";
    `
    )
    .catch((e) => console.log(e));
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

export const getActiveAssessorByAssessorId = (
  assessorId: number | string,
  relations: Array<keyof Assessor> = []
) => {
  return getRepository(Assessor).findOne(
    {
      id: typeof assessorId === 'string' ? parseInt(assessorId) : assessorId,
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
