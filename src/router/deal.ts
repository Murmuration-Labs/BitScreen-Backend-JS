import * as express from "express";
import {getWalletAddressHashed, verifyAccessToken} from "../service/jwt";
import {create_deal, get_deal_stats} from "../controllers/deal.controller";

const dealRouter = express.Router();

dealRouter.post('/', create_deal);
dealRouter.get('/stats/:bucketSize', verifyAccessToken, getWalletAddressHashed, get_deal_stats)

export default dealRouter;
