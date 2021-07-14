import * as express from 'express';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Cid } from '../entity/Cid';
import { Filter } from '../entity/Filter';

const cidRouter = express.Router();

cidRouter.post('/', async (req: Request, res: Response) => {
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

cidRouter.put('/:id', async (request: Request, response: Response) => {
  const id = parseInt(request.params.id);
  const cid = await getRepository(Cid).findOne(id);

  cid.cid = request.body.cid;

  await getRepository(Cid).save(cid);

  response.send(cid);
});

cidRouter.post(
  '/:id/move/:toFilterId',
  async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);
    const filterId = parseInt(request.params.toFilterId);

    const cid = await getRepository(Cid).findOne(id);
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

cidRouter.delete('/:id', async (request: Request, response: Response) => {
  const id = parseInt(request.params.id);

  await getRepository(Cid).delete({
    id,
  });

  response.send({});
});

export default cidRouter;
