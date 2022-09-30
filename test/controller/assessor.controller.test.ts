import { getMockReq, getMockRes } from '@jest-mock/express';
import { recoverPersonalSignature } from 'eth-sig-util';
import { bufferToHex } from 'ethereumjs-util';
import * as jwt from 'jsonwebtoken';
import { mocked } from 'ts-jest/utils';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import {
  assessor_auth,
  assessor_auth_by_email,
  create_assessor,
  create_assessor_by_email,
  delete_assessor,
  get_by_email,
  get_by_email_with_provider,
  get_by_wallet,
  get_by_wallet_with_provider,
  link_google_account_to_wallet,
  link_to_google_account,
} from '../../src/controllers/assessor.controller';
import { LoginType } from '../../src/entity/Provider';
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

describe('Assessor Controller: GET /assessor/:wallet', () => {
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

  it('Should get an assessor by wallet without the provider relation', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: '456',
      }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await get_by_wallet(req, res);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: getAddressHash('123456'),
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

describe('Assessor Controller: GET /assessor/email/:tokenId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await get_by_email(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing OAuth token!' });
  });

  it('Should get an assessor by Google account without the provider relation', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        loginEmail: testEmail,
      }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await get_by_email(req, res);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      loginEmail: testEmail,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      loginEmail: testEmail,
    });
  });
});

describe('Assessor Controller: GET /assessor/with_provider/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing wallet', async () => {
    const req = getMockReq();

    await get_by_wallet_with_provider(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing wallet' });
  });

  it('Should get an assessor by wallet with the provider relation', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: '456',
        provider: {
          id: 1,
        },
      }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await get_by_wallet_with_provider(req, res);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        walletAddressHashed: getAddressHash('123456'),
      },
      { relations: ['provider'] }
    );

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
      provider: {
        id: 1,
      },
    });
  });
});

describe('Assessor Controller: GET /assessor/with_provider/email/:tokenId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing tokenId', async () => {
    const req = getMockReq();

    await get_by_email_with_provider(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing OAuth token!' });
  });

  it('Should get an assessor by wallet with the provider relation', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        loginEmail: testEmail,
        provider: {
          id: 1,
        },
      }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await get_by_email_with_provider(req, res);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        loginEmail: testEmail,
      },
      { relations: ['provider'] }
    );
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      loginEmail: testEmail,
      provider: {
        id: 1,
      },
    });
  });
});

describe('Assessor Controller: POST assessor/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing wallet ', async () => {
    const req = getMockReq();

    await create_assessor(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing wallet',
    });
  });

  it('Should throw error for already existing assessor ', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ id: 1 }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await create_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed: getAddressHash('123456'),
      },
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Assessor already exists',
    });
  });

  it('Should create a new assessor and the corresponding provider', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockReturnValue({
        rodeoConsentDate: '2022-09-10',
        nonce: 123,
      }),
    };

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
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    mocked(v4)
      .mockReturnValueOnce('another-nonce-provider')
      .mockReturnValueOnce('another-nonce-assessor');

    await create_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(4);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed: getAddressHash('123456'),
      },
    });

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed: getAddressHash('123456'),
      },
    });

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: getAddressHash('123456'),
        nonce: 'another-nonce-provider',
        guideShown: false,
      })
    );

    const assessorNonce = 'another-nonce-assessor';

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: getAddressHash('123456'),
        nonce: assessorNonce,
        provider: {
          consentDate: null,
          id: 1,
        },
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      walletAddress: '123456',
      rodeoConsentDate: '2022-09-10',
      consentDate: null,
      nonceMessage: `Welcome to BitScreen!
    
    Your authentication status will be reset after 1 week.
    
    Wallet address:
    123456
    
    Nonce:
    123
    `,
    });
  });

  it('Should create a new assessor for the already existing provider', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockReturnValue({
        rodeoConsentDate: '2022-09-10',
        nonce: 123,
      }),
    };

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, consentDate: '2022-09-10' }),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    mocked(v4).mockReturnValueOnce('another-nonce-assessor');

    await create_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(3);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed: getAddressHash('123456'),
      },
    });

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        walletAddressHashed: getAddressHash('123456'),
      },
    });

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: getAddressHash('123456'),
        nonce: 'another-nonce-assessor',
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      walletAddress: '123456',
      rodeoConsentDate: '2022-09-10',
      consentDate: '2022-09-10',
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

