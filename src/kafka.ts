import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'cid-monitor',
  brokers: [process.env.KAFKA_BROKER],
  ssl: false,
});

export const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionTimeout: 30000,
});
