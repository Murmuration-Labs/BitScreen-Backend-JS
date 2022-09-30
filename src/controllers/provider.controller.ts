import * as archiver from 'archiver';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import { PlatformTypes } from '../types/generic';
import { v4 } from 'uuid';
import { serverUri } from '../config';
import { Assessor } from '../entity/Assessor';
import { Cid } from '../entity/Cid';
import { Complaint } from '../entity/Complaint';
import { Deal } from '../entity/Deal';
import { Visibility } from '../entity/enums';
import { Filter } from '../entity/Filter';
import { LoginType, Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Config } from '../entity/Settings';
import { getAddressHash } from '../service/crypto';
import { returnGoogleEmailFromTokenId } from '../service/googleauth.service';
import { addTextToNonce, getProviderById } from '../service/provider.service';

export const provider_auth_wallet = async (
  request: Request,
  response: Response
) => {
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

  const provider = await getRepository(Provider).findOne({
    walletAddressHashed: getAddressHash(wallet as string),
  });

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

  if (getAddressHash(address.toLowerCase()) !== provider.walletAddressHashed) {
    return response
      .status(400)
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

  switch (true) {
    case !email: {
      return response.status(400).send({
        error: 'Authentication is not valid',
      });
    }
  }

  const provider = await getRepository(Provider).findOne({
    loginEmail: email,
  });

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

export const get_by_email = async (request: Request, response: Response) => {
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

  const provider = await getRepository(Provider).findOne({
    loginEmail: email,
  });

  const responseObject = provider
    ? {
        ...provider,
      }
    : null;

  return response.send(responseObject);
};

export const get_by_wallet = async (request: Request, response: Response) => {
  const {
    params: { wallet },
  } = request;
  if (typeof wallet === 'undefined') {
    return response.status(400).send({ message: 'Missing wallet' });
  }

  const provider = await getRepository(Provider).findOne({
    walletAddressHashed: getAddressHash(wallet),
  });

  const responseObject = provider
    ? {
        ...provider,
        nonceMessage: addTextToNonce(
          provider.nonce,
          wallet.toLocaleLowerCase()
        ),
      }
    : null;

  return response.send(responseObject);
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

  const provider = await getRepository(Provider).findOne({
    [`${identificationKey}`]: identificationValue,
  });

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

  const walletAddressHashed = getAddressHash(wallet.toLowerCase());

  const existingProvider = await getRepository(Provider).findOne({
    where: { walletAddressHashed },
  });

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

  const existingProvider = await getRepository(Provider).findOne({
    where: { loginEmail: email },
  });

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

  const provider = await getRepository(Provider).findOne({
    where: { [`${identificationKey}`]: identificationValue },
  });

  if (provider.loginEmail) {
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

  const providerByEmail = await getRepository(Provider).findOne({
    where: { loginEmail: email },
  });

  if (providerByEmail) {
    return response.status(400).send({
      message: 'A provider associated with this Google Account already exists!',
    });
  }

  provider.loginEmail = email;
  await getRepository(Provider).save(provider);

  const associatedAssessor = await getRepository(Assessor).findOne({
    where: { provider: provider.id },
  });

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

  const provider = await getRepository(Provider).findOne({
    where: { [`${identificationKey}`]: identificationValue },
  });

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

  const provider = await getRepository(Provider).findOne({
    where: { [`${identificationKey}`]: identificationValue },
  });

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

  if (getAddressHash(address.toLowerCase()) !== getAddressHash(wallet)) {
    return response.status(400).send({
      error: 'Could not link account to wallet. Signatures do not match.',
    });
  }

  const providerByWallet = await getRepository(Provider).findOne({
    where: { walletAddressHashed: getAddressHash(wallet) },
  });

  if (providerByWallet) {
    return response.status(400).send({
      message: 'A provider associated with this wallet address already exists!',
    });
  }

  provider.nonce = v4();
  provider.walletAddressHashed = getAddressHash(wallet);
  await getRepository(Provider).save(provider);

  const assessor = await getRepository(Assessor).findOne({
    where: { provider: provider.id },
  });

  if (assessor) {
    assessor.nonce = v4();
    assessor.walletAddressHashed = getAddressHash(wallet);
    await getRepository(Assessor).save(assessor);
  }

  response.status(200).send({
    ...provider,
  });
};

export const delete_provider = async (request: Request, response: Response) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;

  const provider = await getRepository(Provider).findOne(
    { [`${identificationKey}`]: identificationValue },
    {
      relations: [
        'filters',
        'deals',
        'provider_Filters',
        'filters.cids',
        'filters.provider_Filters',
        'filters.provider',
      ],
    }
  );

  if (!provider) {
    return response.status(403).send({
      message: 'There is no account using this authentication details.',
    });
  }

  let cidIds = [];
  let providerFilterIds = [];
  const filterIds = [];
  const dealIds = provider.deals.map((deal) => deal.id);

  for (const filter of provider.filters) {
    if (filter.provider.id !== provider.id) {
      continue;
    }
    filterIds.push(filter.id);
    cidIds = cidIds.concat(filter.cids.map((cid) => cid.id));
    providerFilterIds = providerFilterIds.concat(
      filter.provider_Filters.map((pf) => pf.id)
    );
  }

  for (const providerFilter of provider.provider_Filters) {
    if (!providerFilterIds.includes(providerFilter.id)) {
      providerFilterIds.push(providerFilter.id);
    }
  }

  const config = await getRepository(Config).findOne({
    where: {
      provider,
    },
  });

  if (dealIds.length) {
    await getRepository(Deal).delete(dealIds);
  }

  if (cidIds.length) {
    await getRepository(Cid).delete(cidIds);
  }

  if (providerFilterIds.length) {
    await getRepository(Provider_Filter).delete(providerFilterIds);
  }

  if (filterIds.length) {
    await getRepository(Filter).delete(filterIds);
  }

  await getRepository(Config).delete(config.id);

  const associatedAssessor = await getRepository(Assessor).findOne({
    provider: provider,
  });

  if (associatedAssessor) {
    const complaintsIds = (
      await getRepository(Complaint).find({
        assessor: associatedAssessor,
      })
    ).map((e) => e._id);

    for (let i = 0; i < complaintsIds.length; i++) {
      const currentComplaint = await getRepository(Complaint).findOne({
        _id: complaintsIds[i],
      });

      currentComplaint.assessor = null;
      await getRepository(Complaint).save(currentComplaint);
    }

    await getRepository(Assessor).remove(associatedAssessor);
  }

  await getRepository(Provider).delete(provider.id);

  return response.send({ success: true });
};

export const export_provider = async (request: Request, response: Response) => {
  const {
    body: { identificationKey, identificationValue },
  } = request;
  const arch = archiver('tar');

  let provider = await getRepository(Provider).findOne({
    [`${identificationKey}`]: identificationValue,
  });
  arch.append(JSON.stringify(provider, null, 2), { name: 'account_data.json' });

  provider = await getRepository(Provider).findOne(
    { [`${identificationKey}`]: identificationValue },
    {
      relations: [
        'filters',
        'deals',
        'provider_Filters',
        'provider_Filters.filter',
        'provider_Filters.filter.provider',
        'filters.cids',
        'filters.provider_Filters',
        'filters.provider',
        'filters.provider_Filters.provider',
      ],
    }
  );

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

  const provider = await getProviderById(id);

  if (!provider) {
    return response.status(404).send({ message: 'Provider not found' });
  }
  return response.send(provider);
};
