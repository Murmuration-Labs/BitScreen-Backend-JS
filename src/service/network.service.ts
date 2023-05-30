import { Network } from '../entity/Network';
import { getRepository } from 'typeorm';

export const getAllNetworks = () => {
  return getRepository(Network).find();
};
