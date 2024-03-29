import { Request, Response } from 'express';
import { getActiveAssessor } from '../service/assessor.service';
import { getRepository } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Complaint, ComplaintStatus, ComplaintType } from '../entity/Complaint';
import {
  FileType,
  FilteringStatus,
  Infringement,
} from '../entity/Infringement';
import { Config } from '../entity/Settings';
import { getCidByProvider } from '../service/cid.service';
import {
  adjustNetworksOnIndividualComplaint,
  adjustNetworksOnMultipleComplaints,
  getAssessorCount,
  getAssessorsMonthlyStats,
  getCategoryMonthlyStats,
  getComplainantCount,
  getComplainantCountryCount,
  getComplainantsMonthlyStats,
  getComplaintById,
  getComplaints,
  getComplaintsByCid,
  getComplaintsByComplainant,
  getComplaintsDailyStats,
  getComplaintsMonthlyStats,
  getComplaintStatusStats,
  getCountryMonthlyStats,
  getCountryStats,
  getFileTypeStats,
  getFilteredInfringements,
  getInfringementMonthlyStats,
  getInfringementStats,
  getPublicComplaintById,
  getPublicComplaints,
  getTypeStats,
  sendCreatedEmail,
  sendMarkedAsSpamEmail,
  sendReviewedEmail,
} from '../service/complaint.service';
import { getPublicFiltersByCid } from '../service/filter.service';
import { getProviderByMinerId } from '../service/provider.service';
import {
  filterFields,
  filterFieldsSingle,
  generateCountObject,
} from '../service/util.service';
import { getDealsByCid } from '../service/web3storage.service';
import { Filter } from '../entity/Filter';
import { queue_analysis } from '../service/analysis.service';
import { Visibility } from '../entity/enums';
import { Network } from '../entity/Network';
import { NetworkType } from '../entity/interfaces';
import { logger } from '../service/logger';

export const search_complaints = async (req: Request, res: Response) => {
  const q = req.query.q ? (req.query.q as string) : '';
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const itemsPerPage = req.query.itemsPerPage
    ? parseInt(req.query.itemsPerPage as string)
    : 10;
  const orderBy = req.query.orderBy ? (req.query.orderBy as string) : 'created';
  const orderDirection = req.query.orderDirection
    ? (req.query.orderDirection as string)
    : 'DESC';

  const [complaints, totalCount] = await getComplaints(
    q,
    page,
    itemsPerPage,
    orderBy,
    orderDirection
  );
  const totalPages =
    totalCount < itemsPerPage
      ? 1
      : totalCount % itemsPerPage === 0
      ? totalCount / itemsPerPage
      : Math.floor(totalCount / itemsPerPage) + 1;

  return res.send({
    complaints: adjustNetworksOnMultipleComplaints(complaints),
    page,
    totalPages,
  });
};

export const public_complaints = async (req: Request, res: Response) => {
  const q = req.query.q ? (req.query.q as string) : '';
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const itemsPerPage = req.query.itemsPerPage
    ? parseInt(req.query.itemsPerPage as string)
    : 10;
  const orderBy = req.query.orderBy ? (req.query.orderBy as string) : 'created';
  const orderDirection = req.query.orderDirection
    ? (req.query.orderDirection as string)
    : 'DESC';
  const category = req.query.category ? (req.query.category as string) : null;
  const network = req.query.network ? (req.query.network as NetworkType) : null;
  const startingFrom = req.query.startingFrom
    ? parseInt(req.query.startingFrom as string)
    : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;
  const assessor = req.query.assessor ? (req.query.assessor as string) : null;
  const email = req.query.email ? (req.query.email as string) : null;
  const showSpam = req.query.showSpam
    ? parseInt(req.query.showSpam as string) === 0
      ? false
      : true
    : true;

  let startDate = null;
  if (startingFrom) {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - startingFrom);
  }

  let {
    complaints,
    totalCount,
  }: { complaints: Complaint[]; totalCount: number } =
    await getPublicComplaints(
      q,
      page,
      itemsPerPage,
      orderBy,
      orderDirection,
      category,
      network,
      startDate,
      regions,
      email,
      assessor,
      showSpam
    );
  complaints = filterFields(complaints, [
    '_id',
    'fullName',
    'assessor',
    'companyName',
    'created',
    'complaintDescription',
    'geoScope',
    'type',
    'resolvedOn',
    'submittedOn',
    'filterLists',
    'infringements',
    'submitted',
    'isSpam',
    'networks',
  ]);

  complaints.map((complaint) => {
    complaint['infringements'] = filterFields(complaint['infringements'], [
      'value',
      'accepted',
    ]);

    return complaint;
  });

  const totalPages =
    totalCount < itemsPerPage
      ? 1
      : totalCount % itemsPerPage === 0
      ? totalCount / itemsPerPage
      : Math.floor(totalCount / itemsPerPage) + 1;

  return res.send({
    complaints: adjustNetworksOnMultipleComplaints(complaints),
    page,
    totalPages,
    totalCount,
  });
};

