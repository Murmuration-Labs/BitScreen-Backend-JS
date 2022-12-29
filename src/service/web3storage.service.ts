import { Service, Web3Storage } from 'web3.storage';

export const web3Storage = new Web3Storage({
  token: process.env.WEB3_STORAGE_TOKEN,
} as Service);

export const getDealsByCid = async (cid: string) => {
  try {
    const status = await web3Storage.status(cid);
    if (status && status.deals) {
      return status.deals;
    }
  } catch (e: any) {
    console.error(`retrieving web3Storage status for cid ${cid}: ${e.toString()}`)
  }

  return [];
};
