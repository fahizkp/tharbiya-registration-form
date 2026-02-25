import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface CheckInMember {
    zone: string;
    name: string;
    mobile: string;
    checkedIn: boolean;
    checkinTime?: string;
    isWalkIn?: boolean;
}

interface ZoneStat {
    name: string;
    totalRegistered: number;
    present: number;
    percentage: number;
}

/* ─── Swipe Slider Styles injected once ─── */
const TOGGLE_STYLE_ID = 'checkin-toggle-styles';
if (!document.getElementById(TOGGLE_STYLE_ID)) {
    const s = document.createElement('style');
    s.id = TOGGLE_STYLE_ID;
    s.textContent = `
        @keyframes sliderGlow {
            0%   { box-shadow: 0 0 0px rgba(22,199,132,0); }
            60%  { box-shadow: 0 0 20px rgba(22,199,132,0.6); }
            100% { box-shadow: 0 0 10px rgba(22,199,132,0.35); }
        }
        @keyframes thumbBounce {
            0%   { transform: scale(1); }
            40%  { transform: scale(1.2); }
            80%  { transform: scale(0.92); }
            100% { transform: scale(1); }
        }
        .slider-glow { animation: sliderGlow 0.5s ease forwards; }
        .thumb-bounce { animation: thumbBounce 0.35s ease; }
    `;
    document.head.appendChild(s);
}

/* ─── Swipe-to-confirm Slider ─── */
const TRACK_W = 110;
const THUMB_D = 38;
const MAX_LEFT = TRACK_W - THUMB_D - 4; // rightmost thumb position
const SWIPE_THRESHOLD = MAX_LEFT * 0.55; // must drag >55% to trigger

