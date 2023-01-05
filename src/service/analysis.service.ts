import {
  getRepository,
} from 'typeorm';
import { producer } from '../kafka'
import { Cid } from '../entity/Cid'

export const queue_analysis = async (cid: string) => {
  const relatedCid = await getRepository(Cid).findOne({ where: { cid }, relations: ['cidAnalysis'] });

  if (!relatedCid) {
    const newCid = new Cid();
    newCid.setCid(cid);
    await getRepository(Cid).save(newCid);
  }

  if (relatedCid?.cidAnalysis.length > 0) {
    return 'existingAnalysisFound'
  }

  try {
    await producer.send({
      topic: process.env.KAFKA_RETRIEVE_INPUT,
      messages: [
        {
          key: 'new-cid',
          value: cid
        }
      ]
    })
    return 'cidQueued'
  } catch (e) {
    return `could not queue cid because of ${e}`
  }
}
