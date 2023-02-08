import archiver from 'archiver';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getEnumKeyFromValue } from '../service/util.service';
import { addTextToNonce } from '../service/util.service';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import { serverUri } from '../config';
import { Assessor } from '../entity/Assessor';
import {
  ComplainantType,
  ComplaintStatus,
  ComplaintType,
  OnBehalfOf,
} from '../entity/Complaint';
import { LoginType, Provider } from '../entity/Provider';
import {
  getActiveAssessor,
  getActiveAssessorByAssessorId,
  getActiveAssessorByEmail,
  getActiveAssessorByWallet,
  getAllAssessors,
  softDeleteAssessor,
} from '../service/assessor.service';
import { getAddressHash } from '../service/crypto';
import { returnGoogleEmailFromTokenId } from '../service/googleauth.service';
import {
  getActiveProvider,
  getActiveProviderByEmail,
  getActiveProviderById,
  getActiveProviderByWallet,
  softDeleteProvider,
} from '../service/provider.service';
import { PlatformTypes } from '../types/common';

export const get_auth_info_wallet = async (
  request: Request,
  response: Response
) => {
  const {
    params: { wallet },
  } = request;

  if (typeof wallet === 'undefined') {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const assessor = await getActiveAssessorByWallet(wallet);

  const responseObject = assessor
    ? {
        rodeoConsentDate: assessor.rodeoConsentDate,
        nonce: assessor.nonce,
        nonceMessage: addTextToNonce(
          assessor.nonce,
          wallet.toLocaleLowerCase()
        ),
      }
    : null;
  return response.status(200).send(responseObject);
};

export const get_auth_info_email = async (
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

  if (!email) {
    return response.status(400).send({ message: 'Invalid OAuth token!' });
  }

  const assessor = await getActiveAssessorByEmail(email);

  const responseObject = assessor
    ? {
        rodeoConsentDate: assessor.rodeoConsentDate,
      }
    : null;
  return response.status(200).send(responseObject);
};

export const get_assessor_with_provider = async (
  request: Request,
  response: Response
) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue,
    ['provider']
  );

  return response.send(assessor).status(200);
};

export const create_assessor = async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;

  if (!wallet) {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const walletAddressHashed = getAddressHash(wallet);

  let assessor = await getActiveAssessorByWallet(wallet);
  if (assessor) {
    return response.status(400).send({ message: 'Assessor already exists' });
  }

  let provider = await getActiveProviderByWallet(wallet);

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

  let assessor = await getActiveAssessorByEmail(email);

  if (assessor) {
    return response.status(400).send({ message: 'Assessor already exists' });
  }

  let provider = await getActiveProviderByEmail(email);

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

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );

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

  const assessorByEmail = await getActiveAssessorByEmail(email);

  if (assessorByEmail) {
    return response.status(400).send({
      message:
        'An assessor associated with this Google Account already exists!',
    });
  }

  assessor.loginEmail = email;
  const updatedAssessor = await getRepository(Assessor).save(assessor);

  const associatedProvider = await getActiveProviderById(assessor.provider.id);

  associatedProvider.loginEmail = email;
  await getRepository(Provider).save(associatedProvider);

  return response.status(200).send(updatedAssessor);
};

export const unlink_second_login_type = async (
  request: Request,
  response: Response
) => {
  console.log('intru?');
  const {
    body: { identificationKey, identificationValue, loginType },
  } = request;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );

  if (loginType === LoginType.Email) {
    assessor.walletAddressHashed = null;
    provider.walletAddressHashed = null;
  } else {
    assessor.loginEmail = null;
    provider.loginEmail = null;
  }

  await getRepository(Provider).save(provider);
  const updatedAssessor = await getRepository(Assessor).save(assessor);

  response.status(200).send(updatedAssessor);
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

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );

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

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );

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

  if (getAddressHash(address) !== getAddressHash(wallet)) {
    return response.status(400).send({
      error: 'Could not link account to wallet. Signatures do not match.',
    });
  }

  const assessorByWallet = await getActiveAssessorByWallet(wallet);

  if (assessorByWallet) {
    return response.status(400).send({
      message:
        'An assessor associated with this wallet address already exists!',
    });
  }

  assessor.nonce = v4();
  assessor.walletAddressHashed = getAddressHash(wallet);
  await getRepository(Assessor).save(assessor);

  const provider = await getActiveProviderById(assessor.provider.id);

  provider.nonce = v4();
  provider.walletAddressHashed = getAddressHash(wallet);
  await getRepository(Provider).save(provider);

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

  const assessor = await getActiveAssessorByWallet(wallet);

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

  if (getAddressHash(address) !== assessor.walletAddressHashed) {
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

  const assessor = await getActiveAssessorByEmail(email);

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

export const soft_delete_assessor = async (
  request: Request,
  response: Response
) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue,
    ['provider']
  );

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue,
    [
      'filters',
      'deals',
      'provider_Filters',
      'filters.cids',
      'filters.provider_Filters',
      'filters.provider',
    ]
  );

  if (!assessor || !provider) {
    return response
      .status(403)
      .send({ message: 'You are not allowed to delete this account.' });
  }

  await softDeleteAssessor(assessor);
  await softDeleteProvider(provider);

  return response.send({ success: true });
};

