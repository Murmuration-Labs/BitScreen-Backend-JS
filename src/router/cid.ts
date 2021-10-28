import * as express from 'express';
import {getWalletAddressHashed, verifyAccessToken} from '../service/jwt';
import {
    cid_exception,
    create_cid,
    delete_cid,
    edit_cid,
    get_blocked_cids,
    move_cid
} from "../controllers/cid.controller";

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
cidRouter.put('/:id', verifyAccessToken, edit_cid);

/**
 * @api {post} /cid/:id/move/:toFilterId Move CID to another filter
 * @apiName MoveCID
 * @apiGroup CID
 *
 * @apiParam {Number} id CIDs unique ID.
 * @apiParam {Number} toFilterId Filter ID to move CID to
 *
 * @apiError CIDNotFound cid is not found
 * @apiError FilterNotFound filter is not found
 *
 * @apiSuccess {Object} cid The saved CID object
 */
cidRouter.post('/:id/move/:toFilterId', verifyAccessToken, move_cid);

/**
 * @api {get} /cid/conflict Check the conflict status of a CID
 * @apiName OverrideCIDStatus
 * @apiGroup CID
 *
 * @apiQuery {Number} filterId The filter ID that the CID belongs to.
 * @apiQuery {String} cid The CID string to check
 * @apiQuery {String} providerId The providerId for which to check the CID
 *
 * @apiError InvalidCID cid is invalid
 * @apiError InvalidFilter filter is invalid
 * @apiError InvalidProvider provider is invalid
 *
 * @apiSuccess {Number} local The local count
 * @apiSuccess {Number} remote The remote count
 */
cidRouter.get('/conflict', verifyAccessToken, cid_exception);

/**
 * @api {delete} /cid/:id Delete CID
 * @apiName DeleteCID
 * @apiGroup CID
 *
 * @apiParam {Number} id CIDs unique ID.
 */
cidRouter.delete('/:id', verifyAccessToken, delete_cid);

/**
 * @api {get} /blocked Get blocked CID list
 * @apiName BlockedCIDList
 * @apiGroup CID
 *
 * @apiQuery {Boolean} [download=False] Whether the response be a file or not
 *
 * @apiSuccess {String[]} cids A list of blocked CIDs
 */
cidRouter.get('/blocked', verifyAccessToken, getWalletAddressHashed, get_blocked_cids);

export default cidRouter;
