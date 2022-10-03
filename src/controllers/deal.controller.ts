import { Request, Response } from 'express';
import { getAddressHash } from '../service/crypto';
import { getRepository } from 'typeorm';
import { Provider } from '../entity/Provider';
import { Cid } from '../entity/Cid';
import { Deal } from '../entity/Deal';
import {
  addEndInterval,
  addStartInterval,
  fillDates,
  getCidForProvider,
  getStatsBaseQuery,
  setBucketSize,
} from '../service/deal.service';
import { stat } from 'fs';

export const create_deal = async (request: Request, response: Response) => {
  const {
    body: { wallet, cid, dealType, status },
  } = request;

  const walletAddressHashed = getAddressHash(wallet.toLowerCase());
  const provider = await getRepository(Provider).findOne({
    walletAddressHashed: walletAddressHashed,
  });

  if (!provider) {
    return response.status(400).send({ message: 'Provider not found.' });
  }

  const cidEntry = await getCidForProvider(provider.id, cid);

  if (!cidEntry) {
    return response.status(400).send({
      message: "CID is not present in any of this provider's filters.",
    });
  }

  const deal = new Deal();
  deal.provider = provider;
  deal.cid = cidEntry;
  deal.type = dealType;
  deal.status = status;

  await getRepository(Deal)
    .save(deal)
    .catch((error) => {
      return response
        .status(400)
        .send({ message: error.name + ': ' + error.message });
    });

  delete deal.provider;

  return response.send(deal);
};

export const get_deal_stats = async (request: Request, response: Response) => {
  const {
    params: { bucketSize },
    query: { start, end },
    body: { identificationKey, identificationValue },
  } = request;

  const provider = await getRepository(Provider).findOne({
    [identificationKey]: identificationValue,
  });

  const statsQuery = getStatsBaseQuery(provider.id);

  if (start) {
    addStartInterval(statsQuery, start);
  }

  if (end) {
    addEndInterval(statsQuery, end);
  }

  setBucketSize(statsQuery, bucketSize);

  const result = await statsQuery.getRawMany().catch((error) => {
    return response.send(error);
  });

  const parsedResult = {};

  for (let i in result) {
    parsedResult[result[i]['key']] = result[i];
  }

  return response.send(fillDates(parsedResult, bucketSize, start, end));
};
