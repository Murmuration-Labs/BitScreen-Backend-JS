const { Web3Storage, Web3File } = require('web3.storage');

export const web3Storage = new Web3Storage({token: process.env.WEB3_STORAGE_TOKEN})

export const getDealsByCid = async (cid: string) => {
    const status = await web3Storage.status(cid);
    if (status && status.deals) {
        return status.deals;
    }

    return [];
}