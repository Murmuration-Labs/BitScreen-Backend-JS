import { Brackets, getRepository, SelectQueryBuilder } from 'typeorm';
import { Complaint } from '../entity/Complaint';
import { CreateComplaint, MarkAsSpam, Reviewed } from './email_templates';
import { logger } from './logger';
import { Infringement } from '../entity/Infringement';
import { getDealsByCid } from './web3storage.service';
import { Cid } from '../entity/Cid';

import sgMail from '@sendgrid/mail';
import { NetworkType } from '../entity/interfaces';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

enum TypeOfDate {
  Created,
  Resolved,
  Submitted,
}

const getComplaintsBaseQuery = (
  complaintsAlias: string = 'c',
  infringementAlias: string = 'i',
  networksAlias: string = 'n'
) =>
  getRepository(Complaint)
    .createQueryBuilder(complaintsAlias)
    .leftJoinAndSelect(`${complaintsAlias}.infringements`, infringementAlias)
    .leftJoinAndSelect(`${complaintsAlias}.networks`, networksAlias);

const getComplaintsComplexQuery = (
  complaintsAlias: string = 'c',
  filterListsAlias: string = 'fl',
  assessorAlias: string = 'a',
  providerAlias: string = 'p'
) =>
  getComplaintsBaseQuery()
    .leftJoinAndSelect(`${complaintsAlias}.filterLists`, filterListsAlias)
    .leftJoinAndSelect(`${complaintsAlias}.assessor`, assessorAlias)
    .leftJoinAndSelect(`${assessorAlias}.provider`, providerAlias);