export const create_complaint = async (req: Request, res: Response) => {
  const complaintData = req.body;

  const complaint = new Complaint();
  complaint.title = complaintData.title;
  complaint.fullName = complaintData.fullName;
  complaint.email = complaintData.email;
  complaint.complaintDescription = complaintData.complaintDescription;
  complaint.redactedComplaintDescription = complaintData.complaintDescription;
  complaint.address = complaintData.address;
  complaint.type = complaintData.type;
  complaint.phoneNumber = complaintData.phoneNumber;
  complaint.city = complaintData.city;
  complaint.companyName = complaintData.companyName;
  complaint.country = complaintData.country;
  complaint.state = complaintData.state;
  complaint.geoScope = complaintData.geoScope;
  complaint.workDescription = complaintData.workDescription;
  complaint.agreement = complaintData.agreement;
  complaint.complainantType = complaintData.complainantType;
  complaint.onBehalfOf = complaintData.onBehalfOf;
  complaint.status = ComplaintStatus.New;
  complaint.privateNote = '';
  complaint.networks = [];

  if (
    !complaintData.networks ||
    !Array.isArray(complaintData.networks) ||
    !complaintData.networks.length
  ) {
    return res.status(400).send({
      message: 'Bad request - network key is invalid!',
    });
  }

  const networks = await getRepository(Network).find();

  for (const network of complaintData.networks) {
    if (!Object.keys(NetworkType).includes(network)) {
      return res.status(400).send({
        message: 'Bad request - network key contains invalid networks!',
      });
    }

    complaint.networks.push(networks.find((el) => el.networkType === network));
  }

  try {
    const saved = await getRepository(Complaint).save(complaint);

    await Promise.all(
      complaintData.infringements.map((cid) => {
        const infringement = new Infringement();
        infringement.value = cid.value;
        infringement.complaint = saved;
        infringement.accepted = false;
        infringement.resync = false;
        infringement.fileType = cid.fileType ? cid.fileType : null;

        getDealsByCid(cid.value)
          .then((deals) => {
            const hostedBy = [];
            for (const deal of deals) {
              hostedBy.push({
                node: deal.storageProvider,
                dealId: deal.dealId,
              });
            }
            infringement.hostedBy = hostedBy;
            return getRepository(Infringement).save(infringement);
          })
          .catch((e) => {
            console.log('Web3 Storage error: ', e);
            return getRepository(Infringement).save(infringement);
          });
      })
    );

    sendCreatedEmail(saved.email);

    for (let i = 0; i < complaintData.infringements.length; i++) {
      const cid = complaintData.infringements[i].value;
      const fileType = complaintData.infringements[i].fileType;
      const relatedCid = await getRepository(Cid).findOne({
        where: { cid },
        relations: ['cidAnalysis'],
      });

      if (!relatedCid) {
        logger.info(`Cid does not exist and will be created. Cid: ${cid}`);
        const newCid = new Cid();
        newCid.setCid(cid);
        await getRepository(Cid).save(newCid);
      }

      if (
        (!relatedCid || relatedCid.cidAnalysis.length === 0) &&
        fileType !== FileType.Text
      ) {
        try {
          logger.info(`Queueing cid for analysis. Cid: `, cid);
          await queue_analysis(cid);
        } catch (e) {
          console.trace(e);
          console.log(`Could not queue analysis of ${cid} because of ${e}`);
        }
      } else {
        logger.info(`No need to queue for analysis. Cid: `, cid);
      }
    }

    return res.send(saved);
  } catch (ex) {
    res.status(400).send({ error: ex.message });
  }
};

