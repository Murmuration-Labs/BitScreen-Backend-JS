import * as express from 'express';
import { getAccessKey, verifyAccessToken } from '../service/jwt';
import {
  create_provider,
  create_provider_by_email,
  edit_provider,
  soft_delete_provider,
  export_provider,
  get_auth_info_wallet,
  get_auth_info_email,
  provider_auth_wallet,
  provider_auth_email,
  get_provider_data,
  get_provider,
  link_to_google_account,
  link_google_account_to_wallet,
  generate_nonce_for_signature,
} from '../controllers/provider.controller';

const providerRouter = express.Router();

/**
 * @api {get} /provider/auth_info/:wallet Get provider data required for auth
 * @apiName GetProviderAuthInfoWallet
 * @apiGroup Provider
 *
 * @apiParam {String} wallet The wallet to authenticate
 *
 * @apiSuccess {Object} provider The provider data required for auth
 */
providerRouter.get('/auth_info/:wallet', get_auth_info_wallet);

/**
 * @api {get} /provider/auth_info/email/:tokenId Get provider data required for auth
 * @apiName GetAssessorAuthInfoEmail
 * @apiGroup Provider
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} provider The provider data required for auth
 */
providerRouter.get('/auth_info/email/:tokenId', get_auth_info_email);

/**
 * @api {get} /provider/export Export account data
 * @apiName ExportProvider
 * @apiGroup Provider
 *
 * @apiSuccess {file} export.zip The provider data
 */
providerRouter.get('/export', verifyAccessToken, getAccessKey, export_provider);

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
providerRouter.post('/wallet/:wallet', create_provider);

/**
 * @api {post} /provider/email Create provider
 * @apiName CreateProvider
 * @apiGroup Provider
 *
 * @apiBody {string} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 */
providerRouter.post('/email', create_provider_by_email);

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
providerRouter.post('/auth/wallet/:wallet', provider_auth_wallet);

/**
 * @api {post} /provider/auth/email Authenticate provider
 * @apiName AuthProvider
 * @apiGroup Provider
 *
 * @apiBody {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} provider The provider data
 * @apiSuccess {String} walletAddress The provider wallet
 * @apiSuccess {String} accessToken The JWT token
 */
providerRouter.post('/auth/email', provider_auth_email);

/**
 * @api {get} /provider Get provider data
 * @apiName GetProvider
 * @apiGroup Provider
 *
 * @apiSuccess {Object} provider The provider data
 */
providerRouter.get('/', get_provider_data);

/**
 * @api {post} /provider/link-google/:tokenId Link wallet account provider to Google account
 * @apiName LinkToGoogle
 * @apiGroup Provider
 *
 * @apiParam {string} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 */
providerRouter.post(
  '/link-google/:tokenId',
  verifyAccessToken,
  getAccessKey,
  link_to_google_account
);

/**
 * @api {post} /provider/generate-nonce/:wallet Generate nonce for the user to sign and prove ownership of wallet address
 * @apiName GenerateNonce
 * @apiGroup Provider
 *
 * @apiParam {string} wallet The provider wallet
 */
providerRouter.post(
  '/generate-nonce/:wallet',
  verifyAccessToken,
  getAccessKey,
  generate_nonce_for_signature
);

/**
 * @api {post} /provider/link-wallet/:wallet Generate nonce for the user to sign and prove ownership of wallet address
 * @apiName GenerateNonce
 * @apiGroup Provider
 *
 * @apiParam {string} wallet The provider wallet
 * @apiBody {string} signature The signature that proves ownership of wallet address
 */
providerRouter.post(
  '/link-wallet/:wallet',
  verifyAccessToken,
  getAccessKey,
  link_google_account_to_wallet
);

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
 * @api {put} /provider Edit provider
 * @apiName EditProvider
 * @apiGroup Provider
 *
 * @apiBody {Object} provider The provider data to update
 *
 * @apiSuccess {Object} provider The provider data
 */
providerRouter.put('/', verifyAccessToken, getAccessKey, edit_provider);

/**
 * @api {delete} /provider Delete provider
 * @apiName DeleteProvider
 * @apiGroup Provider
 */
providerRouter.delete(
  '/',
  verifyAccessToken,
  getAccessKey,
  soft_delete_provider
);

export default providerRouter;
