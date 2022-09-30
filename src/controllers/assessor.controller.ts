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
import { LoginType, Provider } from '../entity/Provider';
import {
  getAllAssessors,
  getAssessorComplaintsCount,
} from '../service/assessor.service';
import { getAddressHash } from '../service/crypto';
import { addTextToNonce } from '../service/provider.service';
import { PlatformTypes } from '../types/generic';
import { returnGoogleEmailFromTokenId } from '../service/googleauth.service';

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

export const get_by_email = async (request: Request, response: Response) => {
  const {
    params: { tokenId },
  } = request;

  if (typeof tokenId === 'undefined') {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }

  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.Rodeo
  );

  const assessor = await getRepository(Assessor).findOne({
    loginEmail: email,
  });

  const responseObject = assessor || null;
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

export const get_by_email_with_provider = async (
  request: Request,
  response: Response
) => {
  const {
    params: { tokenId },
  } = request;
  if (typeof tokenId === 'undefined') {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }

  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.Rodeo
  );

  const assessor = await getRepository(Assessor).findOne(
    {
      loginEmail: email,
    },
    { relations: ['provider'] }
  );

  const responseObject = assessor || null;
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
  if (provider.loginEmail) {
    newAssessor.loginEmail = provider.loginEmail;
  }
  assessor = await getRepository(Assessor).save(newAssessor);

  return response.send({
    nonceMessage: addTextToNonce(assessor.nonce, wallet.toLocaleLowerCase()),
    walletAddress: wallet,
    consentDate: provider.consentDate,
    rodeoConsentDate: assessor.rodeoConsentDate,
  });
};

export const create_assessor_by_email = async (
  request: Request,
  response: Response
) => {
  const {
    params: { tokenId },
  } = request;

  if (!tokenId) {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }

  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.Rodeo
  );

  let assessor = await getRepository(Assessor).findOne({
    where: { loginEmail: email },
  });

  if (assessor) {
    return response.status(400).send({ message: 'Assessor already exists' });
  }

  let provider = await getRepository(Provider).findOne({
    where: { loginEmail: email },
  });

  if (!provider) {
    const newProvider = new Provider();
    newProvider.loginEmail = email;
    newProvider.guideShown = false;
    provider = await getRepository(Provider).save(newProvider);
  }

  const newAssessor = new Assessor();
  newAssessor.loginEmail = email;
  newAssessor.provider = provider;
  newAssessor.rodeoConsentDate = new Date().toISOString();
  if (provider.walletAddressHashed) {
    newAssessor.walletAddressHashed = provider.walletAddressHashed;
    newAssessor.nonce = v4();
  }
  assessor = await getRepository(Assessor).save(newAssessor);

  return response.send({
    consentDate: provider.consentDate,
    rodeoConsentDate: assessor.rodeoConsentDate,
  });
};

export const link_to_google_account = async (
  request: Request,
  response: Response
) => {
  const {
    params: { tokenId },
    body: { identificationKey, identificationValue, loginType },
  } = request;

  if (!tokenId) {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }

  if (loginType === LoginType.Email) {
    return response
      .status(400)
      .send({ message: 'You are already logged in with a Google Account!' });
  }

  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.Rodeo
  );

  const assessor = await getRepository(Assessor).findOne({
    where: { [`${identificationKey}`]: identificationValue },
    relations: ['provider'],
  });

  if (assessor.loginEmail) {
    if (assessor.loginEmail === email) {
      return response.status(400).send({
        message: 'The assessor is already linked to this Google Account!',
      });
    } else {
      return response.status(400).send({
        message: 'The assessor is already linked to a Google Account!',
      });
    }
  }

  const assessorByEmail = await getRepository(Assessor).findOne({
    where: { loginEmail: email },
  });

  if (assessorByEmail) {
    return response.status(400).send({
      message:
        'An assessor associated with this Google Account already exists!',
    });
  }

  assessor.loginEmail = email;
  await getRepository(Assessor).save(assessor);

  const associatedProvider = await getRepository(Provider).findOne({
    where: { id: assessor.provider.id },
  });

  associatedProvider.loginEmail = email;
  await getRepository(Provider).save(associatedProvider);

  return response.status(200).send();
};

