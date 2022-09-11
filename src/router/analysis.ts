import * as express from 'express';
import { save_analysis } from '../controllers/analysis.controller';

const analysisRouter = express.Router();

analysisRouter.post('/', save_analysis);

export default analysisRouter;
