import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { encrypt, decrypt } from '../services/crypto';
import {
    provisionInstance,
    stopInstance,
    startInstance,
    removeInstance,
    getInstanceStatus,
} from '../services/provisioner';

const router = Router();

// GET /api/instances/:id — get instance status + config
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { wallet } = req.query as { wallet?: string };

    const result = await pool.query(
        `SELECT i.*, u.wallet_address
     FROM instances i
     JOIN users u ON u.id = i.user_id
     WHERE i.id = $1`,
        [id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Instance not found' });
    const instance = result.rows[0];

    // Simple auth: wallet must match
    if (wallet && instance.wallet_address !== wallet) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Get live Docker status if running
    let dockerStatus = instance.status;
    if (instance.container_id) {
        dockerStatus = await getInstanceStatus(instance.container_id);
        if (dockerStatus !== instance.status) {
            await pool.query('UPDATE instances SET status = $1 WHERE id = $2', [dockerStatus, id]);
        }
    }

    return res.json({
        id: instance.id,
        status: dockerStatus,
        plan: instance.plan,
        expiresAt: instance.expires_at,
        ownerName: instance.owner_name,
        ownerEmail: instance.owner_email,
        sendbluePhone: instance.sendblue_phone,
        ownerPhone: instance.owner_phone,
        // Never return encrypted secrets — just whether they're set
        hasAnthropicKey: !!instance.anthropic_api_key_enc,
        hasOpenaiKey: !!instance.openai_api_key_enc,
        hasAgentmailKey: !!instance.agentmail_api_key_enc,
        hasSendblueKey: !!instance.sendblue_api_key_enc,
        createdAt: instance.created_at,
    });
});

// PATCH /api/instances/:id — update credentials + trigger restart
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            wallet,
            ownerName,
            ownerEmail,
            anthropicApiKey,
            openaiApiKey,
            agentmailApiKey,
            sendblueApiKey,
            sendblueApiSecret,
            sendbluePhone,
            ownerPhone,
        } = req.body;

        if (!wallet) return res.status(401).json({ error: 'wallet required' });

        const result = await pool.query(
            `SELECT i.*, u.wallet_address FROM instances i JOIN users u ON u.id = i.user_id WHERE i.id = $1`,
            [id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Instance not found' });
        const instance = result.rows[0];
        if (instance.wallet_address !== wallet) return res.status(403).json({ error: 'Forbidden' });

        // Build update fields
        const updates: Record<string, string | null> = {};
        if (ownerName !== undefined) updates.owner_name = ownerName;
        if (ownerEmail !== undefined) updates.owner_email = ownerEmail;
        if (anthropicApiKey !== undefined) updates.anthropic_api_key_enc = anthropicApiKey ? encrypt(anthropicApiKey) : null;
        if (openaiApiKey !== undefined) updates.openai_api_key_enc = openaiApiKey ? encrypt(openaiApiKey) : null;
        if (agentmailApiKey !== undefined) updates.agentmail_api_key_enc = agentmailApiKey ? encrypt(agentmailApiKey) : null;
        if (sendblueApiKey !== undefined) updates.sendblue_api_key_enc = sendblueApiKey ? encrypt(sendblueApiKey) : null;
        if (sendblueApiSecret !== undefined) updates.sendblue_api_secret_enc = sendblueApiSecret ? encrypt(sendblueApiSecret) : null;
        if (sendbluePhone !== undefined) updates.sendblue_phone = sendbluePhone;
        if (ownerPhone !== undefined) updates.owner_phone = ownerPhone;

        if (Object.keys(updates).length > 0) {
            const setClause = Object.keys(updates)
                .map((k, i) => `${k} = $${i + 2}`)
                .join(', ');
            await pool.query(
                `UPDATE instances SET ${setClause}, updated_at = NOW() WHERE id = $1`,
                [id, ...Object.values(updates)]
            );
        }

        // Re-fetch to get latest
        const fresh = await pool.query('SELECT * FROM instances WHERE id = $1', [id]);
        const fi = fresh.rows[0];

        if (!fi.anthropic_api_key_enc && !fi.openai_api_key_enc) {
            return res.json({ success: true, status: 'pending', message: 'Saved. Add an Anthropic or OpenAI key to launch.' });
        }

        // Provision / reprovision container
        try {
            await pool.query('UPDATE instances SET status = $1 WHERE id = $2', ['provisioning', id]);

            const containerId = await provisionInstance({
                instanceId: id,
                ownerName: fi.owner_name,
                ownerEmail: fi.owner_email,
                anthropicApiKey: fi.anthropic_api_key_enc ? decrypt(fi.anthropic_api_key_enc) : undefined,
                openaiApiKey: fi.openai_api_key_enc ? decrypt(fi.openai_api_key_enc) : undefined,
                agentmailApiKey: fi.agentmail_api_key_enc ? decrypt(fi.agentmail_api_key_enc) : undefined,
                sendblueApiKey: fi.sendblue_api_key_enc ? decrypt(fi.sendblue_api_key_enc) : undefined,
                sendblueApiSecret: fi.sendblue_api_secret_enc ? decrypt(fi.sendblue_api_secret_enc) : undefined,
                sendbluePhone: fi.sendblue_phone,
                ownerPhone: fi.owner_phone,
            });

            await pool.query(
                'UPDATE instances SET container_id = $1, container_name = $2, status = $3 WHERE id = $4',
                [containerId, `babyagi-${id.replace(/-/g, '').slice(0, 16)}`, 'running', id]
            );

            return res.json({ success: true, status: 'running', containerId });
        } catch (err: any) {
            console.error('Provisioning error:', err);
            await pool.query('UPDATE instances SET status = $1 WHERE id = $2', ['error', id]);
            return res.status(500).json({ error: 'Provisioning failed', details: err.message });
        }
    } catch (err: any) {
        console.error('PATCH /instances/:id error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// POST /api/instances/:id/stop
router.post('/:id/stop', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { wallet } = req.body;

    const result = await pool.query(
        `SELECT i.*, u.wallet_address FROM instances i JOIN users u ON u.id = i.user_id WHERE i.id = $1`,
        [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (result.rows[0].wallet_address !== wallet) return res.status(403).json({ error: 'Forbidden' });

    const { container_id } = result.rows[0];
    if (container_id) await stopInstance(container_id);
    await pool.query('UPDATE instances SET status = $1 WHERE id = $2', ['stopped', id]);
    return res.json({ success: true });
});

// POST /api/instances/:id/start
router.post('/:id/start', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { wallet } = req.body;

    const result = await pool.query(
        `SELECT i.*, u.wallet_address FROM instances i JOIN users u ON u.id = i.user_id WHERE i.id = $1`,
        [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (result.rows[0].wallet_address !== wallet) return res.status(403).json({ error: 'Forbidden' });

    const { container_id } = result.rows[0];
    if (container_id) await startInstance(container_id);
    await pool.query('UPDATE instances SET status = $1 WHERE id = $2', ['running', id]);
    return res.json({ success: true });
});

export default router;
