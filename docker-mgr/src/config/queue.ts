import * as amqp from 'amqplib';
import { createRunContainer } from '../helpers/container';

interface Queues {
    [key: string]: string;
}

const queues: Queues = {
    build_queue: 'build_queue',
};

let connection: amqp.Connection | undefined;
let channel: amqp.Channel | undefined;

// Connect to RabbitMQ
async function connectRabbitMQ(): Promise<void> {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL as string);
        connection.on('close', handleConnectionClose);
        connection.on('error', handleConnectionError);
        channel = await connection.createChannel();
        await initializeQueue(channel);
        console.log('--- Connected to RabbitMQ');
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        setTimeout(connectRabbitMQ, 5000);
    }
}

function handleConnectionClose(): void {
    console.error('--- RabbitMQ connection closed');
    setTimeout(connectRabbitMQ, 5000);
}

function handleConnectionError(error: any): void {
    console.error('--- RabbitMQ connection error', error);
}

// Initialize the queues
async function initializeQueue(channel: amqp.Channel): Promise<void> {
    try {
        for (const queue of Object.values(queues)) {
            await channel.assertQueue(queue, { durable: true });
        }
        console.log('--- Queues initialized');
        channel.prefetch(1);
        await consumeQueue(channel, queues);
    } catch (error) {
        console.error('Error initializing queues:', error);
    }
}

// Consume messages from the queue
async function consumeQueue(channel: amqp.Channel, queues: Queues): Promise<void> {
    if (!channel) {
        console.error('Channel is not available');
        return;
    }

    try {
        await channel.consume(queues.build_queue, async (msg) => {
            if (!msg) {
                console.warn('Received null message');
                return;
            }

            try {
                const content = JSON.parse(msg.content.toString());
                await createRunContainer(content);
                channel.ack(msg);
            } catch (error) {
                console.error('Error processing message:', error);
                channel.nack(msg, false, false); // Optionally requeue the message
            }
        });
        console.log('--- Started consuming queue');
    } catch (error) {
        console.error('Error consuming queue:', error);
    }
}

export { connectRabbitMQ };