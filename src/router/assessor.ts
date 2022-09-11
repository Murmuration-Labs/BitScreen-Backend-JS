import * as express from 'express';
import {
  all_assessors,
  create_assessor,
  delete_assessor,
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

export default assessorRouter;
