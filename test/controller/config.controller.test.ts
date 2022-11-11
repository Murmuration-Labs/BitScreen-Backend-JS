import { getMockReq, getMockRes } from '@jest-mock/express';
import {
  get_config,
  save_config,
} from '../../src/controllers/config.controller';
import { getRepository } from 'typeorm';
import { mocked } from 'ts-jest/utils';
import { Config } from '../../src/entity/Settings';
import { Provider } from '../../src/entity/Provider';
import { getActiveProvider } from '../../src/service/provider.service';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});

const getActiveProviderMock = mocked(getActiveProvider);

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

jest.mock('../../src/service/provider.service', () => {
  return {
    getActiveProvider: jest.fn(),
  };
});

beforeEach(() => {
  mockClear();
  jest.clearAllMocks();
  getActiveProviderMock.mockReset();
});

describe('Config Controller: GET /config', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(null);

    await get_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider not found!',
    });
  });

  it('Should create config on config not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const newConfig = new Config();
    newConfig.id = 999;
    newConfig.config = '{"test": 666}';

    const configRepo = {
      findOne: jest.fn().mockReturnValueOnce(null),
      save: jest.fn().mockResolvedValueOnce(newConfig),
    };

    //@ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);

    const provider = new Provider();
    provider.id = 1;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(configRepo.findOne).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      where: { provider: { id: 1 } },
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ id: 999, test: 666 });
  });

  it('Should return config', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const configRepo = {
      findOne: jest
        .fn()
        .mockReturnValueOnce({ id: 1234, config: '{"bitscreen": true}' }),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);

    const provider = new Provider();
    provider.id = 1;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await get_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(configRepo.findOne).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      where: { provider: { id: 1 } },
    });

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      id: 1234,
      bitscreen: true,
    });
  });
});

describe('Config Controller: PUT /config', () => {
  it('Should throw error on provider not found', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    getActiveProviderMock.mockResolvedValueOnce(null);

    await save_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Provider not found!',
    });
  });

  it('Should throw error on config missing', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
      },
    });

    const provider = new Provider();
    provider.id = 1;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await save_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Empty config not allowed.',
    });
  });

  it('Should update existing config', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
        bitscreen: false,
        someOtherConfig: true,
      },
    });

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce({
        id: 1234,
        config: '{"bitscreen": true, "someConfigToBeRemoved": false}',
      }),
      update: jest.fn(),
    };
    // @ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);

    const provider = new Provider();
    provider.id = 1;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    await save_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(configRepo.findOne).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      where: { provider: { id: 1 } },
    });
    expect(configRepo.update).toHaveBeenCalledTimes(1);
    expect(configRepo.update).toHaveBeenCalledWith(1234, {
      config: '{"bitscreen":false,"someOtherConfig":true}',
    });

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      id: 1234,
      bitscreen: false,
      someOtherConfig: true,
    });
  });

  it('Should create new config', async () => {
    const req = getMockReq({
      body: {
        identificationKey: 'walletAddressHashed',
        identificationValue: '123456',
        bitscreen: false,
        someOtherConfig: true,
      },
    });

    const configRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null),
      save: jest.fn(),
    };

    const provider = new Provider();
    provider.id = 1;

    getActiveProviderMock.mockResolvedValueOnce(provider);

    const config = new Config();
    config.provider = provider;
    config.config = '{"bitscreen":false,"someOtherConfig":true}';

    const dbConfig = new Config();
    dbConfig.id = 123;
    dbConfig.provider = provider;
    dbConfig.config = '{"bitscreen":false,"someOtherConfig":true}';

    // @ts-ignore
    mocked(getRepository).mockReturnValue(configRepo);
    mocked(configRepo.save).mockReturnValueOnce(dbConfig);

    await save_config(req, res);

    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(getActiveProviderMock).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(configRepo.findOne).toHaveBeenCalledTimes(1);
    expect(configRepo.findOne).toHaveBeenCalledWith({
      where: { provider: { id: 1 } },
    });
    expect(configRepo.save).toHaveBeenCalledTimes(1);
    expect(configRepo.save).toHaveBeenCalledWith(config);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      id: 123,
      bitscreen: false,
      someOtherConfig: true,
    });
  });
});
