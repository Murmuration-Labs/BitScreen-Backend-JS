import { getMockReq, getMockRes } from '@jest-mock/express';
import { recoverPersonalSignature } from 'eth-sig-util';
import { bufferToHex } from 'ethereumjs-util';
import * as jwt from 'jsonwebtoken';
import { mocked } from 'ts-jest/utils';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import {
  create_provider,
  create_provider_by_email,
  edit_provider,
  get_auth_info_email,
  get_auth_info_wallet,
  link_google_account_to_wallet,
  link_to_google_account,
  provider_auth_email,
  provider_auth_wallet,
} from '../../src/controllers/provider.controller';
import { Assessor } from '../../src/entity/Assessor';
import { AccountType, LoginType, Provider } from '../../src/entity/Provider';
import { getActiveAssessorByProviderId } from '../../src/service/assessor.service';
import { getConfigByProviderId } from '../../src/service/config.service';
import { getAddressHash } from '../../src/service/crypto';
import * as googleAuthUtils from '../../src/service/googleauth.service';
import {
  getActiveProvider,
  getActiveProviderByEmail,
  getActiveProviderByWallet,
} from '../../src/service/provider.service';
import { addTextToNonce } from '../../src/service/util.service';
import { PlatformTypes } from '../../src/types/common';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

const testEmail = 'test@gmail.com';

let provider: Provider;
let providerByEmail: Provider;
let providerByWallet: Provider;

let assessor: Assessor;
let assessorByEmail: Assessor;
let assessorByWallet: Assessor;

const getActiveProviderMock = mocked(getActiveProvider);
const getActiveProviderByWalletMock = mocked(getActiveProviderByWallet);
const getActiveAssessorByProviderIdMock = mocked(getActiveAssessorByProviderId);
const getActiveProviderByEmailMock = mocked(getActiveProviderByEmail);
const getConfigByProviderIdMock = mocked(getConfigByProviderId);

jest.mock('typeorm', () => {
  return {
    IsNull: jest.fn(),
    getRepository: jest.fn(),
    PrimaryGeneratedColumn: jest.fn(),
    Column: jest.fn(),
    JoinColumn: jest.fn(),
    Entity: jest.fn(),
    BeforeInsert: jest.fn(),
    BeforeUpdate: jest.fn(),
    ManyToOne: jest.fn(),
    OneToMany: jest.fn(),
    OneToOne: jest.fn(),
    Unique: jest.fn(),
    ManyToMany: jest.fn(),
    JoinTable: jest.fn(),
  };
});

jest.mock('ethereumjs-util');
jest.mock('eth-sig-util');
jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(),
  };
});
jest.mock('uuid', () => {
  return {
    v4: jest.fn(),
  };
});

jest.mock('../../src/service/assessor.service', () => {
  return {
    getActiveAssessor: jest.fn(),
    getActiveAssessorByEmail: jest.fn(),
    getActiveAssessorByProviderId: jest.fn(),
    getActiveAssessorByWallet: jest.fn(),
    softDeleteAssessor: jest.fn(),
  };
});

jest.mock('../../src/service/config.service', () => {
  return {
    getConfigByProviderId: jest.fn(),
  };
});

jest.mock('../../src/service/provider.service', () => {
  const original = jest.requireActual('../../src/service/provider.service');
  return {
    ...original,
    getActiveProviderByWallet: jest.fn(),
    getActiveProviderByEmail: jest.fn(),
    getActiveProviderById: jest.fn(),
    getActiveProvider: jest.fn(),
    softDeleteProvider: jest.fn(),
  };
});

beforeEach(() => {
  mockClear();
  jest.clearAllMocks();
  getActiveProviderMock.mockReset();
  getActiveProviderByWalletMock.mockReset();
  getActiveAssessorByProviderIdMock.mockReset();
  getActiveProviderByEmailMock.mockReset();
  getConfigByProviderIdMock.mockReset();

  jest
    .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
    .mockReset()
    .mockResolvedValue(testEmail);

  provider = new Provider();
  provider.id = 1;
  provider.nonce = '456';

  providerByEmail = new Provider();
  providerByEmail.id = 1;
  providerByEmail.loginEmail = testEmail;
  providerByEmail.nonce = '456';

  providerByWallet = new Provider();
  providerByWallet.id = 1;
  providerByWallet.walletAddressHashed = getAddressHash('123456');
  providerByWallet.nonce = '456';

  assessor = new Assessor();
  assessor.id = 1;
  assessor.nonce = '456';

  assessorByEmail = new Assessor();
  assessorByEmail.id = 1;
  assessorByEmail.loginEmail = testEmail;
  assessorByEmail.nonce = '456';

  assessorByWallet = new Assessor();
  assessorByWallet.id = 1;
  assessorByWallet.walletAddressHashed = getAddressHash('123456');
  assessorByWallet.nonce = '456';
});