export const export_assessor_data = async (
  request: Request,
  response: Response
) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;
  const arch = archiver('zip', {
    zlib: { level: 9 },
  });

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue,
    ['complaints']
  );
  arch.append(JSON.stringify(assessor, null, 2), { name: 'account_data.json' });

  for (const complaint of assessor.complaints) {
    let archAppendName: string;
    if (complaint.submitted) {
      switch (complaint.status) {
        case ComplaintStatus.Spam:
          archAppendName = `reviewed_complaints/published/marked_as_spam/complaint_${complaint._id}`;
          break;

        case ComplaintStatus.Resolved:
          archAppendName = `reviewed_complaints/published/resolved/complaint_${complaint._id}`;
          break;
      }
    } else {
      switch (complaint.status) {
        case ComplaintStatus.UnderReview:
          archAppendName = `reviewed_complaints/not_published/under_review/complaint_${complaint._id}`;
          break;

        case ComplaintStatus.Resolved:
          archAppendName = `reviewed_complaints/not_published/resolved/complaint_${complaint._id}`;
          break;
      }
    }

    const parsedEnumValuesComplaint = {
      ...complaint,
      complaintType: getEnumKeyFromValue(
        complaint.complainantType,
        ComplainantType
      ),
      onBehalfOf: getEnumKeyFromValue(complaint.onBehalfOf, OnBehalfOf),
      type: getEnumKeyFromValue(complaint.type, ComplaintType),
      status: getEnumKeyFromValue(complaint.status, ComplaintStatus),
    };

    const updatedComplaint = parsedEnumValuesComplaint.submitted
      ? {
          ...parsedEnumValuesComplaint,
          publishedUrl: `${serverUri()}/records/${
            parsedEnumValuesComplaint._id
          }`,
        }
      : parsedEnumValuesComplaint;

    arch.append(JSON.stringify(updatedComplaint, null, 2), {
      name: archAppendName,
    });
  }

  arch.on('end', () => response.end());
  response.attachment('rodeo_export.zip').type('zip');
  arch.pipe(response);
  arch.finalize();
};

export const get_public_assessor_data = async (
  request: Request,
  response: Response
) => {
  const {
    params: { id },
  } = request;

  if (!id) {
    return response.status(400).send({ message: 'Missing id value!' });
  }

  const assessorId = typeof id === 'string' ? parseInt(id) : id;

  const assessorWithProvider = await getActiveAssessorByAssessorId(assessorId, [
    'provider',
  ]);

  if (!assessorWithProvider) {
    return response.status(400).send({ message: 'Bad request!' });
  }

  const { address, businessName, contactPerson, email, country } =
    assessorWithProvider.provider;

  const assessor = {
    address,
    businessName,
    contactPerson,
    country,
    email,
  };

  return response.send(assessor);
};

export const edit_assessor = async (request: Request, response: Response) => {
  const {
    body: {
      identificationKey,
      identificationValue,
      loginType,
      accessToken,
      walletAddress,
      ..._assessor
    },
  } = request;

  if (
    typeof identificationValue === 'undefined' ||
    typeof identificationKey === 'undefined'
  ) {
    return response
      .status(400)
      .send({ message: 'Missing identification key / value' });
  }

  const assessor = await getActiveAssessor(
    identificationKey,
    identificationValue
  );

  if (!assessor) {
    return response
      .status(404)
      .send({ message: 'Tried to update nonexistent assessor' });
  }

  if (!_assessor || !Object.keys(assessor).length) {
    return response
      .status(400)
      .send({ message: 'Missing or incorrect update values' });
  }

  const updated = await getRepository(Assessor).update(
    { id: assessor.id },
    {
      ..._assessor,
    }
  );

  return response.send(updated);
};

export const all_assessors = async (req: Request, res: Response) => {
  let assessors = await getAllAssessors();

  return res.send({ assessors });
};
