'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const API_WS = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/^http/, 'ws');

interface WebTerminalProps {
    instanceId: string;
    wallet: string;
}

export default function WebTerminal({ instanceId, wallet }: WebTerminalProps) {
    const termRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const xtermRef = useRef<any>(null);
    const fitRef = useRef<any>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const connect = useCallback(async () => {
        if (!termRef.current) return;

        setStatus('connecting');

        // Dynamically import xterm (avoids SSR issues)
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        // Import the CSS
        // @ts-ignore
        await import('@xterm/xterm/css/xterm.css');

        // Clean up previous terminal
        if (xtermRef.current) {
            xtermRef.current.dispose();
        }
        if (termRef.current) {
            termRef.current.innerHTML = '';
        }

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            theme: {
                background: '#0a0a14',
                foreground: '#e2e8f0',
                cursor: '#8b5cf6',
                selectionBackground: 'rgba(139, 92, 246, 0.3)',
                black: '#0a0a14',
                red: '#f87171',
                green: '#4ade80',
                yellow: '#facc15',
                blue: '#60a5fa',
                magenta: '#c084fc',
                cyan: '#22d3ee',
                white: '#e2e8f0',
                brightBlack: '#64748b',
                brightRed: '#fca5a5',
                brightGreen: '#86efac',
                brightYellow: '#fde68a',
                brightBlue: '#93c5fd',
                brightMagenta: '#d8b4fe',
                brightCyan: '#67e8f9',
                brightWhite: '#f8fafc',
            },
            scrollback: 5000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current!);
        fitAddon.fit();

        xtermRef.current = term;
        fitRef.current = fitAddon;

        term.writeln('\x1b[35m┌──────────────────────────────────────────┐\x1b[0m');
        term.writeln('\x1b[35m│\x1b[0m   \x1b[1;36mBabyAGI 3\x1b[0m — Interactive Terminal       \x1b[35m│\x1b[0m');
        term.writeln('\x1b[35m│\x1b[0m   Connecting to your agent...            \x1b[35m│\x1b[0m');
        term.writeln('\x1b[35m└──────────────────────────────────────────┘\x1b[0m');
        term.writeln('');

        // Connect WebSocket
        const wsUrl = `${API_WS}/api/terminal/${instanceId}?wallet=${encodeURIComponent(wallet)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            term.writeln('\x1b[32m✓ Connected\x1b[0m\n');
            term.focus();
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = (event) => {
            setStatus('disconnected');
            term.writeln('\n\x1b[33m⚠ Connection closed\x1b[0m');
            if (event.reason) {
                term.writeln(`\x1b[90m  Reason: ${event.reason}\x1b[0m`);
            }
            term.writeln('\x1b[90m  Click "Reconnect" to start a new session\x1b[0m');
        };

        ws.onerror = () => {
            setStatus('error');
            term.writeln('\n\x1b[31m✗ Connection error — is the instance running?\x1b[0m');
        };

        // Send keystrokes to WebSocket
        term.onData((data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    }, [instanceId, wallet]);

    // Initial connect
    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (xtermRef.current) {
                xtermRef.current.dispose();
            }
        };
    }, [connect]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (fitRef.current) {
                fitRef.current.fit();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const statusColors: Record<string, string> = {
        connecting: '#facc15',
        connected: '#4ade80',
        disconnected: '#94a3b8',
        error: '#f87171',
    };

    const statusLabels: Record<string, string> = {
        connecting: '● Connecting...',
        connected: '● Connected',
        disconnected: '○ Disconnected',
        error: '✗ Error',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
            {/* Terminal toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: 'rgba(22, 22, 36, 0.9)',
                borderBottom: '1px solid rgba(139, 92, 246, 0.18)',
                borderRadius: '14px 14px 0 0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '12px',
                        color: statusColors[status],
                    }}>
                        {statusLabels[status]}
                    </span>
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        color: '#64748b',
                    }}>
                        babyagi-{instanceId.split('-')[0]}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(status === 'disconnected' || status === 'error') && (
                        <button
                            onClick={connect}
                            style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                fontFamily: "'Inter', sans-serif",
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }}
                        >
                            Reconnect
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal container */}
            <div
                ref={termRef}
                style={{
                    flex: 1,
                    background: '#0a0a14',
                    borderRadius: '0 0 14px 14px',
                    overflow: 'hidden',
                    padding: '8px',
                }}
            />
        </div>
    );
}
