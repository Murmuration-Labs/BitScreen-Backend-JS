import * as express from 'express';
import { verifyAccessToken } from '../service/jwt';
import {
    create_filter, edit_filter, get_filter, get_filter_by_id,
    get_filter_count, get_filter_dashboard, get_owned_filters,
    get_public_filter_details,
    get_public_filters, get_shared_filter
} from "../controllers/filter.controller";

const filterRouter = express.Router();

filterRouter.get('/count/:providerId', verifyAccessToken, get_filter_count);
filterRouter.get('/public', verifyAccessToken, get_public_filters);
filterRouter.get('/public/details/:shareId', verifyAccessToken, get_public_filter_details);
filterRouter.get('/', get_owned_filters);
filterRouter.get('/dashboard', get_filter_dashboard);
filterRouter.get('/:shareId', verifyAccessToken, get_filter);
filterRouter.get('/share/:shareId', verifyAccessToken, get_shared_filter);
filterRouter.get('/:_id', verifyAccessToken, get_filter_by_id);
filterRouter.put('/:id', verifyAccessToken, edit_filter);
filterRouter.post('/', verifyAccessToken, create_filter);

export default filterRouter;
