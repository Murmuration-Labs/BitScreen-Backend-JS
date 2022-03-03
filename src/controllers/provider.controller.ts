import {Request, Response} from "express";
import {getRepository} from "typeorm";
import {Provider} from "../entity/Provider";
import {getAddressHash} from "../service/crypto";
import * as ethUtil from "ethereumjs-util";
import * as sigUtil from "eth-sig-util";
import * as jwt from "jsonwebtoken";
import {serverUri} from "../config";
import {v4} from 'uuid';
import {Cid} from "../entity/Cid";
import {Provider_Filter} from "../entity/Provider_Filter";
import {Filter} from "../entity/Filter";
import {Config} from "../entity/Settings";
import {Deal} from "../entity/Deal";
import * as archiver from "archiver";
import {Sources, Visibility} from "../entity/enums";
import { addTextToNonce } from "../service/provider.service";
import {Complaint} from "../entity/Complaint";

export const provider_auth = async (request: Request, response: Response) => {
    const {
        params: { wallet },
        body: { signature, source },
    } = request;

    switch (true) {
        case !signature || !wallet: {
            return response.status(400).send({
                error: 'Request should have signature and wallet',
            });
        }
    }

    const provider = await getRepository(Provider).findOne({
        walletAddressHashed: getAddressHash(wallet as string),
    });

    if (!provider) {
        return response
            .status(400)
            .send({ error: 'User does not exist in our database.' });
    }

    const msgBufferHex = ethUtil.bufferToHex(Buffer.from(addTextToNonce(provider.nonce, wallet.toLocaleLowerCase())));
    const address = sigUtil.recoverPersonalSignature({
        data: msgBufferHex,
        sig: signature,
    });

    if (
        getAddressHash(address.toLowerCase()) !== provider.walletAddressHashed
    ) {
        return response
            .status(401)
            .send({ error: 'Unauthorized access. Signatures do not match.' });
    }

    provider.nonce = v4();
    if (!provider.rodeoConsentDate && source === Sources.Rodeo) {
        provider.rodeoConsentDate = (new Date()).toISOString();
    }
    if (!provider.consentDate && (!source || source === Sources.Bitscreen)) {
        provider.consentDate = (new Date()).toISOString();
    }

    await getRepository(Provider).save(provider);

    return response.status(200).send({
        ...provider,
        walletAddress: wallet,
        accessToken: jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
            data: provider.walletAddressHashed,
        }, process.env.JWT_SECRET
        ),
    });
}

export const get_by_wallet = async (request: Request, response: Response) => {
    const {
        params: { wallet },
    } = request;
    if (typeof wallet === 'undefined') {
        return response.status(400).send({ message: 'Missing wallet' });
    }

    const provider = await getRepository(Provider).findOne({
        walletAddressHashed: getAddressHash(wallet),
    });
    
    const responseObject = provider ? {
        ...provider,
        nonceMessage: addTextToNonce(provider.nonce, wallet.toLocaleLowerCase())
    } : null;

    return response.send(responseObject);
}

export const edit_provider = async (request: Request, response: Response) => {
    const {
        body: { createTs, updateTs, walletAddress, accessToken, ..._provider },
    } = request;

    if (typeof walletAddress === 'undefined') {
        return response.status(400).send({ message: 'Missing wallet' });
    }

    const provider = await getRepository(Provider).findOne({
        walletAddressHashed: getAddressHash(walletAddress),
    });

    if (!provider) {
        return response
            .status(404)
            .send({ message: 'Tried to update nonexistent provider' });
    }

    const updated = getRepository(Provider).update(
        { id: provider.id },
        {
            ..._provider,
        }
    );

    return response.send(updated);
}

export const create_provider = async (request: Request, response: Response) => {
    const {
        params: { wallet },
        query: { source }
    } = request;

    if (!wallet) {
        return response.status(400).send({ message: 'Missing wallet' });
    }

    const walletAddressHashed = getAddressHash(wallet.toLowerCase());

    const exists = await getRepository(Provider).findOne({
        where: { walletAddressHashed },
    });

    if (exists) {
        return response.status(400).send({ message: 'Provider already exists' });
    }

    const provider = new Provider();
    provider.walletAddressHashed = walletAddressHashed;
    provider.nonce = v4();
    if (!source || source === Sources.Bitscreen) {
        provider.consentDate = (new Date()).toISOString();
    } else if (source === Sources.Rodeo) {
        provider.rodeoConsentDate = (new Date()).toISOString();
    }
    provider.guideShown = false;

    const saved = await getRepository(Provider).save(provider);

    return response.send({
        nonceMessage: addTextToNonce(saved.nonce, wallet.toLocaleLowerCase()),
        walletAddress: wallet,
        consentDate: saved.consentDate,
        rodeoConsentDate: saved.rodeoConsentDate
    });
}

