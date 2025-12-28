import React, { useState, useEffect } from 'react';
import './RegistrationForm.css';

// Data structure type
interface UserData {
    mandalam: string;
    name: string;
}

export default function RegistrationForm() {
    const [data, setData] = useState<UserData[]>([]);

    const [selectedMandalam, setSelectedMandalam] = useState('');
    const [selectedName, setSelectedName] = useState('');
    const [mobile, setMobile] = useState('');
    const [participated, setParticipated] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    // Fetch dropdown data from backend on mount
    useEffect(() => {
        fetch(`${backendUrl}/api/data`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(fetchedData => {
                setData(fetchedData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch data", err);
                setError('Failed to load data. Is the backend running?');
                setLoading(false);
            });
    }, []);

    // Extract unique Mandalams
    const mandalamOptions = [...new Set(data.map(item => item.mandalam))];

    // Filter names based on selected mandalam
    const nameOptions = selectedMandalam
        ? data.filter(item => item.mandalam === selectedMandalam).map(item => item.name)
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch(`${backendUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mandalam: selectedMandalam,
                    name: selectedName,
                    mobile,
                    participated
                }),
            });

            if (response.ok) {
                alert('നന്ദി! വിവരങ്ങൾ രേഖപ്പെടുത്തിയിരിക്കുന്നു.');
                // Reset form
                setSelectedMandalam('');
                setSelectedName('');
                setMobile('');
                setParticipated('');
            } else {
                alert('Connection Error! Please try again.');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Something went wrong. Please check your connection.');
        }
    };

    return (
        <div className="registration-container">
            <form className="registration-form" onSubmit={handleSubmit}>
                <h1 className="main-heading">തർബിയ 2026</h1>
                <h1 className="sub-heading">March 01</h1>
                {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
                {loading && <div style={{ color: '#4A90E2', textAlign: 'center', marginBottom: '10px' }}>Loading...</div>}
                <h2 className="form-title">രജിസ്ട്രേഷൻ ഫോം</h2>

                <div className="form-group">
                    <label htmlFor="mandalam">മണ്ഡലം</label>
                    <select
                        id="mandalam"
                        value={selectedMandalam}
                        onChange={(e) => {
                            setSelectedMandalam(e.target.value);
                            setSelectedName(''); // Reset name when zone changes
                        }}
                        required
                    >
                        <option value="">തിരഞ്ഞെടുക്കുക</option>
                        {mandalamOptions.map((m, index) => (
                            <option key={index} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="name">പേര്</label>
                    <select
                        id="name"
                        value={selectedName}
                        onChange={(e) => setSelectedName(e.target.value)}
                        required
                    >
                        <option value="">തിരഞ്ഞെടുക്കുക</option>
                        {nameOptions.map((n, index) => (
                            <option key={index} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="mobile">മൊബൈൽ നമ്പർ</label>
                    <input
                        type="number"
                        id="mobile"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="1234567890"
                        inputMode="numeric"
                        required
                    />
                </div>

                <div className="form-group radio-group">
                    <label>കഴിഞ്ഞ പ്രാവശ്യം നിലമ്പൂർ വെച്ച് നടന്ന തർബിയയിൽ പങ്കെടുത്തിരുന്നോ?</label>
                    <div className="radio-options">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="participated"
                                value="yes"
                                checked={participated === 'yes'}
                                onChange={() => setParticipated('yes')}
                                required
                            />
                            Yes
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="participated"
                                value="no"
                                checked={participated === 'no'}
                                onChange={() => setParticipated('no')}
                            />
                            No
                        </label>
                    </div>
                </div>

                <button type="submit" className="submit-btn">Submit</button>
            </form>
        </div>
    );
}
