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

interface RoleStats {
    total: number;
    registered: number;
    percentage: string;
    isComplete: boolean;
}

interface ZoneRoleStats {
    name: string;
    secretariat: RoleStats;
    executive: RoleStats;
}

interface Member {
    zone: string;
    name: string;
    mobile: string;
    participated: string;
    status: string;
    role: string;
    executive: string;
    registered: boolean;
}

export default function Dashboard() {
    const { token, logout, user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedZone, setSelectedZone] = useState<string>('all');
    const [selectedRole, setSelectedRole] = useState<string>('All');
    const [loading, setLoading] = useState(true);
    const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);
    const [roleStats, setRoleStats] = useState<ZoneRoleStats[]>([]);
    const [showRoleReport, setShowRoleReport] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    useEffect(() => {
        // Wait for auth loading to complete
        if (isLoading) return;

        if (!token) {
            navigate('/login');
            return;
        }
        fetchData();
        fetchRoleStats();
    }, [token, navigate, isLoading]);

    useEffect(() => {
        if (token) {
            fetchMembers();
        }
    }, [selectedZone, selectedRole, token]);

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
            const url = `${backendUrl}/api/dashboard/members?zone=${selectedZone}&role=${selectedRole}`;
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

    const fetchRoleStats = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/dashboard/role-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch role stats');

            const data = await response.json();
            setRoleStats(data.stats);
        } catch (error) {
            console.error('Error fetching role stats:', error);
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

    // Calculate stats based on filtered members
    const filteredTotal = members.length;
    const filteredRegistered = registeredMembers.length;
    const filteredNotRegistered = notRegisteredMembers.length;
    const filteredPercentage = filteredTotal > 0
        ? ((filteredRegistered / filteredTotal) * 100).toFixed(1)
        : '0';

    // Generate WhatsApp message
    const generateWhatsAppMessage = () => {
        if (selectedZone === 'all') return '';

        let message = '';

        // Header based on role filter
        if (selectedRole === 'Secretariat') {
            message = `${selectedZone} മണ്ഡലത്തിൽ സെക്രട്ടേറിയറ്റ്  അംഗങ്ങളിൽ തർബിയക്ക് രജിസ്റ്റർ ചെയ്യാത്തവർ\n\n`;
        } else if (selectedRole === 'Executive') {
            message = `${selectedZone} മണ്ഡലത്തിൽ എക്സിക്യൂട്ടീവ്  അംഗങ്ങളിൽ തർബിയക്ക് രജിസ്റ്റർ ചെയ്യാത്തവർ\n\n`;
        } else {
            message = `${selectedZone} മണ്ഡലത്തിൽ തർബിയക്ക് രജിസ്റ്റർ ചെയ്യാത്തവർ\n\n`;
        }

        // Add numbered list of unregistered members
        notRegisteredMembers.forEach((member, index) => {
            message += `${index + 1}. ${member.name}\n`;
        });

        // Add footer
        message += `\nഇവരെ ഫോളോ ചെയ്ത് രജിസ്റ്റർ ചെയ്യിപ്പിച്ചു റിപ്പോർട്ട് നൽകുമല്ലോ`;

        return message;
    };

    // Copy WhatsApp message to clipboard
    const copyWhatsAppMessage = async () => {
        const message = generateWhatsAppMessage();
        if (!message) return;

        try {
            await navigator.clipboard.writeText(message);
            alert('WhatsApp message copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy message:', error);
            alert('Failed to copy message. Please try again.');
        }
    };

    return (
        <div className="dashboard-container">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="mobile-menu-overlay"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 99,
                        backdropFilter: 'blur(2px)'
                    }}
                />
            )}

            {/* Dark Sidebar */}
            <div className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-profile">
                    <div className="profile-avatar">
                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <p className="profile-name">{user?.username || 'Admin'}</p>
                    <p className="profile-email">{user?.username || 'admin'}</p>
                </div>
                <ul className="sidebar-nav">
                    <li><a href="#" className={!showRoleReport ? "active" : ""} onClick={(e) => { e.preventDefault(); setShowRoleReport(false); setIsMobileMenuOpen(false); }}>Dashboard</a></li>
                    <li><a href="#" className={showRoleReport ? "active" : ""} onClick={(e) => { e.preventDefault(); setShowRoleReport(true); setIsMobileMenuOpen(false); }}>Role Report</a></li>
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
                {!showRoleReport ? (
                    <>
                        <div className="dashboard-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button
                                    className="mobile-menu-btn"
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        color: '#333'
                                    }}
                                >
                                    ☰
                                </button>
                                <h1>Registration Dashboard</h1>
                            </div>
                        </div>

                        {/* Zone Header - Show when filtered */}
                        {(selectedZone !== 'all' || selectedRole !== 'All') && (
                            <div className="zone-header">
                                <h2>
                                    {selectedZone !== 'all' && selectedZone}
                                    {selectedZone !== 'all' && selectedRole !== 'All' && ' - '}
                                    {selectedRole !== 'All' && selectedRole}
                                </h2>
                                <button onClick={() => { setSelectedZone('all'); setSelectedRole('All'); }} className="reset-btn">
                                    Reset Filters
                                </button>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="zone-filter-section">
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                {/* Zone Filter */}
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <label htmlFor="zone-select">Filter by Zone:</label>
                                    <select
                                        id="zone-select"
                                        value={selectedZone}
                                        onChange={(e) => {
                                            setSelectedZone(e.target.value);
                                            if (e.target.value === 'all') {
                                                setSelectedRole('All');
                                            }
                                        }}
                                        className="zone-select"
                                    >
                                        <option value="all">All Zones</option>
                                        {zones.map(zone => (
                                            <option key={zone.name} value={zone.name}>
                                                {zone.name} ({zone.registered}/{zone.total})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Role Filter */}
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <label htmlFor="role-select">Filter by Role:</label>
                                    <select
                                        id="role-select"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="zone-select"
                                        disabled={selectedZone === 'all'}
                                        style={{ opacity: selectedZone === 'all' ? 0.5 : 1 }}
                                    >
                                        <option value="All">All</option>
                                        <option value="Secretariat">Secretariat</option>
                                        <option value="Executive">Executive</option>
                                    </select>
                                    {selectedZone === 'all' && (
                                        <small style={{ color: '#8b93a7', marginTop: '5px', display: 'block' }}>
                                            Please select a zone first to filter by role
                                        </small>
                                    )}
                                </div>
                            </div>
                            {selectedZone !== 'all' && (
                                <div className="zone-stats" style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span className="zone-percentage">{filteredPercentage}% Registered</span>
                                    {notRegisteredMembers.length > 0 && (
                                        <button
                                            onClick={copyWhatsAppMessage}
                                            style={{
                                                background: '#25D366',
                                                color: 'white',
                                                border: 'none',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#20BA5A'}
                                            onMouseOut={(e) => e.currentTarget.style.background = '#25D366'}
                                        >
                                            📋 Copy WhatsApp Message ({notRegisteredMembers.length} unregistered)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* WhatsApp Message Preview */}
                        {selectedZone !== 'all' && notRegisteredMembers.length > 0 && (
                            <div style={{
                                marginTop: '20px',
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '1px solid #e0e0e0'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: showWhatsAppPreview ? '15px' : '0'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>
                                        📱 WhatsApp Message Preview
                                    </h3>
                                    <button
                                        onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #ddd',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            color: '#666'
                                        }}
                                    >
                                        {showWhatsAppPreview ? '▲ Hide' : '▼ Show'}
                                    </button>
                                </div>
                                {showWhatsAppPreview && (
                                    <div style={{
                                        background: 'white',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        fontFamily: 'monospace',
                                        fontSize: '14px',
                                        whiteSpace: 'pre-wrap',
                                        border: '1px solid #e0e0e0',
                                        color: '#333',
                                        lineHeight: '1.6'
                                    }}>
                                        {generateWhatsAppMessage()}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stats Cards */}
                        <div className="stats-cards">
                            <div className="stat-card blue">
                                <div className="stat-value">{filteredTotal}</div>
                                <div className="stat-label">Total Members</div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-value">{filteredRegistered}</div>
                                <div className="stat-label">Registered</div>
                                <div className="stat-percentage">{filteredPercentage}%</div>
                            </div>
                            <div className="stat-card orange">
                                <div className="stat-value">{filteredNotRegistered}</div>
                                <div className="stat-label">Not Registered</div>
                                <div className="stat-percentage">{(100 - parseFloat(filteredPercentage)).toFixed(1)}%</div>
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
                    </>
                ) : (
                    <>
                        {/* Role Report Section */}
                        <div className="dashboard-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                                <button
                                    className="mobile-menu-btn"
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        color: '#333'
                                    }}
                                >
                                    ☰
                                </button>
                                <div>
                                    <h1>📊 Role Registration Report</h1>
                                    <p style={{ color: '#8b93a7', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                                        Zone-wise registration status for Secretariat and Executive members
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px', marginTop: '30px' }}>
                            {/* Secretariat Report */}
                            <div style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '16px',
                                padding: '30px',
                                color: 'white',
                                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                            }}>
                                <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 700 }}>
                                    🎯 Secretariat Members
                                </h2>

                                {/* 100% Complete Zones */}
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', marginBottom: '12px', opacity: 0.9 }}>
                                        ✅ 100% Registration ({roleStats.filter(z => z.secretariat.isComplete).length} zones)
                                    </h3>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '15px' }}>
                                        {roleStats.filter(z => z.secretariat.isComplete).length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {roleStats.filter(z => z.secretariat.isComplete).map((zone, idx) => (
                                                    <span key={idx} style={{
                                                        background: 'rgba(255,255,255,0.25)',
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '13px',
                                                        fontWeight: 600
                                                    }}>
                                                        {zone.name} ({zone.secretariat.total})
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>No zones with 100% registration yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Incomplete Zones */}
                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '12px', opacity: 0.9 }}>
                                        ⚠️ Pending Registration ({roleStats.filter(z => !z.secretariat.isComplete && z.secretariat.total > 0).length} zones)
                                    </h3>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {roleStats.filter(z => !z.secretariat.isComplete && z.secretariat.total > 0).length > 0 ? (
                                            roleStats.filter(z => !z.secretariat.isComplete && z.secretariat.total > 0).sort((a, b) => parseFloat(b.secretariat.percentage) - parseFloat(a.secretariat.percentage)).map((zone, idx) => (
                                                <div key={idx} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: idx < roleStats.filter(z => !z.secretariat.isComplete && z.secretariat.total > 0).length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '16px' }}>{zone.name}</span>
                                                        <span style={{ fontSize: '13px', opacity: 0.9 }}>
                                                            {zone.secretariat.registered}/{zone.secretariat.total} ({zone.secretariat.percentage}%)
                                                        </span>
                                                    </div>
                                                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: parseFloat(zone.secretariat.percentage) >= 75 ? '#4ade80' : parseFloat(zone.secretariat.percentage) >= 50 ? '#fbbf24' : '#f87171',
                                                            height: '100%',
                                                            width: `${zone.secretariat.percentage}%`,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>All zones have 100% registration! 🎉</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Executive Report */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                borderRadius: '16px',
                                padding: '30px',
                                color: 'white',
                                boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)'
                            }}>
                                <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 700 }}>
                                    🎯 Executive Members
                                </h2>

                                {/* 100% Complete Zones */}
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '16px', marginBottom: '12px', opacity: 0.9 }}>
                                        ✅ 100% Registration ({roleStats.filter(z => z.executive.isComplete).length} zones)
                                    </h3>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '15px' }}>
                                        {roleStats.filter(z => z.executive.isComplete).length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {roleStats.filter(z => z.executive.isComplete).map((zone, idx) => (
                                                    <span key={idx} style={{
                                                        background: 'rgba(255,255,255,0.25)',
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '13px',
                                                        fontWeight: 600
                                                    }}>
                                                        {zone.name} ({zone.executive.total})
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>No zones with 100% registration yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Incomplete Zones */}
                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '12px', opacity: 0.9 }}>
                                        ⚠️ Pending Registration ({roleStats.filter(z => !z.executive.isComplete && z.executive.total > 0).length} zones)
                                    </h3>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {roleStats.filter(z => !z.executive.isComplete && z.executive.total > 0).length > 0 ? (
                                            roleStats.filter(z => !z.executive.isComplete && z.executive.total > 0).sort((a, b) => parseFloat(b.executive.percentage) - parseFloat(a.executive.percentage)).map((zone, idx) => (
                                                <div key={idx} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: idx < roleStats.filter(z => !z.executive.isComplete && z.executive.total > 0).length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '16px' }}>{zone.name}</span>
                                                        <span style={{ fontSize: '13px', opacity: 0.9 }}>
                                                            {zone.executive.registered}/{zone.executive.total} ({zone.executive.percentage}%)
                                                        </span>
                                                    </div>
                                                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: parseFloat(zone.executive.percentage) >= 75 ? '#4ade80' : parseFloat(zone.executive.percentage) >= 50 ? '#fbbf24' : '#f87171',
                                                            height: '100%',
                                                            width: `${zone.executive.percentage}%`,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>All zones have 100% registration! 🎉</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
