
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Kafka } from 'kafkajs';
import { createClient } from '@clickhouse/client';



// Create a ClickHouse client
const clickhouseClient = createClient({
    url: process.env.CLICKHOUSE_URL
});



// Create a Kafka instance
const kafka = new Kafka({
    clientId: 'api-server',
    brokers: [process.env.KAFKA_BROKERS],
});

// Create a Kafka consumer
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });



// Function to process each message
const processMessage = async (message: any) => {
    const { project_id, deployment_id, log } = JSON.parse(message.value.toString());
    console.log(`--- PROJECT_ID: ${project_id}, DEPLOYMENT_ID: ${deployment_id}, LOG: ${log}`);

    try {
        const { query_id } = await clickhouseClient.insert({
            table: 'log_events',
            values: [{
                event_id: uuidv4(),
                project_id: project_id,
                deployment_id: deployment_id,
                log: log
            }],
            format: 'JSONEachRow'
        });

        console.log(`--- Inserted log event with query_id: ${query_id}`);
    } catch (error) {
        console.error('--- Error inserting log event:', error);
    }
};



// Initialize the Kafka consumer
export const initKafkaConsumer = async () => {
    try {
        await consumer.connect().then(() => {
            console.log('--- Kafka consumer connected');
        });

        await consumer.subscribe({ topic: process.env.KAFKA_TOPIC });

        await consumer.run({
            autoCommit: false,
            eachBatch: async ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) => {

                const messages = batch.messages;
                console.log(`\n--- Received ${messages.length} messages...`);

                for (const message of messages) {
                    await processMessage(message);
                    resolveOffset(message.offset);
                    commitOffsetsIfNecessary(message.offset);
                    await heartbeat();
                }

            }
        });
    } catch (error) {
        console.error('--- Error initializing Kafka consumer:', error);
    }
};



export const disconnect = async () => {
    try {
        await consumer.disconnect();
    } catch (error) {
        console.error('--- Error disconnecting Kafka consumer:', error);
    }
};