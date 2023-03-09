import * as express from 'express';
import {
  all_assessors,
  assessor_auth,
  assessor_auth_by_email,
  create_assessor,
  create_assessor_by_email,
  soft_delete_assessor,
  edit_assessor,
  export_assessor_data,
  generate_nonce_for_signature,
  get_auth_info_wallet,
  get_auth_info_email,
  get_assessor_with_provider,
  link_google_account_to_wallet,
  link_to_google_account,
  get_public_assessor_data,
  unlink_second_login_type,
} from '../controllers/assessor.controller';
import { getAccessKey, verifyAccessToken } from '../service/jwt';

const assessorRouter = express.Router();

/**
 * @api {get} /assessor/auth_info/:wallet Get assessor data required for auth
 * @apiName GetAssessorAuthInfoWallet
 * @apiGroup Assessor
 *
 * @apiParam {String} wallet The wallet to authenticate
 *
 * @apiSuccess {Object} assessor The assessor data required for auth
 */
assessorRouter.get('/auth_info/:wallet', get_auth_info_wallet);

/**
 * @api {get} /assessor/auth_info/email/:tokenId Get assessor data required for auth
 * @apiName GetAssessorAuthInfoEmail
 * @apiGroup Assessor
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} assessor The assessor data required for auth
 */
assessorRouter.get('/auth_info/email/:tokenId', get_auth_info_email);

/**
 * @api {get} /assessor/with_provider Get assessor & associated provider data
 * @apiName GetAssessorWithProvider
 * @apiGroup Assessor
 *
 * @apiSuccess {Object} assessor The assessor & associated provider data
 */
assessorRouter.get(
  '/with_provider',
  verifyAccessToken,
  getAccessKey,
  get_assessor_with_provider
);

/**
 * @api {post} /assessor/:wallet Create assessor
 * @apiName CreateAssessor
 * @apiGroup Assessor
 *
 * @apiParam {string} wallet The assessor wallet
 * @apiBody {Object} assessor The assessor data
 *
 * @apiSuccess {Object} assessor The assessor data
 * @apiSuccess {String} walletAddress The assessor wallet
 */
assessorRouter.post('/create/:wallet', create_assessor);

/**
 * @api {post} /assessor/email/:tokenId Create assessor
 * @apiName CreateAssessor
 * @apiGroup Assessor
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} assessor The assessor data
 */
assessorRouter.post('/create/email/:tokenId', create_assessor_by_email);

/**
 * @api {post} /assessor/auth/:wallet Authenticate assessor
 * @apiName AuthAssessor
 * @apiGroup Assessor
 *
 * @apiParam {String} wallet The wallet to authenticate
 * @apiBody {String} signature The signature that authenticates the assessor
 *
 * @apiSuccess {Object} assessor The assessor data
 * @apiSuccess {String} walletAddress The assessor wallet
 * @apiSuccess {String} accessToken The JWT token
 */
assessorRouter.post('/auth/wallet/:wallet', assessor_auth);

/**
 * @api {post} /assessor/auth/:wallet Authenticate assessor
 * @apiName AuthAssessor
 * @apiGroup Assessor
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} assessor The assessor data
 * @apiSuccess {String} accessToken The JWT token
 */
assessorRouter.post('/auth/email/:tokenId', assessor_auth_by_email);

/**
 * @api {post} /assessor/link-google/:tokenId Link wallet account assessor to Google account
 * @apiName LinkToGoogle
 * @apiGroup Assessor
 *
 * @apiParam {string} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 */
assessorRouter.post(
  '/link-google/:tokenId',
  verifyAccessToken,
  getAccessKey,
  link_to_google_account
);

/**
 * @api {post} /assessor/unlink-second-login-type Remove second login type from account
 * @apiName UnlinkSecondLogin
 * @apiGroup Assessor
 */
assessorRouter.post(
  '/unlink-second-login-type',
  verifyAccessToken,
  getAccessKey,
  unlink_second_login_type
);

/**
 * @api {post} /assessor/generate-nonce/:wallet Generate nonce for the user to sign and prove ownership of wallet address
 * @apiName GenerateNonce
 * @apiGroup Assessor
 *
 * @apiParam {string} wallet The assessor wallet
 */
assessorRouter.post(
  '/generate-nonce/:wallet',
  verifyAccessToken,
  getAccessKey,
  generate_nonce_for_signature
);

/**
 * @api {post} /assessor/link-wallet/:wallet Generate nonce for the user to sign and prove ownership of wallet address
 * @apiName GenerateNonce
 * @apiGroup Assessor
 *
 * @apiParam {string} wallet The assessor wallet
 * @apiBody {string} signature The signature that proves ownership of wallet address
 */
assessorRouter.post(
  '/link-wallet/:wallet',
  verifyAccessToken,
  getAccessKey,
  link_google_account_to_wallet
);

/**
 * @api {delete} /assessor Delete assessor
 * @apiName DeleteAssessor
 * @apiGroup Assessor
 */
assessorRouter.delete(
  '/',
  verifyAccessToken,
  getAccessKey,
  soft_delete_assessor
);

/**
 * @api {get} /assessor/export_assessor Export Assessor account data
 * @apiName ExportAssessor
 * @apiGroup Assessor
 *
 * @apiSuccess {file} export.zip The assessor data
 */
assessorRouter.get(
  '/export_assessor',
  verifyAccessToken,
  getAccessKey,
  export_assessor_data
);

/**
 * @api {get} /assessor/:id Get assessor by ID
 * @apiName GetProvider
 * @apiGroup Provider
 *
 * @apiParam {Number} id The unique Provider ID
 *
 * @apiSuccess {Object} provider The provider requested with additional information
 */
assessorRouter.get('/:id', get_public_assessor_data);

/**
 * @api {get} /assessor Get all assessors
 * @apiName AllAssessors
 * @apiGroup Assessor
 *
 * @apiSuccess {Object[]} assessor[] List of all assessors
 */
assessorRouter.get('/', all_assessors);

/**
 * @api {put} /provider Edit provider
 * @apiName EditProvider
 * @apiGroup Provider
 *
 * @apiBody {Object} provider The provider data to update
 *
 * @apiSuccess {Object} provider The provider data
 */
assessorRouter.put('/', verifyAccessToken, getAccessKey, edit_assessor);

export default assessorRouter;
