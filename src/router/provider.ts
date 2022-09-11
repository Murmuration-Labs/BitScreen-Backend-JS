import * as express from 'express';
import { getWalletAddressHashed, verifyAccessToken } from '../service/jwt';
import {
  create_provider,
  delete_provider,
  edit_provider,
  export_provider,
  export_rodeo_data,
  get_by_wallet,
  provider_auth,
  get_provider,
  get_provider_complaints_count,
} from '../controllers/provider.controller';

const providerRouter = express.Router();

/**
 * @api {get} /provider/export Export account data
 * @apiName ExportProvider
 * @apiGroup Provider
 *
 * @apiSuccess {file} export.zip The provider data
 */
providerRouter.get(
  '/export',
  verifyAccessToken,
  getWalletAddressHashed,
  export_provider
);

/**
 * @api {get} /provider/export_rodeo Export Rodeo account data
 * @apiName ExportRodeoProvider
 * @apiGroup Provider
 *
 * @apiSuccess {file} export.zip The provider data
 */
providerRouter.get(
  '/export_rodeo',
  verifyAccessToken,
  getWalletAddressHashed,
  export_rodeo_data
);

/**
 * @api {post} /provider/auth/:wallet Authenticate provider
 * @apiName AuthProvider
 * @apiGroup Provider
 *
 * @apiParam {String} wallet The wallet to authenticate
 * @apiBody {String} signature The signature that authenticates the provider
 *
 * @apiSuccess {Object} provider The provider data
 * @apiSuccess {String} walletAddress The provider wallet
 * @apiSuccess {String} accessToken The JWT token
 */
providerRouter.post('/auth/:wallet', provider_auth);

/**
 * @api {get} /provider/:wallet Get provider data by wallet
 * @apiName GetProvider
 * @apiGroup Provider
 *
 * @apiParam {String} wallet The wallet to authenticate
 *
 * @apiSuccess {Object} provider The provider data
 */
providerRouter.get('/:wallet', get_by_wallet);

/**
 * @api {get} /provider/id/:id Get provider by ID
 * @apiName GetProvider
 * @apiGroup Provider
 *
 * @apiParam {Number} id The unique Provider ID
 *
 * @apiSuccess {Object} provider The provider requested
 */
providerRouter.get('/id/:id', get_provider);

/**
 * @api {get} /provider/id_extended/:id Get provider by ID
 * @apiName GetProvider
 * @apiGroup Provider
 *
 * @apiParam {Number} id The unique Provider ID
 *
 * @apiSuccess {Object} provider The provider requested with additional information
 */
providerRouter.get('/id_extended/:id', get_provider_complaints_count);

/**
 * @api {put} /provider Edit provider
 * @apiName EditProvider
 * @apiGroup Provider
 *
 * @apiBody {Object} provider The provider data to update
 * @apiBody {Object} walletAddress The provider wallet
 *
 * @apiSuccess {Object} provider The provider data
 */
providerRouter.put('/', verifyAccessToken, edit_provider);

/**
 * @api {post} /provider Create provider
 * @apiName CreateProvider
 * @apiGroup Provider
 *
 * @apiParam {string} wallet The provider wallet
 * @apiBody {Object} provider The provider data
 *
 * @apiSuccess {Object} provider The provider data
 * @apiSuccess {String} walletAddress The provider wallet
 */
providerRouter.post('/:wallet', create_provider);

/**
 * @api {delete} /provider/:wallet Delete provider
 * @apiName DeleteProvider
 * @apiGroup Provider
 *
 * @apiParam {string} wallet The provider wallet
 */
providerRouter.delete(
  '/:wallet',
  verifyAccessToken,
  getWalletAddressHashed,
  delete_provider
);

export default providerRouter;
