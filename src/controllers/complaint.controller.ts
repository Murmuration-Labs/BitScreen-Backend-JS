import {Request, Response} from "express";
import {
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
    sendCreatedEmail
} from "../service/complaint.service";
import {Complaint, ComplaintStatus} from "../entity/Complaint";
import {getRepository} from "typeorm";
import {FilteringStatus, Infringement} from "../entity/Infringement";
import {Cid} from "../entity/Cid";
import {Config} from "../entity/Settings";
import {filterFields, filterFieldsSingle} from "../service/util.service";
import {getPublicFiltersByCid} from "../service/filter.service";
import {getDealsByCid} from "../service/web3storage.service";
import {getProviderByMinerId} from "../service/provider.service";
import {getCidByProvider} from "../service/cid.service";

export const search_complaints = async (req: Request, res: Response) => {
    const q = req.query.q ? req.query.q as string : '';
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const itemsPerPage = req.query.itemsPerPage ? parseInt(req.query.itemsPerPage as string) : 10;
    const orderBy = req.query.orderBy ? req.query.orderBy as string : 'created';
    const orderDirection = req.query.orderDirection ? req.query.orderDirection as string : 'DESC';

    const [complaints, totalCount] = await getComplaints(q, page, itemsPerPage, orderBy, orderDirection)
    const totalPages = totalCount < itemsPerPage ?
        1 : totalCount % itemsPerPage === 0 ?
        totalCount / itemsPerPage :
        Math.floor(totalCount / itemsPerPage) + 1;

    return res.send({
        complaints,
        page,
        totalPages
    })
}

export const public_complaints = async (req: Request, res: Response) => {
    const q = req.query.q ? req.query.q as string : '';
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const itemsPerPage = req.query.itemsPerPage ? parseInt(req.query.itemsPerPage as string) : 10;
    const orderBy = req.query.orderBy ? req.query.orderBy as string : 'created';
    const orderDirection = req.query.orderDirection ? req.query.orderDirection as string : 'DESC';
    const category = req.query.category ? req.query.category as string : null;
    const startingFrom = req.query.startingFrom ? parseInt(req.query.startingFrom as string) : null;
    const region = req.query.region ? req.query.region as string : null;
    const assessor = req.query.assessor ? req.query.assessor as string : null;
    const email = req.query.email ? req.query.email as string : null;

    let startDate = null;
    if (startingFrom) {
        startDate = new Date()
        startDate.setDate(startDate.getDate() - startingFrom);
    }

    let [complaints, totalCount] = await getPublicComplaints(
        q,
        page,
        itemsPerPage,
        orderBy,
        orderDirection,
        category,
        startDate,
        region,
        email,
        assessor
    )
    complaints = filterFields(
        complaints,
        [
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
            'submitted'
        ]
    );

    complaints.map(complaint => {
        complaint['infringements'] = filterFields(complaint['infringements'], ['value', 'accepted']);

        return complaint;
    })


    const totalPages = totalCount < itemsPerPage ?
      1 : totalCount % itemsPerPage === 0 ?
        totalCount / itemsPerPage :
        Math.floor(totalCount / itemsPerPage) + 1;

    return res.send({
        complaints,
        page,
        totalPages
    })
}

export const create_complaint = async (req: Request, res: Response) => {
    const complaintData = req.body;

    const complaint = new Complaint();
    complaint.title = complaintData.title;
    complaint.fullName = complaintData.fullName;
    complaint.email = complaintData.email;
    complaint.complaintDescription = complaintData.complaintDescription;
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
    complaint.assessorReply = '';
    complaint.privateNote = '';

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
                              dealId: deal.dealId
                          })
                      }
                      infringement.hostedBy = hostedBy;
                      return getRepository(Infringement).save(infringement);
                  })
                  .catch((e) => {
                      console.log("Web3 Storage error: ", e)
                      return getRepository(Infringement).save(infringement);
                  })
          })
        );

        sendCreatedEmail(saved.email)

        return res.send(saved)
    } catch (ex) {
        res.status(400).send({error: ex.message});
    }
}

export const review_complaint = async (req: Request, res: Response) => {
    const {
        params: { id },
        body: { provider, ...complaintData }
    } = req;

    const existing = await getComplaintById(id);

    if (!existing) {
        return res.status(404).send({message: "Complaint not found"})
    }

    const updated = {
        ...existing,
        ...complaintData,
        assessor: provider
    };

    if (updated.status === ComplaintStatus.Resolved && updated.status !== existing.status) {
        updated.resolvedOn = new Date();
    }

    const saved = await getRepository(Complaint).save(updated);

    await Promise.all(
      updated.infringements.map((infringement: Infringement) => {
          return getRepository(Infringement).save(infringement);
      })
    );

    return res.send(saved);
}

