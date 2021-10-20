import * as express from "express";
import {create_complaint, get_complaint, search_complaints} from "../controllers/complaint.controller";

const complaintRouter = express.Router();

complaintRouter.get('/search', search_complaints)
complaintRouter.get('/:id', get_complaint)
complaintRouter.post('/', create_complaint)

export default complaintRouter
