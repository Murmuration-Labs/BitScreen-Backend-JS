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
  edit_assessor,
  get_by_email,
  get_by_email_with_provider,
  get_by_wallet,
  get_by_wallet_with_provider,
  link_google_account_to_wallet,
  link_to_google_account,
  soft_delete_assessor,
} from '../../src/controllers/assessor.controller';
import { LoginType, Provider } from '../../src/entity/Provider';
import { getAddressHash } from '../../src/service/crypto';
import * as googleAuthUtils from '../../src/service/googleauth.service';
import {
  getActiveAssessor,
  getActiveAssessorByEmail,
  getActiveAssessorByWallet,
  softDeleteAssessor,
} from '../../src/service/assessor.service';
import {
  getActiveProvider,
  getActiveProviderByEmail,
  getActiveProviderById,
  getActiveProviderByWallet,
  softDeleteProvider,
} from '../../src/service/provider.service';
import { Assessor } from '../../src/entity/Assessor';

const { res, mockClear } = getMockRes<any>({
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

const getActiveAssessorMock = mocked(getActiveAssessor);
const getActiveAssessorByEmailMock = mocked(getActiveAssessorByEmail);
const getActiveAssessorByWalletMock = mocked(getActiveAssessorByWallet);
const softDeleteAssessorMock = mocked(softDeleteAssessor);

const getActiveProviderMock = mocked(getActiveProvider);
const getActiveProviderByEmailMock = mocked(getActiveProviderByEmail);
const getActiveProviderByIdMock = mocked(getActiveProviderById);
const getActiveProviderByWalletMock = mocked(getActiveProviderByWallet);
const softDeleteProviderMock = mocked(softDeleteProvider);

jest.mock('typeorm', () => {
  return {
    getRepository: jest.fn(),
    IsNull: jest.fn(),
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

jest
  .spyOn(googleAuthUtils, 'returnGoogleEmailFromTokenId')
  .mockResolvedValue(testEmail);

beforeEach(() => {
  mockClear();
  jest.clearAllMocks();
  getActiveAssessorMock.mockReset();
  getActiveAssessorByEmailMock.mockReset();
  getActiveAssessorByWalletMock.mockReset();
  softDeleteAssessorMock.mockReset();

  getActiveProviderMock.mockReset();
  getActiveProviderByEmailMock.mockReset();
  getActiveProviderByIdMock.mockReset();
  getActiveProviderByWalletMock.mockReset();
  softDeleteProviderMock.mockReset();

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

describe('Assessor Controller: GET /assessor/:wallet', () => {
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

    getActiveAssessorByWalletMock.mockResolvedValueOnce(assessorByWallet);

    await get_by_wallet(req, res);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      id: 1,
      nonce: '456',
      walletAddressHashed: getAddressHash(req.params.wallet),
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

    getActiveAssessorByEmailMock.mockResolvedValueOnce(assessorByEmail);

    await get_by_email(req, res);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);
    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      id: 1,
      loginEmail: testEmail,
      nonce: '456',
    });
  });
});

describe('Assessor Controller: GET /assessor/with_provider/:wallet', () => {
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

    mocked(getActiveAssessorByWallet).mockReturnValueOnce({
      // @ts-ignore
      nonce: '456',
      provider: {
        id: 1,
      },
    });

    await get_by_wallet_with_provider(req, res);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

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

    mocked(getActiveAssessorByEmail).mockReturnValueOnce({
      // @ts-ignore
      loginEmail: testEmail,
      provider: {
        id: 1,
      },
    });

    await get_by_email_with_provider(req, res);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);
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

    mocked(getActiveAssessorByWallet).mockReturnValueOnce({
      // @ts-ignore
      id: 1,
    });

    await create_assessor(req, res);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith('123456');

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
      save: jest.fn().mockReturnValue({
        consentDate: null,
        id: 1,
      }),
    };

    mocked(getActiveAssessorByWallet).mockReturnValueOnce(null);
    mocked(getActiveProviderByWallet).mockReturnValueOnce(null);

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    mocked(v4)
      .mockReturnValueOnce('another-nonce-provider')
      .mockReturnValueOnce('another-nonce-assessor');

    await create_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith('123456');

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith('123456');

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: getAddressHash('123456'),
        nonce: 'another-nonce-provider',
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
    };

    mocked(getActiveAssessorByWallet).mockReturnValueOnce(null);
    mocked(getActiveProviderByWallet).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
      consentDate: '2022-09-10',
    });

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    mocked(v4).mockReturnValueOnce('another-nonce-assessor');

    await create_assessor(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith('123456');

    expect(getActiveProviderByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByWallet).toHaveBeenCalledWith('123456');

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

    mocked(getActiveAssessorByEmail).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
    });

    await create_assessor_by_email(req, res);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

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
      save: jest.fn().mockReturnValue({
        consentDate: null,
        id: 1,
      }),
    };

    mocked(getActiveAssessorByEmail).mockReturnValueOnce(null);
    mocked(getActiveProviderByEmail).mockReturnValueOnce(null);

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    await create_assessor_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

    expect(getActiveProviderByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmail).toHaveBeenCalledWith(testEmail);

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
      save: jest.fn().mockReturnValue({
        rodeoConsentDate: '2022-09-10',
        loginEmail: 'test@gmail.com',
      }),
    };

    mocked(getActiveAssessorByEmail).mockReturnValueOnce(null);
    mocked(getActiveProviderByEmail).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
      consentDate: '2022-09-10',
    });

    mocked(getRepository)
      //@ts-ignore
      .mockReturnValueOnce(assessorRepo);

    await create_assessor_by_email(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

    expect(getActiveProviderByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveProviderByEmail).toHaveBeenCalledWith(testEmail);

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
  });
});

