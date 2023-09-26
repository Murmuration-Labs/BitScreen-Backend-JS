import { Request, Response } from 'express';
import { CID } from 'multiformats/cid';
import { getRepository } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Deal } from '../entity/Deal';
import { Filter } from '../entity/Filter';
import { AccountType, Provider } from '../entity/Provider';
import { Config } from '../entity/Settings';
import { getBlockedCidsForProvider, getLocalCid } from '../service/cid.service';
import { getActiveProvider } from '../service/provider.service';

export const create_cid = async (req: Request, res: Response) => {
  const {
    body: { filterId, cid, refUrl },
  } = req;

  if (!filterId) {
    return res.status(400).send({ message: 'Missing filterId' });
  }

  try {
    CID.parse(cid);
  } catch (e) {
    return res
      .status(400)
      .send({ message: `CID "${cid}" does not have a valid CIDv0/v1 format.` });
  }

  const filter = await getRepository(Filter).findOne(req.body.filterId);
  if (!filter) {
    return res
      .status(404)
      .send({ message: `Filter with id ${filterId} not found.` });
  }

  const entity = new Cid();
  entity.filters = [filter];
  entity.setCid(cid);
  entity.refUrl = refUrl;

  return res.send(await getRepository(Cid).save(entity));
};

export const edit_cid = async (request: Request, response: Response) => {
  const {
    body: { filterId, cid, refUrl, providerId },
    params: { id },
  } = request;

  if (!id || !cid || typeof refUrl !== 'string') {
    return response.status(400).send({
      message: 'Invalid request',
    });
  }

  try {
    CID.parse(cid);
  } catch (e) {
    return response.status(400).send({
      message: `CID "${cid}" does not have a valid CIDv0/v1 format.`,
    });
  }

  const cidId = parseInt(id);

  const filter = await getRepository(Filter).findOne(filterId, {
    relations: ['cids', 'provider'],
  });

  if (!filter || filter.provider.id !== providerId) {
    return response.status(403).send({
      message: `The filter list you are trying to edit does not belong to you or does not exist.`,
    });
  }

  if (!filter.cids.map((e) => e.id).includes(cidId)) {
    return response.status(400).send({
      message: `The filter list you are trying to edit does not contain the edited cid.`,
    });
  }

  const filters = await getRepository(Filter)
    .createQueryBuilder('f')
    .innerJoinAndSelect('f.cids', 'cids')
    .where('cids.id IN(:...ids)', { ids: [cidId] })
    .getMany();

  const filterToUpdate = filters.find((e) => e.id === filterId);

  if (filters.length > 1) {
    const newCid = new Cid();
    newCid.setCid(cid);
    newCid.refUrl = refUrl;

    const savedCid = await getRepository(Cid).save(newCid);

    filterToUpdate.cids = [
      ...filterToUpdate.cids.filter((e) => e.id !== cidId),
      savedCid,
    ];

    await getRepository(Filter).save(filterToUpdate);
  } else {
    const existingCid = await getRepository(Cid).findOne({
      cid,
    });

    if (existingCid) {
      filterToUpdate.cids = [
        ...filterToUpdate.cids.filter((e) => e.id !== cidId),
        existingCid,
      ];
      await getRepository(Filter).save(filterToUpdate);

      await getRepository(Cid).delete({
        id: cidId,
      });
    } else {
      await getRepository(Cid).update(cidId, {
        cid,
      });
    }
  }

  return response.status(200).send();
};

export const cid_conflict = async (req, res) => {
  const {
    body: { identificationKey, identificationValue },
    query: { filterId, cid },
  } = req;

  let {
    query: { isException },
  } = req;

  isException = Boolean(parseInt(isException));

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return res.status(404).send({ message: 'Provider not found.' });
  }

  const _filterId =
    typeof filterId === 'string'
      ? parseInt(filterId)
      : typeof filterId === 'number'
      ? filterId
      : null;
  const _cid = typeof cid === 'string' ? cid.toLowerCase() : null;

  switch (true) {
    case typeof _filterId !== 'number':
      return res
        .status(400)
        .send({ message: 'Please provide a valid filterId' });
    case typeof _cid !== 'string':
      return res.status(400).send({ message: 'Please provide a valid cid' });
  }

  const local = await getLocalCid(_filterId, provider.id, _cid, isException);

  return res.send(local);
};

export const delete_cid = async (request: Request, response: Response) => {
  const id = parseInt(request.params.id);

  const cid = await getRepository(Cid).findOne(id, { relations: ['deals'] });

  if (cid.deals.length > 0) {
    await getRepository(Deal).delete(cid.deals.map((deal) => deal.id));
  }

  await getRepository(Cid).delete({ id });

  response.send({});
};

export const get_blocked_cids = async (
  request: Request,
  response: Response
) => {
  const {
    body: { identificationKey, identificationValue },
    query: { download },
  } = request;

  const provider = await getActiveProvider(
    identificationKey,
    identificationValue
  );

  if (!provider) {
    return response.status(404).send({ message: 'Provider not found.' });
  }

  if (provider.accountType !== AccountType.NodeOperator) {
    return response.status(404).send({
      message: 'Provider has to be of type Node Operator to import filters!',
    });
  }

  const config = await getRepository(Config).findOne({
    provider: provider,
  });

  if (!config) {
    return response.status(404).send({ message: 'Config not found.' });
  }

  if (!JSON.parse(config.config).bitscreen) {
    return response.send({
      filecoinCids: [],
      ipfsCids: [],
    });
  }

  const blockedCids = await getBlockedCidsForProvider(provider.id);
  if (!download) {
    provider.lastUpdate = new Date();
    await getRepository(Provider).save(provider);
  }

  if (download) {
    response.setHeader(
      'Content-disposition',
      'attachment; filename=cid_list.json'
    );
    response.setHeader('Content-type', 'application/json');
    await response.write(JSON.stringify(blockedCids));
    response.end();

    return response;
  }

  return response.send(blockedCids);
};
