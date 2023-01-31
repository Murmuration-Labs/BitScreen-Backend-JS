import { getMockReq, getMockRes } from '@jest-mock/express';
import * as typeorm from 'typeorm';
import { mocked } from 'ts-jest/utils';
import { getRepository } from 'typeorm';
import {
  cid_conflict,
  create_cid,
  delete_cid,
  edit_cid,
  get_blocked_cids,
} from '../../src/controllers/cid.controller';
import { Cid } from '../../src/entity/Cid';
import { Filter } from '../../src/entity/Filter';
import {
  getBlockedCidsForProvider,
  getLocalCid,
} from '../../src/service/cid.service';
import { Provider } from '../../src/entity/Provider';
import { CID } from 'multiformats/cid';
import { getActiveProvider } from '../../src/service/provider.service';
import { Config } from '../../src/entity/Settings';

const { res, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

const getActiveProviderMock = mocked(getActiveProvider);

jest.mock('typeorm', () => {
  return {
    getRepository: jest.fn(() => {
      return { findOne: jest.fn() };
    }),
    IsNull: jest.fn(),
    PrimaryGeneratedColumn: jest.fn(),
    Column: jest.fn(),
    Entity: jest.fn(),
    BeforeInsert: jest.fn(),
    BeforeUpdate: jest.fn(),
    ManyToOne: jest.fn(),
    OneToOne: jest.fn(),
    JoinColumn: jest.fn(),
    OneToMany: jest.fn(),
    Unique: jest.fn(),
    ManyToMany: jest.fn(),
    JoinTable: jest.fn(),
  };
});

jest.mock('../../src/service/provider.service', () => {
  return {
    getActiveProvider: jest.fn(),
  };
});

jest.mock('../../src/service/cid.service');
jest.mock('multiformats/cid');

beforeEach(() => {
  mockClear();
  jest.clearAllMocks();
  mocked(CID.parse).mockReset();
  getActiveProviderMock.mockReset();
});

describe('CID Controller: POST /cid', () => {
  it('Should throw error on missing filterId', async () => {
    const req = getMockReq({
      body: {
        cid: 'asdfg',
        refUrl: 'google.com',
      },
    });

    await create_cid(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing filterId' });
  });

  it('Should reject invalid CID', async () => {
    const req = getMockReq({
      body: {
        filterId: 1,
        cid: 'asdfg',
        refUrl: 'google.com',
      },
    });

    mocked(CID.parse).mockImplementation(() => {
      throw new Error('invalid CID');
    });

    await create_cid(req, res);

    expect(CID.parse).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'CID "asdfg" does not have a valid CIDv0/v1 format.',
    });
  });

  it('Should throw error on filter not found', async () => {
    const req = getMockReq({
      body: {
        filterId: 1,
        cid: 'asdfg',
        refUrl: 'google.com',
      },
    });

    const cidRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(cidRepo);

    await create_cid(req, res);

    expect(getRepository).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: `Filter with id 1 not found.`,
    });
  });

  it('Should create cid', async () => {
    const req = getMockReq({
      body: {
        filterId: 1,
        cid: 'asdfg',
        refUrl: 'google.com',
      },
    });

    const filter = new Filter();
    filter.id = 1;

    const cidRepo = {
      metadata: {
        columns: [],
        relations: [],
      },
      findOne: jest.fn().mockResolvedValueOnce(filter),
      save: jest.fn().mockReturnValueOnce({ test: 'value' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(cidRepo);

    await create_cid(req, res);

    const cid = new Cid();
    cid.filters = [filter];
    cid.cid = 'asdfg';
    cid.refUrl = 'google.com';
    cid.hashedCid =
      '0033105ed3302282dddd38fcc8330a6448f6ae16bbcb26209d8740e8b3d28538';

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(cidRepo.findOne).toHaveBeenCalledTimes(1);
    expect(cidRepo.save).toHaveBeenCalledTimes(1);
    expect(cidRepo.save).toHaveBeenCalledWith(cid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ test: `value` });
  });
});

