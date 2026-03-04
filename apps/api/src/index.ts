import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { initDB } from './db';
import paymentRoutes from './routes/payment';
import instanceRoutes from './routes/instances';
import { attachTerminalWs } from './routes/terminal';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/instances', instanceRoutes);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

async function main() {
    try {
        await initDB();
        const server = http.createServer(app);

        // Attach WebSocket terminal handler
        attachTerminalWs(server);

        server.listen(PORT, () => {
            console.log(`🚀 BabyAgi3 Host API running on port ${PORT}`);
            console.log(`🖥️  WebSocket terminal available at ws://localhost:${PORT}/api/terminal/:instanceId`);
        });
    } catch (err) {
        console.error('Failed to start:', err);
        process.exit(1);
    }
}

main();

