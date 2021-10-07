import * as express from 'express';
import {getWalletAddressHashed, verifyAccessToken} from '../service/jwt';
import {
    cid_override,
    create_cid,
    delete_cid,
    edit_cid,
    get_blocked_cids,
    move_cid
} from "../controllers/cid.controller";

const cidRouter = express.Router();

cidRouter.post('/', verifyAccessToken, create_cid);
cidRouter.put('/:id', verifyAccessToken, edit_cid);
cidRouter.post('/:id/move/:toFilterId', verifyAccessToken, move_cid);
cidRouter.get('/override', verifyAccessToken, cid_override);
cidRouter.delete('/:id', verifyAccessToken, delete_cid);
cidRouter.get('/blocked', verifyAccessToken, getWalletAddressHashed, get_blocked_cids);

export default cidRouter;