describe('Provider Controller: Get provider/auth_info/:wallet', () => {
  it('Should throw error for missing wallet ', async () => {
    const req = getMockReq();

    await get_auth_info_wallet(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing wallet',
    });
  });

  it('Should return null due to lack of existing provider for the given wallet', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    mocked(getActiveProviderByWallet).mockResolvedValueOnce(undefined);

    await get_auth_info_wallet(req, res);

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith(req.params.wallet);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(null);
  });

  it('Should return auth info for existing provider', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    mocked(getActiveProviderByWallet).mockResolvedValueOnce(provider);

    await get_auth_info_wallet(req, res);

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith(req.params.wallet);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      consentDate: provider.consentDate,
      nonce: provider.nonce,
      nonceMessage: addTextToNonce(
        provider.nonce,
        req.params.wallet.toLocaleLowerCase()
      ),
    });
  });
});

describe('Provider Controller: Get provider/auth_info/:email', () => {
  it('Should throw error for OAuth token ', async () => {
    const req = getMockReq();

    await get_auth_info_email(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });

  it('Should throw error for invalid OAuth token ', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(null);

    await get_auth_info_email(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Invalid OAuth token!',
    });
  });

  it('Should return null due to lack of existing provider for the given token', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    mocked(getActiveProviderByEmail).mockResolvedValueOnce(undefined);

    await get_auth_info_email(req, res);

    expect(getActiveProviderByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmail).toHaveBeenCalledWith(testEmail);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(null);
  });

  it('Should return auth info for existing provider', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    mocked(getActiveProviderByEmail).mockResolvedValueOnce(provider);

    await get_auth_info_email(req, res);

    expect(getActiveProviderByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmail).toHaveBeenCalledWith(testEmail);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      consentDate: provider.consentDate,
    });
  });
});

describe('Provider Controller: POST /provider/auth/:wallet', () => {
  it('Should throw error for missing signature ', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    await provider_auth_wallet(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Request should have signature and wallet',
    });
  });

  it('Should throw error for missing wallet', async () => {
    const req = getMockReq({
      body: {
        signature: '78910',
      },
    });

    await provider_auth_wallet(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Request should have signature and wallet',
    });
  });

  it('Should throw error for provider not found', async () => {
    const req = getMockReq({
      body: {
        signature: '78910',
      },
      params: {
        wallet: '123456',
      },
    });

    mocked(getActiveProviderByWallet).mockResolvedValueOnce(undefined);

    await provider_auth_wallet(req, res);

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith('123456');

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'User does not exist in our database.',
    });
  });

  it('Should throw error for unauthorized', async () => {
    const req = getMockReq({
      body: {
        signature: '78910',
      },
      params: {
        wallet: '123456',
      },
    });

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    mocked(getActiveProviderByWallet).mockReturnValueOnce({
      // @ts-ignore
      nonce: 'some-nonce',
    });

    await provider_auth_wallet(req, res);

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith('123456');

    expect(recoverPersonalSignature).toHaveBeenCalledTimes(1);
    expect(recoverPersonalSignature).toHaveBeenCalledWith({
      data: 'hex-nonce',
      sig: '78910',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Unauthorized access. Signatures do not match.',
    });
  });

  it('Should authenticate the provider', async () => {
    const req = getMockReq({
      body: {
        signature: '78910',
      },
      params: {
        wallet: '123456',
      },
    });

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn(),
    };

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');
    // @ts-ignore
    mocked(jwt.sign).mockReturnValue('some-jwt-token');
    mocked(v4).mockReturnValue('another-nonce');

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    mocked(getActiveProviderByWallet).mockReturnValueOnce({
      // @ts-ignore
      nonce: 'some-nonce',
      walletAddressHashed:
        'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
    });

    await provider_auth_wallet(req, res);

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith('123456');

    expect(recoverPersonalSignature).toHaveBeenCalledTimes(1);
    expect(recoverPersonalSignature).toHaveBeenCalledWith({
      data: 'hex-nonce',
      sig: '78910',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      accessToken: 'some-jwt-token',
      assessorId: null,
      nonce: 'another-nonce',
      walletAddress: '123456',
      walletAddressHashed:
        'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
    });
  });
});

