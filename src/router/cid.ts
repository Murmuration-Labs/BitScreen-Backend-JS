import * as express from 'express';
import { getAccessKey, verifyAccessToken } from '../service/jwt';
import {
  cid_conflict,
  create_cid,
  delete_cid,
  edit_cid,
  get_blocked_cids,
} from '../controllers/cid.controller';

const cidRouter = express.Router();

/**
 * @api {post} /cid Create a new CID
 * @apiName SaveCID
 * @apiGroup CID
 *
 * @apiBody {Number} filterId The filter ID that the CID belongs to.
 * @apiBody {String} cid The CID string to block
 * @apiBody {String} refUrl A reference URL to the complaint
 *
 * @apiError BadRequest filterId is not set
 * @apiError FilterNotFound filter is not found
 *
 * @apiSuccess {Object} cid The saved CID object
 */
cidRouter.post('/', verifyAccessToken, create_cid);

/**
 * @api {put} /cid/:id Edit existing CID
 * @apiName EditCID
 * @apiGroup CID
 *
 * @apiParam {Number} id CIDs unique ID.
 *
 * @apiBody {String} cid The CID string to block
 * @apiBody {String} refUrl A reference URL to the complaint
 *
 * @apiSuccess {Object} cid The saved CID object
 */
cidRouter.put('/:id', verifyAccessToken, getAccessKey, edit_cid);

/**
 * @api {get} /cid/conflict Check the conflict status of a CID
 * @apiName OverrideCIDStatus
 * @apiGroup CID
 *
 * @apiQuery {Number} filterId The filter ID that the CID belongs to.
 * @apiQuery {String} cid The CID string to check
 *
 * @apiError InvalidCID cid is invalid
 * @apiError InvalidFilter filter is invalid
 *
 * @apiSuccess {Number} local The local count
 * @apiSuccess {Number} remote The remote count
 */
cidRouter.get('/conflict', verifyAccessToken, getAccessKey, cid_conflict);

/**
 * @api {delete} /cid/:id Delete CID
 * @apiName DeleteCID
 * @apiGroup CID
 *
 * @apiParam {Number} id CIDs unique ID.
 */
cidRouter.delete('/:id', verifyAccessToken, delete_cid);

/**
 * @api {get} /cid/blocked Get blocked CID list
 * @apiName BlockedCIDList
 * @apiGroup CID
 *
 * @apiQuery {Boolean} [download=False] Whether the response be a file or not
 *
 * @apiSuccess {String[]} cids A list of blocked CIDs
 */
cidRouter.get('/blocked', verifyAccessToken, getAccessKey, get_blocked_cids);

export default cidRouter;
