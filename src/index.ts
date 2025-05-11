import express, { Express } from 'express';
import cors from 'cors';
import authRouter from './routers/auth.router';
import serviceRouter from './routers/service.router';
import { env } from './config/env.config';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Backend is running');
});

app.use('/auth', authRouter);
app.use('/service', serviceRouter);

app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
});
