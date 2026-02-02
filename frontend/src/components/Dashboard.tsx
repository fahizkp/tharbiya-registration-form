import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

interface Stats {
    total: number;
    registered: number;
    notRegistered: number;
    percentageRegistered: number;
}

interface Zone {
    name: string;
    total: number;
    registered: number;
    notRegistered: number;
}

interface Member {
    zone: string;
    name: string;
    mobile: string;
    participated: string;
    status: string;
    registered: boolean;
}

export default function Dashboard() {
    const { token, logout, user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedZone, setSelectedZone] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    useEffect(() => {
        // Wait for auth loading to complete
        if (isLoading) return;

        if (!token) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [token, navigate, isLoading]);

    useEffect(() => {
        if (token) {
            fetchMembers();
        }
    }, [selectedZone, token]);

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, zonesRes] = await Promise.all([
                fetch(`${backendUrl}/api/dashboard/stats`, { headers }),
                fetch(`${backendUrl}/api/dashboard/zones`, { headers })
            ]);

            if (!statsRes.ok || !zonesRes.ok) throw new Error('Failed to fetch data');

            const statsData = await statsRes.json();
            const zonesData = await zonesRes.json();

            setStats(statsData);
            setZones(zonesData.zones);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const url = `${backendUrl}/api/dashboard/members?zone=${selectedZone}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch members');

            const data = await response.json();
            setMembers(data.members);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (isLoading || loading) {
        return <div className="dashboard-loading">Loading dashboard...</div>;
    }

    const registeredMembers = members.filter(m => m.registered);
    const notRegisteredMembers = members.filter(m => !m.registered);

    // Get current zone stats
    const currentZoneStats = selectedZone === 'all'
        ? stats
        : zones.find(z => z.name === selectedZone);

    const currentPercentage = currentZoneStats
        ? ((currentZoneStats.registered / currentZoneStats.total) * 100).toFixed(1)
        : 0;

    return (
        <div className="dashboard-container">
            {/* Dark Sidebar */}
            <div className="dashboard-sidebar">
                <div className="sidebar-profile">
                    <div className="profile-avatar">
                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <p className="profile-name">{user?.username || 'Admin'}</p>
                    <p className="profile-email">{user?.username || 'admin'}</p>
                </div>
                <ul className="sidebar-nav">
                    <li><a href="#" className="active">Dashboard</a></li>
                    <li><a href="/">Registration Form</a></li>
                    <li><button onClick={handleLogout} style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        padding: '14px 20px',
                        color: '#8b93a7',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '16px',
                        fontFamily: 'inherit'
                    }}>Logout</button></li>
                </ul>
            </div>

            {/* Main Content */}
            <div className="dashboard-main">
                <div className="dashboard-header">
                    <h1>Registration Dashboard</h1>
                </div>

                {/* Zone Header - Show when filtered */}
                {selectedZone !== 'all' && (
                    <div className="zone-header">
                        <h2>{selectedZone}</h2>
                        <button onClick={() => setSelectedZone('all')} className="reset-btn">
                            Reset Filter
                        </button>
                    </div>
                )}

                {/* Zone Filter */}
                <div className="zone-filter-section">
                    <label htmlFor="zone-select">Filter by Zone:</label>
                    <select
                        id="zone-select"
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        className="zone-select"
                    >
                        <option value="all">All Zones</option>
                        {zones.map(zone => (
                            <option key={zone.name} value={zone.name}>
                                {zone.name} ({zone.registered}/{zone.total})
                            </option>
                        ))}
                    </select>
                    {selectedZone !== 'all' && (
                        <div className="zone-stats">
                            <span className="zone-percentage">{currentPercentage}% Registered</span>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="stats-cards">
                    <div className="stat-card blue">
                        <div className="stat-value">{currentZoneStats?.total || 0}</div>
                        <div className="stat-label">Total Members</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-value">{currentZoneStats?.registered || 0}</div>
                        <div className="stat-label">Registered</div>
                        <div className="stat-percentage">{currentPercentage}%</div>
                    </div>
                    <div className="stat-card orange">
                        <div className="stat-value">{currentZoneStats?.notRegistered || 0}</div>
                        <div className="stat-label">Not Registered</div>
                        <div className="stat-percentage">{(100 - parseFloat(currentPercentage.toString())).toFixed(1)}%</div>
                    </div>
                </div>

                {/* Member Lists */}
                <div className="member-lists">
                    {/* Registered Members */}
                    <div className="member-section registered">
                        <h3>✅ Registered Members ({registeredMembers.length})</h3>
                        {registeredMembers.length === 0 ? (
                            <p className="no-data">No registered members yet</p>
                        ) : (
                            <ul className="member-list">
                                {registeredMembers.map((member, idx) => (
                                    <li key={idx} className="member-item">
                                        <div className="member-name">{member.name}</div>
                                        {selectedZone === 'all' && <div className="member-zone">{member.zone}</div>}
                                        <div className="member-mobile">{member.mobile}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Not Registered Members */}
                    <div className="member-section not-registered">
                        <h3>❌ Not Registered ({notRegisteredMembers.length})</h3>
                        {notRegisteredMembers.length === 0 ? (
                            <p className="no-data">All members have registered! 🎉</p>
                        ) : (
                            <ul className="member-list">
                                {notRegisteredMembers.map((member, idx) => (
                                    <li key={idx} className="member-item">
                                        <div className="member-name">{member.name}</div>
                                        {selectedZone === 'all' && <div className="member-zone">{member.zone}</div>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
