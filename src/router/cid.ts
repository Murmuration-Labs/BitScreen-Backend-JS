import * as express from 'express';
import { verifyAccessToken } from '../service/jwt';
import {cid_override, create_cid, delete_cid, move_cid} from "../controllers/cid.controller";

const cidRouter = express.Router();

cidRouter.post('/', verifyAccessToken, create_cid);
cidRouter.post('/:id/move/:toFilterId', verifyAccessToken, move_cid);
cidRouter.get('/override', verifyAccessToken, cid_override);
cidRouter.delete('/:id', verifyAccessToken, delete_cid);

export default cidRouter;
