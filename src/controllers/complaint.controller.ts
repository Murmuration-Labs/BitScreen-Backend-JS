import {Request, Response} from "express";
import {
    getComplaintById,
    getComplaints,
    getComplaintsByCid,
    getComplaintsByComplainant,
    sendCreatedEmail
} from "../service/complaint.service";
import {Complaint, ComplaintStatus} from "../entity/Complaint";
import {getRepository} from "typeorm";
import {Infringement} from "../entity/Infringement";
import {Cid} from "../entity/Cid";
import {Config} from "../entity/Settings";

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

export const create_complaint = async (req: Request, res: Response) => {
    const complaintData = req.body;

    const complaint = new Complaint();
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
              infringement.value = cid;
              infringement.complaint = saved;
              infringement.accepted = false;

              return getRepository(Infringement).save(infringement);
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
    existing.resolvedOn = new Date();

    for (let filterList of existing.filterLists) {
        for (let infringement of existing.infringements) {
            const cid = new Cid();
            cid.filter = filterList;
            cid.setCid(infringement.value);
            cid.refUrl = "http://172.30.1.6:3000/#/complaint/" + existing._id;

            await getRepository(Cid).save(cid);
        }
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
        configJson = {
            ...configJson,
            dontShow: configJson.dontShow ? [...configJson.dontShow, 'markAsSpamModal'] : ['markAsSpamModal']
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