describe('CID Controller: PUT /cid/:id', () => {
  it('Should reject invalid CID', async () => {
    const req = getMockReq({
      params: {
        id: 2,
      },
      body: {
        filterId: 2,
        cid: 'newVal',
        refUrl: 'newRef',
      },
    });

    mocked(CID.parse).mockImplementation(() => {
      throw new Error('invalid CID');
    });

    await edit_cid(req, res);

    expect(CID.parse).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'CID "newVal" does not have a valid CIDv0/v1 format.',
    });
  });

  it.skip('Should create cid with filter', async () => {
    const req = getMockReq({
      params: {
        id: 2,
      },
      body: {
        filterId: 2,
        cid: 'newVal',
        refUrl: 'newRef',
      },
    });

    const oldFilter = new Filter();
    oldFilter.id = 1;

    const cid = new Cid();
    cid.filters = [oldFilter];
    cid.cid = 'oldVal';
    cid.refUrl = 'oldRef';

    const newFilter = new Filter();
    newFilter.id = 2;

    const newCid = new Cid();
    newCid.filters = [oldFilter, newFilter];
    newCid.cid = 'newVal';
    newCid.refUrl = 'newRef';
    newCid.hashedCid =
      'ce88ce0dd5097723a62342cc4a084ce7507b3b37f690e615284dcb754ee0be3d';

    const cidRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const filterRepo = {
      findOne: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(cidRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(filterRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(cidRepo);
    mocked(cidRepo.findOne).mockReturnValueOnce(cid);
    mocked(cidRepo.save).mockReturnValueOnce({ test: 'value' });
    mocked(filterRepo.findOne).mockReturnValueOnce(newFilter);

    await edit_cid(req, res);

    expect(CID.parse).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledTimes(3);
    expect(cidRepo.findOne).toHaveBeenCalledTimes(1);
    expect(cidRepo.findOne).toHaveBeenCalledWith(2, { relations: ['filter'] });
    expect(filterRepo.findOne).toHaveBeenCalledTimes(1);
    expect(filterRepo.findOne).toHaveBeenCalledWith(2);
    expect(cidRepo.save).toHaveBeenCalledTimes(1);
    expect(cidRepo.save).toHaveBeenCalledWith(newCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(newCid);
  });

  it.skip('Should create cid without filter', async () => {
    const req = getMockReq({
      params: {
        id: 2,
      },
      body: {
        filterId: 1,
        cid: 'newVal',
        refUrl: 'newRef',
      },
    });

    const filter = new Filter();
    filter.id = 1;

    const cid = new Cid();
    cid.filters = [filter];
    cid.cid = 'oldVal';
    cid.refUrl = 'oldRef';

    const newCid = new Cid();
    newCid.filters = [filter];
    newCid.cid = 'newVal';
    newCid.refUrl = 'newRef';
    newCid.hashedCid =
      'ce88ce0dd5097723a62342cc4a084ce7507b3b37f690e615284dcb754ee0be3d';

    const cidRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(cidRepo);
    mocked(cidRepo.findOne).mockReturnValueOnce(cid);
    mocked(cidRepo.save).mockReturnValueOnce({ test: 'value' });

    await edit_cid(req, res);

    expect(CID.parse).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(cidRepo.findOne).toHaveBeenCalledTimes(1);
    expect(cidRepo.findOne).toHaveBeenCalledWith(2, { relations: ['filter'] });
    expect(cidRepo.save).toHaveBeenCalledTimes(1);
    expect(cidRepo.save).toHaveBeenCalledWith(newCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(newCid);
  });

  it.skip('Should create cid without filterId', async () => {
    const req = getMockReq({
      params: {
        id: 2,
      },
      body: {
        cid: 'newVal',
        refUrl: 'newRef',
      },
    });

    const filter = new Filter();
    filter.id = 1;

    const cid = new Cid();
    cid.filters = [filter];
    cid.cid = 'oldVal';
    cid.refUrl = 'oldRef';

    const newCid = new Cid();
    newCid.filters = [filter];
    newCid.cid = 'newVal';
    newCid.refUrl = 'newRef';
    newCid.hashedCid =
      'ce88ce0dd5097723a62342cc4a084ce7507b3b37f690e615284dcb754ee0be3d';

    const cidRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValue(cidRepo);
    mocked(cidRepo.findOne).mockReturnValueOnce(cid);
    mocked(cidRepo.save).mockReturnValueOnce({ test: 'value' });

    await edit_cid(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(cidRepo.findOne).toHaveBeenCalledTimes(1);
    expect(cidRepo.findOne).toHaveBeenCalledWith(2, { relations: ['filter'] });
    expect(cidRepo.save).toHaveBeenCalledTimes(1);
    expect(cidRepo.save).toHaveBeenCalledWith(newCid);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(newCid);
  });
});

describe('CID Controller: DELETE /cid/:id', () => {
  it('Should delete CID', async () => {
    const req = getMockReq({
      params: {
        id: 2,
      },
    });

    const cid = new Cid();
    cid.id = 2;
    cid.deals = [];

    const cidRepo = {
      delete: jest.fn(),
      findOne: jest.fn().mockResolvedValueOnce(cid),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(cidRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(cidRepo);

    await delete_cid(req, res);

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(cidRepo.delete).toHaveBeenCalledTimes(1);
    expect(cidRepo.findOne).toHaveBeenCalledTimes(1);
    expect(cidRepo.delete).toHaveBeenCalledWith({ id: 2 });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({});
  });
});

describe('CID Controller: GET /cid/conflict', () => {
  it('Should throw error on wrong filterId type', async () => {
    const req = getMockReq({
      query: {
        filterId: true,
        cid: 'some-cid',
      },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 2;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await cid_conflict(req, res);

    expect(getActiveProviderMock).toHaveBeenCalled();
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide a valid filterId',
    });
  });

  it('Should throw error on wrong CID type', async () => {
    const req = getMockReq({
      query: {
        filterId: 1,
        cid: 12,
      },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 2;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await cid_conflict(req, res);

    expect(getActiveProviderMock).toHaveBeenCalled();
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Please provide a valid cid',
    });
  });

  it('Should return values with string input', async () => {
    const req = getMockReq({
      query: {
        filterId: '1',
        cid: 'SOME-CID',
      },
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const filter = new Filter();
    filter.id = 5;

    const cid = new Cid();
    cid.id = 6;

    const provider = new Provider();
    provider.id = 2;

    getActiveProviderMock.mockResolvedValueOnce(provider);
    mocked(getLocalCid).mockResolvedValueOnce([cid]);

    await cid_conflict(req, res);

    expect(getActiveProviderMock).toHaveBeenCalled();
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getLocalCid).toHaveBeenCalledTimes(1);
    expect(getLocalCid).toHaveBeenCalledWith(1, 2, 'some-cid', false);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith([cid]);
  });
});

describe('CID Controller: GET /cid/blocked', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(null);

    await get_blocked_cids(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Provider not found.' });
  });

  it('Should throw error on config not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 43;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
    };
    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(configRepo);

    await get_blocked_cids(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      provider,
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Config not found.' });
  });

  it('Should return an empty array if bitscreen setting is disabled', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 43;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    const config = new Config();
    config.config = '{"bitscreen":false,"import": false, "share": false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
    };
    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(configRepo);

    await get_blocked_cids(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      provider,
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith([]);
  });

  it('Should return a list of CIDs', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 43;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    const config = new Config();
    config.config = '{"bitscreen":true,"import": false, "share": false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
    };
    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(configRepo);

    const providerRepo = {
      save: jest.fn(),
    };
    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(providerRepo);

    mocked(getBlockedCidsForProvider).mockResolvedValueOnce([
      'oneCid',
      'anotherCid',
    ]);

    await get_blocked_cids(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(2);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      provider,
    });

    expect(providerRepo.save).toHaveBeenCalledTimes(1);
    expect(getBlockedCidsForProvider).toHaveBeenCalledTimes(1);
    expect(getBlockedCidsForProvider).toHaveBeenCalledWith(43);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(['oneCid', 'anotherCid']);
  });

  it('Should return a file of CIDs', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
      query: {
        download: true,
      },
    });

    mocked(getBlockedCidsForProvider).mockResolvedValueOnce([
      'oneCid',
      'anotherCid',
    ]);

    res.write = jest.fn();

    const provider = new Provider();
    provider.id = 43;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    const config = new Config();
    config.config = '{"bitscreen":true,"import": false, "share": false}';
    config.provider = provider;

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(config),
    };
    //@ts-ignore
    mocked(getRepository).mockReturnValueOnce(configRepo);

    await get_blocked_cids(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      provider,
    });

    expect(getBlockedCidsForProvider).toHaveBeenCalledTimes(1);
    expect(getBlockedCidsForProvider).toHaveBeenCalledWith(43);

    expect(res.setHeader).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-disposition',
      'attachment; filename=cid_list.json'
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-type',
      'application/json'
    );
    expect(res.write).toHaveBeenCalledTimes(1);
    expect(res.write).toHaveBeenCalledWith('["oneCid","anotherCid"]');
    expect(res.end).toHaveBeenCalledTimes(1);
  });
});
