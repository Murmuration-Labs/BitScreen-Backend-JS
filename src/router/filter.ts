import * as express from "express";
import {Request, Response} from "express";
import {getRepository} from "typeorm";
import {Filter} from "../entity/Filter";
import {Provider} from "../entity/Provider";
import {generateRandomToken} from "../service/crypto";
import {Cid} from "../entity/Cid";

const filterRouter = express.Router();

filterRouter.get('/', async (request: Request, response: Response) => {
    if (!request.query.provider) {
        response.status(400).send({});
    }

    const provider = await getRepository(Provider).findOne({
        id: parseInt(request.query.provider as string),
    });

    if (!provider) {
        response.status(404).send({});
    }

    const filters = await getRepository(Filter).find({
        where: {
            provider,
        },
        relations: [
            'cids',
        ]
    });

    response.send(filters);
});

filterRouter.get('/:id', async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);

    const filter = await getRepository(Filter).findOne(id, {
        relations: [
            'cids',
        ],
    });

    response.send(filter);
});

filterRouter.post('/', async (request: Request, response: Response) => {
    const data = request.body;
    if (!data.provider) {
        response.status(400).send({});
        return;
    }

    const provider = await getRepository(Provider).findOne(data.provider);

    if (!provider) {
        response.status(404).send({});
    }

    const filter = new Filter();

    filter.name = data.name;
    filter.description = data.description;
    filter.override = data.override;
    filter.visibility = data.visibility;
    filter.provider = provider;

    console.log('cids is', filter.cids);

    // generate shareId
    let shareId, existing;
    do {
        shareId = await generateRandomToken(4);
        existing = await getRepository(Filter).findOne({
            shareId,
        });
    } while (existing);

    console.log('share id is', shareId);

    filter.shareId = shareId;

    await getRepository(Filter).save(filter);

    await Promise.all(data.cids.map(x => {
        const cid = new Cid();

        cid.cid = x.cid;
        cid.refUrl = x.refUrl;
        cid.filter = filter;

        return getRepository(Cid).save(cid);
    }));

    response.send(filter);
});


filterRouter.delete('/:id', async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);

    await getRepository(Filter).delete({
        id,
    });

    response.send({});
});

export default filterRouter;
