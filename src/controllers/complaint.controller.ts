import {Request, Response} from "express";
import {getComplaints, sendCreatedEmail} from "../service/complaint.service";
import {Complaint} from "../entity/Complaint";
import {Cid} from "../entity/Cid";
import {getRepository} from "typeorm";

export const search_complaints = async (req: Request, res: Response) => {
    const q = req.query.q ? req.query.q as string : '';

    const complaints = await getComplaints(q)

    return res.send(complaints)
}

export const create_complaint = async (req: Request, res: Response) => {
    const {
        body: {reporterEmail, typeOfViolation, reporterName, status, description, dmcaNotice, businessName, address, phoneNumber, cids}
    } = req

    let complaint = new Complaint()
    complaint.reporterEmail = reporterEmail
    complaint.typeOfViolation = typeOfViolation
    complaint.reporterName = reporterName
    complaint.description = description
    complaint.dmcaNotice = dmcaNotice
    complaint.businessName = businessName
    complaint.address = address
    complaint.phoneNumber = phoneNumber
    complaint.status = status

    complaint = await getRepository(Complaint).save(complaint)

    await Promise.all(
        cids.map((x) => {
            const cid = new Cid();

            cid.cid = x;
            cid.complaint = complaint;

            return getRepository(Cid).save(cid);
        })
    );

    sendCreatedEmail(complaint.reporterEmail)

    return res.send(complaint)
}

export const get_complaint = async (req: Request, res: Response) => {
    const {
        params: { id }
    } = req

    const complaint = await getRepository(Complaint).findOne(id, {relations: ['cids']})

    if (!complaint) {
        return res.status(404).send({message: "Complaint not found"})
    }

    return res.send(complaint)
}
