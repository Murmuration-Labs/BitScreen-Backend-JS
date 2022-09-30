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
import { getAddressHash } from '../../src/service/crypto';
import * as googleAuthUtils from '../../src/service/googleauth.service';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

jest.mock('typeorm', () => {
  return {
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

describe('Provider Controller: GET /provider/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ nonce: '456' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await get_by_wallet(req, res);

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed:
        'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
    });

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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing signature ', async () => {
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
      findOne: jest.fn().mockResolvedValueOnce({ test: 'result' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ test: 'result' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await provider_auth_wallet(req, res);
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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: 'some-nonce',
      }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    await provider_auth_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed:
        'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
    });
    expect(recoverPersonalSignature).toHaveBeenCalledTimes(1);
    expect(recoverPersonalSignature).toHaveBeenCalledWith({
      data: 'hex-nonce',
      sig: '78910',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
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
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: 'some-nonce',
        walletAddressHashed:
          'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
      }),
      save: jest.fn(),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');
    // @ts-ignore
    mocked(jwt.sign).mockReturnValue('some-jwt-token');
    mocked(v4).mockReturnValue('another-nonce');

    await provider_auth_wallet(req, res);

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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await edit_provider(req, res);
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
      findOne: jest.fn().mockResolvedValueOnce({
        id: 123,
        someField: '321',
        anotherField: '654',
      }),
      update: jest.fn().mockReturnValueOnce({ test: 'value' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await edit_provider(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ id: 1 }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await create_provider(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed:
          'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
      },
    });

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
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest
        .fn()
        .mockReturnValueOnce({ consentDate: '2020-01-02', nonce: 123 }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);
    mocked(v4).mockReturnValue('another-nonce');

    await create_provider(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed:
          'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
      },
    });

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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        loginEmail: testEmail,
      }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await get_by_email(req, res);

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      loginEmail: testEmail,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      loginEmail: testEmail,
    });
  });
});

describe('Assessor Controller: POST /provider/auth/email', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await provider_auth_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      loginEmail: testEmail,
    });

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Provider user does not exist in our database.',
    });
  });

  // to-do
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
      findOne: jest.fn().mockResolvedValueOnce({
        loginEmail: testEmail,
        provider: { id: 1 },
      }),
      save: jest.fn(),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerReepo);

    await provider_auth_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerReepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerReepo.findOne).toHaveBeenCalledWith({
      loginEmail: testEmail,
    });

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ id: 1 }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await create_provider_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        loginEmail: testEmail,
      },
    });
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
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
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockReturnValue({
        consentDate: null,
        id: 1,
      }),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValue(providerRepo);
    await create_provider_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        loginEmail: testEmail,
      },
    });

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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        walletAddressHashed: getAddressHash('123456'),
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await link_google_account_to_wallet(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: { loginEmail: testEmail },
    });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        walletAddressHashed: getAddressHash('234567'),
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await link_google_account_to_wallet(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: { loginEmail: testEmail },
    });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: 'some-nonce',
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    await link_google_account_to_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { loginEmail: testEmail },
    });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          nonce: 'some-nonce',
        })
        .mockResolvedValueOnce({
          loginEmail: 'test2@gmail.com',
        }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    await link_google_account_to_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { loginEmail: testEmail },
    });
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { walletAddressHashed: getAddressHash('123456') },
    });

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
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 25,
        })
        .mockResolvedValueOnce(null),
      save: jest.fn(),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    mocked(v4)
      .mockReturnValueOnce('another-nonce-provider')
      .mockReturnValueOnce('another-nonce-assessor');

    await link_google_account_to_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(5);

    expect(providerRepo.findOne).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { loginEmail: testEmail },
    });
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { walletAddressHashed: getAddressHash('123456') },
    });
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'another-nonce-provider',
        walletAddressHashed: getAddressHash('123456'),
      })
    );

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { provider: 25 },
    });
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
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        loginEmail: testEmail,
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await link_to_google_account(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: { walletAddressHashed: 123456 },
    });

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        loginEmail: 'test2@gmail.com',
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await link_to_google_account(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: { walletAddressHashed: 123456 },
    });

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
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

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 1,
        })
        .mockResolvedValueOnce({
          loginEmail: 'test2@gmail.com',
        }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(providerRepo);

    await link_to_google_account(req, res);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { walletAddressHashed: 123456 },
    });
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { loginEmail: testEmail },
    });

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
      findOne: jest.fn().mockResolvedValueOnce({
        id: 1,
        walletAddressHashed: 123456,
        provider: {
          id: 25,
        },
      }),
      save: jest.fn(),
    };

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          walletAddressHashed: 123456,
          id: 25,
        })
        .mockResolvedValueOnce(null),
      save: jest.fn(),
    };

    //@ts-ignore
    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    await link_to_google_account(req, res);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(getRepository).toHaveBeenCalledTimes(5);

    expect(providerRepo.findOne).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { walletAddressHashed: 123456 },
    });
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { loginEmail: testEmail },
    });
    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
      })
    );

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { provider: 25 },
    });
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
