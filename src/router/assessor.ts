import * as express from 'express';
import {
  all_assessors,
  assessor_auth,
  assessor_auth_by_email,
  create_assessor,
  create_assessor_by_email,
  delete_assessor,
  export_assessor_data,
  generate_nonce_for_signature,
  get_assessor_complaints_count,
  get_by_email,
  get_by_email_with_provider,
  get_by_wallet,
  get_by_wallet_with_provider,
  link_google_account_to_wallet,
  link_to_google_account,
} from '../controllers/assessor.controller';
import { getAccessKey, verifyAccessToken } from '../service/jwt';

const assessorRouter = express.Router();

/**
 * @api {get} /assessor/:wallet Get assessor data by wallet
 * @apiName GetAssessor
 * @apiGroup Assessor
 *
 * @apiParam {String} wallet The wallet to authenticate
 *
 * @apiSuccess {Object} assessor The assessor data
 */
assessorRouter.get('/:wallet', get_by_wallet);

/**
 * @api {get} /assessor/:tokenId Get assessor data by tokenId
 * @apiName GetAssessor
 * @apiGroup Assessor
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} assessor The assessor data
 */
assessorRouter.get('/email/:tokenId', get_by_email);

/**
 * @api {get} /assessor/:wallet Get assessor & associated provider data by wallet
 * @apiName GetAssessorAndProvider
 * @apiGroup Assessor
 *
 * @apiParam {String} wallet The wallet to authenticate
 *
 * @apiSuccess {Object} assessor The assessor & associated provider data
 */
assessorRouter.get('/with_provider/:wallet', get_by_wallet_with_provider);

/**
 * @api {get} /assessor/:tokenId Get assessor & associated provider data by tokenId
 * @apiName GetAssessorAndProvider
 * @apiGroup Assessor
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} assessor The assessor & associated provider data
 */
assessorRouter.get('/with_provider/email/:tokenId', get_by_email_with_provider);

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
assessorRouter.post('/:wallet', create_assessor);

/**
 * @api {post} /assessor/email/:tokenId Create assessor
 * @apiName CreateAssessor
 * @apiGroup Assessor
 *
 * @apiParam {String} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 *
 * @apiSuccess {Object} assessor The assessor data
 */
assessorRouter.post('/email/:tokenId', create_assessor_by_email);

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
assessorRouter.post('/auth/:wallet', assessor_auth);

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
 * @apiBody {string} tokenId The oauth2.0 tokenId that proves the ownership of a google account
 */
assessorRouter.post(
  '/link-google/:tokenId',
  verifyAccessToken,
  getAccessKey,
  link_to_google_account
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
assessorRouter.delete('/', verifyAccessToken, getAccessKey, delete_assessor);

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
 * @api {get} /assessor/id_extended/:id Get assessor by ID
 * @apiName GetProvider
 * @apiGroup Provider
 *
 * @apiParam {Number} id The unique Provider ID
 *
 * @apiSuccess {Object} provider The provider requested with additional information
 */
assessorRouter.get('/id_extended/:id', get_assessor_complaints_count);

/**
 * @api {get} /assessor Get all assessors
 * @apiName AllAssessors
 * @apiGroup Assessor
 *
 * @apiSuccess {Object[]} assessor[] List of all assessors
 */
assessorRouter.get('/', all_assessors);

export default assessorRouter;
