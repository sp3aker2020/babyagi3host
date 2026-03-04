'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import WebTerminal from '@/components/WebTerminal';
import styles from './dashboard.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface InstanceData {
    id: string;
    status: string;
    plan: string;
    expiresAt: string;
    ownerName: string;
    ownerEmail: string;
    sendbluePhone: string;
    ownerPhone: string;
    hasAnthropicKey: boolean;
    hasOpenaiKey: boolean;
    hasAgentmailKey: boolean;
    hasSendblueKey: boolean;
    createdAt: string;
}

type ToastType = 'success' | 'error';

function Toast({ msg, type }: { msg: string; type: ToastType }) {
    return <div className={`toast toast-${type}`}>{msg}</div>;
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`badge ${status === 'running' ? 'badge-green' :
            status === 'stopped' ? '' :
                status === 'provisioning' || status === 'pending' ? 'badge-yellow' : 'badge-red'
            }`} style={status === 'stopped' ? { background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)' } : {}}>
            <span className={`status-dot ${status}`} />
            {status}
        </span>
    );
}

function DashboardInner() {
    const searchParams = useSearchParams();
    const instanceId = searchParams.get('instanceId') || '';
    const walletParam = searchParams.get('wallet') || '';

    const [instance, setInstance] = useState<InstanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'terminal' | 'settings' | 'agentmail' | 'sendblue'>('overview');

    // Form state
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [anthropicApiKey, setAnthropicApiKey] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [agentmailApiKey, setAgentmailApiKey] = useState('');
    const [sendblueApiKey, setSendblueApiKey] = useState('');
    const [sendblueApiSecret, setSendblueApiSecret] = useState('');
    const [sendbluePhone, setSendbluePhone] = useState('');
    const [ownerPhone, setOwnerPhone] = useState('');

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchInstance = useCallback(async () => {
        if (!instanceId) return;
        try {
            const res = await fetch(`${API}/api/instances/${instanceId}?wallet=${walletParam}`);
            const data = await res.json();
            if (res.ok) {
                setInstance(data);
                setOwnerName(data.ownerName || '');
                setOwnerEmail(data.ownerEmail || '');
                setSendbluePhone(data.sendbluePhone || '');
                setOwnerPhone(data.ownerPhone || '');
            }
        } catch { }
        setLoading(false);
    }, [instanceId, walletParam]);

    useEffect(() => {
        fetchInstance();
        const interval = setInterval(fetchInstance, 10000); // poll every 10s
        return () => clearInterval(interval);
    }, [fetchInstance]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/instances/${instanceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: walletParam,
                    ownerName,
                    ownerEmail,
                    ...(anthropicApiKey ? { anthropicApiKey } : {}),
                    ...(openaiApiKey ? { openaiApiKey } : {}),
                    ...(agentmailApiKey ? { agentmailApiKey } : {}),
                    ...(sendblueApiKey ? { sendblueApiKey } : {}),
                    ...(sendblueApiSecret ? { sendblueApiSecret } : {}),
                    sendbluePhone,
                    ownerPhone,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Settings saved! Instance is ' + (data.status === 'running' ? 'online ✅' : 'being configured...'), 'success');
                setAnthropicApiKey('');
                setOpenaiApiKey('');
                setAgentmailApiKey('');
                setSendblueApiKey('');
                setSendblueApiSecret('');
                fetchInstance();
            } else {
                showToast(data.error || 'Save failed', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        }
        setSaving(false);
    };

    const handleStop = async () => {
        await fetch(`${API}/api/instances/${instanceId}/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: walletParam }),
        });
        showToast('Bot stopped', 'success');
        fetchInstance();
    };

    const handleStart = async () => {
        await fetch(`${API}/api/instances/${instanceId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: walletParam }),
        });
        showToast('Bot starting...', 'success');
        fetchInstance();
    };

    if (!instanceId) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
                <p style={{ color: 'var(--text-2)' }}>No instance ID found. Please complete checkout first.</p>
                <Link href="/checkout" className="btn btn-primary">Go to checkout →</Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className={styles.spinner} />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {toast && <Toast msg={toast.msg} type={toast.type} />}
            <div className="orb orb-purple" style={{ width: 350, height: 350, top: 0, right: '-5%', opacity: 0.15 }} />

            {/* Nav */}
            <nav className={styles.nav}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link href="/" className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/babyagi3-logo.png" alt="BabyAGI Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                        <span><span className="gradient-text">BabyAgi3</span> Host</span>
                    </Link>
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }} className="mono">
                        {instanceId.slice(0, 8)}...
                    </span>
                </div>
            </nav>

            <div className="container" style={{ position: 'relative', zIndex: 1, paddingBottom: 80 }}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Your BabyAGI 3</h1>
                        <p style={{ color: 'var(--text-2)', marginTop: 6 }}>
                            {instance?.plan && <span className="badge badge-purple" style={{ marginRight: 8, textTransform: 'capitalize' }}>{instance.plan}</span>}
                            Expires: {instance?.expiresAt ? new Date(instance.expiresAt).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {instance && <StatusBadge status={instance.status} />}
                        {instance?.status === 'running' && (
                            <button className="btn btn-ghost btn-sm" onClick={handleStop} id="stop-btn">Stop</button>
                        )}
                        {instance?.status === 'stopped' && (
                            <button className="btn btn-primary btn-sm" onClick={handleStart} id="start-btn">Start ▶</button>
                        )}
                    </div>
                </div>

                <div className={styles.tabs}>
                    {(['overview', 'terminal', 'settings', 'agentmail', 'sendblue'] as const).map((t) => (
                        <button
                            key={t}
                            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(t)}
                        >
                            {t === 'overview' ? '📊 Overview' :
                                t === 'terminal' ? '💻 Terminal' :
                                    t === 'settings' ? '⚙️ General & LLM' :
                                        t === 'agentmail' ? '📧 AgentMail' : '📱 SendBlue SMS'}
                        </button>
                    ))}
                </div>

                {/* Tab Panels */}
                {activeTab === 'overview' && (
                    <div className={styles.tabContent}>
                        <div className={styles.statsGrid}>
                            <div className="card" style={{ padding: 24 }}>
                                <p className="section-label">Identity</p>
                                <p style={{ marginTop: 10, fontWeight: 600, fontSize: 14 }}>{instance?.ownerName || 'Not set'}</p>
                                <p style={{ marginTop: 4, color: 'var(--text-3)', fontSize: 12 }}>
                                    Email: {instance?.ownerEmail || 'Not set'}
                                </p>
                            </div>
                            <div className="card" style={{ padding: 24 }}>
                                <p className="section-label">LLM Engines</p>
                                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span className={`badge ${instance?.hasAnthropicKey ? 'badge-green' : ''}`}
                                        style={!instance?.hasAnthropicKey ? { background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' } : {}}>
                                        {instance?.hasAnthropicKey ? '✅' : '⬜'} Anthropic
                                    </span>
                                    <span className={`badge ${instance?.hasOpenaiKey ? 'badge-green' : ''}`}
                                        style={!instance?.hasOpenaiKey ? { background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' } : {}}>
                                        {instance?.hasOpenaiKey ? '✅' : '⬜'} OpenAI
                                    </span>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 24 }}>
                                <p className="section-label">Channels</p>
                                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span className={`badge ${instance?.hasAgentmailKey ? 'badge-green' : ''}`}
                                        style={!instance?.hasAgentmailKey ? { background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' } : {}}>
                                        {instance?.hasAgentmailKey ? '✅' : '⬜'} AgentMail
                                    </span>
                                    <span className={`badge ${instance?.hasSendblueKey ? 'badge-green' : ''}`}
                                        style={!instance?.hasSendblueKey ? { background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' } : {}}>
                                        {instance?.hasSendblueKey ? '✅' : '⬜'} SendBlue
                                    </span>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 24 }}>
                                <p className="section-label">Plan</p>
                                <p style={{ marginTop: 10, fontWeight: 700, fontSize: 18, textTransform: 'capitalize' }}>{instance?.plan}</p>
                                <p style={{ marginTop: 4, color: 'var(--text-3)', fontSize: 12 }}>
                                    Valid until {instance?.expiresAt ? new Date(instance.expiresAt).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                        {!(instance?.hasAnthropicKey || instance?.hasOpenaiKey) && (
                            <div className={styles.setupAlert}>
                                <span>⚠️</span>
                                <div>
                                    <strong>Setup required</strong>
                                    <p>Add an Anthropic or OpenAI API key in <button onClick={() => setActiveTab('settings')} className={styles.alertLink}>General & LLM</button> to launch your agent.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'terminal' && (
                    <div className={styles.tabContent} style={{ height: 'calc(100vh - 280px)', minHeight: 500, padding: 0 }}>
                        <WebTerminal instanceId={instanceId} wallet={walletParam} />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className={styles.tabContent}>
                        <div className={`card ${styles.formCard}`}>
                            <h3 className={styles.formTitle}>General & Profile</h3>
                            <p className={styles.formDesc}>
                                Set up your agent's core identity and your contact info.
                            </p>
                            <div className={styles.formGroup}>
                                <label>Your Name</label>
                                <input className="input mono" placeholder="Alice" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                                <p className={styles.hint}>Used by BabyAGI 3 to know who it serves</p>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Your Email Address</label>
                                <input className="input mono" placeholder="alice@example.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                            </div>

                            <h3 className={styles.formTitle} style={{ marginTop: 32 }}>LLM Configuration</h3>
                            <p className={styles.formDesc}>
                                BabyAGI 3 requires at least one LLM key (Anthropic recommended).
                            </p>
                            <div className={styles.formGroup}>
                                <label>Anthropic API Key {instance?.hasAnthropicKey && <span className="badge badge-green" style={{ marginLeft: 6 }}>Set</span>}</label>
                                <input className="input mono" type="password" placeholder={instance?.hasAnthropicKey ? '••••••••••••••••••••' : 'sk-ant-...'} value={anthropicApiKey} onChange={(e) => setAnthropicApiKey(e.target.value)} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>OpenAI API Key (Optional fallback) {instance?.hasOpenaiKey && <span className="badge badge-green" style={{ marginLeft: 6 }}>Set</span>}</label>
                                <input className="input mono" type="password" placeholder={instance?.hasOpenaiKey ? '••••••••••••••••••••' : 'sk-...'} value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} />
                            </div>

                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? '⏳ Saving...' : '💾 Save & Launch'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'agentmail' && (
                    <div className={styles.tabContent}>
                        <div className={`card ${styles.formCard}`}>
                            <h3 className={styles.formTitle}>AgentMail Integration</h3>
                            <div className={styles.guide}>
                                <p className="section-label">Setup guide</p>
                                <ol className={styles.guideSteps}>
                                    <li>AgentMail gives your agent its own email address.</li>
                                    <li>Visit <a href="https://agentmail.to" target="_blank" rel="noreferrer" className={styles.link}>AgentMail</a> and create an account.</li>
                                    <li>Copy the AgentMail API Key and paste it below.</li>
                                    <li>Ensure your "Owner Email" is set in the <b>General</b> tab so the agent knows who to email.</li>
                                </ol>
                            </div>
                            <div className={styles.formGroup}>
                                <label>AgentMail API Key {instance?.hasAgentmailKey && <span className="badge badge-green" style={{ marginLeft: 6 }}>Set</span>}</label>
                                <input className="input mono" type="password" placeholder={instance?.hasAgentmailKey ? '•••••••••••' : 'am_xyz...'} value={agentmailApiKey} onChange={(e) => setAgentmailApiKey(e.target.value)} />
                            </div>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? '⏳ Saving...' : '💾 Save & Restart'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'sendblue' && (
                    <div className={styles.tabContent}>
                        <div className={`card ${styles.formCard}`}>
                            <h3 className={styles.formTitle}>SendBlue SMS Integration</h3>
                            <div className={styles.guide}>
                                <p className="section-label">Setup guide</p>
                                <ol className={styles.guideSteps}>
                                    <li>Enables the agent to text you via SMS or iMessage.</li>
                                    <li>Visit <a href="https://sendblue.co" target="_blank" rel="noreferrer" className={styles.link}>SendBlue</a> and get your API Key and Secret.</li>
                                    <li>Note the dedicated <b>SendBlue Phone Number</b> assigned to your agent.</li>
                                    <li>Provide your <b>Personal Phone Number</b> so the agent recognizes your incoming texts.</li>
                                </ol>
                            </div>
                            <div className={styles.formGroup}>
                                <label>SendBlue API Key {instance?.hasSendblueKey && <span className="badge badge-green" style={{ marginLeft: 6 }}>Set</span>}</label>
                                <input className="input mono" type="password" placeholder={instance?.hasSendblueKey ? '•••••••••••' : 'sb_...'} value={sendblueApiKey} onChange={(e) => setSendblueApiKey(e.target.value)} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>SendBlue API Secret</label>
                                <input className="input mono" type="password" placeholder="•••••••••••" value={sendblueApiSecret} onChange={(e) => setSendblueApiSecret(e.target.value)} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>SendBlue Phone Number</label>
                                <input className="input mono" placeholder="+15551234567" value={sendbluePhone} onChange={(e) => setSendbluePhone(e.target.value)} />
                                <p className={styles.hint}>The number assigned to your agent in the SendBlue dashboard</p>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Your Personal Phone Number</label>
                                <input className="input mono" placeholder="+18889876543" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                                <p className={styles.hint}>So the agent recognizes you when you text it</p>
                            </div>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? '⏳ Saving...' : '💾 Save & Restart'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div style={{ color: 'var(--text-2)', padding: 48, textAlign: 'center' }}>Loading...</div>}>
            <DashboardInner />
        </Suspense>
    );
}
