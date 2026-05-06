import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';

export default function Admin() {
    const [threshold, setThreshold] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.rpc('get_users_list');
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsersError(error.message);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('setting_value')
                .eq('setting_key', 'max_power_threshold')
                .single();
            
            if (error) throw error;
            if (data) setThreshold(data.setting_value);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const { error } = await supabase
                .from('settings')
                .update({ setting_value: threshold })
                .eq('setting_key', 'max_power_threshold');

            if (error) throw error;

            // Log the activity
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Admin';
                await supabase.from('audit_log').insert([{ 
                    username, 
                    action: 'settings_update', 
                    details: `Updated max power threshold to ${threshold}W` 
                }]);
            }

            setMessage({ text: 'System settings saved successfully!', type: 'success' });
        } catch (error) {
            setMessage({ text: error.message, type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingUserId(userId);
        try {
            // Tawagin ang ating bagong SQL Function
            const { error } = await supabase.rpc('update_user_role', { user_id: userId, new_role: newRole });
            if (error) throw error;

            // I-update ang listahan sa screen para mag-reflect agad
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

            // I-log sa Recent Activity
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Admin';
                await supabase.from('audit_log').insert([{ 
                    username, 
                    action: 'user_update', 
                    details: `Updated role of user to ${newRole.toUpperCase()}` 
                }]);
            }
        } catch (err) {
            alert("Failed to update role: " + err.message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const clearDemoData = async () => {
        if (window.confirm("Are you sure you want to clear ALL sensor readings and system alerts? This action cannot be undone.")) {
            // Delete all records where device_id is not null (which targets all rows safely)
            const { error: sensorError } = await supabase.from('sensor_readings').delete().neq('power_watts', -1);
            // Delete all alerts safely
            const { error: alertError } = await supabase.from('alerts').delete().neq('id', 0);

            if (sensorError || alertError) {
                alert("Failed to clear data: " + (sensorError?.message || alertError?.message));
            } else {
                alert("System data and alerts successfully cleared!");
            }
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="row mb-4">
                <div className="col-12">
                    <h2 className="fw-bold text-dark mb-1">Admin Settings</h2>
                    <p className="text-muted mb-0">Configure system parameters and threshold alerts.</p>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold text-dark">
                                <i className="bi bi-sliders me-2 text-primary"></i>
                                System Thresholds
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            {message.text && (
                                <div className={`alert alert-${message.type} py-2 small`}>
                                    <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                                    {message.text}
                                </div>
                            )}
                            
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                </div>
                            ) : (
                                <form onSubmit={handleSave}>
                                    <div className="mb-4">
                                        <label className="form-label fw-bold text-secondary small text-uppercase" style={{ letterSpacing: '1px' }}>
                                            Max Power Threshold
                                        </label>
                                        <div className="input-group input-group-lg">
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={threshold} 
                                                onChange={e => setThreshold(e.target.value)} 
                                                required 
                                                min="0"
                                            />
                                            <span className="input-group-text bg-light text-muted">Watts</span>
                                        </div>
                                        <div className="form-text mt-2 text-muted">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Alerts will be triggered automatically if AC consumption exceeds this value.
                                        </div>
                                    </div>
                                    
                                    <button type="submit" className="btn btn-primary px-4 py-2" disabled={saving}>
                                        {saving ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                        ) : (
                                            <><i className="bi bi-save me-2"></i>Save Configuration</>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* User Management Panel */}
                <div className="col-lg-6 mt-4 mt-lg-0">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-white py-3 border-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-people-fill me-2 text-primary"></i>User Management</h5>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    alert("Dahil naka-Supabase na ang system, ang pag-add, pag-edit, at pag-delete ng users ay ginagawa nang mas secured sa loob ng iyong Supabase Dashboard -> Authentication.");
                                    window.open('https://supabase.com/dashboard/project/zeqarhuybzdrsktttqyx/auth/users', '_blank');
                                }}>
                                    <i className="bi bi-plus-circle me-1"></i> Add User
                                </button>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover table-borderless mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-4">Username</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th className="pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingUsers ? (
                                            <tr><td colSpan="4" className="text-center p-4"><div className="spinner-border spinner-border-sm text-primary" role="status"></div></td></tr>
                                        ) : usersError ? (
                                            <tr><td colSpan="4" className="text-danger p-3">Error: {usersError}. Siguraduhing na-run mo ang SQL Query sa Supabase.</td></tr>
                                        ) : users.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center p-4 text-muted">No users found.</td></tr>
                                        ) : users.map((u, index) => (
                                            <tr key={index}>
                                                <td className="ps-4">
                                                    <div className="fw-bold text-dark">{u.username || 'No Username'}</div>
                                                    <div className="small text-muted">{u.email}</div>
                                                </td>
                                                <td>
                                                    <select 
                                                        className={`form-select form-select-sm fw-bold ${['admin', 'prof'].includes(u.role) ? 'text-primary' : 'text-secondary'}`}
                                                    value={u.role || 'student'} 
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        disabled={updatingUserId === u.id}
                                                        style={{ width: '110px', backgroundColor: 'transparent', border: '1px solid #e5e7eb' }}
                                                    >
                                                        <option value="admin">ADMIN</option>
                                                        <option value="prof">PROF</option>
                                                    <option value="student">STUDENT</option>
                                                    </select>
                                                </td>
                                                <td><span className="badge bg-success">Active</span></td>
                                                <td className="pe-4">
                                                    <span className="text-muted small">Updated</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Management Panel */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card border-0 shadow-sm" style={{ borderLeft: '4px solid #dc3545' }}>
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold text-dark">
                                <i className="bi bi-database-exclamation me-2 text-danger"></i>
                                Data Management
                            </h5>
                        </div>
                        <div className="card-body p-4 d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h6 className="fw-bold mb-1">Clear System Data</h6>
                                <p className="text-muted small mb-0">
                                    This will permanently delete all recorded sensor readings and system alerts from the database. Use with caution.
                                </p>
                            </div>
                            <div className="d-flex gap-2 mt-3 mt-md-0">
                                <button className="btn btn-danger px-4" onClick={clearDemoData}>
                                    <i className="bi bi-trash3-fill me-2"></i>Clear All Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
