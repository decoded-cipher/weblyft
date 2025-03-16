
import * as amqp from 'amqplib';

const queues: { [key: string]: string } = {
    build_queue: 'build_queue',
};

let connection: amqp.Connection | undefined;
let channel: amqp.Channel | undefined;


// Connect to RabbitMQ
async function connectRabbitMQ(): Promise<void> {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL as string);
        connection.on('close', () => {
            console.error('--- RabbitMQ connection closed');
            setTimeout(connectRabbitMQ, 5000);
        });
        connection.on('error', (error) => {
            console.error('--- RabbitMQ connection error', error);
        });
        channel = await connection.createChannel();
        await initializeQueue(channel);
        console.log('--- Connected to RabbitMQ');
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        setTimeout(connectRabbitMQ, 5000);
    }
}


// Initialize the queues
async function initializeQueue(channel: amqp.Channel): Promise<void> {
    Object.keys(queues).forEach(async (queue: string) => {
        await channel.assertQueue(queues[queue], { durable: true });
    });
    console.log('--- Queues initialized');
}


// Send message to the queue
export async function sendToQueue(queue: string, message: any): Promise<void> {
    if (channel) {
        await channel.sendToQueue(queues[queue], Buffer.from(JSON.stringify(message)), { persistent: true });
    } else {
        console.error('--- RabbitMQ channel is not available');
    }
}


module.exports = { connectRabbitMQ, sendToQueue };