export const submit_complaint = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req;

    const existing = await getComplaintById(id);

    existing.submitted = true;
    existing.submittedOn = new Date();

    if (!existing.filterListTimestamps) {
        existing.filterListTimestamps = []
    }

    for (let filterList of existing.filterLists) {
        for (let infringement of existing.infringements) {
            const cid = new Cid();
            cid.filter = filterList;
            cid.setCid(infringement.value);
            cid.refUrl = "http://172.30.1.6:3000/#/complaint/" + existing._id;

            await getRepository(Cid).save(cid);
        }

        existing.filterListTimestamps.push({
            listId: filterList.id,
            timestamp: new Date()
        })
    }

    const saved = await getRepository(Complaint).save(existing);

    return res.send(saved);
}

export const get_complaint = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getComplaintById(id);

    if (!complaint) {
        return res.status(404).send({message: "Complaint not found"})
    }

    return res.send(complaint)
}

export const get_public_complaint = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getPublicComplaintById(id);

    if (!complaint) {
        return res.status(404).send({message: "Complaint not found"})
    }

    for (const infringement of complaint.infringements) {
        infringement.resync = true;

        await getRepository(Complaint).save(complaint);
    }

    complaint.infringements = filterFields(complaint.infringements, ['value', 'accepted', 'hostedBy']);

    for (const infringement of complaint.infringements) {
        for (const deal of infringement.hostedBy) {
            deal.filtering = FilteringStatus.NotAvailable;
            const provider = await getProviderByMinerId(deal.node);

            if (provider) {
                const cids = await getCidByProvider(provider.id, infringement.value);
                deal.country = provider.country;

                if (cids.length > 0) {
                    deal.filtering = FilteringStatus.Filtering;
                } else {
                    deal.filtering = FilteringStatus.NotFiltering;
                }
            }
        }
    }

    return res.send(
        filterFieldsSingle(
            complaint,
            [
                '_id',
                'fullName',
                'email',
                'assessor',
                'companyName',
                'created',
                'complaintDescription',
                'title',
                'geoScope',
                'type',
                'resolvedOn',
                'submittedOn',
                'filterLists',
                'infringements',
            ]
        )
    )
}

export const get_related_complaints = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getComplaintById(id);

    const related = {
        complainant: await getComplaintsByComplainant(complaint.email, 2, [complaint._id]),
        cids: [],
    }

    for (const infringement of complaint.infringements) {
        if (related.cids.length == 2) {
            break;
        }

        const relatedComplaints = await getComplaintsByCid(infringement.value, 2, [complaint._id]);
        if (relatedComplaints.length > 0) {
            related.cids.push({infringement: infringement.value, complaints: relatedComplaints});
        }
    }

    return res.send(related);
}

export const get_public_related_complaints = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getComplaintById(id);

    const related = {
        complaintsByComplainant: await getComplaintsByComplainant(complaint.email, 5, [complaint._id], true),
        complaintsByCids: [],
    }

    for (const infringement of complaint.infringements) {
        if (related.complaintsByCids.length == 2) {
            break;
        }

        const relatedComplaints = await getComplaintsByCid(infringement.value, 5, [complaint._id], true);
        if (relatedComplaints.length > 0) {
            related.complaintsByCids.push({infringement: infringement.value, complaints: relatedComplaints});
        }
    }

    return res.send(related);
}

export const get_related_filters = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

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

    relatedFilters = relatedFilters.filter((value, index, self) =>
        index === self.findIndex((t) => t.id === value.id)
    )

    return res.send(
        relatedFilters
    );
}

export const mark_as_spam = async (req: Request, res: Response) => {
    const {
        body: {
            complaintIds,
            dontShowModal,
            provider
        }
    } = req;

    if (dontShowModal) {
        let config = await getRepository(Config).findOne({
            where: {
                provider,
            },
        });

        if (!config) {
            config = new Config();
            config.provider = provider;
            config.config = JSON.stringify({});
        }

        let configJson = JSON.parse(config.config);
        if (!configJson.dontShow) {
            configJson = {
                ...configJson,
                dontShow: ['markAsSpamModal']
            }
        } else if (!configJson.dontShow.includes('markAsSpamModal')){
            configJson = {
                ...configJson,
                dontShow: [...configJson.dontShow, 'markAsSpamModal']
            }
        }
        config.config = JSON.stringify(configJson);
        await getRepository(Config).save(config);
    }

    for (const complaintId of complaintIds) {
        const complaint = await getRepository(Complaint).findOne(complaintId);
        if (!complaint || [ComplaintStatus.Resolved, ComplaintStatus.Spam].includes(complaint.status)) {
            continue;
        }

        complaint.status = ComplaintStatus.Spam
        complaint.isSpam = true;
        complaint.submitted = true;
        complaint.resolvedOn = new Date();

        await getRepository(Complaint).save(complaint);
    }

    return res.send({success: true});
}

