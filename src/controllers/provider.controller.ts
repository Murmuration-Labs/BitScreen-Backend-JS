import * as archiver from 'archiver';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  getActiveAssessorByProviderId,
  softDeleteAssessor,
} from '../service/assessor.service';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import { serverUri } from '../config';
import { Assessor } from '../entity/Assessor';
import { Visibility } from '../entity/enums';
import { LoginType, Provider } from '../entity/Provider';
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
import { addTextToNonce } from '../service/util.service';

export const provider_auth_wallet = async (
  request: Request,
  response: Response
) => {
  const {
    params: { wallet },
    body: { signature },
  } = request;

  if (!signature || !wallet) {
    return response.status(400).send({
      error: 'Request should have signature and wallet',
    });
  }

  const provider = await getActiveProviderByWallet(wallet);

  if (!provider) {
    return response
      .status(400)
      .send({ error: 'User does not exist in our database.' });
  }

  const msgBufferHex = ethUtil.bufferToHex(
    Buffer.from(addTextToNonce(provider.nonce, wallet.toLocaleLowerCase()))
  );
  const address = sigUtil.recoverPersonalSignature({
    data: msgBufferHex,
    sig: signature,
  });

  if (getAddressHash(address) !== provider.walletAddressHashed) {
    return response
      .status(401)
      .send({ error: 'Unauthorized access. Signatures do not match.' });
  }

  provider.nonce = v4();

  await getRepository(Provider).save(provider);

  return response.status(200).send({
    ...provider,
    walletAddress: wallet,
    accessToken: jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        data: {
          loginType: LoginType.Wallet,
          identificationValue: provider.walletAddressHashed,
        },
      },
      process.env.JWT_SECRET
    ),
  });
};

export const provider_auth_email = async (
  request: Request,
  response: Response
) => {
  const {
    body: { tokenId },
  } = request;

  if (typeof tokenId === 'undefined') {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }

  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.BitScreen
  );

  if (!email) {
    return response.status(400).send({
      error: 'Authentication is not valid',
    });
  }

  const provider = await getActiveProviderByEmail(email);

  if (!provider) {
    return response
      .status(400)
      .send({ error: 'Provider user does not exist in our database.' });
  }

  return response.status(200).send({
    ...provider,
    accessToken: jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        data: {
          loginType: LoginType.Email,
          identificationValue: provider.loginEmail,
        },
      },
      process.env.JWT_SECRET
    ),
  });
};

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

  const provider = await getActiveProviderByWallet(wallet);

  const responseObject = provider
    ? {
        consentDate: provider.consentDate,
        nonce: provider.nonce,
        nonceMessage: addTextToNonce(
          provider.nonce,
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
    PlatformTypes.BitScreen
  );

  if (!email) {
    return response.status(400).send({ message: 'Invalid OAuth token!' });
  }

  const provider = await getActiveProviderByEmail(email);

  const responseObject = provider
    ? {
        consentDate: provider.consentDate,
      }
    : null;
  return response.status(200).send(responseObject);
};

export const get_provider_data = async (
  request: Request,
  response: Response
) => {
  const {
    body: { identificationKey, identificationValue, loginType },
  } = request;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  return response.send(provider);
};

