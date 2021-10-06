import * as express from 'express';
import { verifyAccessToken } from '../service/jwt';
import {
    change_provider_filters_status,
    create_provider_filter, delete_provider_filter,
    update_provider_filter
} from "../controllers/provider_filter.controller";

const providerFilterRouter = express.Router();

providerFilterRouter.post('/', verifyAccessToken, create_provider_filter);
providerFilterRouter.put('/:providerId/:filterId', verifyAccessToken, update_provider_filter);
providerFilterRouter.put('/:filterId/shared/enabled', verifyAccessToken, change_provider_filters_status);
providerFilterRouter.delete('/:providerId/:filterId', verifyAccessToken, delete_provider_filter);

export default providerFilterRouter;
