import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { verifySolanaPayment, PLANS } from '../services/solana';
import { provisionInstance, getInstanceStatus } from '../services/provisioner';
import { decrypt } from '../services/crypto';

const router = Router();

// POST /api/payment/verify
// Body: { txSignature, walletAddress, email? }
router.post('/verify', async (req: Request, res: Response) => {
    const { txSignature, walletAddress, email } = req.body;

    if (!txSignature || !walletAddress) {
        return res.status(400).json({ error: 'txSignature and walletAddress required' });
    }

    // Check if tx already used
    const existing = await pool.query(
        'SELECT id FROM payments WHERE tx_signature = $1',
        [txSignature]
    );
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Transaction already used' });
    }

    // Verify on-chain
    const result = await verifySolanaPayment(txSignature);
    if (!result.ok) {
        return res.status(400).json({ error: result.error });
    }

    // Upsert user
    const userResult = await pool.query(
        `INSERT INTO users (wallet_address, email)
     VALUES ($1, $2)
     ON CONFLICT (wallet_address)
     DO UPDATE SET email = COALESCE($2, users.email), updated_at = NOW()
     RETURNING id`,
        [walletAddress, email || null]
    );
    const userId = userResult.rows[0].id;

    // Record payment
    const plan = PLANS[result.plan!];
    const expiresAt = new Date(Date.now() + plan.durationDays * 86400 * 1000);
    const paymentResult = await pool.query(
        `INSERT INTO payments (user_id, tx_signature, amount_lamports, plan, verified_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
        [userId, txSignature, result.lamports!.toString(), result.plan]
    );
    const paymentId = paymentResult.rows[0].id;

    // Create pending instance
    const instanceResult = await pool.query(
        `INSERT INTO instances (user_id, payment_id, status, plan, expires_at)
     VALUES ($1, $2, 'pending', $3, $4)
     RETURNING id`,
        [userId, paymentId, result.plan, expiresAt]
    );
    const instanceId = instanceResult.rows[0].id;

    return res.json({
        success: true,
        userId,
        instanceId,
        plan: result.plan,
        expiresAt,
        message: 'Payment verified! Configure your bot credentials to launch.',
    });
});

export default router;
