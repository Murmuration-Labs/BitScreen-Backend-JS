import * as express from 'express';
import {
  all_assessors,
  assessor_auth,
  create_assessor,
  delete_assessor,
  export_assessor_data,
  get_assessor_complaints_count,
  get_by_wallet,
  get_by_wallet_with_provider,
} from '../controllers/assessor.controller';
import { getWalletAddressHashed, verifyAccessToken } from '../service/jwt';

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
 * @api {delete} /assessor/:wallet Delete assessor
 * @apiName DeleteAssessor
 * @apiGroup Assessor
 *
 * @apiParam {string} wallet The asssessor wallet
 */
assessorRouter.delete(
  '/:wallet',
  verifyAccessToken,
  getWalletAddressHashed,
  delete_assessor
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
  getWalletAddressHashed,
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
