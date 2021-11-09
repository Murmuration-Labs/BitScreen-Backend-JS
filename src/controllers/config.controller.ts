import {Request, Response} from "express";
import {getRepository} from "typeorm";
import {Provider} from "../entity/Provider";
import {Config} from "../entity/Settings";

export const get_config = async (req: Request, res: Response) => {
    const {
        body: { walletAddressHashed },
    } = req;

    const provider = await getRepository(Provider).findOne({walletAddressHashed});

    if (!provider) {
        return res.status(404).send({
            message: 'Provider not found!'
        });
    }

    const config = await getRepository(Config).findOne({
        where: {
            provider,
        },
    });

    if (!config) {
        return res.status(404).send({});
    }

    return res.send({ id: config.id, ...JSON.parse(config.config) });
}

export const save_config = async (req: Request, res: Response) => {
    const {
        body: { walletAddressHashed, ...config },
    } = req;

    const provider = await getRepository(Provider).findOne({walletAddressHashed: walletAddressHashed});

    if (!provider) {
        return res.status(404).send({
            message: 'Provider not found!'
        });
    }

    if (Object.keys(config).length === 0) {
        return res.status(400).send({ message: 'Empty config not allowed.' });
    }

    const existingConfig = await getRepository(Config).findOne({
        where: {
            provider,
        },
    });

    if (!existingConfig) {
        const newConfig = new Config();
        newConfig.provider = provider;
        newConfig.config = JSON.stringify(config);

        const dbConfig = await getRepository(Config).save(newConfig);
        return res.send({ id: dbConfig.id, ...JSON.parse(dbConfig.config) });
    }

    await getRepository(Config).update(existingConfig.id, {
        config: JSON.stringify(config),
    });

    return res.status(200).send({ id: existingConfig.id, ...config });
}
