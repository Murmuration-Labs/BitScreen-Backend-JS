import { getMockReq, getMockRes } from '@jest-mock/express';
import { In, getRepository } from 'typeorm';
import {
  create_filter,
  edit_filter,
  get_filter,
  get_filter_by_id,
  get_filter_count,
  get_filter_dashboard,
  get_owned_filters,
  get_public_filter_details,
  get_public_filters,
  get_shared_filter,
} from '../../src/controllers/filter.controller';
import { mocked } from 'ts-jest/utils';
import {
  addFilteringToFilterQuery,
  addPagingToFilterQuery,
  addSortingToFilterQuery,
  checkForSameNameFilters,
  getDeclinedDealsCount,
  getFilterById,
  getFilterByShareId,
  getFiltersPaged,
  getOwnedFilterById,
  getOwnedFiltersBaseQuery,
  getPublicFilterDetailsBaseQuery,
  getPublicFiltersBaseQuery,
  adjustNetworksOnIndividualFilter,
} from '../../src/service/filter.service';
import { Filter } from '../../src/entity/Filter';
import { Provider } from '../../src/entity/Provider';
import { Provider_Filter } from '../../src/entity/Provider_Filter';
import { Cid } from '../../src/entity/Cid';
import { Visibility } from '../../src/entity/enums';
import { getProviderFilterCount } from '../../src/service/provider_filter.service';
import { generateRandomToken, getCidHash } from '../../src/service/crypto';
import { CID } from 'multiformats/cid';
import { getActiveProvider } from '../../src/service/provider.service';
import { Config } from '../../src/entity/Settings';
import { getExistingCids } from '../../src/service/cid.service';
import { getAddressHash } from '../../src/service/crypto';
import { NetworkType } from '../../src/entity/interfaces';
import { Network } from '../../src/entity/Network';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

jest.mock('../../src/service/provider.service', () => {
  return {
    getActiveProvider: jest.fn(),
  };
});

jest.mock('typeorm', () => {
  return {
    getRepository: jest.fn(),
    IsNull: jest.fn(),
    PrimaryGeneratedColumn: jest.fn(),
    Column: jest.fn(),
    Entity: jest.fn(),
    BeforeInsert: jest.fn(),
    BeforeUpdate: jest.fn(),
    ManyToOne: jest.fn(),
    OneToMany: jest.fn(),
    OneToOne: jest.fn(),
    Unique: jest.fn(),
    JoinColumn: jest.fn(),
    ManyToMany: jest.fn(),
    JoinTable: jest.fn(),
  };
});

jest.mock('../../src/service/filter.service', () => {
  const originalModule = jest.requireActual('../../src/service/filter.service');
  return {
    ...originalModule,
    getFiltersWithCid: jest.fn(),
    getFilterWithProvider: jest.fn(),
    addFilteringToFilterQuery: jest.fn(),
    addSortingToFilterQuery: jest.fn(),
    getPublicFiltersBaseQuery: jest.fn(),
    getFilterById: jest.fn(),
    getOwnedFilterById: jest.fn(),
    getOwnedFiltersBaseQuery: jest.fn(),
    getFiltersBaseQuery: jest.fn(),
    addPagingToFilterQuery: jest.fn(),
    getPublicFilterDetailsBaseQuery: jest.fn(),
    getFiltersPaged: jest.fn(),
    getDeclinedDealsCount: jest.fn(),
    getFilterByShareId: jest.fn(),
    getPublicFiltersByCid: jest.fn(),
    isProviderSubbedToSafer: jest.fn(),
    addSaferSubToProvider: jest.fn(),
    removeSaferSubFromProvider: jest.fn(),
    checkForSameNameFilters: jest.fn(),
  };
});
jest.mock('../../src/service/cid.service');
jest.mock('../../src/service/provider_filter.service');
jest.mock('../../src/service/crypto');
jest.mock('multiformats/cid');

let provider = new Provider();
provider.id = 1;

const ipfsNetwork = new Network();
ipfsNetwork.networkType = NetworkType.IPFS;
ipfsNetwork.id = 1;

const filecoinNetwork = new Network();
filecoinNetwork.networkType = NetworkType.Filecoin;
filecoinNetwork.id = 1;

let filter = new Filter();
filter.id = 155;
filter.networks = [ipfsNetwork, filecoinNetwork];

const getActiveProviderMock = mocked(getActiveProvider);
const checkForSameNameFiltersMock = mocked(checkForSameNameFilters);
const getExistingCidsMock = mocked(getExistingCids);

beforeEach(() => {
  mockClear();
  jest.clearAllMocks();
  mocked(CID.parse).mockReset();
  getActiveProviderMock.mockReset();
  checkForSameNameFiltersMock.mockReset();
  getExistingCidsMock.mockReset();
  mocked(getRepository).mockReset();
  provider = new Provider();
  provider.id = 1;

  filter = new Filter();
  filter.id = 155;
  filter.networks = [ipfsNetwork, filecoinNetwork];
});

describe('Filter Controller: GET /filter/count', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(undefined);

    await get_filter_count(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should return the filter count', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const baseQuery = {
      getCount: jest.fn().mockResolvedValueOnce(123),
    };

    // @ts-ignore
    mocked(getOwnedFiltersBaseQuery).mockReturnValueOnce(baseQuery);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_count(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ count: 123 });
  });
});

