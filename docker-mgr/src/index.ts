
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


app.listen(process.env.PORT, () => {
  console.log(`\n--- Docker Manager started on port ${process.env.PORT}`);
});
