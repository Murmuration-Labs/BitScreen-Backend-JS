import { Request, Response } from 'express';
import { getAllAssessors } from '../service/assessor.service';
import { getRepository } from 'typeorm';
import { Assessor } from '../entity/Assessor';
import { Complaint } from '../entity/Complaint';
import { Provider } from '../entity/Provider';
import { getAddressHash } from '../service/crypto';
import { addTextToNonce } from '../service/provider.service';
import { v4 } from 'uuid';

export const all_assessors = async (req: Request, res: Response) => {
  let assessors = await getAllAssessors();

  return res.send({ assessors });
};

export const create_assessor = async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;

  if (!wallet) {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const walletAddressHashed = getAddressHash(wallet.toLowerCase());

  let provider = await getRepository(Provider).findOne({
    where: { walletAddressHashed },
  });

  if (!provider) {
    const newProvider = new Provider();
    newProvider.walletAddressHashed = walletAddressHashed;
    newProvider.nonce = v4();
    newProvider.guideShown = false;
    provider = await getRepository(Provider).save(provider);
  }

  const assessor = new Assessor();
  assessor.provider = provider;
  assessor.rodeoConsentDate = new Date().toISOString();

  return response.send({
    nonceMessage: addTextToNonce(provider.nonce, wallet.toLocaleLowerCase()),
    walletAddress: wallet,
    consentDate: provider.consentDate,
    rodeoConsentDate: assessor.rodeoConsentDate,
  });
};

export const delete_assessor = async (request: Request, response: Response) => {
  const {
    body: { walletAddressHashed },
  } = request;

  const provider = await getRepository(Provider).findOne({
    walletAddressHashed,
  });
  const assessor = await getRepository(Assessor).findOne(
    { provider: provider },
    { relations: ['complaints'] }
  );

  if (!assessor || !provider) {
    return response
      .status(403)
      .send({ message: 'You are not allowed to delete this account.' });
  }

  for (const complaint of assessor.complaints) {
    complaint.assessor = null;
    await getRepository(Complaint).save(complaint);
  }

  assessor.rodeoConsentDate = null;

  await getRepository(Provider).save(assessor);

  return response.send({ success: true });
};