export const review_complaint = async (req: Request, res: Response) => {
  const {
    params: { id },
    body: {
      identificationKey,
      identificationValue,
      providerId,
      ...complaintData
    },
  } = req;

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );
  const existing = await getComplaintById(id);

  if (!existing) {
    return res.status(404).send({ message: 'Complaint not found' });
  }

  const updated = {
    ...existing,
    ...complaintData,
    assessor,
  };

  if (
    updated.status === ComplaintStatus.Resolved &&
    updated.status !== existing.status
  ) {
    updated.resolvedOn = new Date();
  }

  const saved = await getRepository(Complaint).save(updated);

  await Promise.all(
    updated.infringements.map((infringement: Infringement) => {
      return getRepository(Infringement).save(infringement);
    })
  );

  return res.send(saved);
};

export const submit_complaint = async (req: Request, res: Response) => {
  const {
    params: { id },
  } = req;

  const existing = await getComplaintById(id);

  existing.submitted = true;
  existing.submittedOn = new Date();

  if (!existing.filterListTimestamps) {
    existing.filterListTimestamps = [];
  }

  if (existing.filterLists) {
    const config = await getRepository(Config).findOne({
      provider: existing.assessor.provider,
    });

    const newConfig = JSON.parse(config.config);
    newConfig.bitscreen = true;

    config.config = JSON.stringify(newConfig);
    await getRepository(Config).save(config);
  }

  for (let filterList of existing.filterLists) {
    const filter = await getRepository(Filter).findOne(
      {
        id: filterList.id,
      },
      {
        relations: ['cids'],
      }
    );

    const cids = filter.cids.map((e) => e.cid);

    for (let infringement of existing.infringements) {
      if (!infringement.accepted || cids.includes(infringement.value)) continue;
      const cid = new Cid();
      cid.filters = [filterList];
      cid.setCid(infringement.value);
      cid.refUrl = 'http://172.30.1.6:3000/#/complaint/' + existing._id;

      await getRepository(Cid).save(cid);
    }

    existing.filterListTimestamps.push({
      listId: filterList.id,
      timestamp: new Date(),
    });
  }

  const saved = await getRepository(Complaint).save(existing);
  sendReviewedEmail(existing);

  return res.send(saved);
};

export const get_complaint = async (req: Request, res: Response) => {
  const {
    params: { id },
  } = req;

  const complaint = await getComplaintById(id);

  if (!complaint) {
    return res.status(404).send({ message: 'Complaint not found' });
  }

  return res.send(adjustNetworksOnIndividualComplaint(complaint));
};

export const get_public_complaint = async (req: Request, res: Response) => {
  const {
    params: { id },
  } = req;

  const complaint = await getPublicComplaintById(id);

  if (!complaint) {
    return res.status(404).send({ message: 'Complaint not found' });
  }

  if (complaint.status === ComplaintStatus.New) {
    return res.status(400).send({ message: 'Complaint is not published!' });
  }

  const updatedComplaint = {
    ...complaint,
    adjustedFilterLists: complaint.filterLists.map((e) => {
      return e.visibility === Visibility.Private
        ? {
            id: e.id,
            visibility: e.visibility,
          }
        : e;
    }),
  };

  if (updatedComplaint.status !== ComplaintStatus.Spam) {
    for (const infringement of updatedComplaint.infringements) {
      infringement.resync = true;
      await getRepository(Infringement).save(infringement);
    }

    updatedComplaint.infringements = filterFields(
      updatedComplaint.infringements,
      ['value', 'accepted', 'hostedBy']
    );

    for (const infringement of updatedComplaint.infringements) {
      if (infringement.hostedBy) {
        for (const deal of infringement.hostedBy) {
          deal.filtering = FilteringStatus.NotAvailable;
          const provider = await getProviderByMinerId(deal.node);

          if (provider) {
            const cids = await getCidByProvider(
              provider.id,
              infringement.value
            );
            deal.country = provider.country;

            if (cids.length > 0) {
              deal.filtering = FilteringStatus.Filtering;
            } else {
              deal.filtering = FilteringStatus.NotFiltering;
            }
          }
        }
      }
    }
  }

  const complaintData = filterFieldsSingle(updatedComplaint, [
    '_id',
    'fullName',
    'email',
    'assessor',
    'companyName',
    'created',
    'complaintDescription',
    'redactedComplaintDescription',
    'redactionReason',
    'title',
    'geoScope',
    'type',
    'resolvedOn',
    'submittedOn',
    'adjustedFilterLists',
    'infringements',
    'isSpam',
    'networks',
  ]);

  return res.send(adjustNetworksOnIndividualComplaint(complaintData));
};

