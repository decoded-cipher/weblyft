
import dotenv from 'dotenv';
import express, { Application } from 'express';
import bodyParser from 'body-parser';
import Routes from './routes';

dotenv.config();
const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/service/v1', Routes);

const { connectRabbitMQ } = require('./config/queue');
connectRabbitMQ();


app.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: 'Resource not found'
    });
});

app.use((req, res) => {
    res.status(500).json({
        status: 500,
        message: 'Internal server error'
    });
});

app.listen(process.env.PORT, () => {
    console.log(`--- Docker Manager started on port ${process.env.PORT}`);
});
