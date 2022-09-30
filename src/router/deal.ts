import * as express from 'express';
import { getAccessKey, verifyAccessToken } from '../service/jwt';
import { create_deal, get_deal_stats } from '../controllers/deal.controller';

const dealRouter = express.Router();

/**
 * @api {post} /deals Create a new deal
 * @apiName CreateDeal
 * @apiGroup Deals
 *
 * @apiBody {String} wallet The wallet of the miner
 * @apiBody {String} cid The CID requested
 * @apiBody {String=0,1} dealType The type of deal (request/retrieve)
 * @apiBody {String=0,1} status The status of the deal (accept, reject)
 *
 * @apiSuccess {Object} deal The saved Deal
 */
dealRouter.post('/', create_deal);

/**
 * @api {get} /deals/stats/:bucketSize Get deal stats
 * @apiName DealStats
 * @apiGroup Deals
 *
 * @apiParam {String=daily,monthly,yearly} bucketSize The bucket size
 * @apiQuery {String} [start] Start of interval
 * @apiQuery {String} [end] End of interval
 *
 * @apiSuccess {Object[]} result List of entries for the table
 */
dealRouter.get(
  '/stats/:bucketSize',
  verifyAccessToken,
  getAccessKey,
  get_deal_stats
);

export default dealRouter;
