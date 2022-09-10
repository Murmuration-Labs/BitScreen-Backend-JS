import { Assessor } from 'entity/Assessor';
import { getRepository } from 'typeorm';
import { Complaint } from '../entity/Complaint';

export const getAllAssessors = () => {
  return getRepository(Complaint)
    .query(
      `
      select p."businessName", c."assessorId" as id, p.created, count(c."resolvedOn" is not null OR null) as "resolvedCount"
      from provider p
      inner join complaint c
      on p.id = c."assessorId"
      group by c."assessorId", p."businessName", p.created;
    `
    )
    .catch((e) => console.log(e));
};

export const getProviderComplaintsCount = async (id: string) => {
  const res = await getRepository(Assessor)
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
