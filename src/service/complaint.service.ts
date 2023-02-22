import { Brackets, getRepository, SelectQueryBuilder } from 'typeorm';
import { Complaint } from '../entity/Complaint';
import { CreateComplaint, MarkAsSpam, Reviewed } from './email_templates';
import { logger } from './logger';
import { Infringement } from '../entity/Infringement';
import { getDealsByCid } from './web3storage.service';
import { Cid } from '../entity/Cid';

import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

enum TypeOfDate {
  Created,
  Resolved,
  Submitted,
}

const getComplaintsBaseQuery = (
  complaintsAlias: string = 'c',
  infringementAlias: string = 'i'
) =>
  getRepository(Complaint)
    .createQueryBuilder(complaintsAlias)
    .leftJoin(`${complaintsAlias}.infringements`, infringementAlias)
    .leftJoin(`${complaintsAlias}.filterLists`, 'fl')
    .leftJoinAndSelect('c.assessor', 'a')
    .leftJoinAndSelect('a.provider', 'p')
    .addSelect(infringementAlias)
    .addSelect('fl');

function filterByDatesAndRegions(
  qb: SelectQueryBuilder<any>,
  startDate: Date,
  endDate: Date,
  regions: string[],
  shouldFilterByDates: boolean = true,
  dateToFilter?: TypeOfDate
) {
  let columnForDate: string;
  switch (dateToFilter) {
    case TypeOfDate.Created:
      columnForDate = 'created';
      break;

    case TypeOfDate.Resolved:
      columnForDate = 'resolvedOn';
      break;

    case TypeOfDate.Submitted:
    default:
      columnForDate = 'submittedOn';
      break;
  }

  if (shouldFilterByDates && startDate) {
    qb.andWhere(`c.${columnForDate} > :start_date`).setParameter(
      'start_date',
      startDate
    );
  }

  if (shouldFilterByDates && endDate) {
    qb.andWhere(`c.${columnForDate} < :end_date`).setParameter(
      'end_date',
      endDate
    );
  }

  if (regions && regions.length) {
    qb.andWhere('c.geoScope ?| array[:...region]').setParameter(
      'region',
      regions
    );
  }
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
    qb.orWhere('LOWER(c.fullName) LIKE LOWER(:query)')
      .orWhere('LOWER(c.email) LIKE LOWER(:query)')
      .orWhere('LOWER(c.complaintDescription) LIKE LOWER(:query)')
      .orWhere('LOWER(i.value) LIKE LOWER(:query)')
      .setParameter('query', `%${query}%`);
  }

  if (!isNaN(parseInt(query))) {
    qb.orWhere('c._id = :complaintId', { complaintId: parseInt(query) });
  }

  qb.skip((page - 1) * itemsPerPage);
  qb.take(itemsPerPage);

  const orderByFields = {};
  orderByFields[`c.${orderBy}`] = orderDirection;
  qb.orderBy(orderByFields);

  return qb.getManyAndCount();
};

const getPublishedRecordsBaseQuery = (
  query: string,
  category: string = null,
  startDate: Date = null,
  regions: string[] = null,
  email: string = null,
  assessor: string = null,
  showSpam: boolean
) => {
  const qb = getComplaintsBaseQuery();

  if (query.length > 0) {
    qb.andWhere(
      new Brackets((qb) => {
        qb.where('LOWER(c.fullName) LIKE :q')
          .orWhere('LOWER(i.value) LIKE :q')
          .orWhere('LOWER(c.email) LIKE :q')
          .orWhere('LOWER(p.contactPerson) LIKE :query')
          .orWhere('LOWER(p.businessName) LIKE :query')
          .orWhere('LOWER(c.complaintDescription) LIKE :query');
      })
    )
      .setParameter('q', query.toLowerCase())
      .setParameter('query', `%${query.toLowerCase()}%`);
  }

  qb.andWhere('c.submittedOn is not NULL').andWhere('c.submitted is TRUE');

  if (!showSpam) {
    qb.andWhere('c.isSpam is not TRUE');
  }

  if (category) {
    qb.andWhere('c.type = :category').setParameter('category', category);
  }

  if (startDate) {
    qb.andWhere('c.submittedOn > :startDate').setParameter(
      'startDate',
      startDate
    );
  }

  if (regions) {
    qb.andWhere('c.geoScope ?| array[:...region]').setParameter(
      'region',
      regions
    );
  }

  if (email) {
    qb.andWhere('c.email LIKE :email').setParameter('email', email);
  }

  if (assessor) {
    qb.andWhere('c.assessor = :assessor').setParameter('assessor', assessor);
  }

  return qb;
};

