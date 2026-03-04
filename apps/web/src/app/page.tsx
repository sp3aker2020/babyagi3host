'use client';

import Link from 'next/link';
import styles from './page.module.css';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Instant Launch',
    desc: 'Your BabyAGI is live in under 60 seconds after payment. No manual Python environments.',
  },
  {
    icon: '🔒',
    title: 'Your Keys, Your Agent',
    desc: 'Bring your own Anthropic or OpenAI API key. We never resell your LLM access.',
  },
  {
    icon: '🚀',
    title: 'Fully Autonomous',
    desc: 'Built on the acclaimed BabyAGI 3 architecture. It breaks down tasks, executes, and learns.',
  },
  {
    icon: '🧠',
    title: 'SQLite Memory',
    desc: 'Your agent remembers interactions. We manage the persistent SQLite volumes to ensure context is never lost.',
  },
  {
    icon: '📧',
    title: 'AgentMail Integrated',
    desc: 'Link your AgentMail API key, and your AI can natively send and receive emails on your behalf.',
  },
  {
    icon: '💬',
    title: 'SendBlue SMS',
    desc: 'Connect SendBlue to let your agent text you mission updates or handle SMS commands remotely.',
  },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '0.05',
    unit: 'SOL / mo',
    usd: '~$10/mo',
    features: ['1 BabyAGI 3 instance', 'Native SQLite Memory', 'OpenAI / Anthropic Support', 'Shared host'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '0.15',
    unit: 'SOL / mo',
    usd: '~$25/mo',
    features: ['1 BabyAGI 3 instance', 'AgentMail + SendBlue', 'Persistent Volumes', 'Dedicated container', '512MB RAM / 0.5 CPU'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '1',
    unit: 'SOL once',
    usd: '~$200 once',
    features: ['Everything in Pro', 'Pay once, yours forever', 'Priority support'],
    cta: 'Buy Lifetime',
    highlight: false,
  },
];

const COMPARE = [
  { col: '', brand: 'BabyAgi3 Host', diy: 'Self-host DIY' },
  { col: 'Setup time', brand: '< 60 seconds', diy: '30–60 minutes' },
  { col: 'Python & uv management', brand: 'We handle it', diy: 'You handle it' },
  { col: 'VPS cost', brand: 'Included', diy: '$5–20/mo extra' },
  { col: 'Solana payments', brand: '✅', diy: '❌' },
  { col: 'Persistent memory volumes', brand: '✅', diy: 'Manual' },
];

export default function Home() {
  return (
    <div className={styles.page}>
      {/* ---- Nav ---- */}
      <nav className={styles.nav}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/babyagi3-logo.png" alt="BabyAGI Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <span><span className="gradient-text">BabyAgi3</span> Host</span>
          </span>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="https://github.com/yoheinakajima/babyagi3" target="_blank" rel="noreferrer">Docs</a>
          </div>
          <Link href="/checkout" className="btn btn-primary btn-sm">Launch your agent →</Link>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className={styles.hero}>
        <div className="orb orb-purple" style={{ width: 500, height: 500, top: -100, left: '10%' }} />
        <div className="orb orb-blue" style={{ width: 400, height: 400, top: -50, right: '5%' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="badge badge-purple" style={{ margin: '0 auto 24px' }}>
            <span>⚡</span> Powered by BabyAGI 3 · Pays in SOL
          </div>
          <h1 className={styles.heroTitle}>
            Your Autonomous Agent,<br />
            <span className="gradient-text">Hosted in Seconds</span>
          </h1>
          <p className={styles.heroSub}>
            Launch a private, persistent BabyAGI 3 Python instance.<br />
            Pay once with SOL — we handle the orchestration.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/checkout" className="btn btn-primary btn-lg">
              🚀 Launch your agent
            </Link>
            <a href="https://github.com/yoheinakajima/babyagi3" target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
              View BabyAGI on GitHub
            </a>
          </div>
          <div className={styles.heroBadges}>
            <span className="badge badge-purple">Python 3.12</span>
            <span className="badge badge-purple">FastAPI</span>
            <span className="badge badge-purple">SQLite Memory</span>
            <span className="badge badge-purple">MIT license</span>
          </div>
          <div style={{ marginTop: '48px', position: 'relative' }}>
            <img src="/babyagi3-banner.png" alt="BabyAgi3 Host Platform Banner" style={{ width: '100%', maxWidth: '850px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 120px rgba(139, 92, 246, 0.25)' }} />
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className={styles.section}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-label">What you get</p>
            <h2 className={styles.sectionTitle}>Everything you need, nothing you don't</h2>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={`card ${styles.featureCard}`}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Compare ---- */}
      <section className={styles.section}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-label">Why BabyAgi3 Host</p>
            <h2 className={styles.sectionTitle}>vs. Self-hosting</h2>
          </div>
          <div className={styles.compareWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th></th>
                  <th><span className="gradient-text">BabyAgi3 Host</span></th>
                  <th>Self-host DIY</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.slice(1).map((row) => (
                  <tr key={row.col}>
                    <td>{row.col}</td>
                    <td className={styles.good}>{row.brand}</td>
                    <td className={styles.meh}>{row.diy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section id="pricing" className={styles.section}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-label">Pricing</p>
            <h2 className={styles.sectionTitle}>Pay with SOL. No card required.</h2>
            <p style={{ color: 'var(--text-2)', marginTop: 8 }}>All plans include a managed BabyAGI 3 container with your own API keys.</p>
          </div>
          <div className={styles.pricingGrid}>
            {PLANS.map((plan) => (
              <div key={plan.id} className={`card ${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}>
                {plan.highlight && <div className={styles.planBadge}>Most Popular</div>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <span className={styles.planAmount}>{plan.price}</span>
                  <span className={styles.planUnit}> {plan.unit}</span>
                </div>
                <p className={styles.planUsd}>{plan.usd}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f}><span className={styles.check}>✓</span>{f}</li>
                  ))}
                </ul>
                <Link
                  href={`/checkout?plan=${plan.id}`}
                  className={`btn ${plan.highlight ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className={styles.ctaSection}>
        <div className="orb orb-purple" style={{ width: 400, height: 400, top: -100, left: '50%', transform: 'translateX(-50%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>Ready to launch?</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 32 }}>Your agent will be live in under 60 seconds.</p>
          <Link href="/checkout" className="btn btn-primary btn-lg">
            🚀 Get started now
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className={styles.footer}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span className={styles.logo} style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/babyagi3-logo.png" alt="BabyAGI Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
            <span><span className="gradient-text">BabyAgi3</span> Host</span>
          </span>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            Built on <a href="https://github.com/yoheinakajima/babyagi3" style={{ color: 'var(--purple-400)' }}>BabyAGI 3</a> · MIT License
          </p>
        </div>
      </footer>
    </div>
  );
}