describe('Provider Controller: PUT provider', () => {
  it('Should throw error for missing authentication key-value pair', async () => {
    const req = getMockReq();

    await edit_provider(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing identification key / value',
    });
  });

  it('Should throw error for missing provider ', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce(undefined);

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Tried to update nonexistent provider',
    });
  });

  it('Should throw error for incorrect sent update information (Config object contains less keys than it should)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          share: true,
        },
        provider: 'asd',
      },
    });

    mocked(getActiveProviderMock).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Config object contains less keys than it should',
    });
  });

  it('Should throw error for incorrect sent update information (provider not an object)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          share: true,
          safer: false,
        },
        provider: 'asd',
      },
    });

    mocked(getActiveProviderMock).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'The provider key of the request data is not an object',
    });
  });

  it('Should throw error for incorrect sent update information (Config object contains keys that should not be part of it)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          share: true,
          key: 'value',
        },
        provider: {
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
          address: 'testtest',
          country: 'AF',
          minerId: 'testtest',
        },
      },
    });

    mocked(getActiveProviderMock).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Config object contains keys that should not be part of it',
    });
  });

  it('Should throw error for incorrect sent update information (config object contains less keys than it should)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          key: 'value',
        },
        provider: {
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
          address: 'testtest',
          country: 'AF',
          minerId: 'testtest',
        },
      },
    });

    mocked(getActiveProviderMock).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Config object contains less keys than it should',
    });
  });

  it('Should throw error for incorrect sent update information (provider object contains keys that should not be part of it)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          share: false,
          safer: false,
        },
        provider: {
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
          address: 'testtest',
          country: 'AF',
          key: 'value',
        },
      },
    });

    mocked(getActiveProviderMock).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider object contains keys that should not be part of it',
    });
  });

  it('Should throw error for incorrect sent update information (provider object contains keys that should not be part of it)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          share: false,
          safer: false,
        },
        provider: {
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
          address: 'testtest',
          country: 'AF',
          key: 'value',
        },
      },
    });

    mocked(getActiveProviderMock).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider object contains keys that should not be part of it',
    });
  });

  it('Should throw error for invalid sent update information (Assessor type account must provide all required information)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: false,
          share: false,
          safer: false,
        },
        provider: {
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
          address: 'testtest',
        },
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce({
      ...provider,
      accountType: AccountType.Assessor,
    });

    mocked(getConfigByProviderIdMock).mockResolvedValueOnce({
      config: '{"bitscreen":true,"import":false,"share":true}',
      id: 5,
      provider: provider,
      created: new Date(),
      updated: new Date(),
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getConfigByProviderId).toHaveBeenCalledTimes(1);
    expect(getConfigByProviderId).toHaveBeenCalledWith(provider.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Assessor type account must provide all required information',
    });
  });

  it('Should throw error for invalid sent update information (Node operator type account must provide country, miner id and email to activate filter list importing - missing minerId)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: true,
          share: false,
          safer: false,
        },
        provider: {
          email: 'testtest@testtest.com',
          country: 'AF',
        },
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce({
      ...provider,
      accountType: AccountType.NodeOperator,
    });

    mocked(getConfigByProviderIdMock).mockResolvedValueOnce({
      config: '{"bitscreen":true,"import":false,"share":false}',
      id: 5,
      provider: provider,
      created: new Date(),
      updated: new Date(),
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getConfigByProviderId).toHaveBeenCalledTimes(1);
    expect(getConfigByProviderId).toHaveBeenCalledWith(provider.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message:
        'Node operator type account must provide country, miner id and email to activate filter list importing',
    });
  });

  it('Should throw error for invalid sent update information (Node operator type account must provide country, miner id and email to activate filter list importing - missing address)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: true,
          share: true,
          safer: false,
        },
        provider: {
          country: 'AF',
          minerId: 'testtest',
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
        },
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce({
      ...provider,
      accountType: AccountType.NodeOperator,
    });

    mocked(getConfigByProviderIdMock).mockResolvedValueOnce({
      config: '{"bitscreen":true,"import":false,"share":false}',
      id: 5,
      provider: provider,
      created: new Date(),
      updated: new Date(),
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getConfigByProviderId).toHaveBeenCalledTimes(1);
    expect(getConfigByProviderId).toHaveBeenCalledWith(provider.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message:
        'Node operator type account must provide contact person, business name, address and website to activate filter list sharing',
    });
  });

  it('Should throw error for invalid sent update information (Node operator type account must provide country, miner id and email to activate filter list importing - Provided website is not a valid URL)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: true,
          share: true,
          safer: false,
        },
        provider: {
          country: 'AF',
          minerId: 'testtest',
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest',
          email: 'testtest@testtest.com',
          address: 'testtest',
        },
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce({
      ...provider,
      accountType: AccountType.NodeOperator,
    });

    mocked(getConfigByProviderIdMock).mockResolvedValueOnce({
      config: '{"bitscreen":true,"import":false,"share":false}',
      id: 5,
      provider: provider,
      created: new Date(),
      updated: new Date(),
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getConfigByProviderId).toHaveBeenCalledTimes(1);
    expect(getConfigByProviderId).toHaveBeenCalledWith(provider.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provided website is not a valid URL',
    });
  });

  it('Should throw error for invalid sent update information (Node operator type account must provide country, miner id and email to activate filter list importing - Provided email is not a valid email address)', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: true,
          share: true,
          safer: false,
        },
        provider: {
          country: 'AF',
          minerId: 'testtest',
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest',
          address: 'testtest',
        },
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce({
      ...provider,
      accountType: AccountType.NodeOperator,
    });

    mocked(getConfigByProviderIdMock).mockResolvedValueOnce({
      config: '{"bitscreen":true,"import":false,"share":false}',
      id: 5,
      provider: provider,
      created: new Date(),
      updated: new Date(),
    });

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getConfigByProviderId).toHaveBeenCalledTimes(1);
    expect(getConfigByProviderId).toHaveBeenCalledWith(provider.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provided email is not a valid email address',
    });
  });

  it('Should update config and assessor based on sent information', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        loginType: LoginType.Wallet,
        config: {
          bitscreen: true,
          import: true,
          share: true,
          safer: false,
        },
        provider: {
          country: 'AF',
          minerId: 'testtest',
          contactPerson: 'testtest',
          businessName: 'testtest',
          website: 'testtest.com',
          email: 'testtest@testtest.com',
          address: 'testtest',
        },
      },
    });

    mocked(getActiveProviderMock).mockResolvedValueOnce({
      ...provider,
      accountType: AccountType.NodeOperator,
    });

    mocked(getConfigByProviderIdMock).mockResolvedValueOnce({
      config: '{"bitscreen":true,"import":true,"share":true}',
      id: 5,
      provider: provider,
      created: new Date(),
      updated: new Date(),
    });

    const configRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      update: jest.fn(),
    };

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      update: jest.fn(),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(configRepo);
    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await edit_provider(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(2);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getConfigByProviderId).toHaveBeenCalledTimes(1);
    expect(getConfigByProviderId).toHaveBeenCalledWith(provider.id);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(configRepo.update).toHaveBeenCalledTimes(1);
    expect(configRepo.update).toHaveBeenCalledWith(5, {
      config: '{"bitscreen":true,"import":true,"share":true}',
    });

    expect(providerRepo.update).toHaveBeenCalledTimes(1);
    expect(providerRepo.update).toHaveBeenCalledWith(provider.id, {
      ...req.body.provider,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Provider Controller: POST provider/:wallet', () => {
  it('Should throw error for missing wallet ', async () => {
    const req = getMockReq();

    await create_provider(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing wallet',
    });
  });

  it('Should throw error for already existing provider ', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    getActiveProviderByWalletMock.mockReturnValueOnce({
      //@ts-ignore
      id: 1,
    });

    await create_provider(req, res);

    expect(getActiveProviderByWalletMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWalletMock).toHaveBeenCalledWith(
      req.params.wallet
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider already exists',
    });
  });

  it('Should create new provider ', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest
        .fn()
        .mockReturnValueOnce({ consentDate: '2020-01-02', nonce: 123 }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);
    mocked(v4).mockReturnValue('another-nonce');
    getActiveProviderByWalletMock.mockResolvedValueOnce(undefined);

    await create_provider(req, res);

    expect(getActiveProviderByWalletMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWalletMock).toHaveBeenCalledWith(
      req.params.wallet
    );

    expect(getRepository).toHaveBeenCalledTimes(1);

    const provider = new Provider();
    provider.walletAddressHashed =
      'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a';
    provider.nonce = 'another-nonce';

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: provider.walletAddressHashed,
      })
    );
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: provider.nonce })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      walletAddress: '123456',
      consentDate: '2020-01-02',
      nonceMessage: `Welcome to BitScreen!
    
    Your authentication status will be reset after 1 week.
    
    Wallet address:
    123456
    
    Nonce:
    123
    `,
    });
  });
});