describe('Filter Controller: GET /filter/public', () => {
  it('Should return empty response without sorting and filtering', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const baseQuery = {
      getCount: jest.fn().mockResolvedValueOnce(123),
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    // @ts-ignore
    mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(addPagingToFilterQuery).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.getRawAndEntities).mockResolvedValueOnce(null);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('f', '1');
    expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(0);
    expect(baseQuery.getCount).toHaveBeenCalledTimes(1);
    expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0);
    expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addPagingToFilterQuery).toHaveBeenCalledWith('f', baseQuery, 0, 5);
    expect(baseQuery.loadAllRelationIds).toHaveBeenCalledTimes(1);
    expect(baseQuery.loadAllRelationIds).toHaveBeenCalledWith({
      relations: ['provider_Filters', 'cids'],
    });
    expect(baseQuery.getRawAndEntities).toHaveBeenCalledTimes(1);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      data: [],
      sort: {},
      page: 0,
      per_page: 5,
      count: 123,
    });
  });

  it('Should return empty response without sorting and filtering, custom page settings', async () => {
    const req = getMockReq({
      query: {
        page: 4678,
        per_page: 921,
      },
      body: {
        body: {
          identificationKey: 'test',
          identificationValue: 'test1',
        },
      },
    });

    const baseQuery = {
      getCount: jest.fn().mockResolvedValueOnce(123),
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };
    // @ts-ignore
    mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(addPagingToFilterQuery).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.getRawAndEntities).mockResolvedValueOnce(null);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('f', '1');
    expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(0);
    expect(baseQuery.getCount).toHaveBeenCalledTimes(1);
    expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0);
    expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addPagingToFilterQuery).toHaveBeenCalledWith(
      'f',
      baseQuery,
      4678,
      921
    );
    expect(baseQuery.loadAllRelationIds).toHaveBeenCalledTimes(1);
    expect(baseQuery.loadAllRelationIds).toHaveBeenCalledWith({
      relations: ['provider_Filters', 'cids'],
    });
    expect(baseQuery.getRawAndEntities).toHaveBeenCalledTimes(1);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      data: [],
      sort: {},
      page: 4678,
      per_page: 921,
      count: 123,
    });
  });

  it('Should return empty response with filtering, without sorting', async () => {
    const req = getMockReq({
      query: {
        q: 'someString',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const baseQuery = {
      something: true,
    };

    const filterQuery = {
      getCount: jest.fn().mockResolvedValueOnce(123),
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    // @ts-ignore
    mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(addFilteringToFilterQuery).mockReturnValueOnce(filterQuery);
    // @ts-ignore
    mocked(addPagingToFilterQuery).mockReturnValueOnce(filterQuery);
    mocked(filterQuery.loadAllRelationIds).mockReturnValueOnce(filterQuery);
    mocked(filterQuery.getRawAndEntities).mockResolvedValueOnce(null);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('f', '1');
    expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addFilteringToFilterQuery).toHaveBeenCalledWith('f', baseQuery, {
      q: '%someString%',
    });
    expect(filterQuery.getCount).toHaveBeenCalledTimes(1);
    expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0);
    expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addPagingToFilterQuery).toHaveBeenCalledWith('f', filterQuery, 0, 5);
    expect(filterQuery.loadAllRelationIds).toHaveBeenCalledTimes(1);
    expect(filterQuery.loadAllRelationIds).toHaveBeenCalledWith({
      relations: ['provider_Filters', 'cids'],
    });
    expect(filterQuery.getRawAndEntities).toHaveBeenCalledTimes(1);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      data: [],
      sort: {},
      page: 0,
      per_page: 5,
      count: 123,
    });
  });

  it('Should return empty response with filtering, with sorting', async () => {
    const req = getMockReq({
      query: {
        q: 'someString',
        sort: '{"name": "asc"}',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const baseQuery = {
      something: true,
    };

    const filterQuery = {
      getCount: jest.fn().mockResolvedValueOnce(123),
    };

    const sortQuery = {
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    // @ts-ignore
    mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(addFilteringToFilterQuery).mockReturnValueOnce(filterQuery);
    // @ts-ignore
    mocked(addSortingToFilterQuery).mockReturnValueOnce(sortQuery);
    // @ts-ignore
    mocked(addPagingToFilterQuery).mockReturnValueOnce(sortQuery);
    mocked(sortQuery.loadAllRelationIds).mockReturnValueOnce(sortQuery);
    mocked(sortQuery.getRawAndEntities).mockResolvedValueOnce(null);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('f', '1');
    expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addFilteringToFilterQuery).toHaveBeenCalledWith('f', baseQuery, {
      q: '%someString%',
    });
    expect(filterQuery.getCount).toHaveBeenCalledTimes(1);
    expect(addSortingToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addSortingToFilterQuery).toHaveBeenCalledWith('f', filterQuery, {
      name: 'asc',
    });
    expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addPagingToFilterQuery).toHaveBeenCalledWith('f', sortQuery, 0, 5);
    expect(sortQuery.loadAllRelationIds).toHaveBeenCalledTimes(1);
    expect(sortQuery.loadAllRelationIds).toHaveBeenCalledWith({
      relations: ['provider_Filters', 'cids'],
    });
    expect(sortQuery.getRawAndEntities).toHaveBeenCalledTimes(1);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      data: [],
      sort: { name: 'asc' },
      page: 0,
      per_page: 5,
      count: 123,
    });
  });

  it('Should parsed data', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const baseQuery = {
      getCount: jest.fn().mockResolvedValueOnce(123),
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    const firstFilter = new Filter();
    firstFilter.id = 16;
    firstFilter.provider_Filters = [
      new Provider_Filter(),
      new Provider_Filter(),
    ];
    firstFilter.cids = [new Cid(), new Cid(), new Cid()];
    firstFilter.provider = new Provider();
    firstFilter.provider.id = 43;
    firstFilter.provider.businessName = 'Test Business';
    firstFilter.provider.country = 'Germany';
    firstFilter.description = 'test';
    firstFilter.networks = [ipfsNetwork, filecoinNetwork];

    const secondFilter = new Filter();
    secondFilter.id = 17;
    secondFilter.provider_Filters = [new Provider_Filter()];
    secondFilter.cids = [new Cid(), new Cid()];
    secondFilter.provider = new Provider();
    secondFilter.provider.id = 44;
    secondFilter.provider.businessName = 'Test Business 2';
    secondFilter.provider.country = 'Romania';
    secondFilter.description = 'test2';
    secondFilter.networks = [ipfsNetwork];

    const filters = {
      raw: [{ isImported: '0' }, { isImported: '1' }],
      entities: [firstFilter, secondFilter],
    };

    // @ts-ignore
    mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(addPagingToFilterQuery).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.getRawAndEntities).mockResolvedValueOnce(filters);

    // // @ts-ignore
    // mocked(adjustNetworksOnMultipleFilters).mockReturnValueOnce(filterQuery);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('f', '1');
    expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(0);
    expect(baseQuery.getCount).toHaveBeenCalledTimes(1);
    expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0);
    expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1);
    expect(addPagingToFilterQuery).toHaveBeenCalledWith('f', baseQuery, 0, 5);
    expect(baseQuery.loadAllRelationIds).toHaveBeenCalledTimes(1);
    expect(baseQuery.loadAllRelationIds).toHaveBeenCalledWith({
      relations: ['provider_Filters', 'cids'],
    });
    expect(baseQuery.getRawAndEntities).toHaveBeenCalledTimes(1);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      data: [
        {
          id: 16,
          isImported: false,
          cids: 3,
          subs: 2,
          provider: firstFilter.provider,
          providerId: 43,
          providerName: 'Test Business',
          providerCountry: 'Germany',
          description: 'test',
          networks: ['IPFS', 'Filecoin'],
        },
        {
          id: 17,
          isImported: true,
          cids: 2,
          subs: 1,
          provider: secondFilter.provider,
          providerId: 44,
          providerName: 'Test Business 2',
          providerCountry: 'Romania',
          description: 'test2',
          networks: ['IPFS'],
        },
      ],
      sort: {},
      page: 0,
      per_page: 5,
      count: 123,
    });
  });
});

