import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ZoneRanking {
    name: string;
    totalRegistered: number;
    present: number;
    leave: number;
    notAttended: number;
    percentage: number;
}

export default function ParticipantCountPage() {
    const { token, isLoading } = useAuth();
    const navigate = useNavigate();

    const [zones, setZones] = useState<ZoneRanking[]>([]);
    const [overall, setOverall] = useState<{ totalRegistered: number; present: number; percentage: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [countdown, setCountdown] = useState(30);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    const fetchRanking = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${backendUrl}/api/checkin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            // Sort by percentage and then totalRegistered like ranking, but we don't display ranks
            const sorted: ZoneRanking[] = [...data.zones].sort((a, b) => {
                if (b.percentage !== a.percentage) return b.percentage - a.percentage;
                return a.totalRegistered - b.totalRegistered;
            });
            setZones(sorted);
            setOverall(data.overall);
            setLastUpdated(new Date());
            setCountdown(30);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, backendUrl]);

    useEffect(() => {
        if (isLoading) return;
        if (!token) { navigate('/login'); return; }
        fetchRanking();
    }, [token, navigate, isLoading, fetchRanking]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchRanking, 30000);
        return () => clearInterval(interval);
    }, [fetchRanking]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? 30 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [lastUpdated]);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen?.();
        }
    };

    if (isLoading || loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #0d1117, #1a1f2e)', fontFamily: 'Quicksand, sans-serif' }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: 72, marginBottom: 24, animation: 'pulse 1.5s ease-in-out infinite' }}>📊</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#60a5fa' }}>Loading Stats...</div>
            </div>
        </div>
    );

    return (
        <div ref={containerRef} style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0d1117 0%, #0d1b2a 50%, #1a0d2e 100%)', fontFamily: "'Quicksand', 'Noto Sans Malayalam', sans-serif", color: 'white', overflowX: 'hidden', overflowY: 'auto' }}>
            {/* Top Banner */}
            <div style={{
                background: 'linear-gradient(90deg, rgba(96,165,250,0.08), rgba(96,165,250,0.03), rgba(96,165,250,0.08))',
                borderBottom: '1px solid rgba(96,165,250,0.15)',
                padding: '20px 40px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 900, background: 'linear-gradient(90deg, #60a5fa, #93c5fd, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 1 }}>
                        📊 Participant Count — തർബിയ 2026
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 12 }}>
                        Refreshes in {countdown}s &nbsp;·&nbsp; {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                {/* Overall stats */}
                {overall && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Registered', val: overall.totalRegistered, color: '#60a5fa' },
                            { label: 'Present', val: overall.present, color: '#16c784' },
                            { label: 'Attendance', val: `${overall.percentage}%`, color: '#f59e0b' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.color}33`, borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
                                <div style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 900, color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                            </div>
                        ))}
                        <button onClick={toggleFullScreen} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                            {isFullscreen ? '◧ Exit Fullscreen' : '⛶ Fullscreen'}
                        </button>
                        <button onClick={fetchRanking} style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                            🔄 Refresh
                        </button>
                    </div>
                )}
            </div>

            <div style={{ padding: '36px 40px' }}>
                {zones.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                        {zones.map((zone) => {
                            const pct = zone.percentage;
                            const barColor = pct >= 75 ? '#16c784' : pct >= 50 ? '#f59e0b' : '#ef4444';
                            return (
                                <div key={zone.name} style={{
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 16, padding: '18px 22px',
                                    display: 'flex', alignItems: 'center', gap: 18
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zone.name}</div>
                                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 6, transition: 'width 0.8s ease' }} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: barColor }}>{pct}%</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{zone.present} / {zone.totalRegistered}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {zones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 40px', color: '#4b5563' }}>
                        <div style={{ fontSize: 80, marginBottom: 24 }}>📊</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>No check-in data yet</div>
                        <div style={{ fontSize: 14, marginTop: 8, color: '#6b7280' }}>Start checking in members to see the count</div>
                    </div>
                )}
            </div>
        </div>
    );
}
