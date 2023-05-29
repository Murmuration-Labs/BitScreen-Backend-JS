import { faker } from '@faker-js/faker';
import { define } from 'typeorm-seeding';
import { Network } from '../../entity/Network';
import { NetworkType } from '../../entity/interfaces';

define(
  Network,
  (fakerGenerator: typeof faker, context: { networkType: NetworkType }) => {
    const { networkType } = context;

    const network = new Network();
    network.networkType = networkType;
    network.created = new Date();

    return network;
  }
);