describe('Filter Controller: GET /filter/public/details/:shareId', () => {
  it('Should throw error on missing data', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
      params: {
        shareId: 'asdf-ghjk',
      },
    });

    const baseQuery = {
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    // @ts-ignore
    mocked(getPublicFilterDetailsBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.getRawAndEntities).mockReturnValueOnce(null);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filter_details(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledWith(
      'asdf-ghjk',
      '1'
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Cannot find filter with shareId asdf-ghjk',
    });
  });

  it('Should return public filter details', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
      },
      params: {
        shareId: 'asdf-ghjk',
      },
    });

    const baseQuery = {
      loadAllRelationIds: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    const providerFilter = new Provider_Filter();
    providerFilter.provider = provider;

    filter.provider = provider;
    filter.provider_Filters = [providerFilter];
    filter.networks = [ipfsNetwork];

    // @ts-ignore
    mocked(getPublicFilterDetailsBaseQuery).mockReturnValueOnce(baseQuery);
    // @ts-ignore
    mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery);
    mocked(baseQuery.getRawAndEntities).mockReturnValueOnce({
      entities: [filter],
      raw: [{ isImported: '0' }],
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_public_filter_details(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledTimes(1);
    expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledWith(
      'asdf-ghjk',
      '1'
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      filter: adjustNetworksOnIndividualFilter(filter),
      provider: provider,
      isImported: false,
    });
  });
});

