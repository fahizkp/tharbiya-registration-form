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

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_GLOWS = [
    '0 0 40px rgba(255,215,0,0.4)',
    '0 0 24px rgba(192,192,192,0.3)',
    '0 0 24px rgba(205,127,50,0.3)'
];

/* Inject ranking animations once */
const RANK_STYLE_ID = 'ranking-anim-styles';
if (!document.getElementById(RANK_STYLE_ID)) {
    const s = document.createElement('style');
    s.id = RANK_STYLE_ID;
    s.textContent = `
        @keyframes medalFloat {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50%       { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes medalFloat2 {
            0%, 100% { transform: translateY(0px) rotate(1deg); }
            50%       { transform: translateY(-7px) rotate(-1deg); }
        }
        @keyframes medalFloat3 {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-5px); }
        }
        @keyframes goldShimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
        }
        @keyframes cardSlideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes borderPulse {
            0%, 100% { border-color: rgba(255,215,0,0.25); box-shadow: 0 0 30px rgba(255,215,0,0.2); }
            50%       { border-color: rgba(255,215,0,0.65); box-shadow: 0 0 55px rgba(255,215,0,0.45); }
        }
        .medal-1 { animation: medalFloat  2.8s ease-in-out infinite; display:inline-block; }
        .medal-2 { animation: medalFloat2 3.2s ease-in-out infinite; display:inline-block; }
        .medal-3 { animation: medalFloat3 2.5s ease-in-out infinite; display:inline-block; }
        .card-slide-0 { animation: cardSlideUp 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        .card-slide-1 { animation: cardSlideUp 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.12s both; }
        .card-slide-2 { animation: cardSlideUp 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.24s both; }
        .gold-border  { animation: borderPulse 2.2s ease-in-out infinite; }
        .gold-shimmer-text {
            background: linear-gradient(90deg, #FFD700 20%, #fff8b0 45%, #FFD700 55%, #FFA500 80%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: goldShimmer 2.8s linear infinite;
        }
    `;
    document.head.appendChild(s);
}

export default function RankingPage() {
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
            const sorted: ZoneRanking[] = [...data.zones].sort((a, b) => {
                if (b.percentage !== a.percentage) return b.percentage - a.percentage;
                // Equal %: zone with fewer expected participants ranks higher
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
                <div style={{ fontSize: 72, marginBottom: 24, animation: 'pulse 1.5s ease-in-out infinite' }}>🏆</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#FFD700' }}>Loading Ranking...</div>
            </div>
        </div>
    );

    const top3 = zones.slice(0, 3);
    const rest = zones.slice(3);

    return (
        <div ref={containerRef} style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0d1117 0%, #0d1b2a 50%, #1a0d2e 100%)', fontFamily: "'Quicksand', 'Noto Sans Malayalam', sans-serif", color: 'white', overflowX: 'hidden', overflowY: 'auto' }}>
            {/* Top Banner */}
            <div style={{
                background: 'linear-gradient(90deg, rgba(255,215,0,0.08), rgba(255,215,0,0.03), rgba(255,215,0,0.08))',
                borderBottom: '1px solid rgba(255,215,0,0.15)',
                padding: '20px 40px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 900, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 1 }}>
                        🏆 Attendance Ranking — തർബിയ 2026
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
                            { label: 'Attendance', val: `${overall.percentage}%`, color: '#FFD700' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.color}33`, borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
                                <div style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 900, color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                            </div>
                        ))}
                        <button onClick={toggleFullScreen} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                            {isFullscreen ? '◧ Exit Fullscreen' : '⛶ Fullscreen'}
                        </button>
                        <button onClick={fetchRanking} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                            🔄 Refresh
                        </button>
                    </div>
                )}
            </div>

            <div style={{ padding: '36px 40px' }}>
                {/* Podium — Top 3 */}
                {top3.length > 0 && (
                    <div style={{ marginBottom: 48 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
                            {top3.map((zone, i) => (
                                <div key={zone.name}
                                    className={`card-slide-${i} ${i === 0 ? 'gold-border' : ''}`}
                                    style={{
                                        flex: i === 0 ? '2 1 300px' : '1 1 220px',
                                        background: i === 0
                                            ? 'linear-gradient(145deg, #18230f, #1e2d14, #1f2a10)'
                                            : 'rgba(255,255,255,0.03)',
                                        border: `2px solid ${MEDAL_COLORS[i]}44`,
                                        borderRadius: 24,
                                        padding: i === 0 ? '36px 32px' : '28px 24px',
                                        boxShadow: MEDAL_GLOWS[i],
                                        display: 'flex', flexDirection: 'column', gap: 12,
                                        position: 'relative', overflow: 'hidden'
                                    }}>
                                    {/* Subtle glow bg */}
                                    <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `radial-gradient(circle, ${MEDAL_COLORS[i]}22, transparent 70%)`, pointerEvents: 'none' }} />

                                    <div className={`medal-${i + 1}`} style={{ fontSize: i === 0 ? 64 : 50, lineHeight: 1 }}>{MEDALS[i]}</div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: MEDAL_COLORS[i], textTransform: 'uppercase', letterSpacing: 2 }}>
                                        #{i + 1} Place
                                    </div>
                                    <div className={i === 0 ? 'gold-shimmer-text' : ''} style={{ fontSize: i === 0 ? 'clamp(20px, 3vw, 30px)' : 'clamp(16px, 2.5vw, 22px)', fontWeight: 900, lineHeight: 1.2, ...(i !== 0 ? { color: 'white' } : {}) }}>
                                        {zone.name}
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: i === 0 ? 14 : 10, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${zone.percentage}%`, height: '100%',
                                            background: `linear-gradient(90deg, ${MEDAL_COLORS[i]}, ${MEDAL_COLORS[i]}88)`,
                                            borderRadius: 8, transition: 'width 1s ease'
                                        }} />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>
                                            {zone.present}/{zone.totalRegistered} present
                                        </span>
                                        <span style={{ fontSize: i === 0 ? 36 : 28, fontWeight: 900, color: MEDAL_COLORS[i] }}>
                                            {zone.percentage}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Divider */}
                {rest.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 2 }}>Other Zones</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                )}

                {/* Remaining zones */}
                {rest.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                        {rest.map((zone, i) => {
                            const rank = i + 4;
                            const pct = zone.percentage;
                            const barColor = pct >= 75 ? '#16c784' : pct >= 50 ? '#f59e0b' : '#ef4444';
                            return (
                                <div key={zone.name} style={{
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 16, padding: '18px 22px',
                                    display: 'flex', alignItems: 'center', gap: 18
                                }}>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: '#374151', width: 32, textAlign: 'center', flexShrink: 0 }}>
                                        #{rank}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zone.name}</div>
                                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 6, transition: 'width 0.8s ease' }} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: barColor }}>{pct}%</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{zone.present}/{zone.totalRegistered}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty state */}
                {zones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 40px', color: '#4b5563' }}>
                        <div style={{ fontSize: 80, marginBottom: 24 }}>🏆</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>No check-in data yet</div>
                        <div style={{ fontSize: 14, marginTop: 8, color: '#6b7280' }}>Start checking in members to see the ranking</div>
                    </div>
                )}
            </div>
        </div>
    );
}
