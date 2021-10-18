import {Request, Response} from "express";
import {getRepository} from "typeorm";
import {Provider} from "../entity/Provider";
import {getAddressHash} from "../service/crypto";
import * as ethUtil from "ethereumjs-util";
import * as sigUtil from "eth-sig-util";
import * as jwt from "jsonwebtoken";
import {JWT_SECRET} from "../config";
import { v4 } from 'uuid';

export const provider_auth = async (request: Request, response: Response) => {
    const {
        params: { wallet },
        body: { signature },
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

    const msgBufferHex = ethUtil.bufferToHex(Buffer.from(`${provider.nonce}`));
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
    await getRepository(Provider).save(provider);

    return response.status(200).send({
        ...provider,
        walletAddress: wallet,
        accessToken: jwt.sign(
            provider.walletAddressHashed,
            JWT_SECRET // NEEDS REFACTORING ON LIVE
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

    return response.send(provider);
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

    return response.send({
        ...(await getRepository(Provider).save(provider)),
        walletAddress: wallet,
    });
}