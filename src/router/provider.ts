import * as express from 'express';
import {getWalletAddressHashed, verifyAccessToken} from '../service/jwt';
import {
  create_provider,
  delete_provider,
  edit_provider, export_provider,
  get_by_wallet,
  provider_auth
} from "../controllers/provider.controller";

const providerRouter = express.Router();

providerRouter.get('/export', verifyAccessToken, getWalletAddressHashed, export_provider);
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
 * @apiName EditProvider
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
providerRouter.delete('/:wallet', verifyAccessToken, getWalletAddressHashed, delete_provider);

export default providerRouter;
