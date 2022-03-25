import {Brackets, getManager, getRepository} from "typeorm";
import {Complaint, ComplaintType} from "../entity/Complaint";
import {CreateComplaint} from "./email_templates";
import {logger} from "./logger";

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const getComplaintsBaseQuery = (complaintsAlias: string = 'c', infringementAlias: string = 'i') => {
    const qb = getRepository(Complaint)
      .createQueryBuilder(complaintsAlias)
      .leftJoin(`${complaintsAlias}.infringements`, infringementAlias)
      .leftJoin(`${complaintsAlias}.filterLists`, 'fl')
      .addSelect(infringementAlias)
      .addSelect('fl');

    return qb;
}

export const getComplaints = (
  query: string,
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: string = 'created',
  orderDirection: string = 'DESC'
) => {
    const qb = getComplaintsBaseQuery();

    if (query.length > 0) {
        qb.orWhere('c.fullName LIKE :query')
            .orWhere('c.email LIKE :query')
            .orWhere('c.complaintDescription LIKE :query')
            .setParameter('query', `%${query}%`)
    }

    qb.skip((page - 1) * itemsPerPage);
    qb.take(itemsPerPage);

    const orderByFields = {};
    orderByFields[`c.${orderBy}`] = orderDirection;
    qb.orderBy(orderByFields);

    return qb.getManyAndCount()
}

export const getPublicComplaints = (
  query: string,
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: string = 'created',
  orderDirection: string = 'DESC',
  category: string = null,
  startDate: Date = null
) => {
    const qb = getComplaintsBaseQuery();

    if (query.length > 0) {
        qb.andWhere(new Brackets(qb => {
            qb.where('c.fullName LIKE :q')
                .orWhere('i.value LIKE :q')
        }))
            .setParameter('q', query);
    }

    qb.andWhere('c.resolvedOn is not NULL')
        .andWhere('c.submitted is TRUE')
        .andWhere('c.isSpam is not TRUE');

    if (query.length > 0) {
        qb.orWhere('c.complaintDescription LIKE :query')
          .setParameter('query', `%${query}%`)
    }

    if (category) {
        qb.andWhere('c.type = :category')
          .setParameter('category', category);
    }

    if (startDate) {
        qb.andWhere('c.resolvedOn > :startDate')
          .setParameter('startDate', startDate);
    }

    qb.skip((page - 1) * itemsPerPage);
    qb.take(itemsPerPage);

    const orderByFields = {};
    orderByFields[`c.${orderBy}`] = orderDirection;
    qb.orderBy(orderByFields);

    return qb.getManyAndCount()
}

export const getCategoryStats = (
  startDate: Date = null,
  endDate: Date = null
) => {
    const qb = getRepository(Complaint)
      .createQueryBuilder('c')
      .select('c.type, COUNT(c.type)')
      .groupBy('c.type');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
          .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
          .setParameter('end_date', endDate);
    }

    return qb.getRawMany().catch((e) => console.log(e));
}

export const getCountryStats = (
  startDate: Date = null,
  endDate: Date = null
) => {
    if (!startDate) {
        startDate = new Date(2000, 0, 0, 0, 0, 0);
    }

    if (!endDate) {
        endDate = new Date(2030, 0, 0, 0, 0, 0);
    }

    return getRepository(Complaint).query(
      `
          SELECT g.country as scope, count(*) AS count
          FROM   complaint c, jsonb_array_elements(c."geoScope") g(country)
          WHERE c."submitted" is TRUE
              AND c."isSpam" is not TRUE
              AND c."resolvedOn" >'${startDate.toISOString()}'
              AND c."resolvedOn" < '${endDate.toISOString()}'
          GROUP  BY g.country;
      `
    ).catch((e) => console.log(e))
}

export const getCountryMonthlyStats = (
  country: string,
  startDate: Date = null,
  endDate: Date = null
) => {
    const qb = getRepository(Complaint)
      .createQueryBuilder('c')
        .select('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\') as date, COUNT(*)');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
          .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
          .setParameter('end_date', endDate);
    }

    qb.andWhere('(c.geoScope)::jsonb ? :country')
        .setParameter('country', country);

    qb.groupBy('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\')')

    return qb.getRawMany();
}

export const getCategoryMonthlyStats = (
    category: string,
    startDate: Date = null,
    endDate: Date = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .select('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\') as date, COUNT(*)');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    qb.andWhere('c.type = :category')
        .setParameter('category', category);

    qb.groupBy('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\')')

    return qb.getRawMany();
}

export const getComplaintById = (id: string) => {
    const qb = getComplaintsBaseQuery();

    qb.andWhere('c._id = :id')
      .setParameter('id', id);

    qb.orderBy('i.value');

    return qb.getOne();
}

export const getPublicComplaintById = (id: string) => {
    const qb = getComplaintsBaseQuery();

    qb.andWhere('c._id = :id')
        .setParameter('id', id);

    qb.orderBy('i.value');

    return qb.getOne();
}

export const sendCreatedEmail = (receiver) => {
    const msg = {
        to: receiver,
        from: "office@keyko.io",
        subject: CreateComplaint.subject,
        html: CreateComplaint.body,
    };

    sgMail
        .send(msg)
        .then(() => {
            logger.info("Email sent");
        })
        .catch((error) => {
            logger.error(error);
        });
};

export const getComplaintsByComplainant = (complainant: string, limit: number = 0, excluded: number[] = []) => {
    const qb = getRepository(Complaint).createQueryBuilder('c')
      .innerJoin('c.infringements', 'i')
      .addSelect('i');

    qb.andWhere('c.email = :email')
      .orderBy('c.created')
      .setParameter('email', complainant);

    if (excluded.length > 0) {
        qb.andWhere('c._id NOT IN (:...excluded)')
          .setParameter('excluded', excluded);
    }

    if (limit > 0) {
        qb.limit(limit);
    }

    return qb.getMany();
}

export const getComplaintsByCid = (cid: string, limit: number = 0, excluded: number[] = []) => {
    const qb = getRepository(Complaint).createQueryBuilder('c');

    qb.innerJoin('c.infringements', 'i')
        .addSelect('i')
        .andWhere('i.value = :cid')
        .orderBy('c.created')
        .setParameter('cid', cid);

    if (excluded.length > 0) {
        qb.andWhere('c._id NOT IN (:...excluded)')
          .setParameter('excluded', excluded);
    }

    if (limit > 0) {
        qb.limit(limit);
    }

    return qb.getMany();
}