describe('Assessor Controller: POST /assessor/auth/:wallet', () => {
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

    mocked(getActiveAssessorByWallet).mockReturnValueOnce(null);

    await assessor_auth(req, res);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

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
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(assessorRepo);
    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    mocked(getActiveAssessorByWallet).mockReturnValueOnce({
      // @ts-ignore
      nonce: 'some-nonce',
    });

    await assessor_auth(req, res);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

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

    mocked(getActiveAssessorByWallet).mockReturnValueOnce({
      // @ts-ignore
      nonce: 'some-nonce',
      walletAddressHashed:
        'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a',
      provider: { id: 1 },
    });

    await assessor_auth(req, res);

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

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

    mocked(getActiveAssessorByEmail).mockReturnValueOnce(null);

    await assessor_auth_by_email(req, res);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

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

    mocked(getActiveAssessorByEmail).mockReturnValueOnce({
      //@ts-ignore
      loginEmail: testEmail,
      provider: { id: 1 },
    });

    await assessor_auth_by_email(req, res);

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

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

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      loginEmail: testEmail,
    });

    await link_to_google_account(req, res);
    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

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

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      loginEmail: 'test2@gmail.com',
    });

    await link_to_google_account(req, res);
    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

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

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
    });
    mocked(getActiveAssessorByEmail).mockReturnValueOnce({
      //@ts-ignore
      loginEmail: 'test2@gmail.com',
    });

    await link_to_google_account(req, res);
    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

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
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo);

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
      walletAddressHashed: 123456,
      provider: {
        id: 25,
      },
    });

    mocked(getActiveAssessorByEmail).mockReturnValueOnce(null);

    mocked(getActiveProviderById).mockReturnValueOnce({
      //@ts-ignore
      walletAddressHashed: 123456,
    });

    await link_to_google_account(req, res);
    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getActiveAssessorByEmail).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByEmail).toHaveBeenCalledWith(testEmail);

    expect(googleAuthUtils.returnGoogleEmailFromTokenId).toHaveBeenCalledTimes(
      1
    );

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        loginEmail: testEmail,
      })
    );

    expect(getActiveProviderById).toHaveBeenCalledTimes(1);
    expect(getActiveProviderById).toHaveBeenCalledWith(25);
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

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      walletAddressHashed: getAddressHash('123456'),
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

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

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      walletAddressHashed: getAddressHash('234567'),
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

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

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('invalid-address');

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      nonce: 'some-nonce',
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
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

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      nonce: 'some-nonce',
    });
    mocked(getActiveAssessorByWallet).mockReturnValueOnce({
      //@ts-ignore
      loginEmail: 'test2@gmail.com',
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

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
      .mockReturnValueOnce(assessorRepo)
      //@ts-ignore
      .mockReturnValueOnce(providerRepo);

    mocked(bufferToHex).mockReturnValue('hex-nonce');
    mocked(recoverPersonalSignature).mockReturnValue('123456');

    mocked(v4)
      .mockReturnValueOnce('another-nonce-assessor')
      .mockReturnValueOnce('another-nonce-provider');

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      nonce: 'some-nonce',
      id: 1,
      provider: {
        id: 25,
      },
    });
    mocked(getActiveAssessorByWallet).mockReturnValueOnce(null);

    mocked(getActiveProviderById).mockReturnValueOnce({
      //@ts-ignore
      id: 25,
    });

    await link_google_account_to_wallet(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getActiveAssessorByWallet).toHaveBeenCalledTimes(1);
    expect(getActiveAssessorByWallet).toHaveBeenCalledWith(req.params.wallet);

    expect(getActiveProviderById).toHaveBeenCalledTimes(1);
    expect(getActiveProviderById).toHaveBeenCalledWith(25);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'another-nonce-assessor',
        walletAddressHashed: getAddressHash('123456'),
      })
    );

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
  it('Should throw error for no existing assessor ', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 123456,
      },
    });

    mocked(getActiveAssessor).mockReturnValueOnce(null);

    mocked(getActiveProvider).mockReturnValueOnce(null);

    await soft_delete_assessor(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue,
      ['provider']
    );

    expect(getActiveProvider).toHaveBeenCalledTimes(1);
    expect(getActiveProvider).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue,
      [
        'filters',
        'deals',
        'provider_Filters',
        'filters.cids',
        'filters.provider_Filters',
        'filters.provider',
      ]
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

    mocked(getActiveAssessor).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
      complaints: [
        { id: 1, assessor: 1 },
        { id: 2, assessor: 1 },
      ],
    });

    mocked(getActiveProvider).mockReturnValueOnce({
      //@ts-ignore
      id: 1,
    });

    mocked(softDeleteAssessor).mockReturnValueOnce(undefined);
    mocked(softDeleteProvider).mockReturnValueOnce(undefined);

    await soft_delete_assessor(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue,
      ['provider']
    );

    expect(getActiveProvider).toHaveBeenCalledTimes(1);
    expect(getActiveProvider).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue,
      [
        'filters',
        'deals',
        'provider_Filters',
        'filters.cids',
        'filters.provider_Filters',
        'filters.provider',
      ]
    );

    expect(softDeleteAssessor).toHaveBeenCalledTimes(1);
    expect(softDeleteAssessor).toHaveBeenCalledWith({
      id: 1,
      complaints: [
        { id: 1, assessor: 1 },
        { id: 2, assessor: 1 },
      ],
    });

    expect(softDeleteProvider).toHaveBeenCalledTimes(1);
    expect(softDeleteProvider).toHaveBeenCalledWith({
      id: 1,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
    });
  });
});

describe('Assessor Controller: PUT assessor', () => {
  it('Should throw error for missing authentication key-value pair', async () => {
    const req = getMockReq();

    await edit_assessor(req, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Missing identification key / value',
    });
  });

  it('Should throw error for missing assessor', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
      },
    });

    mocked(getActiveAssessor).mockReturnValueOnce(null);

    await edit_assessor(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Tried to update nonexistent assessor',
    });
  });

  it('Should update assessor', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'loginEmail',
        identificationValue: testEmail,
        id: 123,
        someField: '123',
        anotherField: '456',
      },
    });

    const assessorRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      update: jest.fn().mockReturnValueOnce({ test: 'value' }),
    };

    mocked(getActiveAssessor).mockReturnValueOnce({
      // @ts-ignore
      id: 123,
      someField: '321',
      anotherField: '654',
    });

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(assessorRepo);

    await edit_assessor(req, res);

    expect(getActiveAssessor).toHaveBeenCalledTimes(1);
    expect(getActiveAssessor).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(assessorRepo.update).toHaveBeenCalledTimes(1);
    expect(assessorRepo.update).toHaveBeenCalledWith(
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
