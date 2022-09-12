import { Request, Response } from 'express';
import { CidAnalysis } from '../entity/CidAnalysis';
import { getRepository } from 'typeorm';

export const save_analysis = async (req: Request, res: Response) => {
  const {
    body: { cid, service, result, downloadUrl },
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
  analysis.isOk = result;

  await getRepository(CidAnalysis).save(analysis);

  return res.send(analysis);
};
