import * as express from "express";
import {
  create_complaint,
  get_complaint,
  get_public_complaint,
  get_related_complaints,
  mark_as_spam,
  public_complaints,
  general_stats,
  review_complaint,
  search_complaints,
  submit_complaint,
  category_stats,
  country_stats,
  get_public_related_complaints,
  get_related_filters,
  complaint_stats, infringement_stats, complainant_stats, assessor_stats
} from "../controllers/complaint.controller";
import {getProvider, getWalletAddressHashed, verifyAccessToken} from "../service/jwt";

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
complaintRouter.get('/search', verifyAccessToken, search_complaints)

/**
 * @api {get} /complaints/public Search complaints
 * @apiName SearchComplaints
 * @apiGroup Complaints
 *
 * @apiQuery {String} [q=''] The search criteria
 *
 * @apiSuccess {Object[]} complaints The list of public complaints that match the criteria
 */
complaintRouter.get('/public', public_complaints)

/**
 * @api {get} /complaints/stats Get complaint stats
 * @apiName GetComplaintStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats', general_stats)

/**
 * @api {get} /complaints/stats/category/:category Get complaint stats
 * @apiName GetComplaintStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats/category/:category', category_stats)

/**
 * @api {get} /complaints/stats/country/:country Get complaint stats
 * @apiName GetComplaintStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats/country/:country', country_stats)

/**
 * @api {get} /complaints/stats/complaint Get complaint stats
 * @apiName GetComplaintStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats/complaint', complaint_stats)

/**
 * @api {get} /complaints/stats/infringement Get complaint stats
 * @apiName GetInfringementStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats/infringement', infringement_stats)

/**
 * @api {get} /complaints/stats/complainant Get complaint stats
 * @apiName GetComplainantStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats/complainant', complainant_stats)

/**
 * @api {get} /complaints/stats/assessor Get complaint stats
 * @apiName GetAssessorStats
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/stats/assessor', assessor_stats)

/**
 * @api {get} /complaints/:id Get complaint by ID
 * @apiName GetComplaint
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/:id', verifyAccessToken, get_complaint)

/**
 * @api {get} /complaints/public/:id Get public complaint by ID
 * @apiName GetComplaint
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} complaint The complaint requested
 */
complaintRouter.get('/public/:id', get_public_complaint)

/**
 * @api {get} /complaints/:id/related Get complaints related with ID
 * @apiName GetRelatedComplaints
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} complaints The related complaints
 */
complaintRouter.get('/:id/related', verifyAccessToken, get_related_complaints)

/**
 * @api {get} /complaints/public/:id/related Get public complaints related with ID
 * @apiName GetPublicRelatedComplaints
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} complaints The related complaints
 */
complaintRouter.get('/public/:id/related', get_public_related_complaints)

/**
 * @api {get} /complaints/public/:id/related_filters Get public complaints related with ID
 * @apiName GetPublicRelatedFilters
 * @apiGroup Complaints
 *
 * @apiParam {Number} id The unique Complaint ID
 *
 * @apiSuccess {Object} filters The related filters
 */
complaintRouter.get('/public/:id/related_filters', get_related_filters)

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
complaintRouter.put('/:id', verifyAccessToken, getWalletAddressHashed, getProvider, review_complaint)

/**
 * @api {patch} /complaints/:id/submit Review a complaint
 * @apiName SubmitComplaint
 * @apiGroup Complaints
 *
 * @apiSuccess {Object} complaint The submitted complaint
 */
complaintRouter.patch('/:id/submit', verifyAccessToken, submit_complaint)


/**
 * @api {post} /complaints/mark-as-spam Review a complaint
 * @apiName MarkAsSpam
 * @apiGroup Complaints
 *
 * @apiBody {Number[]} complaintIds Complaint ids to mark as spam
 * @apiBody {Boolean} dontShowModal If to show the modal ever again
 *
 * @apiSuccess {boolean} success If the process was successful
 */
complaintRouter.post('/mark-as-spam', verifyAccessToken, getWalletAddressHashed, getProvider, mark_as_spam)

export default complaintRouter
