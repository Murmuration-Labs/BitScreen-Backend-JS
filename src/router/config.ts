import * as express from 'express';
import {get_config, save_config} from "../controllers/config.controller";

const configRouter = express.Router();

configRouter.get('/:providerId', get_config);
configRouter.put('/', save_config);

export default configRouter;
