import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

export const veriyAccessToken = (
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

  jwt.verify(accessToken, JWT_SECRET, (err, payload) => {
    if (err) {
      return response.status(401).end();
    }

    next();
  });
};
