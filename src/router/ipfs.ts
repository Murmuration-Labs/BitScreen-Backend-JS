import * as express from 'express';
import { get_ipfs_file } from '../controllers/ipfs.controller';
import { verifyAccessToken } from '../service/jwt';

const ipfsRouter = express.Router();

ipfsRouter.get('/get/:cid', verifyAccessToken, get_ipfs_file);

export default ipfsRouter;