export const getPublicComplaints = async (
  query: string,
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: string = 'created',
  orderDirection: string = 'DESC',
  category: string = null,
  startDate: Date = null,
  regions: string[] = null,
  email: string = null,
  assessor: string = null,
  showSpam: boolean
): Promise<{ complaints: Complaint[]; totalCount: number }> => {
  const qb = getPublishedRecordsBaseQuery(
    query,
    category,
    startDate,
    regions,
    email,
    assessor,
    showSpam
  );

  qb.skip((page - 1) * itemsPerPage);
  qb.take(itemsPerPage);

  const orderByFields = {};
  orderByFields[`c.${orderBy}`] = orderDirection;
  qb.orderBy(orderByFields);

  const [complaintsWithNestedProvider, totalCount] = await qb.getManyAndCount();
  const complaintsWithoutNestedProvider = complaintsWithNestedProvider.map(
    (complaint) => {
      complaint.assessor = {
        ...complaint.assessor.provider,
        ...complaint.assessor,
      };
      delete complaint.assessor.provider;

      return complaint;
    }
  );

  return { complaints: complaintsWithoutNestedProvider, totalCount };
};

export const getTypeStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select('c.type, COUNT(c.type)')
    .groupBy('c.type');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  try {
    return await qb.getRawMany();
  } catch (e) {
    return console.log(e);
  }
};

export const getFileTypeStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .innerJoin('c.infringements', 'i')
    .select('i.fileType, COUNT(i.fileType)')
    .andWhere('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .groupBy('i.fileType');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  try {
    return await qb.getRawMany();
  } catch (e) {
    return console.log(e);
  }
};

export const getCountryStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  if (!startDate) {
    startDate = new Date(2000, 0, 0, 0, 0, 0);
  }

  if (!endDate) {
    endDate = new Date(2030, 0, 0, 0, 0, 0);
  }

  if (regions) {
    try {
      return await getRepository(Complaint).query(
        `
          SELECT g.country as scope, count(*) AS count
          FROM complaint c, jsonb_array_elements(c."geoScope") g(country)
            WHERE c."isSpam" is not TRUE
              AND c."resolvedOn" >'${startDate.toISOString()}'
              AND c."resolvedOn" < '${endDate.toISOString()}'
              AND c."geoScope" ?| array['${regions}']
          GROUP BY g.country;
      `
      );
    } catch (e) {
      return console.log(e);
    }
  }

  try {
    return await getRepository(Complaint).query(
      `
          SELECT g.country as scope, count(*) AS count
          FROM   complaint c, jsonb_array_elements(c."geoScope") g(country)
          WHERE c."submitted" is TRUE
              AND c."isSpam" is not TRUE
              AND c."resolvedOn" >'${startDate.toISOString()}'
              AND c."resolvedOn" < '${endDate.toISOString()}'
          GROUP  BY g.country;
      `
    );
  } catch (e_1) {
    return console.log(e_1);
  }
};

export const getInfringementStats = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .innerJoin('c.infringements', 'i');

  qb.select('i.accepted, COUNT(*)')
    .andWhere('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .groupBy('i.accepted');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return qb.getRawMany();
};

export const getFilteredInfringements = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Infringement)
    .createQueryBuilder('i')
    .innerJoin('i.complaint', 'c')
    .leftJoin(Cid, 'cid', 'cid.cid = i.value');

  qb.select('DISTINCT c._id, i.value')
    .andWhere('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .andWhere('cid.cid is not NULL')
    .andWhere('i.accepted is TRUE');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return qb.getCount();
};

