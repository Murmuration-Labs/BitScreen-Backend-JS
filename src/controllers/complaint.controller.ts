import {Request, Response} from "express";
import {
    getComplaints,
    getComplaintsByCid,
    getComplaintsByComplainant,
    sendCreatedEmail
} from "../service/complaint.service";
import {Complaint, ComplaintStatus} from "../entity/Complaint";
import {getRepository} from "typeorm";
import {Infringement} from "../entity/Infringement";

export const search_complaints = async (req: Request, res: Response) => {
    const q = req.query.q ? req.query.q as string : '';

    const complaints = await getComplaints(q)

    return res.send(complaints)
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
    complaint.status = ComplaintStatus.Created;

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
}

export const get_complaint = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getRepository(Complaint).findOne(id, {relations: ['infringements']});

    if (!complaint) {
        return res.status(404).send({message: "Complaint not found"})
    }

    return res.send(complaint)
}

export const get_related_complaints = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getRepository(Complaint).findOne(id, {relations: ['infringements']});

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
