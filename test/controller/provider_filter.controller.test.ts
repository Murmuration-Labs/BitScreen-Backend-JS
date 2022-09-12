import { getMockReq, getMockRes } from '@jest-mock/express';
import {
  change_provider_filters_status,
  create_provider_filter,
  delete_provider_filter,
  update_provider_filter,
} from '../../src/controllers/provider_filter.controller';
import { getRepository } from 'typeorm';
import { mocked } from 'ts-jest/utils';
import { Provider } from '../../src/entity/Provider';
import { Filter } from '../../src/entity/Filter';
import { Provider_Filter } from '../../src/entity/Provider_Filter';

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

jest.mock('../../src/service/filter.service');
jest.mock('../../src/service/provider_filter.service');
jest.mock('../../src/service/crypto');

describe('Provider_Filter Controller: POST /provider_filter', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await create_provider_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on missing filterId', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 43 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await create_provider_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide a filterId.',
    });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
        filterId: 6,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 43 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await create_provider_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(6);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });

  it('Should create new provider filter', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
        filterId: 6,
        active: true,
        notes: 'something',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const provider = new Provider();
    provider.id = 12;

    const filter = new Filter();
    filter.id = 6;

    const expectedProviderFilter = new Provider_Filter();
    expectedProviderFilter.provider = provider;
    expectedProviderFilter.filter = filter;
    expectedProviderFilter.active = true;
    expectedProviderFilter.notes = 'something';

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    const providerFilterRepo = {
      save: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);

    await create_provider_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(3);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(3, Provider_Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(6);
    expect(providerFilterRepo.save).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.save).toHaveBeenCalledWith(
      expectedProviderFilter
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedProviderFilter);
  });
});

