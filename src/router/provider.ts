import * as express from 'express';
import { verifyAccessToken } from '../service/jwt';
import {create_provider, edit_provider, get_by_wallet, provider_auth} from "../controllers/providerController";

const providerRouter = express.Router();

providerRouter.post('/auth/:wallet', provider_auth);
providerRouter.get('/:wallet', get_by_wallet);
providerRouter.put('/', verifyAccessToken, edit_provider);
providerRouter.post('/:wallet', create_provider);

export default providerRouter;