const Toggle = ({ checked, onChange, pending }: { checked: boolean; onChange: () => void; pending: boolean }) => {
    const [dragging, setDragging] = React.useState(false);
    const [dragX, setDragX] = React.useState<number | null>(null);
    const [bounceKey, setBounceKey] = React.useState(0);
    const startXRef = React.useRef(0);
    const trackRef = React.useRef<HTMLDivElement>(null);

    const thumbLeft = dragging && dragX !== null
        ? Math.max(3, Math.min(dragX, MAX_LEFT + 3))
        : checked ? MAX_LEFT + 3 : 3;

    const getClientX = (e: React.TouchEvent | React.MouseEvent) =>
        'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

    const onStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (pending) return;
        startXRef.current = getClientX(e);
        setDragging(true);
        setDragX(checked ? MAX_LEFT + 3 : 3);
    };

    const onMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!dragging) return;
        const delta = getClientX(e) - startXRef.current;
        const base = checked ? MAX_LEFT + 3 : 3;
        setDragX(Math.max(3, Math.min(base + delta, MAX_LEFT + 3)));
    };

    const onEnd = () => {
        if (!dragging) return;
        setDragging(false);
        const base = checked ? MAX_LEFT + 3 : 3;
        const delta = (dragX ?? base) - base;
        // toggling OFF: drag left > threshold; toggling ON: drag right > threshold
        const shouldToggle = checked
            ? delta < -SWIPE_THRESHOLD
            : delta > SWIPE_THRESHOLD;
        if (shouldToggle) {
            setBounceKey(k => k + 1);
            onChange();
        }
        setDragX(null);
    };

    const progress = ((thumbLeft - 3) / MAX_LEFT) * 100;

    return (
        <div
            ref={trackRef}
            onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
            onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
            className={checked ? 'slider-glow' : ''}
            style={{
                width: TRACK_W, height: 44, borderRadius: 22, flexShrink: 0,
                background: checked
                    ? `linear-gradient(90deg, #16c784 ${progress}%, #0ca772 100%)`
                    : `linear-gradient(90deg, #16c784 ${progress}%, #d1d5db ${progress}%)`,
                position: 'relative', cursor: pending ? 'wait' : 'ew-resize',
                userSelect: 'none', touchAction: 'none',
                transition: dragging ? 'none' : 'background 0.3s ease',
            }}
        >
            {/* Arrow hints */}
            {!checked && !dragging && (
                <span style={{ position: 'absolute', left: 44, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none', letterSpacing: -2 }}>››</span>
            )}
            {/* IN label */}
            {checked && (
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)', pointerEvents: 'none', letterSpacing: 1 }}>IN</span>
            )}
            {/* Thumb */}
            <div
                key={bounceKey}
                className={bounceKey > 0 ? 'thumb-bounce' : ''}
                style={{
                    position: 'absolute', top: 3, left: thumbLeft,
                    width: THUMB_D, height: THUMB_D, borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, pointerEvents: 'none',
                    transition: dragging ? 'none' : 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {pending ? '' : checked ? '✓' : ''}
            </div>
        </div>
    );
};

/* ─── Zone Selector Modal ─── */
const ZoneSelectorModal = ({
    allZones, selectedZones, onConfirm, onClose
}: {
    allZones: string[];
    selectedZones: string[];
    onConfirm: (zones: string[]) => void;
    onClose: () => void;
}) => {
    const [picked, setPicked] = useState<string[]>(selectedZones);
    const toggle = (z: string) => {
        setPicked(prev =>
            prev.includes(z)
                ? prev.filter(x => x !== z)
                : [...prev, z]
        );
    };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1a1f2e' }}>Select Zones for this Device</h2>
                <p style={{ margin: '0 0 20px', color: '#8b93a7', fontSize: 13 }}>Select zones to manage on this device.</p>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' }}>
                    {allZones.map(z => {
                        const active = picked.includes(z);
                        return (
                            <button key={z} onClick={() => toggle(z)} style={{
                                padding: '10px 18px', borderRadius: 24, border: `2px solid ${active ? '#16c784' : '#e5e7eb'}`,
                                background: active ? '#dcfce7' : 'white',
                                color: active ? '#065f46' : '#374151',
                                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                fontFamily: 'inherit', transition: 'all 0.15s ease'
                            }}>
                                {active ? '✓ ' : ''}{z}
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '2px solid #e5e7eb', background: 'white', color: '#6b7280', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                        Cancel
                    </button>
                    <button onClick={() => setPicked([])} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '2px solid #fee2e2', background: '#fff5f5', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                        Clear All
                    </button>
                    <button onClick={() => onConfirm(picked)} style={{
                        flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                        background: picked.length === 0 ? '#e5e7eb' : 'linear-gradient(135deg, #16c784, #0891b2)',
                        color: picked.length === 0 ? '#9ca3af' : 'white',
                        fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14
                    }}>
                        Apply {picked.length > 0 ? `(${picked.length})` : '(none)'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Member Card with tap-to-reveal name popup, time display & edit, delete for walk-ins ─── */
const MemberCard = ({
    member, pending, onToggle, onDelete, onTimeEdit, backendUrl, token
}: {
    member: CheckInMember;
    pending: boolean;
    onToggle: () => void;
    onDelete?: () => void;
    onTimeEdit?: (newTime: string) => void;
    backendUrl: string;
    token: string;
}) => {
    const [showPopup, setShowPopup] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingTime, setEditingTime] = useState(false);
    const [timeInput, setTimeInput] = useState(''); // 24hr for the <input type="time">
    const [savingTime, setSavingTime] = useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Convert "09:30 AM" / "09:30 am" → "09:30" (24hr for <input type="time">)
    const to24hr = (t: string): string => {
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return t.substring(0, 5); // already HH:MM or garbage
        let h = parseInt(m[1]);
        const min = m[2];
        const ampm = m[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${min}`;
    };

    // Convert "09:30" (24hr) → "09:30 AM" (12hr display)
    const to12hr = (t: string): string => {
        const [hStr, mStr] = t.split(':');
        let h = parseInt(hStr);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
    };

    const handleNameTap = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setShowPopup(true);
        timerRef.current = setTimeout(() => setShowPopup(false), 2000);
    };

    const handleSaveTime = async () => {
        if (!timeInput.trim()) return;
        const time12 = to12hr(timeInput); // convert from native 24hr input to 12hr string
        setSavingTime(true);
        try {
            await fetch(`${backendUrl}/api/checkin/edittime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ zone: member.zone, name: member.name, time: time12 })
            });
            onTimeEdit?.(time12);
            setEditingTime(false);
        } finally {
            setSavingTime(false);
        }
    };

    React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    return (
        <div style={{
            background: member.checkedIn ? '#f0fdf4' : 'white',
            border: `2px solid ${member.checkedIn ? '#86efac' : '#f0f2f8'}`,
            borderRadius: 14, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: member.checkedIn ? '0 2px 12px rgba(22,199,132,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease', position: 'relative',
            flexWrap: 'wrap'
        }}>
            {/* Name popup overlay */}
            {showPopup && (
                <div onClick={() => setShowPopup(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#1a1f2e', color: 'white', borderRadius: 16, padding: '18px 28px', fontSize: 22, fontWeight: 800, boxShadow: '0 8px 40px rgba(0,0,0,0.4)', maxWidth: '80vw', textAlign: 'center', lineHeight: 1.3 }}>
                        {member.name}
                        {member.isWalkIn && <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginTop: 6 }}>WALK-IN</div>}
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Tap to dismiss</div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {showDeleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: 'white', borderRadius: 16, padding: '24px 28px', maxWidth: 320, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: '#1a1f2e' }}>Delete Walk-in?</div>
                        <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{member.name} will be removed from the sheet.</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '2px solid #e5e7eb', background: 'white', color: '#6b7280', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Cancel</button>
                            <button onClick={() => { setShowDeleteConfirm(false); onDelete?.(); }} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Avatar */}
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: member.checkedIn ? 'linear-gradient(135deg, #16c784, #0891b2)' : '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: member.checkedIn ? 'white' : '#9ca3af' }}>
                {member.isWalkIn ? '🚶' : member.name.charAt(0)}
            </div>

            {/* Name + time */}
            <div style={{ flex: 1, minWidth: 0 }} onClick={handleNameTap}>
                <div style={{ fontWeight: 700, fontSize: 14, color: member.checkedIn ? '#065f46' : '#1a1f2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    {member.name}
                    {member.isWalkIn && <span style={{ fontSize: 9, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 6, marginLeft: 5 }}>WALK-IN</span>}
                </div>
                {/* Time row */}
                {member.checkedIn && !editingTime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#16c784', fontWeight: 700 }}>🕐 {member.checkinTime || '--:--'}</span>
                        <button onClick={e => { e.stopPropagation(); setTimeInput(to24hr(member.checkinTime || '')); setEditingTime(true); }}
                            style={{ fontSize: 10, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '1px 4px', borderRadius: 4, fontFamily: 'inherit' }}>✏️ edit</button>
                    </div>
                )}
                {editingTime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }} onClick={e => e.stopPropagation()}>
                        <input
                            type="time" value={timeInput}
                            onChange={e => setTimeInput(e.target.value)}
                            style={{ fontSize: 13, padding: '4px 6px', borderRadius: 6, border: '1.5px solid #16c784', outline: 'none', fontFamily: 'inherit' }}
                            autoFocus
                        />
                        <button onClick={handleSaveTime} disabled={savingTime} style={{ fontSize: 11, background: '#16c784', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                            {savingTime ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingTime(false)} style={{ fontSize: 11, background: '#f0f2f8', border: 'none', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                    </div>
                )}
                {member.mobile && !editingTime && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{member.mobile}</div>}
            </div>

            {/* Delete (walk-in only) */}
            {member.isWalkIn && (
                <button onClick={() => setShowDeleteConfirm(true)} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14, color: '#ef4444', flexShrink: 0 }}>🗑</button>
            )}

            {/* Swipe Slider */}
            <Toggle checked={member.checkedIn} pending={pending} onChange={onToggle} />
        </div>
    );
};

/* ─── Walk-in Add Form ─── */
const WalkInForm = ({ zone, token, backendUrl, onAdded }: { zone: string; token: string; backendUrl: string; onAdded: (member: CheckInMember) => void }) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${backendUrl}/api/checkin/walkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ zone, name: name.trim(), mobile: mobile.trim() })
            });
            if (!res.ok) throw new Error('Failed');
            onAdded({ zone, name: name.trim(), mobile: mobile.trim(), checkedIn: true, isWalkIn: true });
            setName(''); setMobile(''); setOpen(false);
        } catch {
            alert('Failed to add walk-in. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!open) return (
        <button onClick={() => setOpen(true)} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: '2px dashed #d1d5db',
            background: 'transparent', color: '#6b7280', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s ease', marginTop: 8
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#16c784'; e.currentTarget.style.color = '#16c784'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}
        >
            ＋ Add Attendee
        </button>
    );

    return (
        <div style={{ background: '#f0fdf4', border: '2px solid #16c784', borderRadius: 14, padding: '18px 20px', marginTop: 8 }}>
            <div style={{ fontWeight: 800, color: '#065f46', marginBottom: 14, fontSize: 15 }}>➕ New Walk-in ({zone})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                    type="text" placeholder="Full Name *" value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ padding: '12px 16px', borderRadius: 10, border: '2px solid #bbf7d0', fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
                />
                <input
                    type="tel" placeholder="Mobile Number" value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    style={{ padding: '12px 16px', borderRadius: 10, border: '2px solid #bbf7d0', fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => { setOpen(false); setName(''); setMobile(''); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #e5e7eb', background: 'white', color: '#6b7280', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                        Cancel
                    </button>
                    <button onClick={handleAdd} disabled={saving || !name.trim()} style={{
                        flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                        background: (!name.trim() || saving) ? '#e5e7eb' : 'linear-gradient(135deg, #16c784, #0891b2)',
                        color: (!name.trim() || saving) ? '#9ca3af' : 'white',
                        fontWeight: 800, cursor: (!name.trim() || saving) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14
                    }}>
                        {saving ? 'Adding...' : '✓ Add & Mark Present'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main CheckIn Page ─── */
export default function CheckInPage() {
    const { token, logout, user, isLoading } = useAuth();
    const navigate = useNavigate();

    const [allZones, setAllZones] = useState<string[]>([]);
    const [selectedZones, setSelectedZones] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [showZoneSelector, setShowZoneSelector] = useState(false);

    // members per zone: key = zone name
    const [membersByZone, setMembersByZone] = useState<Record<string, CheckInMember[]>>({});
    const [loadingZone, setLoadingZone] = useState<Record<string, boolean>>({});
    const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    useEffect(() => {
        if (isLoading) return;
        if (!token) { navigate('/login'); return; }
        fetchAllZones();
    }, [token, navigate, isLoading]);

    // When selected zones change, load members for any not yet loaded
    useEffect(() => {
        selectedZones.forEach(zone => {
            if (!membersByZone[zone]) fetchMembersForZone(zone);
        });
        if (!selectedZones.includes(selectedZones[activeTab])) setActiveTab(0);
    }, [selectedZones]);

    const fetchAllZones = async () => {
        try {
            const res = await fetch(`${backendUrl}/api/checkin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            const names: string[] = (data.zones as ZoneStat[]).map((z: ZoneStat) => z.name);
            setAllZones(names);
            // Default: pick first 6 (or fewer)
            const defaults = names;
            setSelectedZones(defaults);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchMembersForZone = useCallback(async (zone: string) => {
        setLoadingZone(prev => ({ ...prev, [zone]: true }));
        try {
            const res = await fetch(`${backendUrl}/api/checkin/members?zone=${encodeURIComponent(zone)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setMembersByZone(prev => ({ ...prev, [zone]: data.members }));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingZone(prev => ({ ...prev, [zone]: false }));
        }
    }, [token, backendUrl]);

    const handleApplyZones = (zones: string[]) => {
        setSelectedZones(zones);
        setShowZoneSelector(false);
        setActiveTab(0);
    };

    const toggleCheckIn = async (zone: string, member: CheckInMember) => {
        const key = `${member.zone}||${member.name}`;
        if (pendingToggles.has(key)) return;

        const newVal = !member.checkedIn;

        // Optimistic update
        setMembersByZone(prev => ({
            ...prev,
            [zone]: (prev[zone] || []).map(m =>
                m.name === member.name ? { ...m, checkedIn: newVal, checkinTime: newVal ? '' : undefined } : m
            )
        }));
        setPendingToggles(prev => new Set(prev).add(key));

        try {
            const res = await fetch(`${backendUrl}/api/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ zone: member.zone, name: member.name, present: newVal })
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            // Store real timestamp returned from server
            setMembersByZone(prev => ({
                ...prev,
                [zone]: (prev[zone] || []).map(m =>
                    m.name === member.name ? { ...m, checkinTime: data.checkinTime || '' } : m
                )
            }));
        } catch {
            // Revert
            setMembersByZone(prev => ({
                ...prev,
                [zone]: (prev[zone] || []).map(m =>
                    m.name === member.name ? { ...m, checkedIn: !newVal } : m
                )
            }));
        } finally {
            setPendingToggles(prev => { const s = new Set(prev); s.delete(key); return s; });
        }
    };

    const handleWalkInAdded = (zone: string, member: CheckInMember) => {
        setMembersByZone(prev => ({
            ...prev,
            [zone]: [...(prev[zone] || []), member]
        }));
    };

    const handleWalkInDeleted = async (zone: string, member: CheckInMember) => {
        // Optimistically remove
        setMembersByZone(prev => ({
            ...prev,
            [zone]: (prev[zone] || []).filter(m => m.name !== member.name)
        }));
        try {
            await fetch(`${backendUrl}/api/checkin/walkin`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ zone: member.zone, name: member.name })
            });
        } catch {
            // Revert on failure
            setMembersByZone(prev => ({
                ...prev,
                [zone]: [...(prev[zone] || []), member]
            }));
        }
    };

    const handleTimeEdited = (zone: string, name: string, newTime: string) => {
        setMembersByZone(prev => ({
            ...prev,
            [zone]: (prev[zone] || []).map(m => m.name === name ? { ...m, checkinTime: newTime } : m)
        }));
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const currentZone = selectedZones[activeTab] || '';
    const currentMembers = membersByZone[currentZone] || [];
    const presentCount = currentMembers.filter(m => m.checkedIn).length;

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 18, color: '#4A90E2', fontFamily: 'Quicksand, sans-serif' }}>Loading...</div>
    );

    return (
        <div style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden', background: '#f0f2f8', fontFamily: "'Quicksand', 'Noto Sans Malayalam', sans-serif", display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            {/* Zone Selector Modal */}
            {showZoneSelector && (
                <ZoneSelectorModal
                    allZones={allZones}
                    selectedZones={selectedZones}
                    onConfirm={handleApplyZones}
                    onClose={() => setShowZoneSelector(false)}
                />
            )}

            {/* ── Top App Bar ── */}
            <div style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, flexShrink: 0, gap: 8, flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #16c784, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0 }}>
                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #16c784, #0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                        ✅ Check-in
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Live badge */}
                    <div style={{ background: 'linear-gradient(135deg, #16c784, #0891b2)', borderRadius: 20, padding: '5px 12px', color: 'white', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {presentCount} / {currentMembers.length}
                    </div>
                    <button onClick={() => setShowZoneSelector(true)} style={{ background: '#f0f2f8', border: 'none', borderRadius: 8, padding: '7px 11px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', color: '#495057', whiteSpace: 'nowrap' }}>
                        ⚙ Zones
                    </button>
                    <Link to="/admin" style={{ background: '#f0f2f8', borderRadius: 8, padding: '7px 11px', color: '#495057', fontWeight: 700, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>Admin</Link>
                    <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Out</button>
                </div>
            </div>

            {/* ── Zone Tabs ── */}
            {selectedZones.length > 0 ? (
                <>
                    <div style={{ background: 'white', borderBottom: '2px solid #f0f2f8', display: 'flex', overflowX: 'auto', flexShrink: 0, width: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' as any }}>
                        {selectedZones.map((zone, i) => {
                            const members = membersByZone[zone] || [];
                            const present = members.filter(m => m.checkedIn).length;
                            const total = members.length;
                            const active = activeTab === i;
                            return (
                                <button
                                    key={zone}
                                    onClick={() => setActiveTab(i)}
                                    style={{
                                        flexShrink: 0, padding: '0 20px', height: 56,
                                        border: 'none', borderBottom: active ? '3px solid #16c784' : '3px solid transparent',
                                        background: active ? '#f0fdf4' : 'white',
                                        color: active ? '#065f46' : '#6b7280',
                                        fontWeight: active ? 800 : 600, fontSize: 14,
                                        cursor: 'pointer', fontFamily: 'inherit',
                                        transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
                                    }}
                                >
                                    <span style={{ whiteSpace: 'nowrap' }}>{zone}</span>
                                    {total > 0 && (
                                        <span style={{
                                            fontSize: 11, fontWeight: 800,
                                            color: present === total ? '#16c784' : (active ? '#065f46' : '#9ca3af')
                                        }}>
                                            {present}/{total}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Member List for active zone ── */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
                        {loadingZone[currentZone] ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b93a7' }}>Loading {currentZone}...</div>
                        ) : (
                            <>
                                {/* Progress bar */}
                                {currentMembers.length > 0 && (() => {
                                    const pct = currentMembers.length > 0 ? Math.round((presentCount / currentMembers.length) * 100) : 0;
                                    return (
                                        <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#6b7280' }}>
                                                <span style={{ color: '#16c784' }}>✅ {presentCount} present</span>
                                                <span style={{ color: '#f59e0b' }}>⏳ {currentMembers.length - presentCount} pending</span>
                                                <span style={{ color: '#0891b2' }}>{pct}%</span>
                                            </div>
                                            <div style={{ background: '#f0f2f8', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #16c784, #0891b2)', borderRadius: 8, transition: 'width 0.4s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Members */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {/* Walk-in Add Form — shown at TOP */}
                                    <WalkInForm
                                        zone={currentZone}
                                        token={token!}
                                        backendUrl={backendUrl}
                                        onAdded={(m) => handleWalkInAdded(currentZone, m)}
                                    />

                                    {currentMembers.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b93a7', background: 'white', borderRadius: 14, fontSize: 15 }}>
                                            No registered members for {currentZone}
                                        </div>
                                    )}

                                    {currentMembers.map((member, idx) => {
                                        const key = `${member.zone}||${member.name}`;
                                        const pending = pendingToggles.has(key);
                                        return (
                                            <MemberCard
                                                key={idx}
                                                member={member}
                                                pending={pending}
                                                onToggle={() => toggleCheckIn(currentZone, member)}
                                                onDelete={member.isWalkIn ? () => handleWalkInDeleted(currentZone, member) : undefined}
                                                onTimeEdit={(t) => handleTimeEdited(currentZone, member.name, t)}
                                                backendUrl={backendUrl}
                                                token={token!}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#8b93a7', padding: 40 }}>
                    <div style={{ fontSize: 64 }}>🗂️</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#374151' }}>No zones selected</div>
                    <div style={{ fontSize: 14 }}>Tap the ⚙ Zones button to pick zones for this tablet</div>
                    <button onClick={() => setShowZoneSelector(true)} style={{ background: 'linear-gradient(135deg, #16c784, #0891b2)', color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
                        ⚙ Select Zones
                    </button>
                </div>
            )}
        </div>
    );
}
