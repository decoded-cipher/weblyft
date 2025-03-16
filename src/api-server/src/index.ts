
import dotenv from 'dotenv';

import express, { Application, Request, Response, NextFunction } from 'express';
import routes from './routes';

dotenv.config();
const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(routes);

const { connectRabbitMQ } = require('./config/rabbitmq');
connectRabbitMQ();

const { initKafkaConsumer } = require('./config/kafka-clickhouse');
initKafkaConsumer();


app.use((req: Request, res: Response, next: NextFunction) => {
	res.status(404).json({
		status: 404,
		message: 'Resource not found'
	});
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	res.status(500).json({
		status: 500,
		message: 'Internal server error'
	});
});

app.listen(process.env.PORT, () => {
	console.log(`--- API Server started on port ${process.env.PORT}`)
});
