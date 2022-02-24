import {Request, Response} from "express";
import * as IPFS from 'ipfs-core'
import all = require("it-all");

export const get_ipfs_file = async (request: Request, response: Response) => {
  const {
    params: { cid },
  } = request;

  const ipfs = await IPFS.create();
  // @ts-ignore
  const data = Buffer.concat(await all(ipfs.files.read('/ipfs/'+cid)));
  return response.send(data);
}
