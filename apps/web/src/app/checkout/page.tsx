'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import styles from './checkout.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET || '';

const PLANS = {
    starter: { name: 'Starter', sol: 0.05, lamports: 50_000_000, usd: '~$10', duration: '1 month' },
    pro: { name: 'Pro', sol: 0.15, lamports: 150_000_000, usd: '~$25', duration: '1 month' },
    lifetime: { name: 'Lifetime', sol: 1, lamports: 1_000_000_000, usd: '~$200', duration: 'Forever' },
};

type PlanId = keyof typeof PLANS;
type Step = 'select' | 'pay' | 'success';

function CheckoutInner() {
    const searchParams = useSearchParams();
    const defaultPlan = (searchParams.get('plan') as PlanId) || 'starter';

    const [plan, setPlan] = useState<PlanId>(defaultPlan);
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<Step>('select');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [instanceId, setInstanceId] = useState('');

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const handlePay = useCallback(async () => {
        if (!publicKey) {
            setError('Please connect your wallet first.');
            return;
        }
        if (!TREASURY) {
            setError('Treasury wallet not configured.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const planInfo = PLANS[plan];
            const treasuryPubkey = new PublicKey(TREASURY);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: treasuryPubkey,
                    lamports: planInfo.lamports,
                })
            );

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            // Verify with backend
            const res = await fetch(`${API}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txSignature: signature,
                    walletAddress: publicKey.toBase58(),
                    email: email || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');

            setInstanceId(data.instanceId);
            setStep('success');
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    }, [publicKey, connection, sendTransaction, plan, email]);

    const selectedPlan = PLANS[plan];

    return (
        <div className={styles.page}>
            <div className="orb orb-purple" style={{ width: 450, height: 450, top: -100, left: '20%', opacity: 0.2 }} />

            <nav className={styles.nav}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link href="/" className={styles.back}>← Back</Link>
                    <span className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/babyagi3-logo.png" alt="BabyAGI Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                        <span><span className="gradient-text">BabyAgi3</span> Host</span>
                    </span>
                </div>
            </nav>

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className={styles.layout}>

                    {/* Left: Plan select */}
                    <div className={`card ${styles.planSection}`}>
                        <h2 className={styles.heading}>Choose your plan</h2>
                        <div className={styles.planOptions}>
                            {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, p]) => (
                                <button
                                    key={id}
                                    onClick={() => setPlan(id)}
                                    className={`${styles.planOption} ${plan === id ? styles.planOptionActive : ''}`}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className={styles.planOptionName}>{p.name}</span>
                                        <span className={styles.planOptionPrice}>{p.sol} SOL</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className={styles.planOptionUsd}>{p.usd}</span>
                                        <span className={styles.planOptionDuration}>{p.duration}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <label>Email (optional, for notifications)</label>
                            <input
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right: Payment */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className={`card ${styles.summaryCard}`}>
                            <h2 className={styles.heading}>Order summary</h2>
                            <div className={styles.summaryRow}>
                                <span>{selectedPlan.name} plan</span>
                                <span>{selectedPlan.sol} SOL</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.dimLabel}>USD equivalent</span>
                                <span className={styles.dimLabel}>{selectedPlan.usd}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.dimLabel}>Duration</span>
                                <span className={styles.dimLabel}>{selectedPlan.duration}</span>
                            </div>
                            <div className="divider" />
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <span>Total</span>
                                <span><span className="gradient-text">{selectedPlan.sol} SOL</span></span>
                            </div>
                        </div>

                        {step !== 'success' ? (
                            <div className={`card ${styles.payCard}`}>
                                <h3 className={styles.subheading}>Connect & Pay</h3>
                                <div style={{ marginBottom: 20 }}>
                                    <WalletMultiButton className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} />
                                </div>

                                {publicKey && (
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', fontSize: 16 }}
                                        onClick={handlePay}
                                        disabled={loading}
                                        id="pay-button"
                                    >
                                        {loading ? '⏳ Processing...' : `Pay ${selectedPlan.sol} SOL Now`}
                                    </button>
                                )}

                                {error && <p className={styles.error}>{error}</p>}
                                <p className={styles.secureNote}>
                                    🔒 Payment goes directly on-chain to our treasury wallet. Verified automatically.
                                </p>
                            </div>
                        ) : (
                            <div className={`card ${styles.successCard}`}>
                                <div className={styles.successIcon}>🎉</div>
                                <h3 className={styles.successTitle}>Payment confirmed!</h3>
                                <p className={styles.successSub}>Your agent instance is ready to configure.</p>
                                <Link
                                    href={`/dashboard?instanceId=${instanceId}&wallet=${publicKey?.toBase58()}`}
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                                    id="go-to-dashboard"
                                >
                                    Configure your agent →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div style={{ color: 'var(--text-2)', padding: 48, textAlign: 'center' }}>Loading...</div>}>
            <CheckoutInner />
        </Suspense>
    );
}
