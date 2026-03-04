import Docker from 'dockerode';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { pool } from '../db';

const docker = new Docker({
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
});

/**
 * Attach WebSocket terminal handler to an HTTP server.
 * URL: /api/terminal/:instanceId?wallet=xxx
 */
export function attachTerminalWs(server: import('http').Server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (req: IncomingMessage, socket, head) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const match = url.pathname.match(/^\/api\/terminal\/([a-f0-9-]+)$/i);
        if (!match) return; // Not our route — let other upgrade handlers take it

        const instanceId = match[1];
        const wallet = url.searchParams.get('wallet');

        // Authenticate
        if (!wallet) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            const result = await pool.query(
                `SELECT i.container_id, u.wallet_address
                 FROM instances i JOIN users u ON u.id = i.user_id
                 WHERE i.id = $1`,
                [instanceId]
            );

            if (!result.rows[0]) {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }

            const { container_id, wallet_address } = result.rows[0];
            if (wallet_address !== wallet) {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            if (!container_id) {
                socket.write('HTTP/1.1 409 Conflict\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                handleTerminalSession(ws, container_id, instanceId);
            });
        } catch (err) {
            console.error('Terminal upgrade error:', err);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    });
}

async function handleTerminalSession(ws: WebSocket, containerId: string, instanceId: string) {
    console.log(`Terminal session opened for instance ${instanceId}`);

    try {
        const container = docker.getContainer(containerId);

        // Create an exec instance that runs the BabyAGI CLI
        const exec = await container.exec({
            Cmd: ['python', 'main.py', 'cli'],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
        });

        const stream = await exec.start({ hijack: true, stdin: true, Tty: true });

        // Container stdout/stderr → WebSocket
        stream.on('data', (chunk: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(chunk.toString('utf8'));
            }
        });

        stream.on('end', () => {
            console.log(`Terminal stream ended for ${instanceId}`);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Container stream ended');
            }
        });

        // WebSocket → Container stdin
        ws.on('message', (data: Buffer | string) => {
            try {
                stream.write(typeof data === 'string' ? data : data.toString('utf8'));
            } catch { }
        });

        ws.on('close', () => {
            console.log(`Terminal WebSocket closed for ${instanceId}`);
            try {
                stream.end();
            } catch { }
        });

        ws.on('error', (err) => {
            console.error(`Terminal WebSocket error for ${instanceId}:`, err);
            try {
                stream.end();
            } catch { }
        });
    } catch (err: any) {
        console.error(`Failed to start terminal for ${instanceId}:`, err);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[31mError: Could not connect to container. Is the instance running?\x1b[0m\r\n`);
            ws.close(1011, 'Container exec failed');
        }
    }
}
