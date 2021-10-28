import {getRepository} from "typeorm";
import {Complaint} from "../entity/Complaint";
import {CreateComplaint} from "./email_templates";
import {logger} from "./logger";

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export const getComplaints = (query: string) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .select(['c', 'cids'])
        .innerJoin('c.cids', 'cids')

    if (query.length > 0) {
        qb.orWhere('c.reporterName LIKE :query')
            .orWhere('c.reporterEmail LIKE :query')
            .orWhere('c.description LIKE :query')
            .setParameter('query', `%${query}%`)
    }

    return qb.getMany()
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
