import { Request, Response } from 'express';
import { getAllAssessors } from '../service/assessor.service';

export const all_assessors = async (req: Request, res: Response) => {
  let assessors = await getAllAssessors();

  return res.send({ assessors });
};
