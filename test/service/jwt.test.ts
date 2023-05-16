import { getMockReq, getMockRes } from '@jest-mock/express';
import * as jwt from 'jsonwebtoken';
import { mocked } from 'ts-jest/utils';
import { LoginType, Provider } from '../../src/entity/Provider';
import { getAccessKey, verifyAccessToken } from '../../src/service/jwt';
import { getActiveProvider } from '../../src/service/provider.service';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});
const getActiveProviderMock = mocked(getActiveProvider);

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

describe('Verify access token', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();

    process.env.JWT_SECRET = 'some_secret';
  });

  it('Should throw error for missing Authorization header', async () => {
    const req = getMockReq();
    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  it('Should throw error for invalid JWT', async () => {
    const req = getMockReq({
      headers: {
        authorization: 'Bearer invalidToken',
      },
    });

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('Should go further with valid token', async () => {
    const token = jwt.sign('someHashOfAWallet', 'some_secret');

    const req = getMockReq({
      headers: {
        authorization: 'Bearer ' + token,
      },
    });

    verifyAccessToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('Get wallet address', () => {
  beforeEach(() => {
    mockClear();
    jest.clearAllMocks();
  });

  it('Should go further with valid token', async () => {
    process.env.JWT_SECRET;
    const token = jwt.sign(
      {
        data: {
          loginType: LoginType.Wallet,
          identificationValue: 'someHashOfAWallet',
        },
      },
      'some_secret'
    );

    const req = getMockReq({
      headers: {
        authorization: 'Bearer ' + token,
      },
    });

    const provider = new Provider();
    provider.id = 1;

    mocked(getActiveProvider).mockResolvedValueOnce(provider);

    await getAccessKey(req, res, next);

    expect(getActiveProvider).toHaveBeenCalledTimes(1);
    expect(getActiveProvider).toHaveBeenCalledWith(
      req.body.identificationKey,
      req.body.identificationValue
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toStrictEqual({
      loginType: LoginType.Wallet,
      identificationKey: 'walletAddressHashed',
      identificationValue: 'someHashOfAWallet',
      providerId: provider.id,
    });
  });
});
