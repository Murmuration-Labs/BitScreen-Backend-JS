import {Request, Response} from "express";
import {getRepository} from "typeorm";
import {Filter} from "../entity/Filter";
import {Cid} from "../entity/Cid";
import {
    getBlockedCidsForProvider, getLocalCid
} from "../service/cid.service";
import {Provider} from "../entity/Provider";
import { CID } from "multiformats/cid";

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
        return res.status(400).send({message: `CID "${cid}" does not have a valid CIDv0/v1 format.`});
    }

    const filter = await getRepository(Filter).findOne(req.body.filterId);
    if (!filter) {
        return res
            .status(404)
            .send({ message: `Filter with id ${filterId} not found.` });
    }

    const entity = new Cid();
    entity.filter = filter;
    entity.setCid(cid);
    entity.refUrl = refUrl;

    return res.send(await getRepository(Cid).save(entity));
}

export const edit_cid = async (request: Request, response: Response) => {
    const id = parseInt(request.params.id);

    try {
        CID.parse(request.body.cid);
    } catch (e) {
        return response.status(400).send({message: `CID "${request.body.cid}" does not have a valid CIDv0/v1 format.`});
    }

    const cid = await getRepository(Cid).findOne(id, { relations: ['filter'] });
    cid.setCid(request.body.cid);
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

export const cid_conflict = async (req, res) => {
    const {
        body: { walletAddressHashed },
        query: { filterId, cid },
    } = req;

    const provider = await getRepository(Provider).findOne({walletAddressHashed})

    if (!provider) {
        return res.status(404).send({message: "Provider not found."})
    }

    const _filterId =
        typeof filterId === 'string' ? parseInt(filterId) : typeof filterId === 'number' ? filterId : null;
    const _cid = typeof cid === 'string' ? cid.toLowerCase() : null;

    switch (true) {
        case typeof _filterId !== 'number':
            return res
                .status(400)
                .send({ message: 'Please provide a valid filterId' });
        case typeof _cid !== 'string':
            return res.status(400).send({ message: 'Please provide a valid cid' });
    }

    const local = await getLocalCid(_filterId, provider.id, _cid)

    return res.send(local);
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
