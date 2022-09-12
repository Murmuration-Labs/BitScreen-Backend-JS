import * as archiver from 'archiver';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import { Assessor } from '../entity/Assessor';
import { Complaint } from '../entity/Complaint';
import { Provider } from '../entity/Provider';
import {
  getAllAssessors,
  getProviderComplaintsCount,
} from '../service/assessor.service';
import { getAddressHash } from '../service/crypto';
import { addTextToNonce } from '../service/provider.service';

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

  const newAssessor = new Assessor();
  newAssessor.walletAddressHashed = walletAddressHashed;
  newAssessor.provider = provider;
  newAssessor.rodeoConsentDate = new Date().toISOString();
  const assessor = await getRepository(Assessor).save(newAssessor);

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

export const export_assessor_data = async (
  request: Request,
  response: Response
) => {
  const {
    body: { walletAddressHashed },
  } = request;
  const arch = archiver('tar');

  const assessor = await getRepository(Assessor).findOne(
    { walletAddressHashed },
    { relations: ['complaints'] }
  );
  arch.append(JSON.stringify(assessor, null, 2), { name: 'account_data.json' });

  for (const complaint of assessor.complaints) {
    arch.append(JSON.stringify(complaint, null, 2), {
      name: `reviewed_complaints/complaint_${complaint._id}`,
    });
  }

  arch.on('end', () => response.end());
  response.attachment('rodeo_export.tar').type('tar');
  arch.pipe(response);
  arch.finalize();
};

export const get_assessor_complaints_count = async (
  request: Request,
  response: Response
) => {
  const {
    params: { id },
  } = request;

  const provider = await getProviderComplaintsCount(id);

  if (!provider) {
    return response.status(404).send({ message: 'Provider not found' });
  }
  return response.send(provider);
};