export const getComplaintStatusStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const allComplaints = getRepository(Complaint).createQueryBuilder('c');

  allComplaints
    .select(
      'SUM(case when c.resolvedOn IS NULL then 1 else 0 end) AS "unreviewedComplaints"'
    )
    .addSelect(
      'SUM(case when c.resolvedOn IS NOT NULL and c.submitted IS FALSE then 1 else 0 end) AS "reviewedComplaints"'
    )
    .addSelect(
      'SUM(case when c.resolvedOn IS NOT NULL and c.submitted IS TRUE then 1 else 0 end) AS "submittedComplaints"'
    );
  filterByDatesAndRegions(
    allComplaints,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return allComplaints.getRawOne();
};

export const getComplainantCount = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint).createQueryBuilder('c');

  qb.select('COUNT(DISTINCT c.email)');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return qb.getRawMany();
};

export const getComplainantCountryCount = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint).createQueryBuilder('c');

  qb.select('COUNT(DISTINCT c.country)');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return qb.getRawMany();
};

export const getAssessorCount = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint).createQueryBuilder('c');

  qb.select('COUNT(DISTINCT c.assessor)');

  filterByDatesAndRegions(
    qb,
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return qb.getRawMany();
};

export const getCountryMonthlyStats = (
  country: string,
  startDate: Date = null,
  endDate: Date = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD') as date, COUNT(*)")
    .andWhere('c.resolvedOn is not NULL');

  if (startDate) {
    qb.andWhere('c.resolvedOn > :start_date').setParameter(
      'start_date',
      startDate
    );
  }

  if (endDate) {
    qb.andWhere('c.resolvedOn < :end_date').setParameter('end_date', endDate);
  }

  qb.andWhere('(c.geoScope)::jsonb ? :country').setParameter(
    'country',
    country
  );

  qb.groupBy("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD')");

  return qb.getRawMany();
};

export const getCategoryMonthlyStats = (
  category: string,
  startDate: Date = null,
  endDate: Date = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD') as date, COUNT(*)")
    .andWhere('c.resolvedOn is not NULL');

  if (startDate) {
    qb.andWhere('c.resolvedOn > :start_date').setParameter(
      'start_date',
      startDate
    );
  }

  if (endDate) {
    qb.andWhere('c.resolvedOn < :end_date').setParameter('end_date', endDate);
  }

  qb.andWhere('c.type = :category').setParameter('category', category);

  qb.groupBy("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD')");

  return qb.getRawMany();
};

export const getInfringementMonthlyStats = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD') as date, COUNT(*)")
    .innerJoin('c.infringements', 'i')
    .andWhere('c.resolvedOn is not NULL');

  filterByDatesAndRegions(qb, startDate, endDate, regions);

  qb.andWhere('c.resolvedOn is not NULL');

  qb.groupBy("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD')");

  return qb.getRawMany();
};

export const getComplaintsDailyStats = async (
  query: string,
  category: string = null,
  startDate: Date = null,
  regions: string[] = null,
  email: string = null,
  assessor: string = null,
  showSpam: boolean
) => {
  const qb = getPublishedRecordsBaseQuery(
    query,
    category,
    startDate,
    regions,
    email,
    assessor,
    showSpam
  );

  qb.groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')")
    .addGroupBy('c._id')
    .select("TO_CHAR(c.created, 'YYYY-MM-DD') as date")
    .addSelect("c._id, COUNT(distinct 'c._id')");

  return qb.getRawMany();
};

export const getComplaintsMonthlyStats = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select("TO_CHAR(c.created, 'YYYY-MM-DD') as date, COUNT(*)");

  filterByDatesAndRegions(qb, startDate, endDate, regions);

  qb.groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')");

  return qb.getRawMany();
};

export const getComplainantsMonthlyStats = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select(
      "TO_CHAR(c.created, 'YYYY-MM-DD') as date, COUNT(DISTINCT c.email)"
    );

  filterByDatesAndRegions(qb, startDate, endDate, regions);

  qb.groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')");

  return qb.getRawMany();
};