export const get_related_complaints = async (req: Request, res: Response) => {
  const {
    params: { id },
  } = req;

  const complaint = await getComplaintById(id);
  const related = {
    complainant: await getComplaintsByComplainant(complaint.email, 2, [
      complaint._id,
    ]),
    cids: [],
  };

  for (const infringement of complaint.infringements) {
    if (related.cids.length == 2) {
      break;
    }

    const relatedComplaints = await getComplaintsByCid(infringement.value, 2, [
      complaint._id,
    ]);
    if (relatedComplaints.length > 0) {
      related.cids.push({
        infringement: infringement.value,
        complaints: relatedComplaints,
      });
    }
  }

  return res.send(related);
};

export const get_public_related_complaints = async (
  req: Request,
  res: Response
) => {
  const {
    params: { id },
  } = req;
  const complaint = await getComplaintById(id);

  const related = {
    complaintsByComplainant: adjustNetworksOnMultipleComplaints(
      await getComplaintsByComplainant(
        complaint.email,
        5,
        [complaint._id],
        true
      )
    ),
    complaintsByCids: [],
  };

  for (const infringement of complaint.infringements) {
    if (related.complaintsByCids.length == 2) {
      break;
    }
    const relatedComplaints = await getComplaintsByCid(
      infringement.value,
      5,
      [complaint._id],
      true
    );
    if (relatedComplaints.length > 0) {
      related.complaintsByCids.push({
        infringement: infringement.value,
        complaints: adjustNetworksOnMultipleComplaints(relatedComplaints),
      });
    }
  }

  return res.send(related);
};

export const get_related_filters = async (req: Request, res: Response) => {
  const {
    params: { id },
  } = req;

  const complaint = await getComplaintById(id);

  let relatedFilters = [];

  for (const infringement of complaint.infringements) {
    if (!infringement.accepted) {
      continue;
    }
    const filters = await getPublicFiltersByCid(infringement.value);
    if (filters) {
      relatedFilters = [...relatedFilters, ...filters];
    }
  }

  relatedFilters = relatedFilters.filter(
    (value, index, self) => index === self.findIndex((t) => t.id === value.id)
  );

  return res.send(relatedFilters);
};

export const mark_as_spam = async (req: Request, res: Response) => {
  const {
    body: {
      complaintIds,
      dontShowModal,
      identificationKey,
      identificationValue,
    },
  } = req;

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );

  if (!assessor) {
    return res
      .status(400)
      .send({ error: 'Assessor user does not exist in our database.' });
  }

  if (dontShowModal) {
    let config = await getRepository(Config).findOne({
      where: {
        provider: assessor.provider,
      },
    });

    if (!config) {
      config = new Config();
      config.provider = assessor.provider;
      config.config = JSON.stringify({});
    }

    let configJson = JSON.parse(config.config);
    if (!configJson.dontShow) {
      configJson = {
        ...configJson,
        dontShow: ['markAsSpamModal'],
      };
    } else if (!configJson.dontShow.includes('markAsSpamModal')) {
      configJson = {
        ...configJson,
        dontShow: [...configJson.dontShow, 'markAsSpamModal'],
      };
    }
    config.config = JSON.stringify(configJson);
    await getRepository(Config).save(config);
  }

  for (const complaintId of complaintIds) {
    const complaint = await getRepository(Complaint).findOne(complaintId);
    if (
      !complaint ||
      [ComplaintStatus.Resolved, ComplaintStatus.Spam].includes(
        complaint.status
      )
    ) {
      continue;
    }

    complaint.status = ComplaintStatus.Spam;
    complaint.isSpam = true;
    complaint.submitted = true;
    complaint.resolvedOn = new Date();
    complaint.submittedOn = complaint.resolvedOn;
    complaint.assessor = assessor;

    await getRepository(Complaint).save(complaint);
    sendMarkedAsSpamEmail(complaint);
  }

  return res.send({ success: true });
};

