import * as express from 'express';
import {get_config, save_config} from "../controllers/config.controller";
import { getWalletAddressHashed, verifyAccessToken } from '../service/jwt';

const configRouter = express.Router();

/**
 * @api {get} /config Get config of provider
 * @apiName GetConfig
 * @apiGroup Config
 *
 * @apiSuccess {Object} config The config
 */
configRouter.get('/', verifyAccessToken, getWalletAddressHashed, get_config);

/**
 * @api {get} /config Save config
 * @apiName SaveConfig
 * @apiGroup Config
 *
 * @apiBody {Object} ...config Any config keys we wish to save. At least 1 must be provided.
 *
 * @apiSuccess {Object} config The config
 */
configRouter.put('/', verifyAccessToken, getWalletAddressHashed, save_config);

export default configRouter;