async function filterByDatesAndRegions(
  qb: SelectQueryBuilder<any> | Array<SelectQueryBuilder<any>>,
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
    if (Array.isArray(qb)) {
      qb.forEach((individualQb) => {
        individualQb
          .andWhere(`c.${columnForDate} > :start_date`)
          .setParameter('start_date', startDate);
      });
    } else
      qb.andWhere(`c.${columnForDate} > :start_date`).setParameter(
        'start_date',
        startDate
      );
  }

  if (shouldFilterByDates && endDate) {
    if (Array.isArray(qb)) {
      qb.forEach((individualQb) => {
        individualQb
          .andWhere(`c.${columnForDate} < :end_date`)
          .setParameter('end_date', endDate);
      });
    } else
      qb.andWhere(`c.${columnForDate} < :end_date`).setParameter(
        'end_date',
        endDate
      );
  }

  if (regions && regions.length) {
    if (Array.isArray(qb)) {
      qb.forEach((individualQb) => {
        individualQb
          .andWhere('c.geoScope ?| array[:...region]')
          .setParameter('region', regions);
      });
    } else
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
  const qb = getComplaintsComplexQuery();

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
  network: NetworkType = null,
  startDate: Date = null,
  regions: string[] = null,
  email: string = null,
  assessor: string = null,
  showSpam: boolean
) => {
  const qb = getComplaintsComplexQuery();

  if (query.length > 0) {
    qb.andWhere(
      new Brackets((qb) => {
        qb.where('LOWER(c.fullName) LIKE :q')
          .orWhere('LOWER(i.value) LIKE :q')
          .orWhere('LOWER(c.email) LIKE :q')
          .orWhere('LOWER(p.contactPerson) LIKE :query')
          .orWhere('LOWER(p.businessName) LIKE :query')
          .orWhere('LOWER(c.redactedComplaintDescription) LIKE :query');
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

  if (network) {
    qb.andWhere('n.networkType = :network').setParameter('network', network);
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
  network: NetworkType = null,
  startDate: Date = null,
  regions: string[] = null,
  email: string = null,
  assessor: string = null,
  showSpam: boolean
): Promise<{ complaints: Complaint[]; totalCount: number }> => {
  const qb = getPublishedRecordsBaseQuery(
    query,
    category,
    network,
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
    .select([
      'c.type as "type"',
      'CAST(SUM(CASE WHEN n.networkType = :networkType1 THEN 1 ELSE 0 END) as INTEGER) AS "Filecoin"',
      'CAST(SUM(CASE WHEN n.networkType = :networkType2 THEN 1 ELSE 0 END) AS INTEGER) AS "IPFS"',
    ])
    .leftJoin('c.networks', 'n')
    .groupBy('c.type')
    .setParameter('networkType1', NetworkType.Filecoin)
    .setParameter('networkType2', NetworkType.IPFS);

  const qb2 = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      'c.type as "type"',
      'CAST(COUNT(c.type) as INTEGER) as "totalCount"',
    ])
    .groupBy('c.type');

  filterByDatesAndRegions(
    [qb, qb2],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  const qbResult = await qb.getRawMany(); // count on networks
  const qb2Result = await qb2.getRawMany(); // total count

  const complaintTypesObject = qbResult.map((e) => {
    const { totalCount } = qb2Result.find((el) => el.type === e.type);

    return {
      ...e,
      totalCount,
    };
  });

  try {
    return complaintTypesObject;
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
    .leftJoinAndSelect('c.networks', 'n')
    .innerJoin('c.infringements', 'i')
    .select([
      'i.fileType as "fileType"',
      'CAST(SUM(CASE WHEN n.networkType = :networkType1 THEN 1 ELSE 0 END) AS INTEGER) AS "Filecoin"',
      'CAST(SUM(CASE WHEN n.networkType = :networkType2 THEN 1 ELSE 0 END) AS INTEGER) AS "IPFS"',
    ])
    .andWhere('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .groupBy('i.fileType')
    .setParameter('networkType1', NetworkType.Filecoin)
    .setParameter('networkType2', NetworkType.IPFS);

  const qb2 = getRepository(Complaint)
    .createQueryBuilder('c')
    .innerJoin('c.infringements', 'i')
    .select([
      'i.fileType as "fileType"',
      'CAST(COUNT(c.type) as INTEGER) as "totalCount"',
    ])
    .andWhere('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .groupBy('i.fileType');

  filterByDatesAndRegions(
    [qb, qb2],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  const qbResult = await qb.getRawMany(); // count on networks
  const qb2Result = await qb2.getRawMany(); // total count

  const fileTypesObject = qbResult.map((e) => {
    const { totalCount } = qb2Result.find((el) => el.type === e.type);

    return {
      ...e,
      totalCount,
    };
  });

  try {
    return fileTypesObject;
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

  try {
    if (regions) {
      var query = `
      SELECT 
          g.country as scope, 
          CAST(SUM(CASE WHEN n."networkType" = '${
            NetworkType.Filecoin
          }' THEN 1 ELSE 0 END) AS INTEGER) AS "Filecoin",
          CAST(SUM(CASE WHEN n."networkType" = '${
            NetworkType.IPFS
          }' THEN 1 ELSE 0 END) AS INTEGER) AS "IPFS"
      FROM   
          complaint c
      LEFT JOIN 
          complaint_networks_network cn ON c."_id" = cn.complaint_id
      LEFT JOIN 
          network n ON cn."networkId" = n.id,
          jsonb_array_elements(c."geoScope") g(country)
      WHERE 
          c."isSpam" IS NOT TRUE
          AND c."resolvedOn" > '${startDate.toISOString()}'
          AND c."resolvedOn" < '${endDate.toISOString()}'
          AND c."geoScope" ?| array['${regions}']
      GROUP BY 
          g.country;
  `;

      var totalQuery = `
        SELECT 
          g.country as scope, 
          CAST(COUNT(g.country) as INTEGER) as "totalCount"
        FROM   
          complaint c,
          jsonb_array_elements(c."geoScope") g(country)
        WHERE 
          c."isSpam" IS NOT TRUE
          AND c."resolvedOn" > '${startDate.toISOString()}'
          AND c."resolvedOn" < '${endDate.toISOString()}'
          AND c."geoScope" ?| array['${regions}']
        GROUP BY 
          g.country;
        `;

      return await getRepository(Complaint).query(query);
    } else {
      var query = `
        SELECT 
            g.country as scope, 
            CAST(SUM(CASE WHEN n."networkType" = '${
              NetworkType.Filecoin
            }' THEN 1 ELSE 0 END) AS INTEGER) AS "Filecoin",
            CAST(SUM(CASE WHEN n."networkType" = '${
              NetworkType.IPFS
            }' THEN 1 ELSE 0 END) AS INTEGER) AS "IPFS"
        FROM   
            complaint c
        LEFT JOIN 
            complaint_networks_network cn ON c."_id" = cn.complaint_id
        LEFT JOIN 
            network n ON cn."networkId" = n.id,
            jsonb_array_elements(c."geoScope") g(country)
        WHERE 
            c."submitted" IS TRUE
            AND c."isSpam" IS NOT TRUE
            AND c."resolvedOn" > '${startDate.toISOString()}'
            AND c."resolvedOn" < '${endDate.toISOString()}'
        GROUP BY 
            g.country;
      `;

      var totalQuery = `
        SELECT 
            g.country as scope, 
            CAST(COUNT(g.country) as INTEGER) as "totalCount"
        FROM   
            complaint c,
            jsonb_array_elements(c."geoScope") g(country)
        WHERE 
            c."submitted" IS TRUE
            AND c."isSpam" IS NOT TRUE
            AND c."resolvedOn" > '${startDate.toISOString()}'
            AND c."resolvedOn" < '${endDate.toISOString()}'
        GROUP BY 
            g.country;
      `;
    }

    const qbResult = await getRepository(Complaint).query(query); // count on networks
    const qb2Result = await getRepository(Complaint).query(totalQuery); // total count

    const countriesObject = qbResult.map((e) => {
      const { totalCount } = qb2Result.find((el) => el.scope === e.scope);

      return {
        ...e,
        totalCount,
      };
    });

    return countriesObject;
  } catch (e_1) {
    return console.log(e_1);
  }
};

export const getInfringementStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Infringement)
    .createQueryBuilder('i')
    .select([
      'CAST(SUM(case when i.accepted is TRUE THEN 1 ELSE 0 END) AS INTEGER) as "acceptedCount"',
      'CAST(SUM(case when i.accepted is FALSE THEN 1 ELSE 0 END) AS INTEGER) as "rejectedCount"',
      'n.networkType as "networkType"',
    ])
    .innerJoin('i.complaint', 'c')
    .leftJoin('c.networks', 'n')
    .where('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .groupBy('n.networkType');

  const qbTotal = getRepository(Infringement)
    .createQueryBuilder('i')
    .select([
      'CAST(SUM(case when i.accepted is TRUE THEN 1 ELSE 0 END) AS INTEGER) as "acceptedCount"',
      'CAST(SUM(case when i.accepted is FALSE THEN 1 ELSE 0 END) AS INTEGER) as "rejectedCount"',
    ])
    .innerJoin('i.complaint', 'c')
    .where('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE');

  filterByDatesAndRegions(
    [qb, qbTotal],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return {
    total: await qbTotal.getRawOne(),
    groupedByNetworks: await qb.getRawMany(),
  };
};

export const getFilteredInfringements = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Infringement)
    .createQueryBuilder('i')
    .select([
      'CAST(COUNT(i.value) AS INTEGER) as count',
      'n.networkType as "networkType"',
    ])
    .innerJoin('i.complaint', 'c')
    .leftJoin(Cid, 'cid', 'cid.cid = i.value')
    .leftJoin('c.networks', 'n')
    .leftJoin('cid.filters', 'f')
    .leftJoin('f.networks', 'fn')
    .where('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .andWhere('i.accepted is TRUE')
    .andWhere('f.id is not NULL')
    .andWhere('fn.networkType = n.networkType')
    .groupBy('n.networkType');

  const qbTotal = getRepository(Infringement)
    .createQueryBuilder('i')
    .select(['CAST(COUNT(i.value) AS INTEGER) as count'])
    .innerJoin('i.complaint', 'c')
    .leftJoin(Cid, 'cid', 'cid.cid = i.value')
    .leftJoin('cid.filters', 'f')
    .where('c.resolvedOn is not NULL')
    .andWhere('c.submitted is TRUE')
    .andWhere('c.isSpam is not TRUE')
    .andWhere('i.accepted is TRUE')
    .andWhere('f.id is not NULL');

  filterByDatesAndRegions(
    [qb, qbTotal],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return {
    groupedByNetworks: await qb.getRawMany(),
    total: await qbTotal.getRawOne(),
  };
};

export const getComplaintStatusStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const allComplaintsByNetwork = getRepository(Complaint)
    .createQueryBuilder('c')
    .leftJoin('c.networks', 'n')
    .select([
      'n.networkType as "networkType"',
      'CAST(SUM(case when c.resolvedOn IS NULL then 1 else 0 end) AS INTEGER) AS "unreviewedComplaintsCount"',
      'CAST(SUM(case when c.resolvedOn IS NOT NULL and c.submitted IS FALSE then 1 else 0 end) AS INTEGER) AS "reviewedComplaintsCount"',
      'CAST(SUM(case when c.resolvedOn IS NOT NULL and c.submitted IS TRUE then 1 else 0 end) AS INTEGER) AS "submittedComplaintsCount"',
    ])
    .groupBy('n.networkType');

  const allComplaints = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      'CAST(COUNT(DISTINCT c._id) AS INTEGER) AS "totalCount"',
      'CAST(SUM(case when c.resolvedOn IS NULL then 1 else 0 end) AS INTEGER) AS "unreviewedComplaintsCount"',
      'CAST(SUM(case when c.resolvedOn IS NOT NULL and c.submitted IS FALSE then 1 else 0 end) AS INTEGER) AS "reviewedComplaintsCount"',
      'CAST(SUM(case when c.resolvedOn IS NOT NULL and c.submitted IS TRUE then 1 else 0 end) AS INTEGER) AS "submittedComplaintsCount"',
    ]);

  filterByDatesAndRegions(
    [allComplaints, allComplaintsByNetwork],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return {
    total: await allComplaints.getRawOne(),
    groupedByNetworks: await allComplaintsByNetwork.getRawMany(),
  };
};

export const getComplainantCount = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .leftJoin('c.networks', 'n')
    .select('n.networkType as "networkType"')
    .addSelect(
      'CAST(COUNT(DISTINCT c.email) AS INTEGER) AS "uniqueEmailsCount"'
    )
    .groupBy('n.networkType');

  const qbTotal = getRepository(Complaint)
    .createQueryBuilder('c')
    .select('CAST(COUNT(DISTINCT c.email) AS INTEGER) AS "uniqueEmailsCount"');

  filterByDatesAndRegions(
    [qb, qbTotal],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return {
    groupedByNetworks: await qb.getRawMany(),
    total: await qbTotal.getRawOne(),
  };
};

export const getComplainantCountryCount = (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .leftJoin('c.networks', 'n');

  qb.select('n.networkType as "networkType"')
    .addSelect(
      'CAST(COUNT(DISTINCT c.country) AS INTEGER) AS "uniqueCountriesCount"'
    )
    .groupBy('n.networkType');

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

export const getAssessorCount = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select('n.networkType as "networkType"')
    .addSelect(
      'CAST(COUNT(DISTINCT c.assessor) AS INTEGER) AS "uniqueAssessorsCount"'
    )
    .leftJoin('c.networks', 'n')
    .groupBy('n.networkType');

  const qbTotal = getRepository(Complaint)
    .createQueryBuilder('c')
    .select(
      'CAST(COUNT(DISTINCT c.assessor) AS INTEGER) AS "uniqueAssessorsCount"'
    );

  filterByDatesAndRegions(
    [qb, qbTotal],
    startDate,
    endDate,
    regions,
    true,
    TypeOfDate.Created
  );

  return {
    groupedByNetworks: await qb.getRawMany(),
    total: await qbTotal.getRawOne(),
  };
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

export const getInfringementMonthlyStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qbTotal = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      "TO_CHAR(c.resolvedOn, 'YYYY-MM-DD') as date",
      'CAST(count(c."_id") as integer) as "totalCount"',
    ])
    .innerJoin('c.infringements', 'i')
    .andWhere('c.resolvedOn is not NULL')
    .groupBy("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD')");

  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      "TO_CHAR(c.resolvedOn, 'YYYY-MM-DD') as date",
      'CAST(SUM(CASE WHEN n.networkType = :networkType1 THEN 1 ELSE 0 END) AS INTEGER) AS "Filecoin"',
      'CAST(SUM(CASE WHEN n.networkType = :networkType2 THEN 1 ELSE 0 END) AS INTEGER) AS "IPFS"',
    ])
    .innerJoin('c.infringements', 'i')
    .andWhere('c.resolvedOn is not NULL')
    .leftJoin('c.networks', 'n')
    .setParameter('networkType1', NetworkType.Filecoin)
    .setParameter('networkType2', NetworkType.IPFS)
    .groupBy("TO_CHAR(c.resolvedOn, 'YYYY-MM-DD')");

  filterByDatesAndRegions([qb, qbTotal], startDate, endDate, regions);

  const qbResult = await qb.getRawMany();
  const qbTotalResult = await qbTotal.getRawMany();

  const mappedQbResult = qbResult.map((e) => {
    return {
      ...e,
      totalCount: qbTotalResult.find((el) => el.date === e.date).totalCount,
    };
  });

  return mappedQbResult;
};

export const getComplaintsDailyStats = async (
  query: string,
  category: string = null,
  network: NetworkType = null,
  startDate: Date = null,
  regions: string[] = null,
  email: string = null,
  assessor: string = null,
  showSpam: boolean
) => {
  const qb = getPublishedRecordsBaseQuery(
    query,
    category,
    network,
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

export const getComplaintsMonthlyStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qbTotal = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      "TO_CHAR(c.created, 'YYYY-MM-DD') as date",
      'CAST(count(c."_id") as integer) as "totalCount"',
    ])
    .groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')");

  const qb = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      "TO_CHAR(c.created, 'YYYY-MM-DD') as date",
      'CAST(SUM(CASE WHEN n.networkType = :networkType1 THEN 1 ELSE 0 END) AS INTEGER) AS "Filecoin"',
      'CAST(SUM(CASE WHEN n.networkType = :networkType2 THEN 1 ELSE 0 END) AS INTEGER) AS "IPFS"',
    ])
    .leftJoin('c.networks', 'n')
    .setParameter('networkType1', NetworkType.Filecoin)
    .setParameter('networkType2', NetworkType.IPFS)
    .groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')");

  filterByDatesAndRegions([qbTotal, qb], startDate, endDate, regions);

  const qbResult = await qb.getRawMany();
  const qbTotalResult = await qbTotal.getRawMany();

  const mappedQbResult = qbResult.map((e) => {
    return {
      ...e,
      totalCount: qbTotalResult.find((el) => el.date === e.date).totalCount,
    };
  });

  return mappedQbResult;
};

export const getComplainantsMonthlyStats = async (
  startDate: Date = null,
  endDate: Date = null,
  regions: string[] = null
) => {
  const qbTotal = getRepository(Complaint)
    .createQueryBuilder('c')
    .select([
      "TO_CHAR(c.created, 'YYYY-MM-DD') as date",
      'CAST(COUNT(DISTINCT c.email) as integer) as "totalCount"',
    ])
    .groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')");

  const networkTypeKeys = Object.keys(NetworkType);
  const networksQueries = [];
  const networksQueriesResults = [];

  for (let i = 0; i < networkTypeKeys.length; i++) {
    const qb = getRepository(Complaint)
      .createQueryBuilder('c')
      .select([
        "TO_CHAR(c.created, 'YYYY-MM-DD') as date",
        `CAST(COUNT(DISTINCT c.email) as integer) as "${networkTypeKeys[i]}"`,
      ])
      .leftJoin('c.networks', 'n')
      .where(`n.networkType = '${networkTypeKeys[i]}'`)
      .groupBy("TO_CHAR(c.created, 'YYYY-MM-DD')");

    networksQueries.push(qb);
  }

  filterByDatesAndRegions(
    [...networksQueries, qbTotal],
    startDate,
    endDate,
    regions
  );
  for (let i = 0; i < networksQueries.length; i++) {
    networksQueriesResults.push(...(await networksQueries[i].getRawMany()));
  }

  const networksQueriesResultsMerged = [
    ...networksQueriesResults,
    ...(await qbTotal.getRawMany()),
  ].reduce((acc, curr) => {
    const existingObj = acc.find((item) => item.date === curr.date);

    if (existingObj) {
      // Merge the current object with the existing one
      Object.assign(existingObj, curr);
    } else {
      // Push the current object to the accumulator array
      acc.push(curr);
    }

    return acc;
  }, []);

  return networksQueriesResultsMerged;
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
  const qb = getComplaintsComplexQuery();

  qb.andWhere('c._id = :id').setParameter('id', id);

  qb.orderBy('i.value');

  return qb.getOne();
};

export const getPublicComplaintById = async (id: string) => {
  const qb = getComplaintsComplexQuery();

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
    .leftJoin('c.networks', 'n')
    .addSelect('n.networkType')
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
    .leftJoin('c.networks', 'n')
    .addSelect('n.networkType')
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

export const adjustNetworksOnMultipleComplaints = (complaints: Complaint[]) => {
  return complaints.map((e) => adjustNetworksOnIndividualComplaint(e));
};

export const adjustNetworksOnIndividualComplaint = (complaint: Complaint) => {
  const updatedComplaint = {
    ...complaint,
    networks: complaint.networks.map((e) => e.networkType),
  };

  return updatedComplaint;
};