export const generate_nonce_for_signature = async (
  request: Request,
  response: Response
) => {
  const {
    params: { wallet },
    body: { identificationKey, identificationValue },
  } = request;

  if (!wallet) {
    return response.status(400).send({ message: 'Missing wallet address!' });
  }

  const assessor = await getRepository(Assessor).findOne({
    where: { [`${identificationKey}`]: identificationValue },
  });

  assessor.nonce = v4();
  await getRepository(Assessor).save(assessor);

  return response.status(200).send({
    nonceMessage: addTextToNonce(assessor.nonce, wallet.toLocaleLowerCase()),
    walletAddress: wallet,
  });
};

export const link_google_account_to_wallet = async (
  request: Request,
  response: Response
) => {
  const {
    params: { wallet },
    body: { signature, identificationKey, identificationValue, loginType },
  } = request;

  switch (true) {
    case !signature || !wallet: {
      return response.status(400).send({
        error: 'Request should have signature and wallet',
      });
    }
  }

  if (loginType === LoginType.Wallet) {
    return response
      .status(400)
      .send({ message: 'You are already logged in with a wallet address!' });
  }

  const assessor = await getRepository(Assessor).findOne({
    where: { [`${identificationKey}`]: identificationValue },
    relations: ['provider'],
  });

  if (assessor.walletAddressHashed) {
    if (assessor.walletAddressHashed === getAddressHash(wallet)) {
      return response.status(400).send({
        message: 'Assessor is already linked to this wallet address!',
      });
    } else {
      return response.status(400).send({
        message: 'Assessor is already linked to a wallet address!',
      });
    }
  }

  const msgBufferHex = ethUtil.bufferToHex(
    Buffer.from(addTextToNonce(assessor.nonce, wallet.toLocaleLowerCase()))
  );
  const address = sigUtil.recoverPersonalSignature({
    data: msgBufferHex,
    sig: signature,
  });

  if (getAddressHash(address.toLowerCase()) !== getAddressHash(wallet)) {
    return response.status(400).send({
      error: 'Could not link account to wallet. Signatures do not match.',
    });
  }

  const assessorByWallet = await getRepository(Assessor).findOne({
    where: { walletAddressHashed: getAddressHash(wallet) },
  });

  if (assessorByWallet) {
    return response.status(400).send({
      message:
        'An assessor associated with this wallet address already exists!',
    });
  }

  assessor.nonce = v4();
  assessor.walletAddressHashed = getAddressHash(wallet);
  await getRepository(Assessor).save(assessor);

  const provider = await getRepository(Provider).findOne({
    where: { id: assessor.provider.id },
  });

  provider.nonce = v4();
  provider.walletAddressHashed = getAddressHash(wallet);
  await getRepository(Assessor).save(provider);

  response.status(200).send({
    ...assessor,
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
      .status(400)
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
        data: {
          loginType: LoginType.Wallet,
          identificationValue: assessor.walletAddressHashed,
        },
      },
      process.env.JWT_SECRET
    ),
  });
};

export const assessor_auth_by_email = async (
  request: Request,
  response: Response
) => {
  const {
    params: { tokenId },
  } = request;

  if (!tokenId) {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }

  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.Rodeo
  );

  const assessor = await getRepository(Assessor).findOne(
    {
      loginEmail: email,
    },
    { relations: ['provider'] }
  );

  if (!assessor) {
    return response
      .status(400)
      .send({ error: 'Assessor user does not exist in our database.' });
  }

  return response.status(200).send({
    ...assessor,
    accessToken: jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        data: {
          loginType: LoginType.Email,
          identificationValue: assessor.loginEmail,
        },
      },
      process.env.JWT_SECRET
    ),
  });
};

export const delete_assessor = async (request: Request, response: Response) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;

  const assessor = await getRepository(Assessor).findOne(
    { [`${identificationKey}`]: identificationValue },
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
    body: { identificationKey, identificationValue },
  } = request;
  const arch = archiver('tar');

  const assessor = await getRepository(Assessor).findOne(
    { [`${identificationKey}`]: identificationValue },
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
