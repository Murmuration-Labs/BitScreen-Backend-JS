import { Assessor } from '../entity/Assessor';
import { getRepository } from 'typeorm';
import { Complaint } from '../entity/Complaint';

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