export const general_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const region = req.query.region ? req.query.region as string : null;

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    let typeStats = null;
    let countryStats = null;
    let infringementStats = null;
    let complaintStats = null;
    let complainantCount = null;
    let assessorCount = null;
    let filteredInfringements = null;
    let fileTypeStats = null;
    let complainantCountryCount = null;

    try {
        typeStats = await getTypeStats(startDate, endDate, region);
        fileTypeStats = await getFileTypeStats(startDate, endDate, region);
        countryStats = await getCountryStats(startDate, endDate, region);
        infringementStats = await getInfringementStats(startDate, endDate, region);
        complaintStats = await getComplaintStatusStats(startDate, endDate, region);
        complainantCount = await getComplainantCount(startDate, endDate, region);
        complainantCountryCount = await getComplainantCountryCount(startDate, endDate, region);
        assessorCount = await getAssessorCount(startDate, endDate, region);
        filteredInfringements = await getFilteredInfringements(startDate, endDate, region);
    } catch (e) {
        console.log(e);
        return res.status(400).send("There was an error. Please check your parameters.");
    }

    const stats = {
        type: typeStats,
        fileType: fileTypeStats,
        country: countryStats,
        infringements: {
            infringementStats: infringementStats.reduce(
                (prev, curr) => {
                    let obj = {...prev};
                    if (curr.accepted) {
                        obj["accepted"] = curr;
                    } else {
                        obj["rejected"] = curr;
                    }

                    return obj
                },
                {}
            ),
            filteredInfringements: filteredInfringements
        },
        complaints: complaintStats.reduce(
            (prev, curr) => {
                let obj = {...prev}
                if (curr.submitted) {
                    obj['assessed'] = curr;
                } else {
                    obj['notAssessed'] = curr;
                }

                return obj;
            },
            {}
        ),
        complainant: complainantCount[0],
        complainantCountry: complainantCountryCount[0],
        assessor: assessorCount[0],
    }

    return res.send(stats);
}

export const country_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const country = req.params.country ? req.params.country as string : null;

    if (!country) {
        return res.status(400).send("Country missing.");
    }

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    const result = await getCountryMonthlyStats(country, startDate, endDate);
    result.sort((a, b) => {
        const keyA = a.date;
        const keyB = b.date;
            
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    })
    
    return res.send(result);
}

export const category_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const category = req.params.category ? req.params.category as string : null;

    if (!category) {
        return res.status(400).send("Category missing.");
    }

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    const result = await getCategoryMonthlyStats(category, startDate, endDate);
    result.sort((a, b) => {
        const keyA = a.date;
        const keyB = b.date;
            
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    })

    return res.send(result);
}

export const complaint_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const region = req.params.region ? req.params.region as string : null;

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    const result = await getComplaintsMonthlyStats(startDate, endDate, region);
    result.sort((a, b) => {
        const keyA = a.date;
        const keyB = b.date;
            
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    })

    return res.send(result);
}

export const infringement_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const region = req.params.region ? req.params.region as string : null;

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    const result = await getInfringementMonthlyStats(startDate, endDate, region);
    result.sort((a, b) => {
        const keyA = a.date;
        const keyB = b.date;
            
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    })

    return res.send(result);
}

export const complainant_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const region = req.params.region ? req.params.region as string : null;

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    const result = await getComplainantsMonthlyStats(startDate, endDate, region);
    result.sort((a, b) => {
        const keyA = a.date;
        const keyB = b.date;
            
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    })

    return res.send(result);
}

export const assessor_stats = async (req: Request, res: Response) => {
    const start = req.query.startDate ? req.query.startDate as string : null;
    const end = req.query.endDate ? req.query.endDate as string : null;
    const region = req.params.region ? req.params.region as string : null;

    let startDate = null;
    if (start) {
        try {
            startDate = new Date(start)
        } catch(e) {
            return res.status(400).send("Invalid parameter for start date");
        }
    }

    let endDate = null;
    if (end) {
        try {
            endDate = new Date(end)
        } catch(e) {
            return res.status(400).send("Invalid parameter for end date");
        }
    }

    const result = await getAssessorsMonthlyStats(startDate, endDate, region);
    result.sort((a, b) => {
        const keyA = a.date;
        const keyB = b.date;
            
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    })

    return res.send(result);
}
