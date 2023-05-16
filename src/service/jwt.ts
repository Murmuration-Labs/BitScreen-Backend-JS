import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { LoginType } from '../entity/Provider';
import { getActiveProvider } from './provider.service';

export const verifyAccessToken = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  if (!request.headers.authorization) {
    return response.status(401).end();
  }

  const { authorization } = request.headers;
  const tokenParts = authorization.split(' ');
  const accessToken = tokenParts[1]; // [0] is "Bearer"

  jwt.verify(accessToken, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return response.status(401).send({
          message: 'Your token has expired. Please relog!',
        });
      }
      return response.status(401).send({
        message: 'Your token is invalid. Please relog!',
      });
    }

    next();
  });
};

export const getAccessKey = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { authorization } = request.headers;
  const tokenParts = authorization.split(' ');
  const accessToken = tokenParts[1];

  const decodedJwt: jwt.JwtPayload = jwt.decode(accessToken) as jwt.JwtPayload;
  const decodedObject = decodedJwt.data ? decodedJwt.data : decodedJwt;
  const { loginType, identificationValue } = decodedObject;

  request.body.identificationKey =
    loginType === LoginType.Email ? 'loginEmail' : 'walletAddressHashed';
  request.body.identificationValue = identificationValue;
  request.body.loginType = loginType;

  const provider = await getActiveProvider(
    request.body.identificationKey,
    request.body.identificationValue
  );

  if (!provider) {
    return response.status(401).send({
      message: 'Your token is invalid. Please relog!',
    });
  }

  request.body.providerId = provider.id;

  next();
};