export const getAssessorsMonthlyStats = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select(
      "TO_CHAR(c.resolvedOn, 'YYYY-MM-DD') as date, COUNT(DISTINCT c.assessor)"
    )
    .andWhere('c.resolvedOn is not NULL');

  filterByDatesAndRegions(qb, startDate, endDate, regions);

  qb.groupBy("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD')");

  return qb.getRawMany();
};

export const getComplaintById = (id: string) => {
  const qb = getComplaintsBaseQuery();

  qb.andWhere('c._id = :id').setParameter('id', id);

  qb.orderBy('i.value');

  return qb.getOne();
};

export const getPublicComplaintById = async (id: string) => {
  const qb = getComplaintsBaseQuery();

  qb.leftJoin('fl.provider_Filters', 'pv').addSelect('pv');

  qb.leftJoin('pv.provider', 'provider').addSelect(
    'provider.walletAddressHashed'
  );

  qb.andWhere('c._id = :id').setParameter('id', id);

  qb.orderBy('i.value');

  const complaint = await qb.getOne();
  complaint.assessor = {
    ...complaint.assessor.provider,
    ...complaint.assessor,
  };
  delete complaint.assessor.provider;

  return complaint;
};

export const sendCreatedEmail = (receiver) => {
  const msg = {
    to: receiver,
    from: 'services@murmuration.ai',
    subject: CreateComplaint.subject,
    html: CreateComplaint.body,
    text: CreateComplaint.text,
  };

  sendEmail(msg);
};

export const sendMarkedAsSpamEmail = (complaint: Complaint) => {
  const msg = {
    to: complaint.email,
    from: 'services@murmuration.ai',
    subject: MarkAsSpam.subject,
    html: MarkAsSpam.body(complaint),
    text: MarkAsSpam.text(complaint),
  };

  sendEmail(msg);
};

export const sendReviewedEmail = (complaint: Complaint) => {
  const msg = {
    to: complaint.email,
    from: 'services@murmuration.ai',
    subject: Reviewed.subject,
    template_id: 'd-3a6e322d228c476986bee8981ceb9bba',
    personalizations: Reviewed.personalizations(complaint),
  };

  sendEmail(msg);
};

const sendEmail = (msg) => {
  sgMail
    .send(msg)
    .then(() => {
      logger.info('Email sent');
    })
    .catch((error) => {
      logger.error(error);
    });
};

export const getComplaintsByComplainant = (
  complainant: string,
  limit: number = 0,
  excluded: number[] = [],
  submitted: boolean = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .innerJoin('c.infringements', 'i')
    .addSelect('i');

  if (submitted !== null) {
    qb.andWhere('c.submitted = :submitted').setParameter(
      'submitted',
      submitted
    );
  }

  qb.andWhere('c.email = :email')
    .orderBy('c.created')
    .setParameter('email', complainant);

  if (excluded.length > 0) {
    qb.andWhere('c._id NOT IN (:...excluded)').setParameter(
      'excluded',
      excluded
    );
  }

  if (limit > 0) {
    qb.limit(limit);
  }

  return qb.getMany();
};

export const getComplaintsByCid = (
  cid: string,
  limit: number = 0,
  excluded: number[] = [],
  submitted: boolean = null
) => {
  const qb = getRepository(Complaint).createQueryBuilder('c');

  qb.innerJoin('c.infringements', 'i')
    .addSelect('i')
    .andWhere('i.value = :cid')
    .orderBy('c.created')
    .setParameter('cid', cid);

  if (submitted !== null) {
    qb.andWhere('c.submitted = :submitted').setParameter(
      'submitted',
      submitted
    );
  }

  if (excluded.length > 0) {
    qb.andWhere('c._id NOT IN (:...excluded)').setParameter(
      'excluded',
      excluded
    );
  }

  if (limit > 0) {
    qb.limit(limit);
  }

  return qb.getMany();
};

export const updateHostedNodesForInfringement = (
  infringement: Infringement
) => {
  getDealsByCid(infringement.value).then((deals) => {
    const hostedBy = [];
    for (const deal of deals) {
      hostedBy.push({
        node: deal.storageProvider,
        dealId: deal.dealId,
      });
    }
    infringement.hostedBy = hostedBy;
    infringement.resync = false;
    return getRepository(Infringement).save(infringement);
  });
};
