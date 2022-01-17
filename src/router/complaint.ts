import * as express from "express";
import {
  create_complaint,
  get_complaint,
  get_related_complaints, review_complaint,
  search_complaints, submit_complaint
} from "../controllers/complaint.controller";

const complaintRouter = express.Router();

/**
 * @api {get} /complaints/search Search complaints
 * @apiName SearchComplaints
 * @apiGroup Complaints
 *
 * @apiQuery {String} [q=''] The search criteria
 *
 * @apiSuccess {Object[]} complaints The list of complaints that match the criteria
 */
complaintRouter.get('/search', search_complaints)

/**
 * @api {get} /complaints/:id Get complaint by ID
 * @apiName GetComplaint
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/:id', get_complaint)

/**
 * @api {get} /complaints/:id/related Get complaints related with ID
 * @apiName GetRelatedComplaints
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} complaints The related complaints
 */
complaintRouter.get('/:id/related', get_related_complaints)

/**
 * @api {post} /complaints Create a new complaint
 * @apiName CreateComplaint
 * @apiGroup Complaints
 *
 * @apiBody {String} reporterEmail The email of the reporter
 * @apiBody {Number=0,1} typeOfViolation The type of violation
 * @apiBody {String} reporterName The name of the reporter
 * @apiBody {Number=0,1} status The status of the complaint.
 * @apiBody {String} description The description of the complaint
 * @apiBody {String} dmcaNotice The DMCA notice associated to the complaint
 * @apiBody {String} businessName The business name of the reporter
 * @apiBody {String} address The address of the reporter
 * @apiBody {String} phoneNumber The phone number of the reporter
 * @apiBody {String[]} cids The list of reported CIDs
 *
 * @apiSuccess {Object} complaint The submitted complaint
 */
complaintRouter.post('/', create_complaint)

/**
 * @api {put} /complaints/:id Review a complaint
 * @apiName ReviewComplaint
 * @apiGroup Complaints
 *
 * @apiBody {String} reporterEmail The email of the reporter
 * @apiBody {Number=0,1} typeOfViolation The type of violation
 * @apiBody {String} reporterName The name of the reporter
 * @apiBody {Number=0,1} status The status of the complaint.
 * @apiBody {String} description The description of the complaint
 * @apiBody {String} dmcaNotice The DMCA notice associated to the complaint
 * @apiBody {String} businessName The business name of the reporter
 * @apiBody {String} address The address of the reporter
 * @apiBody {String} phoneNumber The phone number of the reporter
 * @apiBody {String[]} cids The list of reported CIDs
 *
 * @apiSuccess {Object} complaint The submitted complaint
 */
complaintRouter.put('/:id', review_complaint)

/**
 * @api {patch} /complaints/:id/submit Review a complaint
 * @apiName SubmitComplaint
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The submitted complaint
 */
complaintRouter.patch('/:id/submit', submit_complaint)

export default complaintRouter
