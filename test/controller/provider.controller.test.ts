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
  get_by_email,
  get_by_wallet,
  link_google_account_to_wallet,
  link_to_google_account,
  provider_auth_email,
  provider_auth_wallet,
} from '../../src/controllers/provider.controller';
import { LoginType, Provider } from '../../src/entity/Provider';
import { getActiveAssessorByProviderId } from '../../src/service/assessor.service';
import { getAddressHash } from '../../src/service/crypto';
import * as googleAuthUtils from '../../src/service/googleauth.service';
import {
  getActiveProvider,
  getActiveProviderByEmail,
  getActiveProviderByWallet,
} from '../../src/service/provider.service';
import { PlatformTypes } from '../../src/types/common';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

const getActiveProviderMock = mocked(getActiveProvider);
const getActiveProviderByWalletMock = mocked(getActiveProviderByWallet);
const getActiveAssessorByProviderIdMock = mocked(getActiveAssessorByProviderId);
const getActiveProviderByEmailMock = mocked(getActiveProviderByEmail);

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

const testEmail = 'test@gmail.com';

jest
  .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
  .mockResolvedValue(testEmail);

jest.mock('../../src/service/assessor.service', () => {
  return {
    getActiveAssessor: jest.fn(),
    getActiveAssessorByEmail: jest.fn(),
    getActiveAssessorByProviderId: jest.fn(),
    getActiveAssessorByWallet: jest.fn(),
    softDeleteAssessor: jest.fn(),
  };
});

jest.mock('../../src/service/provider.service', () => {
  return {
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
});

describe('Provider Controller: GET /provider/:wallet', () => {
  it('Should throw error for missing wallet', async () => {
    const req = getMockReq();

    await get_by_wallet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing wallet' });
  });

  it('Should get a provider by wallet', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    mocked(getActiveProviderByWallet).mockReturnValueOnce({
      // @ts-ignore
      nonce: '456',
    });

    await get_by_wallet(req, res);

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith('123456');

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      nonce: '456',
      nonceMessage: `Welcome to BitScreen!
    
    Your authentication status will be reset after 1 week.
    
    Wallet address:
    123456
    
    Nonce:
    456
    `,
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

    mocked(getActiveProviderByWallet).mockReturnValueOnce(null);

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

    mocked(getActiveProvider).mockReturnValueOnce(null);

    await edit_provider(req, res);

    expect(getActiveProvider).toHaveBeenCalledTimes(1);
    expect(getActiveProvider).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Tried to update nonexistent provider',
    });
  });

  it('Should update provider ', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        id: 123,
        someField: '123',
        anotherField: '456',
      },
    });

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      update: jest.fn().mockReturnValueOnce({ test: 'value' }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    mocked(getActiveProvider).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    await edit_provider(req, res);

    expect(getActiveProvider).toHaveBeenCalledTimes(1);
    expect(getActiveProvider).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.update).toHaveBeenCalledTimes(1);
    expect(providerRepo.update).toHaveBeenCalledWith(
      { id: 123 },
      {
        id: 123,
        someField: '123',
        anotherField: '456',
      }
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ test: 'value' });
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
    getActiveProviderByWalletMock.mockReturnValueOnce(null);

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

describe('Assessor Controller: GET /provider/email/:tokenId', () => {
  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await get_by_email(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });

  it('Should get a provider by Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    getActiveProviderByEmailMock.mockReturnValueOnce({
      // @ts-ignore
      loginEmail: testEmail,
    });

    await get_by_email(req, res);

    expect(getActiveProviderByEmailMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmailMock).toHaveBeenCalledWith(testEmail);
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      loginEmail: testEmail,
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

    getActiveProviderByEmailMock.mockReturnValueOnce(null);
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
    getActiveProviderByEmailMock.mockReturnValueOnce(null);

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
    getActiveProviderByWalletMock.mockReturnValueOnce(null);
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
        identificationValue: 123456,
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
        identificationValue: 123456,
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
        identificationValue: 123456,
      },
    });

    getActiveProviderMock.mockReturnValueOnce(null);

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
        identificationValue: 123456,
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

    getActiveProviderByEmailMock.mockReturnValueOnce(null);

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
