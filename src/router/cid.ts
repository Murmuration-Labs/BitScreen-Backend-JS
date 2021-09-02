import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Filter } from '../entity/Filter';
import { verifyAccessToken } from '../service/jwt';

const cidRouter = express.Router();

cidRouter.post('/', verifyAccessToken, async (req: Request, res: Response) => {
  const {
    body: { filterId, cid, refUrl },
  } = req;

  if (!filterId) {
    return res.status(400).send({ message: 'Missing filterId' });
  }

  const filter = await getRepository(Filter).findOne(req.body.filterId);
  if (!filter) {
    return res
      .status(404)
      .send({ message: `Filter with id ${filterId} not found.` });
  }

  const entity = new Cid();
  entity.filter = filter;
  entity.cid = cid;
  entity.refUrl = refUrl;

  return res.send(await getRepository(Cid).save(entity));
});

cidRouter.put(
  '/:id',
  verifyAccessToken,
  async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);
    const cid = await getRepository(Cid).findOne(id, { relations: ['filter'] });
    cid.cid = request.body.cid;
    cid.refUrl = request.body.refUrl;

    if (request.body.filterId && cid.filter.id !== request.body.filterId) {
      cid.filter = await getRepository(Filter).findOne(request.body.filterId);
    }

    await getRepository(Cid).save(cid);

    response.send(cid);
  }
);

cidRouter.post(
  '/:id/move/:toFilterId',
  verifyAccessToken,
  async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);
    const filterId = parseInt(request.params.toFilterId);

    const cid = await getRepository(Cid).findOne(id, { relations: ['filter'] });
    const filter = await getRepository(Filter).findOne(filterId);

    if (!cid || !filter) {
      response.status(404).send({});
      return;
    }

    cid.filter = filter;
    await getRepository(Cid).save(cid);

    response.send(cid);
  }
);

cidRouter.get('/override', verifyAccessToken, async (req, res) => {
  const {
    query: { filterId, cid, providerId },
  } = req;

  const _filterId = typeof filterId === 'string' ? parseInt(filterId) : null;
  const _cid = typeof cid === 'string' ? cid.toLowerCase() : null;
  const _providerId =
    typeof providerId === 'string' ? parseInt(providerId) : null;

  switch (true) {
    case typeof _filterId !== 'number':
      return res
        .status(400)
        .send({ message: 'Please provide a valid filterId' });
    case typeof _cid !== 'string':
      return res.status(400).send({ message: 'Please provide a valid cid' });
    case typeof _providerId !== 'number':
      return res
        .status(400)
        .send({ message: 'Please provide a valid providerId' });
  }

  const local = await getRepository(Filter)
    .createQueryBuilder('f')
    .where('f.id <> :_filterId', { _filterId })
    .andWhere('f.provider.id = :_providerId', { _providerId })
    .andWhere(
      `
    exists (
      select 1 from cid 
      where cid."filterId" = f.id 
      and cid.cid like :_cid 
    )
    `,
      { _cid }
    )
    .getCount();

  const remote = await getRepository(Filter)
    .createQueryBuilder('f')
    .where('f.id <> :_filterId', { _filterId })
    .andWhere('f.provider.id <> :_providerId', { _providerId })

    .andWhere(
      `
  exists (
    select 1 from provider_filter p_v
    where p_v."providerId" = :_providerId
    and p_v."filterId" = f.id
  )
  `,
      { _providerId }
    )
    .andWhere(
      `
    exists (
      select 1 from cid 
      where cid."filterId" = f.id 
      and cid.cid like :_cid 
    )
    `,
      { _cid }
    )
    .getCount();

  return res.send({ local, remote });
});

cidRouter.delete(
  '/:id',
  verifyAccessToken,
  async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);

    await getRepository(Cid).delete({
      id,
    });

    response.send({});
  }
);

export default cidRouter;
