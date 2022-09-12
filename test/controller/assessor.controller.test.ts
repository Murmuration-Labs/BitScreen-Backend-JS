import {
  create_assessor,
  get_by_wallet,
  get_assessor_complaints_count,
  delete_assessor,
  export_assessor_data,
  assessor_auth,
  all_assessors,
  get_by_wallet_with_provider,
} from '../../src/controllers/assessor.controller';
import { getMockReq, getMockRes } from '@jest-mock/express';
import * as typeorm from 'typeorm';
import { mocked } from 'ts-jest/utils';
import { getRepository, Repository } from 'typeorm';
import { bufferToHex } from 'ethereumjs-util';
import { recoverPersonalSignature } from 'eth-sig-util';
import * as jwt from 'jsonwebtoken';
import { v4 } from 'uuid';
import { Provider } from '../../src/entity/Provider';
import { getAddressHash } from '../../src/service/crypto';
import { Assessor } from '../../src/entity/Assessor';

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

describe('Assessor Controller: GET /assessor/with_provider/:wallet', () => {
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

    const provider = new Provider();
    provider.walletAddressHashed = getAddressHash('123456');
    provider.nonce = 'another-nonce-provider';

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: provider.walletAddressHashed,
        nonce: 'another-nonce-provider',
        guideShown: false,
      })
    );
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: provider.nonce })
    );

    const assessor = new Assessor();
    assessor.walletAddressHashed = getAddressHash('123456');
    assessor.nonce = 'another-nonce-assessor';

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: assessor.walletAddressHashed,
        nonce: 'another-nonce-assessor',
      })
    );
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: assessor.nonce })
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

  it('Should create a new assessor for the existing correspondant provider', async () => {
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

    const assessor = new Assessor();
    assessor.walletAddressHashed = getAddressHash('123456');
    assessor.nonce = 'another-nonce-assessor';

    expect(assessorRepo.save).toHaveBeenCalledTimes(1);
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddressHashed: assessor.walletAddressHashed,
        nonce: 'another-nonce-assessor',
      })
    );
    expect(assessorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: assessor.nonce })
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

describe('Asessor Controller: POST /assessor/auth/:wallet', () => {
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

describe('Assessor Controller: DELETE assessor/:wallet', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error for no existing assessor ', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: getAddressHash('123456'),
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
        walletAddressHashed: getAddressHash('123456'),
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
        walletAddressHashed: getAddressHash('123456'),
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
        walletAddressHashed: getAddressHash('123456'),
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
