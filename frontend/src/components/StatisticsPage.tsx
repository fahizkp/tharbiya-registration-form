import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ZoneCheckInStat {
    name: string;
    totalRegistered: number;
    present: number;
    leave: number;
    notAttended: number;
    percentage: number;
}

interface OverallStats {
    totalRegistered: number;
    present: number;
    leave: number;
    notAttended: number;
    percentage: number;
}

export default function StatisticsPage() {
    const { token, logout, user, isLoading } = useAuth();
    const navigate = useNavigate();

    const [overall, setOverall] = useState<OverallStats | null>(null);
    const [zones, setZones] = useState<ZoneCheckInStat[]>([]);
    const [selectedZone, setSelectedZone] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    const fetchStats = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/checkin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setOverall(data.overall);
            setZones(data.zones);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token, backendUrl]);

    useEffect(() => {
        if (isLoading) return;
        if (!token) { navigate('/login'); return; }
        fetchStats();
    }, [token, navigate, isLoading, fetchStats]);

    const handleLogout = () => { logout(); navigate('/login'); };

    const displayZones = selectedZone === 'all'
        ? zones
        : zones.filter(z => z.name === selectedZone);

    const getPctColor = (pct: number) => {
        if (pct >= 75) return '#16c784';
        if (pct >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const getPctBg = (pct: number) => {
        if (pct >= 75) return '#dcfce7';
        if (pct >= 50) return '#fef3c7';
        return '#fee2e2';
    };

    if (isLoading || loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 18, color: '#4A90E2', fontFamily: 'Quicksand, sans-serif' }}>
            Loading statistics...
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Quicksand', 'Noto Sans Malayalam', sans-serif", background: '#f0f2f8' }}>
            {/* Overlay */}
            {isMobileMenuOpen && (
                <div onClick={() => setIsMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
            )}

            {/* Sidebar */}
            <div style={{
                width: '260px', background: '#1a1f2e', color: 'white', display: 'flex', flexDirection: 'column',
                padding: 0, boxShadow: '4px 0 20px rgba(0,0,0,0.15)', position: 'fixed', top: 0, bottom: 0, zIndex: 100,
                ...(window.innerWidth < 768 ? { transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-260px)', transition: 'transform 0.3s ease' } : {})
            }}>
                <div style={{ padding: '30px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.username || 'Admin'}</div>
                    <div style={{ fontSize: 12, color: '#8b93a7', marginTop: 4 }}>Statistics View</div>
                </div>
                <nav style={{ padding: '20px 12px', flex: 1 }}>
                    {[
                        { label: '📊 Dashboard', to: '/admin' },
                        { label: '✅ Check-in', to: '/checkin' },
                        { label: '📈 Statistics', to: '/statistics', active: true },
                        { label: '🏆 Ranking', to: '/ranking' },
                    ].map(item => (
                        <Link key={item.to} to={item.to} style={{
                            display: 'block', padding: '12px 16px', borderRadius: 10, marginBottom: 6,
                            color: item.active ? 'white' : '#8b93a7', fontWeight: item.active ? 700 : 500,
                            background: (item as any).active ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'transparent',
                            textDecoration: 'none', fontSize: 15, transition: 'all 0.2s ease'
                        }}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#8b93a7', padding: '10px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>Logout</button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ marginLeft: window.innerWidth >= 768 ? '260px' : 0, flex: 1 }}>
                {/* Header */}
                <div style={{ background: 'white', padding: '20px 30px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer' }}>☰</button>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            📈 Statistics
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#8b93a7', fontSize: 14 }}>Live attendance breakdown by zone</p>
                    </div>
                    <button onClick={fetchStats} style={{ background: '#f0f2f8', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', color: '#495057' }}>
                        🔄 Refresh
                    </button>
                </div>

                <div style={{ padding: '24px 30px' }}>
                    {/* Overall Stats Cards */}
                    {overall && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
                            {[
                                { label: 'Registered', value: overall.totalRegistered, icon: '📋', color: '#0891b2', bg: '#e0f2fe' },
                                { label: 'Present', value: overall.present, icon: '✅', color: '#16c784', bg: '#dcfce7' },
                                { label: 'Not Attended', value: overall.notAttended, icon: '❌', color: '#ef4444', bg: '#fee2e2' },
                                { label: 'On Leave', value: overall.leave, icon: '🏖️', color: '#f59e0b', bg: '#fef3c7' },
                                { label: 'Attendance %', value: `${overall.percentage}%`, icon: '📊', color: getPctColor(overall.percentage), bg: getPctBg(overall.percentage) },
                            ].map((card, i) => (
                                <div key={i} style={{ background: card.bg, borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${card.color}22` }}>
                                    <div style={{ fontSize: 26, marginBottom: 8 }}>{card.icon}</div>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: card.color }}>{card.value}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginTop: 4 }}>{card.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Zone Filter */}
                    <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', marginBottom: 24 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#495057', marginBottom: 8, fontSize: 14 }}>Filter by Zone</label>
                        <select
                            value={selectedZone}
                            onChange={e => setSelectedZone(e.target.value)}
                            style={{ padding: '10px 16px', borderRadius: 10, border: '2px solid #fef3c7', fontSize: 15, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'white', width: '100%', maxWidth: 320 }}
                        >
                            <option value="all">All Zones</option>
                            {zones.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
                        </select>
                    </div>

                    {/* Zone Table */}
                    <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(135deg, #f59e0b11, #ef444411)', borderBottom: '2px solid #f0f2f8' }}>
                                        {['Zone', 'Registered', 'Present', 'Not Attended', 'On Leave', 'Attendance %'].map(h => (
                                            <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 700, color: '#495057', fontSize: 13, whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayZones.sort((a, b) => b.percentage - a.percentage).map((zone, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f0f2f8', transition: 'background 0.2s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#1a1f2e' }}>{zone.name}</td>
                                            <td style={{ padding: '14px 20px', color: '#0891b2', fontWeight: 700 }}>{zone.totalRegistered}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ background: '#dcfce7', color: '#16c784', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                                                    {zone.present}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                                                    {zone.notAttended}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ background: '#fef3c7', color: '#f59e0b', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                                                    {zone.leave}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ flex: 1, background: '#f0f2f8', borderRadius: 6, height: 8, minWidth: 80, overflow: 'hidden' }}>
                                                        <div style={{ width: `${zone.percentage}%`, height: '100%', background: `linear-gradient(90deg, ${getPctColor(zone.percentage)}, ${getPctColor(zone.percentage)}99)`, borderRadius: 6, transition: 'width 0.5s ease' }} />
                                                    </div>
                                                    <span style={{ background: getPctBg(zone.percentage), color: getPctColor(zone.percentage), padding: '4px 12px', borderRadius: 20, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
                                                        {zone.percentage}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayZones.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#8b93a7' }}>No data available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