describe('Assessor Controller: POST assessor/email/:tokenId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await create_assessor_by_email(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });

  it('Should throw error for already existing assessor ', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ id: 1 }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await create_assessor_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
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
      message: 'Assessor already exists',
    });
  });

  it('Should create a new assessor and the corresponding provider by Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockReturnValue({
        rodeoConsentDate: '2022-09-10',
        loginEmail: 'test@gmail.com',
      }),
    };

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
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    await create_assessor_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(4);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: {
        loginEmail: testEmail,
      },
    });

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

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
        provider: {
          consentDate: null,
          id: 1,
        },
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      rodeoConsentDate: '2022-09-10',
      consentDate: null,
    });
  });

  it('Should create a new assessor for the already existing provider by Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockReturnValue({
        rodeoConsentDate: '2022-09-10',
        loginEmail: 'test@gmail.com',
      }),
    };

    const providerRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, consentDate: '2022-09-10' }),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    await create_assessor_by_email(req, res);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(getRepository).toHaveBeenCalledTimes(3);

    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: {
        loginEmail: testEmail,
      },
    });

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: {
        loginEmail: testEmail,
      },
    });

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
        provider: {
          consentDate: '2022-09-10',
          id: 1,
        },
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      rodeoConsentDate: '2022-09-10',
      consentDate: '2022-09-10',
    });
  });
});

describe('Assessor Controller: POST /assessor/auth/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing wallet', async () => {
    const req = getMockReq();

    await assessor_auth(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Request should have signature and wallet',
    });
  });

  it('Should throw error for missing signature', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({ test: 'result' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await assessor_auth(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Request should have signature and wallet',
    });
  });

  it('Should throw error for assessor not found', async () => {
    const req = getMockReq({
      body: {
        signature: '78910',
      },
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await assessor_auth(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Assessor user does not exist in our database.',
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

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: 'some-nonce',
      }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    await assessor_auth(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        walletAddressHashed:
          'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
      },
      { relations: ['provider'] }
    );
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

  it('Should authenticate the assessor', async () => {
    const req = getMockReq({
      body: {
        signature: '78910',
      },
      params: {
        wallet: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: 'some-nonce',
        walletAddressHashed:
          'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
        provider: { id: 1 },
      }),
      save: jest.fn(),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');
    // @ts-ignore
    mocked(jwt.sign).mockReturnValue('some-jwt-token');
    mocked(v4).mockReturnValue('another-nonce');

    await assessor_auth(req, res);

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
      provider: { id: 1 },
    });
  });
});