describe('Provider_Filter Controller: PUT /provider_filter/:filterId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);
    await update_provider_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on missing filterId', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await update_provider_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide a filterId.',
    });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
      params: {
        filterId: 2,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await update_provider_filter(req, res);

    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(2, {
      relations: [
        'provider',
        'provider_Filters',
        'provider_Filters.provider',
        'provider_Filters.filter',
      ],
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });

  it('Should throw error on provider_filter not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
      params: {
        filterId: 2,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const filter = new Filter();
    filter.id = 2;

    const badProvider = new Provider();
    badProvider.id = 99;
    const badProviderFilter = new Provider_Filter();
    badProviderFilter.filter = filter;
    badProviderFilter.provider = badProvider;

    filter.provider_Filters = [badProviderFilter];

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await update_provider_filter(req, res);

    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(2, {
      relations: [
        'provider',
        'provider_Filters',
        'provider_Filters.provider',
        'provider_Filters.filter',
      ],
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });

  it('Should update provider filter', async () => {
    const req = getMockReq({
      params: {
        filterId: 2,
      },
      body: {
        active: true,
        walletAddressHashed: 'some-address',
        notes: 'test',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const provider = new Provider();
    provider.id = 12;

    const filter = new Filter();
    filter.id = 2;

    const badProvider = new Provider();
    badProvider.id = 99;
    const badProviderFilter = new Provider_Filter();
    badProviderFilter.id = 88;
    badProviderFilter.filter = filter;
    badProviderFilter.provider = badProvider;

    const goodProviderFilter = new Provider_Filter();
    goodProviderFilter.id = 77;
    goodProviderFilter.filter = filter;
    goodProviderFilter.provider = provider;

    filter.provider_Filters = [badProviderFilter, goodProviderFilter];
    filter.provider = provider;

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    const providerFilterRepo = {
      update: jest.fn().mockResolvedValueOnce(goodProviderFilter),
      findOne: jest.fn().mockResolvedValueOnce(goodProviderFilter),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);

    await update_provider_filter(req, res);

    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(2, {
      relations: [
        'provider',
        'provider_Filters',
        'provider_Filters.provider',
        'provider_Filters.filter',
      ],
    });

    expect(providerFilterRepo.update).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.update).toHaveBeenCalledWith(
      77,
      goodProviderFilter
    );
    expect(providerFilterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.findOne).toHaveBeenCalledWith(77);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(goodProviderFilter);
  });
});

describe('Provider_Filter Controller: PUT /provider_filter/:filterId/shared/enabled', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error on missing filterId', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await change_provider_filters_status(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide a filterId.',
    });
  });

  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      params: {
        filterId: 43,
      },
      body: {
        walletAddressHashed: 'some-address',
        enabled: false,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await change_provider_filters_status(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledWith(Provider);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
        enabled: false,
      },
      params: {
        filterId: 43,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await change_provider_filters_status(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(43, {
      relations: ['provider'],
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Filter not found' });
  });

  it('Should throw error on access denied', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
        enabled: false,
      },
      params: {
        filterId: 43,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const provider = new Provider();
    provider.id = 12;

    const badProvider = new Provider();
    badProvider.id = 13;

    const filter = new Filter();
    filter.id = 43;
    filter.provider = badProvider;

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await change_provider_filters_status(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(43, {
      relations: ['provider'],
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message:
        'Only the creator of the filter can change the enablement for all the subscribers.',
    });
  });

  it('Should update all provider filters', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
        enabled: false,
      },
      params: {
        filterId: 43,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const provider = new Provider();
    provider.id = 12;

    const filter = new Filter();
    filter.id = 43;
    filter.provider = provider;

    const filterRepo = {
      findOne: jest.fn().mockResolvedValue(filter),
      update: jest.fn().mockResolvedValueOnce({}),
    };

    const firstPv = new Provider_Filter();
    firstPv.id = 64;
    const secondPv = new Provider_Filter();
    secondPv.id = 78;

    const providerFilterRepo = {
      find: jest.fn().mockResolvedValueOnce([firstPv, secondPv]),
      update: jest.fn().mockResolvedValue({}),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await change_provider_filters_status(req, res);

    expect(getRepository).toHaveBeenCalledTimes(7);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(3, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(4, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(5, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(6, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(7, Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(2);
    expect(filterRepo.findOne).toHaveBeenNthCalledWith(1, 43, {
      relations: ['provider'],
    });
    expect(filterRepo.findOne).toHaveBeenNthCalledWith(2, 43);
    expect(filterRepo.update).toHaveBeenCalledTimes(1);
    expect(filterRepo.update).toHaveBeenCalledWith(43, {
      ...filter,
      enabled: false,
    });
    expect(providerFilterRepo.update).toHaveBeenCalledTimes(2);
    expect(providerFilterRepo.update).toHaveBeenNthCalledWith(1, 64, {
      ...firstPv,
      active: false,
    });
    expect(providerFilterRepo.update).toHaveBeenNthCalledWith(2, 78, {
      ...secondPv,
      active: false,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(filter);
  });
});

describe('Provider_Filter Controller: DELETE /provider_filter/:filtedId', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should throw error on missing filterId', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await delete_provider_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide a filterId.',
    });
  });

  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
      params: {
        filterId: 43,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    await delete_provider_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledWith(Provider);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
      params: {
        filterId: 43,
      },
    });

    const provider = new Provider();
    provider.id = 12;

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(provider),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    await delete_provider_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(43, {
      relations: ['provider'],
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });

  it('Should delete provider filter (filter not owned)', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
      params: {
        filterId: 43,
      },
    });

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce({ id: 12 }),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const provider = new Provider();
    provider.id = 13;

    const filter = new Filter();
    filter.id = 43;
    filter.provider = provider;

    const providerFilter = new Provider_Filter();
    providerFilter.id = 33;
    providerFilter.provider = provider;
    providerFilter.filter = filter;

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    const providerFilterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(providerFilter),
      delete: jest.fn().mockResolvedValue({}),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);

    await delete_provider_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(4);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(3, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(4, Provider_Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(43, {
      relations: ['provider'],
    });
    expect(providerFilterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.findOne).toHaveBeenCalledWith({
      where: { provider: { id: 12 }, filter },
    });
    expect(providerFilterRepo.delete).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.delete).toHaveBeenCalledWith(33);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });

  it('Should delete provider filter (filter owned)', async () => {
    const req = getMockReq({
      body: {
        walletAddressHashed: 'some-address',
      },
      params: {
        filterId: 43,
      },
    });
    const provider = new Provider();
    provider.id = 12;

    const providerRepo = {
      findOne: jest.fn().mockResolvedValueOnce(provider),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    const filter = new Filter();
    filter.id = 43;
    filter.provider = provider;

    const providerFilter = new Provider_Filter();
    providerFilter.id = 33;
    providerFilter.provider = provider;
    providerFilter.filter = filter;

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
      update: jest.fn().mockResolvedValue({}),
    };

    const fPV = new Provider_Filter();
    fPV.id = 432;
    const sPV = new Provider_Filter();
    sPV.id = 523;

    const providerFilterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(providerFilter),
      delete: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([fPV, sPV]),
      update: jest.fn().mockResolvedValue({}),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);

    await delete_provider_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(8);
    expect(getRepository).toHaveBeenNthCalledWith(1, Provider);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(3, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(4, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(5, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(6, Provider_Filter);
    expect(getRepository).toHaveBeenNthCalledWith(7, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(8, Provider_Filter);
    expect(providerRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerRepo.findOne).toHaveBeenCalledWith({
      walletAddressHashed: 'some-address',
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(43, {
      relations: ['provider'],
    });
    expect(providerFilterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.findOne).toHaveBeenCalledWith({
      where: { provider, filter },
    });
    expect(providerFilterRepo.find).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.find).toHaveBeenCalledWith({
      filter: { id: 43 },
    });
    expect(providerFilterRepo.update).toHaveBeenCalledTimes(2);
    expect(providerFilterRepo.update).toHaveBeenNthCalledWith(1, 432, {
      ...fPV,
      active: false,
    });
    expect(providerFilterRepo.update).toHaveBeenNthCalledWith(2, 523, {
      ...sPV,
      active: false,
    });
    expect(filterRepo.update).toHaveBeenCalledTimes(1);
    expect(filterRepo.update).toHaveBeenCalledWith(43, {
      ...filter,
      enabled: false,
    });
    expect(providerFilterRepo.delete).toHaveBeenCalledTimes(1);
    expect(providerFilterRepo.delete).toHaveBeenCalledWith(33);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });
});
