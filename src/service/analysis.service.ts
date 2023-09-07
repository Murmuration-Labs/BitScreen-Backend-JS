import { getRepository } from 'typeorm';
import { producer } from '../kafka';
import { Cid } from '../entity/Cid';
import { logger } from './logger';

export const queue_analysis = async (cid: string) => {
  const relatedCid = await getRepository(Cid).findOne({
    where: { cid },
    relations: ['cidAnalysis'],
  });

  if (!relatedCid) {
    logger.info(`Cid does not exist and will be created. Cid: `, cid);
    const newCid = new Cid();
    newCid.setCid(cid);
    await getRepository(Cid).save(newCid);
  }

  if (relatedCid?.cidAnalysis.length > 0) {
    logger.info(
      `Cid already exists and already contains a cid analysis. Cid: `,
      cid
    );
    return 'existingAnalysisFound';
  }

  try {
    logger.info(
      `Cid was sent to cid monitor for safer verification. Cid: `,
      cid
    );
    await producer.send({
      topic: process.env.KAFKA_RETRIEVE_INPUT,
      messages: [
        {
          key: 'new-cid',
          value: cid,
        },
      ],
    });
    return 'cidQueued';
  } catch (e) {
    console.log(e);
    console.log(JSON.stringify(e));
    console.log(Object.keys(e));
    logger.error(
      `Erorr occured while trying to send cid for safer verification. Error: `,
      e
    );
    return `could not queue cid because of ${e}`;
  }
};