describe('Assessor Controller: POST /provider/auth/email', () => {
  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await provider_auth_email(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });

  it('Should throw error for unauthorized', async () => {
    const req = getMockReq({
      body: {
        tokenId: '123456',
      },
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce('');

    await provider_auth_email(req, res);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Authentication is not valid',
    });
  });

  it('Should throw error for provider not found', async () => {
    const req = getMockReq({
      body: {
        tokenId: '123456',
      },
    });

    getActiveProviderByEmailMock.mockResolvedValueOnce(undefined);
    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await provider_auth_email(req, res);

    expect(getActiveProviderByEmailMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmailMock).toHaveBeenCalledWith(testEmail);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.body.tokenId,
      PlatformTypes.BitScreen
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Provider user does not exist in our database.',
    });
  });

  it('Should authenticate the provider by Google account', async () => {
    const req = getMockReq({
      body: {
        tokenId: '123456',
      },
    });

    const providerReepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerReepo);

    getActiveProviderByEmailMock.mockReturnValueOnce({
      // @ts-ignore
      loginEmail: testEmail,
      provider: { id: 1 },
    });
    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await provider_auth_email(req, res);

    expect(getActiveProviderByEmailMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmailMock).toHaveBeenCalledWith(testEmail);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.body.tokenId,
      PlatformTypes.BitScreen
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      accessToken: 'some-jwt-token',
      assessorId: null,
      loginEmail: testEmail,
      provider: { id: 1 },
    });
  });
});