export const general_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  try {
    var complaintStatusStats = await getComplaintStatusStats(
      startDate,
      endDate,
      regions
    );
    var typeStats = await getTypeStats(startDate, endDate, regions);
    var countryStats = await getCountryStats(startDate, endDate, regions);

    var infringementStats = await getInfringementStats(
      startDate,
      endDate,
      regions
    );
    var fileTypeStats = await getFileTypeStats(startDate, endDate, regions);
    var filteredInfringements = await getFilteredInfringements(
      startDate,
      endDate,
      regions
    );

    var assessorCount = await getAssessorCount(startDate, endDate, regions);
    var complainantCount = await getComplainantCount(
      startDate,
      endDate,
      regions
    );
    // used in the past, will keep if needed in the future
    // var complainantCountryCount = await getComplainantCountryCount(
    //   startDate,
    //   endDate,
    //   regions
    // );
  } catch (e) {
    console.log(e);
    return res
      .status(400)
      .send('There was an error. Please check your parameters.');
  }

  const stats = {
    type: typeStats,
    fileType: fileTypeStats,
    country: countryStats,
    acceptedInfringements: generateCountObject(
      'acceptedCount',
      infringementStats
    ),
    rejectedInfringements: generateCountObject(
      'rejectedCount',
      infringementStats
    ),
    filteredInfringements: generateCountObject('count', filteredInfringements),
    unreviewedComplaintsCount: generateCountObject(
      'unreviewedComplaintsCount',
      complaintStatusStats
    ),
    reviewedComplaintsCount: generateCountObject(
      'reviewedComplaintsCount',
      complaintStatusStats
    ),
    submittedComplaintsCount: generateCountObject(
      'submittedComplaintsCount',
      complaintStatusStats
    ),
    complainant: generateCountObject('uniqueEmailsCount', complainantCount),
    // used in the past, will keep if needed in the future
    // complainantCountry: generateNetworkCountObject(
    //   'uniqueCountriesCount',
    //   complainantCountryCount
    // ),
    assessor: generateCountObject('uniqueAssessorsCount', assessorCount),
  };

  return res.send(stats);
};

export const country_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const country = req.params.country ? (req.params.country as string) : null;

  if (!country) {
    return res.status(400).send('Country missing.');
  }

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  const result = await getCountryMonthlyStats(country, startDate, endDate);
  result.sort((a, b) => {
    const keyA = a.date;
    const keyB = b.date;

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return res.send(result);
};

export const complaint_daily_stats = async (req: Request, res: Response) => {
  const q = req.query.q ? (req.query.q as string) : '';
  const category = req.query.category ? (req.query.category as string) : null;
  const network = req.query.network ? (req.query.network as NetworkType) : null;
  const startingFrom = req.query.startingFrom
    ? parseInt(req.query.startingFrom as string)
    : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;
  const assessor = req.query.assessor ? (req.query.assessor as string) : null;
  const email = req.query.email ? (req.query.email as string) : null;

  let startDate = null;
  if (startingFrom) {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - startingFrom);
  }
  const showSpam = req.query.showSpam
    ? parseInt(req.query.showSpam as string) === 0
      ? false
      : true
    : true;

  let complaints = await getComplaintsDailyStats(
    q,
    category,
    network,
    startDate,
    regions,
    email,
    assessor,
    showSpam
  );

  return res.send(
    complaints.map((r) => {
      return { date: r.date, value: +r.count };
    })
  );
};

export const category_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const category = req.params.category ? (req.params.category as string) : null;

  if (!category) {
    return res.status(400).send('Category missing.');
  }

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  const result = await getCategoryMonthlyStats(category, startDate, endDate);
  result.sort((a, b) => {
    const keyA = a.date;
    const keyB = b.date;

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return res.send(result);
};

export const complaint_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  const result = await getComplaintsMonthlyStats(startDate, endDate, regions);
  result.sort((a, b) => {
    const keyA = a.date;
    const keyB = b.date;

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return res.send(result);
};

export const infringement_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  const result = await getInfringementMonthlyStats(startDate, endDate, regions);
  result.sort((a, b) => {
    const keyA = a.date;
    const keyB = b.date;

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return res.send(result);
};

export const complainant_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  const result = await getComplainantsMonthlyStats(startDate, endDate, regions);
  result.sort((a, b) => {
    const keyA = a.date;
    const keyB = b.date;

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return res.send(result);
};

export const assessor_stats = async (req: Request, res: Response) => {
  const start = req.query.startDate ? (req.query.startDate as string) : null;
  const end = req.query.endDate ? (req.query.endDate as string) : null;
  const regions =
    req.query.regions &&
    JSON.stringify(req.query.regions) !== JSON.stringify(['Global'])
      ? (req.query.regions as string[])
      : null;

  let startDate = null;
  if (start) {
    try {
      startDate = new Date(start);
    } catch (e) {
      return res.status(400).send('Invalid parameter for start date');
    }
  }

  let endDate = null;
  if (end) {
    try {
      endDate = new Date(end);
    } catch (e) {
      return res.status(400).send('Invalid parameter for end date');
    }
  }

  const result = await getAssessorsMonthlyStats(startDate, endDate, regions);
  result.sort((a, b) => {
    const keyA = a.date;
    const keyB = b.date;

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return res.send(result);
};
