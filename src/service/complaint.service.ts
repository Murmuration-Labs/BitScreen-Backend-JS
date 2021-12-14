import {getRepository} from "typeorm";
import {Complaint} from "../entity/Complaint";
import {CreateComplaint} from "./email_templates";
import {logger} from "./logger";

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export const getComplaints = (query: string) => {
    const qb = getRepository(Complaint)
        .createQueryBuilder('c')
        .leftJoin('c.infringements', 'i')
        .addSelect('i');

    if (query.length > 0) {
        qb.orWhere('c.fullName LIKE :query')
            .orWhere('c.email LIKE :query')
            .orWhere('c.complaintDescription LIKE :query')
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

export const getComplaintsByComplainant = (complainant: string, limit: number = 0, excluded: number[] = []) => {
    const qb = getRepository(Complaint).createQueryBuilder('c');
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

export const getComplaintsByCid = (cid: string, limit: number = 0, excluded: number[] = []) => {
    const qb = getRepository(Complaint).createQueryBuilder('c');

    qb.innerJoin('c.infringements', 'i')
        .andWhere('i.value = :cid')
        .orderBy('c.created')
        .setParameter('cid', cid);

    if (excluded.length > 0) {
        qb.andWhere('c._id NOT IN (:...excluded)')
          .setParameter('excluded', excluded);
    }

    if (limit > 0) {
        qb.limit(limit);
    }

    return qb.getMany();
}
