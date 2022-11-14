import { Request, Response } from 'express';
import { CidAnalysis } from '../entity/CidAnalysis';
import { getRepository } from 'typeorm';

export const save_analysis = async (req: Request, res: Response) => {
  const {
    body: { cid, service, status, result, downloadUrl },
  } = req;

  let analysis = new CidAnalysis();

  const existingAnalysis = await getRepository(CidAnalysis).findOne({
    where: {
      cid,
      service,
    },
  });

  if (existingAnalysis) {
    analysis = existingAnalysis;
  }

  analysis.cid = cid;
  analysis.downloadUrl = downloadUrl;
  analysis.service = service;
  analysis.status = status;
  analysis.isOk = result;

  await getRepository(CidAnalysis).save(analysis);

  return res.send(analysis);
};
