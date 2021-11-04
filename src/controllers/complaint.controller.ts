import {Request, Response} from "express";
import {getComplaints, sendCreatedEmail} from "../service/complaint.service";
import {Complaint, ComplaintStatus} from "../entity/Complaint";
import {getRepository} from "typeorm";

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
    complaint.infringements = complaintData.infringements;
    complaint.workDescription = complaintData.workDescription;
    complaint.agreement = complaintData.agreement;
    complaint.complainantType = complaintData.complainantType;
    complaint.onBehalfOf = complaintData.onBehalfOf;

    complaint.status = ComplaintStatus.Created;

    const saved = await getRepository(Complaint).save(complaint);

    sendCreatedEmail(saved.email)

    return res.send(saved)
}

export const get_complaint = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getRepository(Complaint).findOne(id)

    if (!complaint) {
        return res.status(404).send({message: "Complaint not found"})
    }

    return res.send(complaint)
}
