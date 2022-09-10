import * as express from 'express';
import { getWalletAddressHashed, verifyAccessToken } from '../service/jwt';
import {
  change_provider_filters_status,
  create_provider_filter,
  delete_provider_filter,
  update_provider_filter,
} from '../controllers/provider_filter.controller';

const providerFilterRouter = express.Router();

/**
 * @api {post} /provider-filter Create providerFilter
 * @apiName CreateProviderFilter
 * @apiGroup ProviderFilter
 *
 * @apiBody {Number} filterId The unique filter id
 * @apiBody {Boolean} active If the link is active
 * @apiBody {String} notes Notes for the import
 *
 * @apiSuccess {Object} providerFilter The provider filter data
 */
providerFilterRouter.post(
  '/',
  verifyAccessToken,
  getWalletAddressHashed,
  create_provider_filter
);

/**
 * @api {put} /provider-filter/:filterId Edit providerFilter
 * @apiName EditProviderFilter
 * @apiGroup ProviderFilter
 *
 * @apiBody {Object} providerFilter The provider filter data
 * @apiQuery {Number} filterId The unique filter id
 *
 * @apiSuccess {Object} providerFilter The provider filter data
 */
providerFilterRouter.put(
  '/:filterId',
  verifyAccessToken,
  getWalletAddressHashed,
  update_provider_filter
);

/**
 * @api {put} /provider-filter/:filterId/shared/enabled Change providerFilter status
 * @apiName ProviderFilterStatus
 * @apiGroup ProviderFilter
 *
 * @apiBody {Boolean} enabled The provider filter status
 * @apiParam {Number} filterId The unique filter id
 *
 * @apiSuccess {Object} filter The filter data
 */
providerFilterRouter.put(
  '/:filterId/shared/enabled',
  verifyAccessToken,
  getWalletAddressHashed,
  change_provider_filters_status
);

/**
 * @api {delete} /provider-filter/:filterId Delete providerFilter
 * @apiName DeleteProviderFilter
 * @apiGroup ProviderFilter
 *
 * @apiParam {Number} filterId The unique filter id
 */
providerFilterRouter.delete(
  '/:filterId',
  verifyAccessToken,
  getWalletAddressHashed,
  delete_provider_filter
);

export default providerFilterRouter;