export const delete_provider = async (request: Request, response: Response) => {
    const {
      params: { wallet },
      body: { walletAddressHashed },
    } = request;

    const loggedProvider = await getRepository(Provider).findOne({walletAddressHashed});
    const provider = await getRepository(Provider)
      .findOne(
        {walletAddressHashed: getAddressHash(wallet)},
        {relations: ['filters', 'deals', 'provider_Filters', 'filters.cids', 'filters.provider_Filters', 'filters.provider']}
      );

    if (!provider || !loggedProvider || provider.id !== loggedProvider.id) {
        return response.status(403).send({ message: 'You are not allowed to delete this account.' });
    }

    let cidIds = [];
    let providerFilterIds = [];
    const filterIds = [];
    const dealIds = provider.deals.map(deal => deal.id);

    for (const filter of provider.filters) {
        if (filter.provider.id !== provider.id) {
            continue;
        }
        filterIds.push(filter.id);
        cidIds = cidIds.concat(filter.cids.map(cid => cid.id));
        providerFilterIds = providerFilterIds.concat(filter.provider_Filters.map(pf => pf.id));
    }

    for (const providerFilter of provider.provider_Filters) {
        if (!providerFilterIds.includes(providerFilter.id)) {
            providerFilterIds.push(providerFilter.id);
        }
    }

    const config = await getRepository(Config).findOne({
        where: {
            provider,
        },
    });

    if (dealIds.length) {
        await getRepository(Deal).delete(dealIds);
    }

    if (cidIds.length) {
        await getRepository(Cid).delete(cidIds);
    }

    if (providerFilterIds.length) {
        await getRepository(Provider_Filter).delete(providerFilterIds);
    }

    if (filterIds.length) {
        await getRepository(Filter).delete(filterIds);
    }

    await getRepository(Config).delete(config.id);
    await getRepository(Provider).delete(provider.id);

    return response.send({success: true});
}

export const delete_rodeo_data = async (request: Request, response: Response) => {
    const {
        params: { wallet },
        body: { walletAddressHashed },
    } = request;

    const loggedProvider = await getRepository(Provider).findOne({walletAddressHashed});
    const provider = await getRepository(Provider)
      .findOne(
        {walletAddressHashed: getAddressHash(wallet)},
        {relations: ['complaints']}
      );

    if (!provider || !loggedProvider || provider.id !== loggedProvider.id) {
        return response.status(403).send({ message: 'You are not allowed to delete this account.' });
    }

    for (const complaint of provider.complaints) {
        complaint.assessor = null;
        await getRepository(Complaint).save(complaint);
    }

    provider.rodeoConsentDate = null;

    await getRepository(Provider).save(provider);

    return response.send({success: true});
}

export const export_provider = async (request: Request, response: Response) => {
    const {
        body: { walletAddressHashed },
    } = request;
    const arch = archiver('tar');

    let provider = await getRepository(Provider).findOne({walletAddressHashed});
    arch.append(JSON.stringify(provider, null, 2), { name: 'account_data.json'});

    provider = await getRepository(Provider)
      .findOne(
        {walletAddressHashed: walletAddressHashed},
        {relations: ['filters', 'deals', 'provider_Filters', 'provider_Filters.filter',
                'provider_Filters.filter.provider', 'filters.cids', 'filters.provider_Filters',
                'filters.provider', 'filters.provider_Filters.provider']}
      );

    for (const filter of provider.filters) {
        if (filter.isOrphan()) {
            continue;
        }

        let directory = 'other_lists';
        let fileName = `${filter.shareId}.json`;
        switch (filter.visibility) {
            case Visibility.Private:
                directory = 'private_lists';
                break;
            case Visibility.Public:
                directory = 'public_lists';
                break;
            case Visibility.Shared:
                directory = 'shared_lists';
                break;
            case Visibility.Exception:
                directory = 'exception_lists';
                break;
        }
        const url = `${serverUri()}/filters/edit/${filter.shareId}`;
        arch.append(JSON.stringify({...filter, url}, null, 2), { name: `${directory}/${fileName}`});
    }

    for (const providerFilter of provider.provider_Filters) {
        if (providerFilter.filter.provider.id !== provider.id) {
            const url = `${serverUri()}/directory/details/${providerFilter.filter.shareId}`;
            arch.append(JSON.stringify({...providerFilter.filter, url}, null, 2), { name: `imported_lists/${providerFilter.filter.shareId}`});
        }
    }

    arch.on("end", () => response.end());

    response.attachment('test.tar').type('tar');
    arch.pipe(response);
    arch.finalize();
}

export const export_rodeo_data = async (request: Request, response: Response) => {
    const {
        body: {walletAddressHashed},
    } = request;
    const arch = archiver('tar');

    let provider = await getRepository(Provider).findOne({walletAddressHashed}, {relations: ['complaints']});
    arch.append(JSON.stringify(provider, null, 2), { name: 'account_data.json'});

    for (const complaint of provider.complaints) {
        arch.append(
          JSON.stringify(complaint, null, 2),
          { name: `reviewed_complaints/complaint_${complaint._id}`}
        );
    }

    arch.on("end", () => response.end());
    response.attachment('rodeo_export.tar').type('tar');
    arch.pipe(response);
    arch.finalize();
}