describe('Assessor Controller: POST /provider/email', () => {
  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await create_provider_by_email(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });

  it('Should throw error for already existing provider ', async () => {
    const req = getMockReq({
      body: {
        tokenId: '123456',
      },
    });

    getActiveProviderByEmailMock.mockReturnValueOnce({
      // @ts-ignore
      id: 1,
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await create_provider_by_email(req, res);

    expect(getActiveProviderByEmailMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmailMock).toHaveBeenCalledWith(testEmail);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.body.tokenId,
      PlatformTypes.BitScreen
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider already exists',
    });
  });

  it('Should create new provider by Google account', async () => {
    const req = getMockReq({
      body: {
        tokenId: '123456',
      },
    });

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn().mockReturnValue({
        consentDate: null,
        id: 1,
      }),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValue(providerRepo);
    getActiveProviderByEmailMock.mockResolvedValueOnce(undefined);

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await create_provider_by_email(req, res);

    expect(getActiveProviderByEmailMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmailMock).toHaveBeenCalledWith(testEmail);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.body.tokenId,
      PlatformTypes.BitScreen
    );

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
        guideShown: false,
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Assessor Controller: POST /provider/link-wallet/:wallet', () => {
  it('Should throw error for signature and/or wallet', async () => {
    const req = getMockReq({});

    await link_google_account_to_wallet(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Request should have signature and wallet',
    });
  });

  it('Should throw error for already being logged with a wallet address', async () => {
    const req = getMockReq({
      params: { wallet: '123456' },
      body: {
        signature: 'signature',
        loginType: LoginType.Wallet,
      },
    });

    await link_google_account_to_wallet(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'You are already logged in with a wallet address!',
    });
  });

  it('Should throw error for the Provider already being linked to the same wallet address', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
      body: {
        loginType: LoginType.Email,
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        signature: 'signature',
      },
    });

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      walletAddressHashed: getAddressHash('123456'),
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider is already linked to this wallet address!',
    });
  });

  it('Should throw error for the Provider already being linked to another wallet address', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
      body: {
        loginType: LoginType.Email,
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        signature: 'signature',
      },
    });

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      walletAddressHashed: getAddressHash('234567'),
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider is already linked to a wallet address!',
    });
  });

  it('Should throw error for unmatched singatures', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
      body: {
        loginType: LoginType.Email,
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        signature: 'signature',
      },
    });

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      nonce: 'some-nonce',
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(recoverPersonalSignature).toHaveBeenCalledTimes(1);
    expect(recoverPersonalSignature).toHaveBeenCalledWith({
      data: 'hex-nonce',
      sig: 'signature',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Could not link account to wallet. Signatures do not match.',
    });
  });

  it('Should throw error for an Assessor already being associated with the given Google Account', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
      body: {
        loginType: LoginType.Email,
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        signature: 'signature',
      },
    });

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      nonce: 'some-nonce',
    });
    getActiveProviderByWalletMock.mockReturnValueOnce({
      //@ts-ignore
      loginEmail: 'test2@gmail.com',
    });

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    await link_google_account_to_wallet(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getActiveProviderByWalletMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWalletMock).toHaveBeenCalledWith(
      req.params.wallet
    );

    expect(recoverPersonalSignature).toHaveBeenCalledTimes(1);
    expect(recoverPersonalSignature).toHaveBeenCalledWith({
      data: 'hex-nonce',
      sig: 'signature',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'A provider associated with this wallet address already exists!',
    });
  });

  it('Should link provider (and the associated assessor account) to the given wallet address', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
      body: {
        loginType: LoginType.Email,
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        signature: 'signature',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          nonce: 'some-nonce',
          id: 1,
          provider: {
            id: 25,
          },
        })
        .mockResolvedValueOnce(null),
      save: jest.fn(),
    };

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn(),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    mocked(v4)
      .mockReturnValueOnce('another-nonce-provider')
      .mockReturnValueOnce('another-nonce-assessor');

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      id: 25,
    });
    getActiveProviderByWalletMock.mockResolvedValueOnce(undefined);
    getActiveAssessorByProviderIdMock.mockReturnValueOnce({
      //@ts-ignore
      nonce: 'some-nonce',
      id: 1,
      provider: {
        id: 25,
      },
    });

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    await link_google_account_to_wallet(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getActiveProviderByWalletMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWalletMock).toHaveBeenCalledWith(
      req.params.wallet
    );

    expect(getRepository).toHaveBeenCalledTimes(2);

    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'another-nonce-provider',
        walletAddressHashed: getAddressHash('123456'),
      })
    );

    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'another-nonce-assessor',
        walletAddressHashed: getAddressHash('123456'),
      })
    );

    expect(recoverPersonalSignature).toHaveBeenCalledTimes(1);
    expect(recoverPersonalSignature).toHaveBeenCalledWith({
      data: 'hex-nonce',
      sig: 'signature',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Assessor Controller: POST /provider/link-google/:tokenId', () => {
  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await link_to_google_account(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });
  it('Should throw error for already being logged with a Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
      body: { loginType: LoginType.Email },
    });

    await link_to_google_account(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'You are already logged in with a Google Account!',
    });
  });

  it('Should throw error for Provider already being linked to the same Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
      body: {
        loginType: LoginType.Wallet,
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      loginEmail: testEmail,
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await link_to_google_account(req, res);
    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.params.tokenId,
      PlatformTypes.BitScreen
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider is already linked to this Google Account!',
    });
  });

  it('Should throw error for Provider already being linked to another Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
      body: {
        loginType: LoginType.Wallet,
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      loginEmail: testEmail + '2',
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await link_to_google_account(req, res);
    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.params.tokenId,
      PlatformTypes.BitScreen
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider is already linked to a Google Account!',
    });
  });

  it('Should throw error for a Provider already being associated with the given Google Account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
      body: {
        loginType: LoginType.Wallet,
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(undefined);

    getActiveProviderByEmailMock.mockReturnValueOnce({
      //@ts-ignore
      loginEmail: testEmail,
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await link_to_google_account(req, res);
    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.params.tokenId,
      PlatformTypes.BitScreen
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'A provider associated with this Google Account already exists!',
    });
  });

  it('Should link provider (and the associated assessor account) to the given Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
      body: {
        loginType: LoginType.Wallet,
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn(),
    };

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn(),
    };

    //@ts-ignore
    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    getActiveProviderMock.mockReturnValueOnce({
      //@ts-ignore
      id: 1,
      walletAddressHashed: getAddressHash('123456'),
    });

    getActiveProviderByEmailMock.mockResolvedValueOnce(undefined);

    getActiveAssessorByProviderIdMock.mockReturnValueOnce({
      //@ts-ignore
      id: 1,
    });

    jest
      .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
      .mockResolvedValueOnce(testEmail);

    await link_to_google_account(req, res);
    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledWith(
      req.params.tokenId,
      PlatformTypes.BitScreen
    );

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
      })
    );

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
