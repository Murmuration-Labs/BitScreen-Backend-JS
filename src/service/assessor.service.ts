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
