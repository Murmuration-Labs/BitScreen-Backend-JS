import * as express from 'express';
import { all_assessors } from '../controllers/assessor.controller'

const assessorRouter = express.Router();

/**
 * @api {get} /assessors Get all assessors
 * @apiName AllAssessors
 * @apiGroup Assessor
 *
 * @apiSuccess {Object[]} assessor[] List of all assessors
 */
assessorRouter.get('/all', all_assessors);

export default assessorRouter;
