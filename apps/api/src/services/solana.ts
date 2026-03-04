import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || '';
const MAX_TX_AGE_SECONDS = 300; // 5 minutes

export const PLANS: Record<string, { lamports: bigint; label: string; durationDays: number }> = {
    starter: {
        lamports: BigInt(50_000_000), // 0.05 SOL
        label: 'Starter (Monthly)',
        durationDays: 30,
    },
    pro: {
        lamports: BigInt(150_000_000), // 0.15 SOL
        label: 'Pro (Monthly)',
        durationDays: 30,
    },
    lifetime: {
        lamports: BigInt(1_000_000_000), // 1 SOL
        label: 'Lifetime',
        durationDays: 36500, // ~100 years
    },
};

export interface VerifyResult {
    ok: boolean;
    plan?: string;
    lamports?: bigint;
    sender?: string;
    error?: string;
}

export async function verifySolanaPayment(txSignature: string): Promise<VerifyResult> {
    if (!TREASURY_WALLET) {
        return { ok: false, error: 'Treasury wallet not configured' };
    }

    const connection = new Connection(RPC_URL, 'confirmed');

    let tx;
    try {
        tx = await connection.getParsedTransaction(txSignature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });
    } catch (e) {
        return { ok: false, error: 'Failed to fetch transaction' };
    }

    if (!tx || !tx.blockTime) {
        return { ok: false, error: 'Transaction not found or not confirmed' };
    }

    // Check tx age
    const ageSeconds = Math.floor(Date.now() / 1000) - tx.blockTime;
    if (ageSeconds > MAX_TX_AGE_SECONDS) {
        return { ok: false, error: `Transaction too old (${ageSeconds}s > ${MAX_TX_AGE_SECONDS}s)` };
    }

    // Check for errors in the tx
    if (tx.meta?.err) {
        return { ok: false, error: 'Transaction failed on-chain' };
    }

    // Find transfer to treasury
    let transferredLamports = BigInt(0);
    let sender = '';
    const preBalances = tx.meta?.preBalances ?? [];
    const postBalances = tx.meta?.postBalances ?? [];
    const accounts = tx.transaction.message.accountKeys;

    for (let i = 0; i < accounts.length; i++) {
        const acct = accounts[i] as any;
        const pubkey: string = acct?.pubkey?.toBase58?.() ?? acct?.toBase58?.() ?? String(acct);
        if (pubkey === TREASURY_WALLET) {
            transferredLamports = BigInt(postBalances[i] - preBalances[i]);
        } else if (i === 0) {
            sender = pubkey; // fee payer / sender
        }
    }

    if (transferredLamports <= BigInt(0)) {
        return { ok: false, error: 'No SOL transferred to treasury wallet' };
    }

    // Match plan
    let matchedPlan: string | undefined;
    for (const [planName, planInfo] of Object.entries(PLANS)) {
        // Allow 0.5% tolerance for rounding
        const tolerance = planInfo.lamports / BigInt(200);
        if (transferredLamports >= planInfo.lamports - tolerance) {
            matchedPlan = planName;
        }
    }

    if (!matchedPlan) {
        return {
            ok: false,
            error: `Amount ${transferredLamports} lamports doesn't match any plan`,
        };
    }

    return {
        ok: true,
        plan: matchedPlan,
        lamports: transferredLamports,
        sender,
    };
}
