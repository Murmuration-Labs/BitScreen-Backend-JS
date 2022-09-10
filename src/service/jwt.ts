import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import { Assessor } from '../entity/Assessor';

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
          message: 'Your token has expired. Please login again!',
        });
      }
      return response.status(401).send({
        message: 'Your token is invalid. Please login again!',
      });
    }

    next();
  });
};

export const getWalletAddressHashed = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { authorization } = request.headers;
  const tokenParts = authorization.split(' ');
  const accessToken = tokenParts[1];

  const decodedJwt: jwt.JwtPayload = jwt.decode(accessToken) as jwt.JwtPayload;
  const walletAddress = decodedJwt.data ? decodedJwt.data : decodedJwt;

  request.body.walletAddressHashed = walletAddress;

  next();
};

export const getAssessor = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  if (!request.body.walletAddressHashed) {
    next();
  }

  const assessor = await getRepository(Assessor).findOne({
    walletAddressHashed: request.body.walletAddressHashed,
  });
  request.body.assessor = assessor;

  next();
};
