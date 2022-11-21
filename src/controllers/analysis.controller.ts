import { Request, Response } from 'express';
import { CidAnalysis } from '../entity/CidAnalysis';
import { getRepository } from 'typeorm';
import { Cid } from '../entity/Cid'

export const save_analysis = async (req: Request, res: Response) => {
  const {
    body: { cid, isOk, service, status, downloadUrl },
  } = req;

  let analysis = new CidAnalysis();

  const relatedCid = await getRepository(Cid).findOne({ where: { cid } })
  const existingAnalysis = await getRepository(CidAnalysis).findOne({
    where: {
      cid: relatedCid.id,
      service,
    },
  });

  if (existingAnalysis) {
    analysis = existingAnalysis;
  }

  analysis.downloadUrl = downloadUrl;
  analysis.service = service;
  analysis.status = status;
  analysis.isOk = isOk;

  await getRepository(CidAnalysis).save(analysis);
  relatedCid.cidAnalysis = [analysis];
  await getRepository(Cid).save(relatedCid);

  return res.send(analysis);
};
