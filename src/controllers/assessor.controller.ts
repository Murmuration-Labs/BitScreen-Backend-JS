import { Config } from '../entity/Settings';
import * as archiver from 'archiver';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import { Assessor } from '../entity/Assessor';
import { Complaint } from '../entity/Complaint';
import { Provider } from '../entity/Provider';
import {
  getAllAssessors,
  getAssessorComplaintsCount,
} from '../service/assessor.service';
import { getAddressHash } from '../service/crypto';
import { addTextToNonce } from '../service/provider.service';

export const get_by_wallet = async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;
  if (typeof wallet === 'undefined') {
    return response.status(400).send({ message: 'Missing wallet' });
  }
  const assessor = await getRepository(Assessor).findOne({
    walletAddressHashed: getAddressHash(wallet),
  });

  const responseObject = assessor
    ? {
        ...assessor,
        nonceMessage: addTextToNonce(
          assessor.nonce,
          wallet.toLocaleLowerCase()
        ),
      }
    : null;
  return response.send(responseObject);
};

export const get_by_wallet_with_provider = async (
  request: Request,
  response: Response
) => {
  const {
    params: { wallet },
  } = request;
  if (typeof wallet === 'undefined') {
    return response.status(400).send({ message: 'Missing wallet' });
  }
  const assessor = await getRepository(Assessor).findOne(
    {
      walletAddressHashed: getAddressHash(wallet),
    },
    { relations: ['provider'] }
  );

  const responseObject = assessor
    ? {
        ...assessor,
        nonceMessage: addTextToNonce(
          assessor.nonce,
          wallet.toLocaleLowerCase()
        ),
      }
    : null;
  return response.send(responseObject);
};

export const create_assessor = async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;

  if (!wallet) {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const walletAddressHashed = getAddressHash(wallet.toLowerCase());

  let assessor = await getRepository(Assessor).findOne({
    where: { walletAddressHashed },
  });

  if (assessor) {
    return response.status(400).send({ message: 'Assessor already exists' });
  }

  let provider = await getRepository(Provider).findOne({
    where: { walletAddressHashed },
  });

  if (!provider) {
    const providerNonce = v4();
    const newProvider = new Provider();
    newProvider.walletAddressHashed = walletAddressHashed;
    newProvider.nonce = providerNonce;
    newProvider.guideShown = false;
    provider = await getRepository(Provider).save(newProvider);
  }

  const newAssessor = new Assessor();
  newAssessor.walletAddressHashed = walletAddressHashed;
  newAssessor.provider = provider;
  newAssessor.nonce = v4();
  newAssessor.rodeoConsentDate = new Date().toISOString();
  assessor = await getRepository(Assessor).save(newAssessor);

  return response.send({
    nonceMessage: addTextToNonce(assessor.nonce, wallet.toLocaleLowerCase()),
    walletAddress: wallet,
    consentDate: provider.consentDate,
    rodeoConsentDate: assessor.rodeoConsentDate,
  });
};

export const assessor_auth = async (request: Request, response: Response) => {
  const {
    params: { wallet },
    body: { signature },
  } = request;

  switch (true) {
    case !signature || !wallet: {
      return response.status(400).send({
        error: 'Request should have signature and wallet',
      });
    }
  }

  const assessor = await getRepository(Assessor).findOne(
    {
      walletAddressHashed: getAddressHash(wallet as string),
    },
    { relations: ['provider'] }
  );

  if (!assessor) {
    return response
      .status(400)
      .send({ error: 'Assessor user does not exist in our database.' });
  }

  const msgBufferHex = ethUtil.bufferToHex(
    Buffer.from(addTextToNonce(assessor.nonce, wallet.toLocaleLowerCase()))
  );
  const address = sigUtil.recoverPersonalSignature({
    data: msgBufferHex,
    sig: signature,
  });

  if (getAddressHash(address.toLowerCase()) !== assessor.walletAddressHashed) {
    return response
      .status(401)
      .send({ error: 'Unauthorized access. Signatures do not match.' });
  }

  assessor.nonce = v4();

  await getRepository(Assessor).save(assessor);

  return response.status(200).send({
    ...assessor,
    walletAddress: wallet,
    accessToken: jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        data: assessor.walletAddressHashed,
      },
      process.env.JWT_SECRET
    ),
  });
};

export const delete_assessor = async (request: Request, response: Response) => {
  const {
    body: { walletAddressHashed },
  } = request;

  const assessor = await getRepository(Assessor).findOne(
    { walletAddressHashed },
    { relations: ['complaints'] }
  );

  if (!assessor) {
    return response
      .status(403)
      .send({ message: 'You are not allowed to delete this account.' });
  }

  for (const complaint of assessor.complaints) {
    complaint.assessor = null;
    await getRepository(Complaint).save(complaint);
  }

  await getRepository(Assessor).remove(assessor);

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

  const provider = await getAssessorComplaintsCount(id);

  if (!provider) {
    return response.status(404).send({ message: 'Provider not found' });
  }
  return response.send(provider);
};

export const all_assessors = async (req: Request, res: Response) => {
  let assessors = await getAllAssessors();

  return res.send({ assessors });
};