describe('Filter Controller: GET /filter', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(undefined);

    await get_owned_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should return filters, without q, default values', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const filterItem = {
      ...filter,
      cidsCount: 10,
    };

    mocked(getFiltersPaged).mockResolvedValueOnce({
      filters: [filterItem],
      count: 1,
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_owned_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFiltersPaged).toHaveBeenCalledTimes(1);
    expect(getFiltersPaged).toHaveBeenCalledWith({
      providerId: '1',
      q: undefined,
      sort: {},
      page: 0,
      per_page: 5,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      filters: [adjustNetworksOnIndividualFilter(filterItem)],
      count: 1,
    });
  });

  it('Should return filters, with q, default values', async () => {
    const req = getMockReq({
      query: {
        q: 'tESt',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const filterItem = {
      ...filter,
      cidsCount: 10,
    };

    mocked(getFiltersPaged).mockResolvedValueOnce({
      filters: [filterItem],
      count: 1,
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_owned_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFiltersPaged).toHaveBeenCalledTimes(1);
    expect(getFiltersPaged).toHaveBeenCalledWith({
      providerId: '1',
      q: '%test%',
      sort: {},
      page: 0,
      per_page: 5,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      filters: [adjustNetworksOnIndividualFilter(filterItem)],
      count: 1,
    });
  });

  it('Should return filters, with q, custom values', async () => {
    const req = getMockReq({
      query: {
        q: 'tESt',
        page: 213,
        perPage: 15,
        sort: '{"name": "asc"}',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const filterItem = {
      ...filter,
      cidsCount: 10,
    };

    mocked(getFiltersPaged).mockResolvedValueOnce({
      filters: [filterItem],
      count: 1,
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_owned_filters(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFiltersPaged).toHaveBeenCalledTimes(1);
    expect(getFiltersPaged).toHaveBeenCalledWith({
      providerId: '1',
      q: '%test%',
      sort: { name: 'asc' },
      page: 213,
      per_page: 15,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      filters: [adjustNetworksOnIndividualFilter(filterItem)],
      count: 1,
    });
  });
});

describe('Filter Controller: GET /filter/dashboard', () => {
  it('Should return filter dashboard data', async () => {
    const req = getMockReq({
      query: {
        q: 'tESt',
        page: 213,
        perPage: 15,
        sort: '{"name": "asc"}',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const baseFilter = new Filter();
    baseFilter.id = 23;
    baseFilter.enabled = true;
    baseFilter.provider_Filters = [
      new Provider_Filter(),
      new Provider_Filter(),
    ];
    baseFilter.visibility = Visibility.Public;
    baseFilter.provider = provider;
    baseFilter.networks = [ipfsNetwork];

    const firstFilterItem = {
      ...baseFilter,
      cidsCount: 10,
    };

    const secondFilterItem = {
      ...baseFilter,
      id: 15,
      cidsCount: 3,
    };

    mocked(getFiltersPaged).mockResolvedValueOnce({
      filters: [firstFilterItem, secondFilterItem],
      count: 2,
    });
    mocked(getDeclinedDealsCount).mockResolvedValueOnce(12);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_dashboard(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFiltersPaged).toHaveBeenCalledTimes(1);
    expect(getFiltersPaged).toHaveBeenCalledWith({
      providerId: '1',
      q: '%test%',
      sort: { name: 'asc' },
      page: 213,
      per_page: 15,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      currentlyFiltering: 13,
      listSubscribers: 2,
      dealsDeclined: 12,
      activeLists: 2,
      inactiveLists: 0,
      importedLists: 0,
      privateLists: 0,
      publicLists: 2,
    });
  });

  it('Should return filter dashboard data part 2', async () => {
    const req = getMockReq({
      query: {
        q: 'tESt',
        page: 213,
        perPage: 15,
        sort: '{"name": "asc"}',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const newProvider = new Provider();
    newProvider.id = 45;

    const baseFilter = new Filter();
    baseFilter.id = 23;
    baseFilter.enabled = true;
    baseFilter.networks = [ipfsNetwork];
    baseFilter.provider_Filters = [
      new Provider_Filter(),
      new Provider_Filter(),
    ];
    baseFilter.visibility = Visibility.Private;
    baseFilter.provider = newProvider;

    const firstFilterItem = {
      ...baseFilter,
      enabled: false,
      provider_Filters: [],
      cidsCount: 9,
    };

    const secondFilterItem = {
      ...baseFilter,
      id: 15,
      cidsCount: 7,
    };

    mocked(getFiltersPaged).mockResolvedValueOnce({
      filters: [firstFilterItem, secondFilterItem],
      count: 2,
    });
    mocked(getDeclinedDealsCount).mockResolvedValueOnce(12);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_dashboard(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFiltersPaged).toHaveBeenCalledTimes(1);
    expect(getFiltersPaged).toHaveBeenCalledWith({
      providerId: '1',
      q: '%test%',
      sort: { name: 'asc' },
      page: 213,
      per_page: 15,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      currentlyFiltering: 7,
      listSubscribers: 0,
      dealsDeclined: 12,
      activeLists: 1,
      inactiveLists: 1,
      importedLists: 2,
      privateLists: 2,
      publicLists: 0,
    });
  });
});

describe('Filter Controller: GET /filter/:shareId', () => {
  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      params: {
        shareId: 'share-id',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledWith(Filter);
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(
      { shareId: req.params.shareId },
      {
        relations: [
          'cids',
          'provider',
          'provider_Filters',
          'provider_Filters.provider',
          'networks',
        ],
      }
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Filter not found.' });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      params: {
        shareId: 'share-id',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    const otherProvider = new Provider();
    otherProvider.id = 12;

    const firstProviderFilter = new Provider_Filter();
    firstProviderFilter.provider = otherProvider;
    firstProviderFilter.active = false;
    const secondProviderFilter = new Provider_Filter();
    secondProviderFilter.provider = provider;
    secondProviderFilter.active = true;

    filter.provider_Filters = [firstProviderFilter, secondProviderFilter];

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledWith(Filter);
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(
      { shareId: 'share-id' },
      {
        relations: [
          'cids',
          'provider',
          'provider_Filters',
          'provider_Filters.provider',
          'networks',
        ],
      }
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      ...adjustNetworksOnIndividualFilter(filter),
      enabled: true,
    });
  });
});

describe('Filter Controller: GET /filter/share/:shareId', () => {
  it('Should throw error on missing shareId', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_shared_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'ShareId must be provided',
    });
  });

  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(undefined);

    await get_shared_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      params: {
        shareId: 'share-id',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    mocked(getFilterByShareId).mockResolvedValueOnce(undefined);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_shared_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFilterByShareId).toHaveBeenCalledTimes(1);
    expect(getFilterByShareId).toHaveBeenCalledWith('share-id', '1');

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Cannot find filter with id share-id',
    });
  });

  it('Should throw error on provider_filter already exists', async () => {
    const req = getMockReq({
      params: {
        shareId: 'share-id',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    // @ts-ignore
    mocked(getFilterByShareId).mockResolvedValueOnce(filter);
    // @ts-ignore
    mocked(getProviderFilterCount).mockResolvedValueOnce(1);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_shared_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFilterByShareId).toHaveBeenCalledTimes(1);
    expect(getFilterByShareId).toHaveBeenCalledWith('share-id', '1');

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Cannot import filter because you already have it',
    });
  });

  it('Should return shared filter', async () => {
    const req = getMockReq({
      params: {
        shareId: 'share-id',
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    // @ts-ignore
    mocked(getFilterByShareId).mockResolvedValueOnce(filter);
    // @ts-ignore
    mocked(getProviderFilterCount).mockResolvedValueOnce(0);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_shared_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getFilterByShareId).toHaveBeenCalledTimes(1);
    expect(getFilterByShareId).toHaveBeenCalledWith('share-id', '1');

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      adjustNetworksOnIndividualFilter(filter)
    );
  });
});

describe('Filter Controller: GET /filter/:_id', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(undefined);

    await get_filter_by_id(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on missing id', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_by_id(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Filter not found' });
  });

  it('Should return owned filter', async () => {
    const req = getMockReq({
      params: {
        _id: 43,
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    mocked(getOwnedFilterById).mockResolvedValueOnce(filter);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_by_id(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      adjustNetworksOnIndividualFilter(filter)
    );
  });

  it('Should return owned filter', async () => {
    const req = getMockReq({
      params: {
        _id: 155,
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    mocked(getOwnedFilterById).mockResolvedValueOnce(filter);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_by_id(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getOwnedFilterById).toHaveBeenCalledTimes(1);
    expect(getOwnedFilterById).toHaveBeenCalledWith(req.params._id, '1');

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      adjustNetworksOnIndividualFilter(filter)
    );
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      params: {
        _id: 155,
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    mocked(getOwnedFilterById).mockResolvedValueOnce(undefined);
    mocked(getFilterById).mockResolvedValueOnce(undefined);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_by_id(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getOwnedFilterById).toHaveBeenCalledTimes(1);
    expect(getOwnedFilterById).toHaveBeenCalledWith(req.params._id, '1');
    expect(getFilterById).toHaveBeenCalledTimes(1);
    expect(getFilterById).toHaveBeenCalledWith(req.params._id);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Filter not found' });
  });

  it('Should return other filter', async () => {
    const req = getMockReq({
      params: {
        _id: 155,
      },
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    mocked(getOwnedFilterById).mockResolvedValueOnce(undefined);
    mocked(getFilterById).mockResolvedValueOnce(filter);

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_filter_by_id(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getOwnedFilterById).toHaveBeenCalledTimes(1);
    expect(getOwnedFilterById).toHaveBeenCalledWith(req.params._id, '1');
    expect(getFilterById).toHaveBeenCalledTimes(1);
    expect(getFilterById).toHaveBeenCalledWith(req.params._id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      adjustNetworksOnIndividualFilter(filter)
    );
  });
});

describe('Filter Controller: PUT /filter/:id', () => {
  it('Should throw error on missing id', async () => {
    const req = getMockReq({});

    await edit_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide an ID for the filter to be updated',
    });
  });

  it('Should throw error on invalid network key', async () => {
    const req = getMockReq({
      params: {
        id: 1,
      },
      body: {
        networks: 'asd',
      },
    });

    await edit_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Bad request - network key is invalid!',
    });
  });

  it('Should throw error on invalid networks', async () => {
    const req = getMockReq({
      params: {
        id: 1,
      },
      body: {
        networks: ['network1', 'network2'],
      },
    });

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(networkRepo);

    await edit_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Bad request - network key contains invalid networks!',
    });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      params: {
        id: 1,
      },
      body: {
        networks: ['IPFS'],
      },
    });

    const filterRepo = {
      update: jest.fn(),
      findOne: jest.fn().mockResolvedValueOnce(null),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(networkRepo);

    // @ts-ignore
    mocked(getRepository).mockReturnValue(filterRepo);

    await edit_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Filter list does not exist!',
    });
  });

  it('Should throw error on filter not owned by user', async () => {
    const req = getMockReq({
      params: {
        id: 1,
      },
      body: {
        networks: ['IPFS'],
        providerId: 3,
      },
    });

    const newProvider = new Provider();
    newProvider.id = 5;

    filter.provider = newProvider;

    const filterRepo = {
      update: jest.fn(),
      findOne: jest.fn().mockResolvedValueOnce(filter),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(networkRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValue(filterRepo);

    await edit_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Filter not owned by you!',
    });
  });

  it('Should edit filter', async () => {
    const req = getMockReq({
      params: { id: 155 },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        providerId: 5,
        id: 155,
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const newProvider = new Provider();
    newProvider.id = 5;

    filter.provider = newProvider;

    const filterRepo = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(filter),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(networkRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValue(filterRepo);

    await edit_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(4);
    expect(getRepository).toHaveBeenCalledWith(Filter);
    expect(getRepository).toHaveBeenCalledWith(Network);
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith({
      provider: newProvider,
      id: req.params.id,
      networks: [ipfsNetwork, filecoinNetwork],
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(2);
    expect(filterRepo.findOne).toHaveBeenCalledWith(req.params.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(filter);
  });

  it('Should edit filter - should change network to only IPFS', async () => {
    const req = getMockReq({
      params: { id: 155 },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        providerId: 5,
        id: 155,
        networks: ['IPFS'],
      },
    });

    const newProvider = new Provider();
    newProvider.id = 5;

    filter.provider = newProvider;

    const filterRepo = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(filter),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(networkRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValue(filterRepo);

    await edit_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(4);
    expect(getRepository).toHaveBeenCalledWith(Filter);
    expect(getRepository).toHaveBeenCalledWith(Network);
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith({
      provider: newProvider,
      id: req.params.id,
      networks: [ipfsNetwork],
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(2);
    expect(filterRepo.findOne).toHaveBeenCalledWith(req.params.id);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(filter);
  });

  it('Should edit filter - add 2 new cids', async () => {
    const req = getMockReq({
      params: { id: 155 },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        providerId: 5,
        id: 155,
        cids: [
          {
            cid: 'cid1',
            refUrl: 'ref1',
          },
          {
            cid: 'cid2',
            refUrl: 'ref2',
          },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const newProvider = new Provider();
    newProvider.id = 5;

    filter.provider = newProvider;

    const filterRepo = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(filter),
    };

    const cidRepo = {
      save: jest.fn(),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    mocked(getRepository);

    getExistingCidsMock.mockResolvedValueOnce([]);

    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo);

    const firstCid = new Cid();
    firstCid.cid = req.body.cids[0].cid;
    firstCid.hashedCid = getCidHash(req.body.cids[0].cid);
    firstCid.refUrl = req.body.cids[0].refUrl;
    firstCid.filters = [filter];
    const secondCid = new Cid();
    secondCid.cid = req.body.cids[1].cid;
    secondCid.hashedCid = getCidHash(req.body.cids[1].cid);
    secondCid.refUrl = req.body.cids[1].refUrl;
    secondCid.filters = [filter];

    await edit_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(6);
    expect(getRepository).toHaveBeenNthCalledWith(1, Network);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(3, Cid);
    expect(getRepository).toHaveBeenNthCalledWith(4, Cid);
    expect(getRepository).toHaveBeenNthCalledWith(5, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(6, Filter);
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith({
      provider: newProvider,
      id: req.params.id,
      networks: [ipfsNetwork, filecoinNetwork],
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(2);
    expect(filterRepo.findOne).toHaveBeenCalledWith(req.params.id);
    expect(cidRepo.save).toHaveBeenCalledTimes(2);
    expect(cidRepo.save).toHaveBeenNthCalledWith(1, firstCid);
    expect(cidRepo.save).toHaveBeenNthCalledWith(2, secondCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(filter);
  });

  it('Should edit filter - add 2 new cids and add the filter to 2 existing ones', async () => {
    const req = getMockReq({
      params: { id: 155 },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        providerId: 5,
        id: 155,
        cids: [
          {
            cid: 'cid1',
            refUrl: 'ref1',
          },
          {
            cid: 'cid2',
            refUrl: 'ref2',
          },
          {
            cid: 'cid3',
            refUrl: 'ref3',
          },
          {
            cid: 'cid4',
            refUrl: 'ref4',
          },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const newProvider = new Provider();
    newProvider.id = 5;

    filter.provider = newProvider;

    const existingFilter = new Filter();
    existingFilter.id = 12;
    existingFilter.provider = newProvider;

    const filterRepo = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(filter),
    };

    const cidRepo = {
      save: jest.fn(),
    };
    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    const existingCid1 = new Cid();
    existingCid1.cid = 'cid2';
    existingCid1.hashedCid = 'hashedCid2';
    existingCid1.refUrl = 'ref2';
    existingCid1.filters = [existingFilter];
    existingCid1.id = 15;

    const existingCid2 = new Cid();
    existingCid2.cid = 'cid3';
    existingCid2.hashedCid = 'hashedCid3';
    existingCid2.refUrl = 'ref3';
    existingCid2.filters = [existingFilter];
    existingCid2.id = 16;

    getExistingCidsMock.mockResolvedValueOnce([existingCid1, existingCid2]);

    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo);

    const firstCid = new Cid();
    firstCid.cid = req.body.cids[0].cid;
    firstCid.hashedCid = getCidHash(req.body.cids[0].cid);
    firstCid.refUrl = req.body.cids[0].refUrl;
    firstCid.filters = [filter];
    const secondCid = new Cid();
    secondCid.cid = req.body.cids[3].cid;
    secondCid.hashedCid = getCidHash(req.body.cids[3].cid);
    secondCid.refUrl = req.body.cids[3].refUrl;
    secondCid.filters = [filter];

    await edit_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(8);
    expect(getRepository).toHaveBeenNthCalledWith(1, Network);
    expect(getRepository).toHaveBeenNthCalledWith(2, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(3, Cid);
    expect(getRepository).toHaveBeenNthCalledWith(4, Cid);
    expect(getRepository).toHaveBeenNthCalledWith(5, Cid);
    expect(getRepository).toHaveBeenNthCalledWith(6, Cid);
    expect(getRepository).toHaveBeenNthCalledWith(7, Filter);
    expect(getRepository).toHaveBeenNthCalledWith(8, Filter);
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith({
      id: req.params.id,
      provider: newProvider,
      networks: [ipfsNetwork, filecoinNetwork],
    });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(2);
    expect(filterRepo.findOne).toHaveBeenCalledWith(req.params.id);

    existingCid1.filters = [...existingCid1.filters, filter];
    existingCid2.filters = [...existingCid2.filters, filter];

    expect(cidRepo.save).toHaveBeenCalledTimes(4);
    expect(cidRepo.save).toHaveBeenNthCalledWith(1, existingCid1);
    expect(cidRepo.save).toHaveBeenNthCalledWith(2, existingCid2);
    expect(cidRepo.save).toHaveBeenNthCalledWith(3, firstCid);
    expect(cidRepo.save).toHaveBeenNthCalledWith(4, secondCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(filter);
  });
});

describe('Filter Controller: POST /filter', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'test',
        identificationValue: 'test1',
      },
    });

    await create_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found!' });
  });

  it('Should throw error on same name filter', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);
    checkForSameNameFiltersMock.mockResolvedValueOnce(new Filter());

    await create_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message:
        'A filter with the same name already exists for this account, please choose another!',
    });
  });

  it('Should throw error on invalid network key', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
        networks: 'IPFS',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(provider);
    checkForSameNameFiltersMock.mockResolvedValueOnce(undefined);

    await create_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Bad request - network key is invalid!',
    });
  });

  it('Should throw error on invalid networks', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
        networks: ['network1'],
      },
    });

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(networkRepo);

    getActiveProviderMock.mockResolvedValueOnce(provider);
    checkForSameNameFiltersMock.mockResolvedValueOnce(undefined);

    await create_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Bad request - network key contains invalid networks!',
    });
  });

  it('Should throw error on invalid CID', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const expectedFilter = new Filter();
    expectedFilter.name = req.body.name;
    expectedFilter.description = req.body.description;
    expectedFilter.visibility = req.body.visibility;
    expectedFilter.enabled = req.body.enabled;
    expectedFilter.provider = provider;
    expectedFilter.shareId = 'random-token';

    const firstCid = new Cid();
    firstCid.cid = 'cid1';
    firstCid.refUrl = 'ref1';
    firstCid.filters = [expectedFilter];
    const secondCid = new Cid();
    secondCid.cid = 'cid2';
    secondCid.refUrl = 'ref2';
    secondCid.filters = [expectedFilter];

    checkForSameNameFiltersMock.mockResolvedValueOnce(undefined);
    getActiveProviderMock.mockResolvedValueOnce(provider);

    const filterRepo = {
      update: jest.fn(),
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn().mockResolvedValueOnce(null),
    };
    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValue(filterRepo);

    // @ts-ignore
    mocked(CID.parse).mockImplementationOnce(() => {
      return true;
    });
    mocked(CID.parse).mockImplementationOnce(() => {
      throw new Error('Random error');
    });

    await create_filter(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'CID "cid2" does not have a valid CIDv0/v1 format.',
    });
  });

  it('Should create a new filter', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn(),
    };

    const cidRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    getExistingCidsMock.mockResolvedValueOnce([]);

    const expectedFilter = new Filter();
    expectedFilter.name = 'test';
    expectedFilter.description = 'test desc';
    expectedFilter.visibility = Visibility.Exception;
    expectedFilter.enabled = false;
    expectedFilter.provider = provider;
    expectedFilter.shareId = 'random-token';
    expectedFilter.networks = [ipfsNetwork, filecoinNetwork];

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    mocked(generateRandomToken).mockReturnValueOnce('random-token');
    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo);

    const firstCid = new Cid();
    firstCid.cid = 'cid1';
    firstCid.refUrl = 'ref1';
    firstCid.filters = [expectedFilter];
    const secondCid = new Cid();
    secondCid.cid = 'cid2';
    secondCid.refUrl = 'ref2';
    secondCid.filters = [expectedFilter];

    getActiveProviderMock.mockResolvedValueOnce(provider);

    const config = new Config();
    config.config = '{"bitscreen":false,"import":false,"share":false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
      save: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);

    await create_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith({
      shareId: 'random-token',
    });
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith(expectedFilter);

    expect(cidRepo.save).toHaveBeenCalledTimes(3);
    expect(cidRepo.save).toHaveBeenNthCalledWith(1, firstCid);
    expect(cidRepo.save).toHaveBeenNthCalledWith(2, secondCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedFilter);
  });

  it('Should create new filter, retry share id generation', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const filterRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const cidRepo = {
      save: jest.fn(),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    const expectedFilter = new Filter();
    expectedFilter.name = 'test';
    expectedFilter.description = 'test desc';
    expectedFilter.visibility = Visibility.Exception;
    expectedFilter.enabled = false;
    expectedFilter.provider = provider;
    expectedFilter.shareId = 'random-token';
    expectedFilter.networks = [ipfsNetwork, filecoinNetwork];

    mocked(generateRandomToken).mockReturnValueOnce('existing-token');
    mocked(generateRandomToken).mockReturnValueOnce('random-token');

    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo);
    mocked(filterRepo.findOne).mockResolvedValueOnce(new Filter());
    mocked(filterRepo.findOne).mockResolvedValueOnce(null);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo);
    const firstCid = new Cid();
    firstCid.cid = 'cid1';
    firstCid.refUrl = 'ref1';
    firstCid.filters = [expectedFilter];
    const secondCid = new Cid();
    secondCid.cid = 'cid2';
    secondCid.refUrl = 'ref2';
    secondCid.filters = [expectedFilter];

    getActiveProviderMock.mockResolvedValueOnce(provider);
    getExistingCidsMock.mockResolvedValueOnce([]);

    const config = new Config();
    config.config = '{"bitscreen":false,"import":false,"share":false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
      save: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);

    await create_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(filterRepo.findOne).toHaveBeenCalledTimes(2);
    expect(filterRepo.findOne).toHaveBeenNthCalledWith(1, {
      shareId: 'existing-token',
    });
    expect(filterRepo.findOne).toHaveBeenNthCalledWith(2, {
      shareId: 'random-token',
    });
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith(expectedFilter);

    expect(cidRepo.save).toHaveBeenCalledTimes(2);
    expect(cidRepo.save).toHaveBeenNthCalledWith(1, firstCid);
    expect(cidRepo.save).toHaveBeenNthCalledWith(2, secondCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedFilter);
  });

  it('Should create a new filter and update bitscreen config setting to true', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const filterRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const cidRepo = {
      save: jest.fn(),
    };

    const providerFilterRepo = {
      save: jest.fn(),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    const expectedFilter = new Filter();
    expectedFilter.name = 'test';
    expectedFilter.description = 'test desc';
    expectedFilter.visibility = Visibility.Exception;
    expectedFilter.enabled = false;
    expectedFilter.provider = provider;
    expectedFilter.shareId = 'random-token';
    expectedFilter.networks = [ipfsNetwork, filecoinNetwork];

    mocked(generateRandomToken).mockReturnValueOnce('random-token');
    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo);
    mocked(filterRepo.findOne).mockResolvedValueOnce(null);

    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo);
    const firstCid = new Cid();
    firstCid.cid = 'cid1';
    firstCid.refUrl = 'ref1';
    firstCid.filters = [expectedFilter];
    const secondCid = new Cid();
    secondCid.cid = 'cid2';
    secondCid.refUrl = 'ref2';
    secondCid.filters = [expectedFilter];

    getActiveProviderMock.mockResolvedValueOnce(provider);
    getExistingCidsMock.mockResolvedValueOnce([]);

    const config = new Config();
    config.config = '{"bitscreen":false,"import":false,"share":false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
      save: jest.fn(),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerFilterRepo);

    //@ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);

    await create_filter(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith({
      shareId: 'random-token',
    });
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith(expectedFilter);

    expect(cidRepo.save).toHaveBeenCalledTimes(2);
    expect(cidRepo.save).toHaveBeenNthCalledWith(1, firstCid);
    expect(cidRepo.save).toHaveBeenNthCalledWith(2, secondCid);

    expect(configRepo.findOne).toHaveBeenCalledWith({
      provider,
    });
    expect(configRepo.save).toHaveBeenCalledTimes(1);
    expect(configRepo.save).toHaveBeenCalledWith({
      ...config,
      config: '{"bitscreen":true,"import":false,"share":false}',
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedFilter);
  });

  it('Should create a new filter - create 2 new cids and update 2 already existing ones', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: 'some-address',
        name: 'test',
        description: 'test desc',
        visibility: Visibility.Exception,
        enabled: false,
        cids: [
          { cid: 'cid1', refUrl: 'ref1' },
          { cid: 'cid2', refUrl: 'ref2' },
          { cid: 'cid3', refUrl: 'ref3' },
          { cid: 'cid4', refUrl: 'ref4' },
        ],
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const filterRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn(),
    };

    const cidRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    const providerFilterRepo = {
      save: jest.fn(),
    };

    const config = new Config();
    config.config = '{"bitscreen":false,"import":false,"share":false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
      save: jest.fn(),
    };

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    const existingFilter = new Filter();
    existingFilter.id = 80;

    const existingCid1 = new Cid();
    existingCid1.cid = 'cid2';
    existingCid1.hashedCid = 'hashedCid2';
    existingCid1.refUrl = 'ref2';
    existingCid1.filters = [existingFilter];
    existingCid1.id = 15;

    const existingCid2 = new Cid();
    existingCid2.cid = 'cid3';
    existingCid2.hashedCid = 'hashedCid3';
    existingCid2.refUrl = 'ref3';
    existingCid2.filters = [existingFilter];
    existingCid2.id = 16;

    getExistingCidsMock.mockResolvedValueOnce([existingCid1, existingCid2]);

    const expectedFilter = new Filter();
    expectedFilter.name = 'test';
    expectedFilter.description = 'test desc';
    expectedFilter.visibility = Visibility.Exception;
    expectedFilter.enabled = false;
    expectedFilter.provider = provider;
    expectedFilter.shareId = 'random-token';
    expectedFilter.networks = [ipfsNetwork, filecoinNetwork];

    mocked(generateRandomToken).mockReturnValueOnce('random-token');
    mocked(getRepository)
      // @ts-ignore
      .mockReturnValueOnce(networkRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(filterRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(cidRepo)
      // @ts-ignore
      .mockReturnValueOnce(providerFilterRepo)
      // @ts-ignore
      .mockReturnValueOnce(configRepo)
      // @ts-ignore
      .mockReturnValueOnce(configRepo);

    const firstCid = new Cid();
    firstCid.cid = 'cid1';
    firstCid.refUrl = 'ref1';
    firstCid.filters = [expectedFilter];
    const secondCid = new Cid();
    secondCid.cid = 'cid4';
    secondCid.refUrl = 'ref4';
    secondCid.filters = [expectedFilter];

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await create_filter(req, res);

    expect(getRepository).toHaveBeenCalledTimes(10);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith({
      shareId: 'random-token',
    });
    expect(filterRepo.save).toHaveBeenCalledTimes(1);
    expect(filterRepo.save).toHaveBeenCalledWith(expectedFilter);

    expect(cidRepo.save).toHaveBeenCalledTimes(4);

    existingCid1.filters = [...existingCid1.filters, expectedFilter];
    existingCid2.filters = [...existingCid2.filters, expectedFilter];

    expect(cidRepo.save).toHaveBeenNthCalledWith(1, existingCid1);
    expect(cidRepo.save).toHaveBeenNthCalledWith(2, existingCid2);
    expect(cidRepo.save).toHaveBeenNthCalledWith(3, firstCid);
    expect(cidRepo.save).toHaveBeenNthCalledWith(4, secondCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedFilter);
  });
});
