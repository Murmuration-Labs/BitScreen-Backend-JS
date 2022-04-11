import * as express from "express";
import cidRouter from "./cid";
import {save_analysis} from "../controllers/analysis.controller";

const analysisRouter = express.Router();

cidRouter.post('/', save_analysis);

export default analysisRouter;
