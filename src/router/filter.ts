import * as express from 'express';
import { Request, Response } from 'express';
import { getManager, getRepository } from 'typeorm';
import { Filter } from '../entity/Filter';
import { Provider } from '../entity/Provider';
import { generateRandomToken } from '../service/crypto';
import { Cid } from '../entity/Cid';

const filterRouter = express.Router();

filterRouter.get('/', async (request: Request, response: Response) => {
  if (!request.query.provider) {
    return response.status(400).send({});
  }

  const provider = await getRepository(Provider).findOne({
    id: parseInt(request.query.provider as string),
  });

  if (!provider) {
    return response.status(404).send({});
  }

  const filters = await getRepository(Filter).find({
    where: {
      provider,
    },
    relations: ['cids'],
  });

  response.send(filters);
});

filterRouter.get('/search', async (req, res) => {
  const {
    query: { q },
  } = req;

  const filters = await getRepository(Filter).find({
    relations: ['cids'],
  });

  const query = !q ? null : (q as string).toLowerCase();

  return res.send(
    !query
      ? filters
      : filters.filter(({ name, description, shareId, provider, cids }) => {
          return (
            name.toLowerCase().indexOf(query) > -1 ||
            description.toLowerCase().indexOf(query) > -1 ||
            shareId.toLowerCase().indexOf(query) > -1 ||
            // provider conditions might come in handy here
            cids.reduce(
              (acc, cid) =>
                acc ||
                cid.cid.toLowerCase().indexOf(query) > -1 ||
                cid.refUrl.toLowerCase().indexOf(query) > -1,
              false
            )
          );
        })
  );
});

filterRouter.get('/:id', async (request: Request, response: Response) => {
  const id = parseInt(request.params.id);

  const filter = await getRepository(Filter).findOne(id, {
    relations: ['cids'],
  });

  response.send(filter);
});

filterRouter.put('/:id', async (req, res) => {
  const {
    body: { updated, created, cids, ...updatedFilter },
    params: { id },
  } = req;

  console.log(id);
  if (!id) {
    return res
      .status(400)
      .send({ message: 'Please provide and ID for the filter to be updated' });
  }

  const _id = id as string;

  await getRepository(Filter)
    .update(_id, updatedFilter)
    .catch((err) => res.status(500).send(err));

  //   const manager = getManager();

  //   console.log(cids.map(({ id }) => id).filter((e) => e));

  //   const exists = await manager
  //     .createQueryBuilder(Cid, 'cid')
  //     .where('cid.id IN (:ids)', {
  //       ids: cids.map(({ id }) => id).filter((e) => e),
  //     })
  //     .getMany();

  //   const existIds = exists.reduce((acc, { id }) => ({ ...acc, [id]: true }), {});

  //   const filter = await getRepository(Filter).findOne(_id);

  //   await Promise.all(
  //     cids.map(({ id, cid, refUrl }) => {
  //       const obj = { cid, refUrl, filter: filter };

  //       return existIds[id]
  //         ? getRepository(Cid).update(id, obj)
  //         : getRepository(Cid).save(obj);
  //     })
  //   );

  res.send(await getRepository(Filter).findOne(_id));
});

filterRouter.post('/', async (request: Request, response: Response) => {
  const data = request.body;
  if (typeof data.providerId !== 'number') {
    return response.status(400).send({});
  }

  const provider = await getRepository(Provider).findOne(data.providerId);

  if (!provider) {
    return response.status(404).send({});
  }

  const filter = new Filter();

  filter.name = data.name;
  filter.description = data.description;
  filter.override = data.override;
  filter.visibility = data.visibility;
  filter.provider = provider;

  console.log('cids is', filter.cids);

  // generate shareId
  let shareId: string, existing: Filter;
  do {
    shareId = await generateRandomToken(4);
    existing = await getRepository(Filter).findOne({
      shareId,
    });
  } while (existing);

  console.log('share id is', shareId);

  filter.shareId = shareId;

  await getRepository(Filter).save(filter);

  await Promise.all(
    data.cids.map((x) => {
      const cid = new Cid();

      cid.cid = x.cid;
      cid.refUrl = x.refUrl;
      cid.filter = filter;

      return getRepository(Cid).save(cid);
    })
  );

  response.send(filter);
});

filterRouter.delete('/:id', async (request: Request, response: Response) => {
  const {
    params: { id },
  } = request;

  await getRepository(Cid).delete({
    filter: {
      id: parseInt(id),
    },
  });
  await getRepository(Filter).delete(parseInt(id));

  return response.send({});
});

export default filterRouter;
