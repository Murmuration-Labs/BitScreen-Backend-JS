import {Brackets, getManager, getRepository} from "typeorm";
import {Complaint, ComplaintType} from "../entity/Complaint";
import {CreateComplaint} from "./email_templates";
import {logger} from "./logger";
import {Infringement} from "../entity/Infringement";
import {getDealsByCid} from "./web3storage.service";
import {Cid} from "../entity/Cid";

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
  startDate: Date = null,
  region: string = null,
  email: string = null,
  assessor: string = null,
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

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    if (email) {
        console.log(email);
        qb.andWhere('c.email LIKE :email')
            .setParameter('email', email);
    }

    if (assessor) {
        qb.andWhere('c.assessor = :assessor')
            .setParameter('assessor', assessor);
    }

    qb.skip((page - 1) * itemsPerPage);
    qb.take(itemsPerPage);

    const orderByFields = {};
    orderByFields[`c.${orderBy}`] = orderDirection;
    qb.orderBy(orderByFields);

    return qb.getManyAndCount()
}

export const getTypeStats = (
  startDate: Date = null,
  endDate: Date = null,
  region: string = null
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

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany().catch((e) => console.log(e));
}

export const getFileTypeStats = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .innerJoin('c.infringements', 'i')
        .select('i.fileType, COUNT(i.fileType)')
        .groupBy('i.fileType');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany().catch((e) => console.log(e));
}

export const getCountryStats = (
  startDate: Date = null,
  endDate: Date = null,
  region: string = null
) => {
    if (!startDate) {
        startDate = new Date(2000, 0, 0, 0, 0, 0);
    }

    if (!endDate) {
        endDate = new Date(2030, 0, 0, 0, 0, 0);
    }

    if (region) {
        return getRepository(Complaint).query(
            `
          SELECT g.country as scope, count(*) AS count
          FROM   complaint c, jsonb_array_elements(c."geoScope") g(country)
          WHERE c."submitted" is TRUE
              AND c."isSpam" is not TRUE
              AND c."resolvedOn" >'${startDate.toISOString()}'
              AND c."resolvedOn" < '${endDate.toISOString()}'
              AND c."geoScope" ? '${region}'
          GROUP  BY g.country;
      `
        ).catch((e) => console.log(e))
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

export const getInfringementStats = (
  startDate: Date = null,
  endDate: Date = null,
  region: string = null
) => {
    const qb = getRepository(Complaint)
      .createQueryBuilder('c')
      .innerJoin('c.infringements', 'i');

    qb.select('i.accepted, COUNT(*)')
      .andWhere('c.resolvedOn is not NULL')
      .andWhere('c.submitted is TRUE')
      .andWhere('c.isSpam is not TRUE')
      .groupBy('i.accepted');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
          .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
          .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany();
}

export const getFilteredInfringements = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .innerJoin('c.infringements', 'i')
        .leftJoin(Cid, 'cid', 'cid.cid = i.value');

    qb.select('COUNT(DISTINCT i.value)')
        .andWhere('c.resolvedOn is not NULL')
        .andWhere('c.submitted is TRUE')
        .andWhere('c.isSpam is not TRUE')
        .andWhere('cid.cid is not NULL')

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany();
}

export const getComplaintStatusStats = (
  startDate: Date = null,
  endDate: Date = null,
  region: string = null
) => {
    const qb = getRepository(Complaint)
      .createQueryBuilder('c');

    qb.select('c.submitted, COUNT(*)')
      .groupBy('c.submitted');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
          .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
          .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany();
}

export const getComplainantCount = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c');

    qb.select('COUNT(DISTINCT c.email)');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany();
}

export const getAssessorCount = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c');

    qb.select('COUNT(DISTINCT c.assessor)');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    return qb.getRawMany();
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

export const getInfringementMonthlyStats = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .select('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\') as date, COUNT(*)')
        .innerJoin('c.infringements', 'i');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    qb.groupBy('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\')')

    return qb.getRawMany();
}

export const getComplaintsMonthlyStats = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
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

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    qb.groupBy('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\')')

    return qb.getRawMany();
}

export const getComplainantsMonthlyStats = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .select('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\') as date, COUNT(DISTINCT c.email)');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

    qb.groupBy('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\')')

    return qb.getRawMany();
}

export const getAssessorsMonthlyStats = (
    startDate: Date = null,
    endDate: Date = null,
    region: string = null
) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .select('TO_CHAR(c.resolvedOn, \'DD/MM/YYYY\') as date, COUNT(DISTINCT c.assessor)');

    if (startDate) {
        qb.andWhere('c.resolvedOn > :start_date')
            .setParameter('start_date', startDate);
    }

    if (endDate) {
        qb.andWhere('c.resolvedOn < :end_date')
            .setParameter('end_date', endDate);
    }

    if (region) {
        qb.andWhere('c.geoScope ? :region')
            .setParameter('region', region);
    }

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

    qb.leftJoin('fl.provider_Filters', 'pv')
        .addSelect('pv');

    qb.leftJoin('pv.provider', 'provider')
        .addSelect('provider.walletAddressHashed');

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

export const getComplaintsByComplainant = (complainant: string, limit: number = 0, excluded: number[] = [], submitted: boolean = null) => {
    const qb = getRepository(Complaint).createQueryBuilder('c')
      .innerJoin('c.infringements', 'i')
      .addSelect('i');

    if (submitted !== null) {
        qb.andWhere('c.submitted = :submitted')
            .setParameter('submitted', submitted);
    }

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

export const getComplaintsByCid = (cid: string, limit: number = 0, excluded: number[] = [], submitted: boolean = null) => {
    const qb = getRepository(Complaint).createQueryBuilder('c');

    qb.innerJoin('c.infringements', 'i')
        .addSelect('i')
        .andWhere('i.value = :cid')
        .orderBy('c.created')
        .setParameter('cid', cid);

    if (submitted !== null) {
        qb.andWhere('c.submitted = :submitted')
            .setParameter('submitted', submitted);
    }

    if (excluded.length > 0) {
        qb.andWhere('c._id NOT IN (:...excluded)')
          .setParameter('excluded', excluded);
    }

    if (limit > 0) {
        qb.limit(limit);
    }

    return qb.getMany();
}

export const updateHostedNodesForInfringement = (infringement: Infringement) => {
    getDealsByCid(infringement.value).then((deals) => {
        const hostedBy = [];
        for (const deal of deals) {
            hostedBy.push({
                node: deal.storageProvider,
                dealId: deal.dealId
            })
        }
        infringement.hostedBy = hostedBy;
        infringement.resync = false;
        return getRepository(Infringement).save(infringement);
    })
}