export const edit_provider = async (request: Request, response: Response) => {
  const {
    body: {
      identificationKey,
      identificationValue,
      loginType,
      accessToken,
      walletAddress,
      ..._provider
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

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response
      .status(404)
      .send({ message: 'Tried to update nonexistent provider' });
  }
  const updated = await getRepository(Provider).update(
    { id: provider.id },
    {
      ..._provider,
    }
  );

  return response.send(updated);
};

export const create_provider = async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;

  if (!wallet) {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const walletAddressHashed = getAddressHash(wallet);

  const existingProvider = await getActiveProviderByWallet(wallet);

  if (existingProvider) {
    return response.status(400).send({ message: 'Provider already exists' });
  }

  const provider = new Provider();
  provider.walletAddressHashed = walletAddressHashed;
  provider.nonce = v4();
  provider.consentDate = new Date().toISOString();
  provider.guideShown = false;
  const createdProvider = await getRepository(Provider).save(provider);

  return response.send({
    nonceMessage: addTextToNonce(
      createdProvider.nonce,
      wallet.toLocaleLowerCase()
    ),
    walletAddress: wallet,
    consentDate: createdProvider.consentDate,
  });
};

export const create_provider_by_email = async (
  request: Request,
  response: Response
) => {
  const {
    body: { tokenId },
  } = request;

  if (!tokenId) {
    return response.status(400).send({ message: 'Missing OAuth token!' });
  }
  const email = await returnGoogleEmailFromTokenId(
    tokenId,
    PlatformTypes.BitScreen
  );

  const existingProvider = await getActiveProviderByEmail(email);

  if (existingProvider) {
    return response.status(400).send({ message: 'Provider already exists' });
  }

  const provider = new Provider();
  provider.loginEmail = email;
  provider.consentDate = new Date().toISOString();
  provider.guideShown = false;

  await getRepository(Provider).save(provider);

  return response.status(200).send();
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
    PlatformTypes.BitScreen
  );

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (provider && provider.loginEmail) {
    if (provider.loginEmail === email) {
      return response.status(400).send({
        message: 'Provider is already linked to this Google Account!',
      });
    } else {
      return response.status(400).send({
        message: 'Provider is already linked to a Google Account!',
      });
    }
  }

  const providerByEmail = await getActiveProviderByEmail(email);

  if (providerByEmail) {
    return response.status(400).send({
      message: 'A provider associated with this Google Account already exists!',
    });
  }

  provider.loginEmail = email;
  await getRepository(Provider).save(provider);

  const associatedAssessor = await getActiveAssessorByProviderId(provider.id);

  if (associatedAssessor) {
    associatedAssessor.loginEmail = email;
    await getRepository(Assessor).save(provider);
  }

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

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  provider.nonce = v4();
  await getRepository(Provider).save(provider);

  return response.status(200).send({
    nonceMessage: addTextToNonce(provider.nonce, wallet.toLocaleLowerCase()),
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

  if (!signature || !wallet) {
    return response.status(400).send({
      error: 'Request should have signature and wallet',
    });
  }

  if (loginType === LoginType.Wallet) {
    return response
      .status(400)
      .send({ message: 'You are already logged in with a wallet address!' });
  }

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (provider.walletAddressHashed) {
    if (provider.walletAddressHashed === getAddressHash(wallet)) {
      return response.status(400).send({
        message: 'Provider is already linked to this wallet address!',
      });
    } else {
      return response.status(400).send({
        message: 'Provider is already linked to a wallet address!',
      });
    }
  }

  const msgBufferHex = ethUtil.bufferToHex(
    Buffer.from(addTextToNonce(provider.nonce, wallet.toLocaleLowerCase()))
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

  const providerByWallet = await getActiveProviderByWallet(wallet);

  if (providerByWallet) {
    return response.status(400).send({
      message: 'A provider associated with this wallet address already exists!',
    });
  }

  provider.nonce = v4();
  provider.walletAddressHashed = getAddressHash(wallet);
  await getRepository(Provider).save(provider);

  const assessor = await getActiveAssessorByProviderId(provider.id);

  if (assessor) {
    assessor.nonce = v4();
    assessor.walletAddressHashed = getAddressHash(wallet);
    await getRepository(Assessor).save(assessor);
  }

  response.status(200).send({
    ...provider,
  });
};

export const soft_delete_provider = async (
  request: Request,
  response: Response
) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;

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

  if (!provider) {
    return response.status(403).send({
      message: 'There is no account using this authentication details.',
    });
  }

  await softDeleteProvider(provider);

  const associatedAssessor = await getActiveAssessorByProviderId(provider.id, [
    'provider',
  ]);

  if (associatedAssessor) softDeleteAssessor(associatedAssessor);

  return response.send({ success: true });
};

export const export_provider = async (request: Request, response: Response) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;
  const arch = archiver('tar');

  let provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );
  arch.append(JSON.stringify(provider, null, 2), { name: 'account_data.json' });

  provider = await getActiveProvider(identificationKey, identificationValue, [
    'filters',
    'deals',
    'provider_Filters',
    'provider_Filters.filter',
    'provider_Filters.filter.provider',
    'filters.cids',
    'filters.provider_Filters',
    'filters.provider',
    'filters.provider_Filters.provider',
  ]);

  for (const filter of provider.filters) {
    if (filter.isOrphan()) {
      continue;
    }

    let directory = 'other_lists';
    let fileName = `${filter.shareId}.json`;
    switch (filter.visibility) {
      case Visibility.Private:
        directory = 'private_lists';
        break;
      case Visibility.Public:
        directory = 'public_lists';
        break;
      case Visibility.Shared:
        directory = 'shared_lists';
        break;
      case Visibility.Exception:
        directory = 'exception_lists';
        break;
    }
    const url = `${serverUri()}/filters/edit/${filter.shareId}`;
    arch.append(JSON.stringify({ ...filter, url }, null, 2), {
      name: `${directory}/${fileName}`,
    });
  }

  for (const providerFilter of provider.provider_Filters) {
    if (providerFilter.filter.provider.id !== provider.id) {
      const url = `${serverUri()}/directory/details/${
        providerFilter.filter.shareId
      }`;
      arch.append(JSON.stringify({ ...providerFilter.filter, url }, null, 2), {
        name: `imported_lists/${providerFilter.filter.shareId}`,
      });
    }
  }

  arch.on('end', () => response.end());

  response.attachment('test.tar').type('tar');
  arch.pipe(response);
  arch.finalize();
};

export const get_provider = async (request: Request, response: Response) => {
  const {
    params: { id },
  } = request;

  const provider = await getActiveProviderById(id);

  if (!provider) {
    return response.status(404).send({ message: 'Provider not found' });
  }
  return response.send(provider);
};
