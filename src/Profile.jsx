import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Link } from 'react-router-dom';

export default function Profile() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email);
                setUsername(user.user_metadata?.username || '');
                setRole((user.user_metadata?.role || 'student').toUpperCase());
                setAvatarUrl(user.user_metadata?.avatar_url || '');
            }
            setLoading(false);
        };
        fetchUserProfile();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const updates = {};
            
            if (password.trim() !== '') {
                updates.password = password;
            } else {
                setSaving(false);
                setMessage({ text: 'Please enter a new password to save changes.', type: 'danger' });
                return;
            }

            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;

            // I-log sa Recent Activity
            await supabase.from('audit_log').insert([{ 
                username: username || email?.split('@')[0], 
                action: 'profile_update', 
                details: 'User updated their profile information or credentials' 
            }]);

            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setPassword(''); // I-clear ang password field pagkatapos ma-save
        } catch (error) {
            setMessage({ text: error.message, type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="row mb-4">
                <div className="col-12">
                    <h2 className="fw-bold text-dark mb-1">My Profile</h2>
                    <p className="text-muted mb-0">Manage your account settings and credentials.</p>
                </div>
            </div>

            <div className="row g-4">
                {/* Left Column: User Summary Card & Support Links */}
                <div className="col-lg-4 d-flex flex-column gap-4">
                    <div className="card border-0 shadow-sm text-center overflow-hidden">
                        {/* Card Banner Background */}
                        <div style={{ height: '120px', background: 'linear-gradient(135deg, #862334 0%, #5e1322 100%)' }}></div>
                        
                        <div className="card-body px-4 pb-4" style={{ marginTop: '-60px' }}>
                            {/* Avatar */}
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="rounded-circle shadow mb-3" style={{ width: '100px', height: '100px', objectFit: 'cover', border: '4px solid #fff', backgroundColor: '#fff' }} />
                            ) : (
                                <div className="rounded-circle d-inline-flex align-items-center justify-content-center text-white mb-3 shadow" 
                                     style={{ width: '100px', height: '100px', fontSize: '3rem', background: 'linear-gradient(135deg, #ffc553, #f59e0b)', border: '4px solid #fff' }}>
                                    {(username || email || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            
                            <h4 className="fw-bold text-dark mb-1">{username || 'User'}</h4>
                            <p className="text-muted small mb-3">{email}</p>
                            
                            <span className={`badge px-4 py-2 rounded-pill ${['ADMIN', 'PROF'].includes(role) ? 'bg-primary' : 'bg-secondary'}`} style={{ letterSpacing: '1px' }}>
                                {role || 'STUDENT'}
                            </span>
                        </div>
                    </div>

                    {/* Support & Legal Links */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush rounded-3">
                                <Link to="/help" className="list-group-item list-group-item-action d-flex align-items-center p-3 border-0 border-bottom">
                                    <div className="bg-primary-soft text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                        <i className="bi bi-question-circle-fill fs-5"></i>
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold text-dark">Help Center</h6>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Guides and FAQs</small>
                                    </div>
                                    <i className="bi bi-chevron-right ms-auto text-muted small"></i>
                                </Link>
                                <a href="#" className="list-group-item list-group-item-action d-flex align-items-center p-3 border-0" onClick={(e) => { e.preventDefault(); alert('Terms and Privacy Policy module is under construction.'); }}>
                                    <div className="bg-success-soft text-success rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                        <i className="bi bi-shield-fill-check fs-5"></i>
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold text-dark">Terms & Policy</h6>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Privacy and rules</small>
                                    </div>
                                    <i className="bi bi-chevron-right ms-auto text-muted small"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Account Settings Form */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-gear-fill me-2 text-primary"></i>Account Settings</h5>
                        </div>
                        <div className="card-body p-4">
                            {message.text && (
                                <div className={`alert alert-${message.type} py-3 small d-flex align-items-center`}>
                                    <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5 me-3`}></i>
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleUpdateProfile}>
                                <h6 className="fw-bold text-secondary text-uppercase small mb-3" style={{ letterSpacing: '1px' }}>Profile Information</h6>
                                
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">Username</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-person"></i></span>
                                        <input type="text" className="form-control bg-light border-start-0 ps-0 text-muted" value={username} disabled />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">Email Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-envelope"></i></span>
                                            <input type="email" className="form-control bg-light border-start-0 ps-0 text-muted" value={email} disabled />
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-4 border-light" />

                                <h6 className="fw-bold text-secondary text-uppercase small mb-3" style={{ letterSpacing: '1px' }}>Security</h6>
                                
                                <div className="mb-3">
                                    <label className="form-label text-muted small fw-bold">Change Password</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-shield-lock"></i></span>
                                        <input type="password" className="form-control border-start-0 ps-0" placeholder="Enter new password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required />
                                    </div>
                                    <div className="form-text mt-2"><i className="bi bi-info-circle me-1"></i>Must be at least 6 characters long.</div>
                                </div>
                                
                                <div className="d-flex justify-content-end mt-4">
                                    <button type="submit" className="btn btn-primary px-4 py-2" disabled={saving}>
                                        {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving Changes...</> : <><i className="bi bi-save me-2"></i>Save Changes</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}