describe('Assessor Controller: POST /assessor/auth/email/:tokenId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await assessor_auth_by_email(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing OAuth token!',
    });
  });

  it('Should throw error for assessor not found', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await assessor_auth_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        loginEmail: testEmail,
      },
      { relations: ['provider'] }
    );

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Assessor user does not exist in our database.',
    });
  });

  it('Should authenticate the assessor by Google account', async () => {
    const req = getMockReq({
      params: {
        tokenId: '123456',
      },
    });

    const assessorRepo = {
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
    mocked(getRepository).mockReturnValue(assessorRepo);

    await assessor_auth_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        loginEmail: testEmail,
      },
      { relations: ['provider'] }
    );

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

describe('Assessor Controller: POST /assessor/link-google/:tokenId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for missing OAuth token', async () => {
    const req = getMockReq();

    await link_to_google_account(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
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

  it('Should throw error for Assessor already being linked to the same Google account', async () => {
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
        loginEmail: testEmail,
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await link_to_google_account(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: { walletAddressHashed: 123456 },
      relations: ['provider'],
    });

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'The assessor is already linked to this Google Account!',
    });
  });

  it('Should throw error for Assessor already being linked to another Google account', async () => {
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
        loginEmail: 'test2@gmail.com',
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await link_to_google_account(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: { walletAddressHashed: 123456 },
      relations: ['provider'],
    });

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'The assessor is already linked to a Google Account!',
    });
  });

  it('Should throw error for an Assessor already being associated with the given Google Account', async () => {
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
    mocked(getRepository).mockReturnValue(assessorRepo);

    await link_to_google_account(req, res);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(2);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { walletAddressHashed: 123456 },
      relations: ['provider'],
    });
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { loginEmail: testEmail },
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message:
        'An assessor associated with this Google Account already exists!',
    });
  });

  it('Should link assessor (and provider) to the given Google account', async () => {
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
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 1,
          walletAddressHashed: 123456,
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
      findOne: jest.fn().mockResolvedValueOnce({
        walletAddressHashed: 123456,
      }),
      save: jest.fn(),
    };

    //@ts-ignore
    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo);

    await link_to_google_account(req, res);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(getRepository).toHaveBeenCalledTimes(5);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(2);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { walletAddressHashed: 123456 },
      relations: ['provider'],
    });
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { loginEmail: testEmail },
    });
    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
      })
    );

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      where: { id: 25 },
    });
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
      })
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Assessor Controller: POST /assessor/link-wallet/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for signature and/or wallet', async () => {
    const req = getMockReq();

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

  it('Should throw error for Assessor already being linked to the same wallet address', async () => {
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
      findOne: jest.fn().mockResolvedValueOnce({
        walletAddressHashed: getAddressHash('123456'),
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await link_google_account_to_wallet(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: { loginEmail: testEmail },
      relations: ['provider'],
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Assessor is already linked to this wallet address!',
    });
  });

  it('Should throw error for Assessor already being linked to another wallet address', async () => {
    const req = getMockReq({
      params: {
        wallet: '123456',
      },
      body: {
        loginType: LoginType.Email,
        identificationKey: 'loginEmail',
        signature: 'signature',
        identificationValue: testEmail,
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        walletAddressHashed: getAddressHash('234567'),
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await link_google_account_to_wallet(req, res);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith({
      where: { loginEmail: testEmail },
      relations: ['provider'],
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Assessor is already linked to a wallet address!',
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

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce({
        nonce: 'some-nonce',
      }),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    await link_google_account_to_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { loginEmail: testEmail },
      relations: ['provider'],
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

    const assessorRepo = {
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
    mocked(getRepository).mockReturnValue(assessorRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    await link_google_account_to_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(2);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { loginEmail: testEmail },
      relations: ['provider'],
    });
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(2, {
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
      message:
        'An assessor associated with this wallet address already exists!',
    });
  });

  it('Should link assessor (and provider) to the given wallet address', async () => {
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
      findOne: jest.fn().mockResolvedValueOnce({
        id: 25,
      }),
      save: jest.fn(),
    };

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo);

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    mocked(v4)
      .mockReturnValueOnce('another-nonce-assessor')
      .mockReturnValueOnce('another-nonce-provider');

    await link_google_account_to_wallet(req, res);

    expect(getRepository).toHaveBeenCalledTimes(5);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(2);
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { loginEmail: testEmail },
      relations: ['provider'],
    });
    expect(assessorRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { walletAddressHashed: getAddressHash('123456') },
    });
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'another-nonce-assessor',
        walletAddressHashed: getAddressHash('123456'),
      })
    );

    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 25 },
    });
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'another-nonce-provider',
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

describe('Assessor Controller: DELETE assessor/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for no existing assessor ', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 123456,
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);

    await delete_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        walletAddressHashed: 123456,
      },
      { relations: ['complaints'] }
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      message: 'You are not allowed to delete this account.',
    });
  });

  it('Should delete assessor and remove relation to corresponding complaints', async () => {
    const req = getMockReq({
      body: {
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
        complaints: [
          { id: 1, assessor: 1 },
          { id: 2, assessor: 1 },
        ],
      }),
      remove: jest.fn().mockResolvedValue(null),
    };

    const complaintRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      save: jest.fn().mockResolvedValue(null),
    };

    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(assessorRepo)
      // @ts-ignore
      .mockReturnValueOnce(complaintRepo)
      // @ts-ignore
      .mockReturnValueOnce(complaintRepo)
      // @ts-ignore
      .mockReturnValueOnce(assessorRepo);

    await delete_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(4);
    expect(assessorRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assessorRepo.findOne).toHaveBeenCalledWith(
      {
        walletAddressHashed: 123456,
      },
      { relations: ['complaints'] }
    );

    expect(complaintRepo.save).toHaveBeenCalledTimes(2);
    expect(complaintRepo.save).toHaveBeenNthCalledWith(1, {
      id: 1,
      assessor: null,
    });
    expect(complaintRepo.save).toHaveBeenNthCalledWith(2, {
      id: 2,
      assessor: null,
    });

    expect(assessorRepo.remove).toHaveBeenCalledTimes(1);
    expect(assessorRepo.remove).toHaveBeenCalledWith({
      id: 1,
      complaints: [
        { id: 1, assessor: null },
        { id: 2, assessor: null },
      ],
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
    });
  });
});
