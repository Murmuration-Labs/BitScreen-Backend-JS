import {Request, Response} from "express";
import {getRepository} from "typeorm";
import {Filter} from "../entity/Filter";
import {Cid} from "../entity/Cid";
import {
    getBlockedCidsForProvider,
    getLocalCidCount,
    getRemoteCidCount
} from "../service/cid.service";
import {Provider} from "../entity/Provider";

export const create_cid = async (req: Request, res: Response) => {
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
}

export const edit_cid = async (request: Request, response: Response) => {
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

export const move_cid = async (request: Request, response: Response) => {
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

export const cid_override = async (req, res) => {
    const {
        query: { filterId, cid, providerId },
    } = req;

    const _filterId =
        typeof filterId === 'string' ? parseInt(filterId) : typeof filterId === 'number' ? filterId : null;
    const _cid = typeof cid === 'string' ? cid.toLowerCase() : null;
    const _providerId =
        typeof providerId === 'string' ? parseInt(providerId) : typeof providerId === 'number' ? providerId : null;

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

    const local = await getLocalCidCount(_filterId, _providerId, _cid)
    const remote = await getRemoteCidCount(_filterId, _providerId, _cid)

    return res.send({ local, remote });
}

export const delete_cid = async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);

    await getRepository(Cid).delete({
        id,
    });

    response.send({});
}

export const get_blocked_cids = async (request: Request, response: Response) => {
    const {
        body: {walletAddressHashed},
        query: {download}
    } = request;

    const provider = await getRepository(Provider).findOne({walletAddressHashed})

    if (!provider) {
        return response.status(404).send({message: "Provider not found."})
    }

    const blockedCids = await getBlockedCidsForProvider(provider.id)

    if (download) {
        response.setHeader('Content-disposition', 'attachment; filename=cid_list.json')
        response.setHeader('Content-type', 'application/json')
        await response.write(JSON.stringify(blockedCids))
        response.end()

        return response
    }

    return response.send(blockedCids)
}
