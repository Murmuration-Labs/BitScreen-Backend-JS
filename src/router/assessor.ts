import * as express from 'express';
import {
  all_assessors,
  create_assessor,
  delete_assessor,
  export_assessor_data,
  get_assessor_complaints_count,
} from '../controllers/assessor.controller';
import { getWalletAddressHashed, verifyAccessToken } from '../service/jwt';

const assessorRouter = express.Router();

/**
 * @api {post} /assessor Create assessor
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
 * @api {delete} /assessor/:wallet Delete provider
 * @apiName DeleteAssessor
 * @apiGroup Assessor
 *
 * @apiParam {string} wallet The asssessor wallet
 */
assessorRouter.delete(
  '/',
  verifyAccessToken,
  getWalletAddressHashed,
  delete_assessor
);

/**
 * @api {get} /assessors Get all assessors
 * @apiName AllAssessors
 * @apiGroup Assessor
 *
 * @apiSuccess {Object[]} assessor[] List of all assessors
 */
assessorRouter.get('/all', all_assessors);

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

export default assessorRouter;
