import * as express from 'express';
import { verifyAccessToken } from '../service/jwt';
import {
    change_provider_filters_status,
    create_provider_filter, delete_provider_filter,
    update_provider_filter
} from "../controllers/provider_filter.controller";

const providerFilterRouter = express.Router();

/**
 * @api {post} /provider-filter Create providerFilter
 * @apiName CreateProviderFilter
 * @apiGroup ProviderFilter
 *
 * @apiBody {Number} providerId The unique provider id
 * @apiBody {Number} filterId The unique filter id
 * @apiBody {Boolean} active If the link is active
 * @apiBody {String} notes Notes for the import
 *
 * @apiSuccess {Object} providerFilter The provider filter data
 */
providerFilterRouter.post('/', verifyAccessToken, create_provider_filter);

/**
 * @api {put} /provider-filter/:providerId/:filterId Edit providerFilter
 * @apiName EditProviderFilter
 * @apiGroup ProviderFilter
 *
 * @apiBody {Object} providerFilter The provider filter data
 * @apiQuery {Number} providerId The unique provider id
 * @apiQuery {Number} filterId The unique filter id
 *
 * @apiSuccess {Object} providerFilter The provider filter data
 */
providerFilterRouter.put('/:providerId/:filterId', verifyAccessToken, update_provider_filter);

/**
 * @api {put} /provider-filter/:filterId/shared/enabled Change providerFilter status
 * @apiName ProviderFilterStatus
 * @apiGroup ProviderFilter
 *
 * @apiBody {Number} providerId The unique provider id
 * @apiBody {Boolean} enabled The provider filter status
 * @apiParam {Number} filterId The unique filter id
 *
 * @apiSuccess {Object} filter The filter data
 */
providerFilterRouter.put('/:filterId/shared/enabled', verifyAccessToken, change_provider_filters_status);

/**
 * @api {delete} /provider-filter/:providerId/:filterId Delete providerFilter
 * @apiName DeleteProviderFilter
 * @apiGroup ProviderFilter
 *
 * @apiParam {Number} providerId The unique provider id
 * @apiParam {Number} filterId The unique filter id
 */
providerFilterRouter.delete('/:providerId/:filterId', verifyAccessToken, delete_provider_filter);

export default providerFilterRouter;
