import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler } from './middleware/errorHandler.js';
import businessesRouter from './routes/businesses.js';
import emailsRouter from './routes/emails.js';
import offersRouter from './routes/offers.js';
import queriesRouter from './routes/queries.js';
import queryResultsRouter from './routes/queryResults.js';
import notificationsRouter from './routes/notifications.js';
import campaignsRouter from './routes/campaigns.js';
import ownerProfileRouter from './routes/ownerProfile.js';
import webhooksRouter from './routes/webhooks.js';
import publicRouter from './routes/public.js';
import uploadsRouter from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/businesses', businessesRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/queries', queriesRouter);
app.use('/api/query-results', queryResultsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/owner-profile', ownerProfileRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/public', publicRouter);
app.use('/api/uploads', uploadsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Carbonelle CRM backend running on port ${PORT}`));
