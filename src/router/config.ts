import * as express from 'express';
import {get_config, save_config} from "../controllers/config.controller";

const configRouter = express.Router();

/**
 * @api {get} /config/:providerId Get config of provider
 * @apiName GetConfig
 * @apiGroup Config
 *
 * @apiSuccess {Object} config The config
 */
configRouter.get('/', get_config);

/**
 * @api {get} /config Save config
 * @apiName SaveConfig
 * @apiGroup Config
 *
 * @apiBody {Object} ...config Any config keys we wish to save. At least 1 must be provided.
 *
 * @apiSuccess {Object} config The config
 */
configRouter.put('/', save_config);

export default configRouter;
