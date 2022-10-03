import { getMockReq, getMockRes } from '@jest-mock/express';
import { getRepository } from 'typeorm';
import { mocked } from 'ts-jest/utils';
import { Provider } from '../../src/entity/Provider';
import {
  create_deal,
  get_deal_stats,
} from '../../src/controllers/deal.controller';
import { Deal, DealStatus, DealType } from '../../src/entity/Deal';
import {
  addEndInterval,
  addStartInterval,
  BucketSize,
  fillDates,
  getCidForProvider,
  getStatsBaseQuery,
  setBucketSize,
} from '../../src/service/deal.service';
import { Cid } from '../../src/entity/Cid';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

jest.mock('typeorm', () => {
  return {
    getRepository: jest.fn(),
    PrimaryGeneratedColumn: jest.fn(),
    Column: jest.fn(),
    Entity: jest.fn(),
    BeforeInsert: jest.fn(),
    BeforeUpdate: jest.fn(),
    ManyToOne: jest.fn(),
    OneToMany: jest.fn(),
    OneToOne: jest.fn(),
    Unique: jest.fn(),
    ManyToMany: jest.fn(),
    JoinColumn: jest.fn(),
    JoinTable: jest.fn(),
  };
});

jest.mock('../../src/service/deal.service');

describe('Deal Controller: POST /deal', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        wallet: 'asdf',
        cid: 'ghjkl',
        dealType: DealType.Retrieval,
        status: DealStatus.Accepted,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await create_deal(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed:
        '4c8f18581c0167eb90a761b4a304e009b924f03b619a0c0e8ea3adfce20aee64',
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found.' });
  });

  it('Should throw error on cid not found', async () => {
    const req = getMockReq({
      body: {
        wallet: 'asdf',
        cid: 'ghjkl',
        dealType: DealType.Retrieval,
        status: DealStatus.Accepted,
      },
    });

    const provider = new Provider();
    provider.id = 1;

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(provider),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);
    mocked(getCidForProvider).mockReturnValueOnce(null);

    await create_deal(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed:
        '4c8f18581c0167eb90a761b4a304e009b924f03b619a0c0e8ea3adfce20aee64',
    });
    expect(getCidForProvider).toHaveBeenCalledTimes(1);
    expect(getCidForProvider).toHaveBeenCalledWith(1, 'ghjkl');

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: "CID is not present in any of this provider's filters.",
    });
  });

  it('Should save deal', async () => {
    const req = getMockReq({
      body: {
        wallet: 'asdf',
        cid: 'ghjkl',
        dealType: DealType.Retrieval,
        status: DealStatus.Accepted,
      },
    });

    const provider = new Provider();
    provider.id = 1;

    const cid = new Cid();
    cid.id = 666;

    const expectedDeal = new Deal();
    expectedDeal.cid = cid;
    expectedDeal.type = DealType.Retrieval;
    expectedDeal.status = DealStatus.Accepted;

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(provider),
    };
    const dealRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockResolvedValueOnce(true),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValue(dealRepo);
    mocked(getCidForProvider).mockResolvedValueOnce(cid);

    await create_deal(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed:
        '4c8f18581c0167eb90a761b4a304e009b924f03b619a0c0e8ea3adfce20aee64',
    });
    expect(getCidForProvider).toHaveBeenCalledTimes(1);
    expect(getCidForProvider).toHaveBeenCalledWith(1, 'ghjkl');
    expect(dealRepo.save).toHaveBeenCalledTimes(1);
    expect(dealRepo.save).toHaveBeenCalledWith(expectedDeal);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedDeal);
  });
});

describe('Deal Controller: GET /deal/stats/:bucketSize', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should get stats without interval', async () => {
    const req = getMockReq({
      params: {
        bucketSize: BucketSize.Daily,
      },
      query: {},
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 1;

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(provider),
    };

    const statsQuery = {
      getRawMany: jest.fn().mockResolvedValueOnce([
        { value: 1, key: 'test1' },
        { value: 2, key: 'test2' },
      ]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);
    // @ts-ignore
    mocked(getStatsBaseQuery).mockReturnValue(statsQuery);

    mocked(fillDates).mockReturnValue({ test: 'value' });

    await get_deal_stats(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: '123456',
    });
    expect(getStatsBaseQuery).toHaveBeenCalledTimes(1);
    expect(getStatsBaseQuery).toHaveBeenCalledWith(1);
    expect(addStartInterval).toHaveBeenCalledTimes(0);
    expect(addEndInterval).toHaveBeenCalledTimes(0);
    expect(setBucketSize).toHaveBeenCalledTimes(1);
    expect(setBucketSize).toHaveBeenCalledWith(statsQuery, BucketSize.Daily);
    expect(fillDates).toHaveBeenCalledTimes(1);
    expect(fillDates).toHaveBeenCalledWith(
      {
        test1: { value: 1, key: 'test1' },
        test2: { value: 2, key: 'test2' },
      },
      BucketSize.Daily,
      undefined,
      undefined
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ test: 'value' });
  });

  it('Should get stats with interval', async () => {
    const req = getMockReq({
      params: {
        bucketSize: BucketSize.Daily,
      },
      query: {
        start: '2021-09-30',
        end: '2021-10-01',
      },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 1;

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(provider),
    };

    const statsQuery = {
      getRawMany: jest.fn().mockResolvedValueOnce([
        { value: 1, key: 'test1' },
        { value: 2, key: 'test2' },
      ]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);
    // @ts-ignore
    mocked(getStatsBaseQuery).mockReturnValue(statsQuery);

    mocked(fillDates).mockReturnValue({ test: 'value' });

    await get_deal_stats(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: '123456',
    });
    expect(getStatsBaseQuery).toHaveBeenCalledTimes(1);
    expect(getStatsBaseQuery).toHaveBeenCalledWith(1);
    expect(addStartInterval).toHaveBeenCalledTimes(1);
    expect(addStartInterval).toHaveBeenCalledWith(statsQuery, '2021-09-30');
    expect(addEndInterval).toHaveBeenCalledTimes(1);
    expect(addEndInterval).toHaveBeenCalledWith(statsQuery, '2021-10-01');
    expect(setBucketSize).toHaveBeenCalledTimes(1);
    expect(setBucketSize).toHaveBeenCalledWith(statsQuery, BucketSize.Daily);
    expect(fillDates).toHaveBeenCalledTimes(1);
    expect(fillDates).toHaveBeenCalledWith(
      {
        test1: { value: 1, key: 'test1' },
        test2: { value: 2, key: 'test2' },
      },
      BucketSize.Daily,
      '2021-09-30',
      '2021-10-01'
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ test: 'value' });
  });
});
