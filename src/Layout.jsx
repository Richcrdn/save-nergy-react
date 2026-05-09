import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Layout({ session }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [userRole, setUserRole] = useState('student');
    const [userName, setUserName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSidebarToggled, setIsSidebarToggled] = useState(localStorage.getItem('sb|sidebar-toggle') === 'true');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (isSidebarToggled) {
            document.body.classList.add('sb-sidenav-toggled');
        } else {
            document.body.classList.remove('sb-sidenav-toggled');
        }
        localStorage.setItem('sb|sidebar-toggle', isSidebarToggled);
    }, [isSidebarToggled]);

    useEffect(() => {
        if (session?.user) {
            setUserName(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User');
            setUserRole(session.user.user_metadata?.role || 'student');
            setAvatarUrl(session.user.user_metadata?.avatar_url || '');
        }
    }, [session]);

    useEffect(() => {
        const loadNotifications = async () => {
            const { data: alerts } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5);
            if (alerts) {
                setNotifications(alerts);
                setUnreadCount(alerts.length);
            }
        };
        loadNotifications();
    }, []);

    const markAllRead = () => setUnreadCount(0);

    const handleLogout = async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        navigate('/login');
    };

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    const isAdmin = ['admin', 'prof'].includes(userRole);

    return (
        <>
            {/* Dashboard Background Animation */}
            <ul className="dashboard-bg-animation">
                <li></li><li></li><li></li><li></li><li></li>
                <li></li><li></li><li></li><li></li><li></li>
            </ul>
            
            <div className="d-flex" id="wrapper">
            {/* Sidebar */}
            <div id="sidebar-wrapper">
                <div className="sidebar-heading d-flex justify-content-center align-items-center">
                    <img src="/logos.png" alt="Logo" className="sidebar-logo" style={{ height: '75px', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))', margin: '15px 0' }} />
                </div>
                <div className="list-group flex-grow-1">
                    <div className="sidebar-label">Menu</div>
                    <Link className={`list-group-item list-group-item-action ${location.pathname === '/' ? 'active' : ''}`} to="/">
                        <i className="bi bi-speedometer2 me-2"></i> Dashboard
                    </Link>
                    <Link className={`list-group-item list-group-item-action ${location.pathname === '/history' ? 'active' : ''}`} to="/history">
                        <i className="bi bi-graph-up me-2"></i> Analytics
                    </Link>
                    {isAdmin && (
                        <Link className={`list-group-item list-group-item-action ${location.pathname === '/reports' ? 'active' : ''}`} to="/reports">
                            <i className="bi bi-file-earmark-text me-2"></i> Reports
                        </Link>
                    )}
                </div>
                <div className="sidebar-footer">
                    <a className="list-group-item list-group-item-action logout-link bg-transparent border-0" href="#" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i> Logout
                    </a>
                </div>
            </div>

            {/* Page Content */}
            <div id="page-content-wrapper">
                <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
                    <div className="container-fluid px-4">
                        <button className="btn btn-link text-dark" id="sidebarToggle" onClick={() => setIsSidebarToggled(!isSidebarToggled)}>
                            <i className="bi bi-list fs-4" id="sidebarIcon"></i>
                        </button>
                        
                        <div className="d-flex align-items-center gap-3 ms-auto">
                            <button className="btn btn-link nav-link navbar-icon-btn" onClick={toggleTheme}>
                                <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'} fs-5`}></i>
                            </button>
                            
                            {/* Notifications Dropdown */}
                            <div className="dropdown">
                                <button className="btn btn-link nav-link navbar-icon-btn" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i className="bi bi-bell-fill fs-5"></i>
                                    {unreadCount > 0 && (
                                        <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ width: '10px', height: '10px', top: '10px !important', left: '28px !important' }}>
                                            <span className="visually-hidden">New alerts</span>
                                        </span>
                                    )}
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg py-0 animate-fade-in" style={{ width: '300px' }}>
                                    <li className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                        <h6 className="mb-0 fw-bold">Notifications {unreadCount > 0 && <span className="badge bg-danger ms-2">{unreadCount}</span>}</h6>
                                        <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={markAllRead} style={{ fontSize: '0.8rem' }}>Mark all as read</button>
                                    </li>
                                    <div>
                                        {notifications.length > 0 ? notifications.map(alert => {
                                            let icon = 'bi-info-circle-fill', color = 'text-primary', bg = 'bg-primary-subtle';
                                            if (alert.type === 'overload') { icon = 'bi-exclamation-triangle-fill'; color = 'text-danger'; bg = 'bg-danger-subtle'; }
                                            if (alert.type === 'offline') { icon = 'bi-wifi-off'; color = 'text-dark'; bg = 'bg-secondary-subtle'; }
                                            return (
                                                <li key={alert.id}><a className="dropdown-item py-3 border-bottom" href="#">
                                                    <div className="d-flex align-items-start">
                                                        <div className={`${bg} p-2 rounded-circle me-3 mt-1`}><i className={`bi ${icon} ${color}`}></i></div>
                                                        <div>
                                                            <div className="small fw-bold text-wrap">{alert.message}</div>
                                                            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{new Date(alert.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                    </div>
                                                </a></li>
                                            );
                                        }) : (
                                            <li><div className="text-center py-4 text-muted small">No recent notifications</div></li>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <li><Link className="dropdown-item py-2 text-center text-primary small fw-bold" to="/reports">View All Alerts</Link></li>
                                    )}
                                </ul>
                            </div>

                            {/* User Profile */}
                            <div className="dropdown">
                                <a className="nav-link dropdown-toggle d-flex align-items-center gap-2 ps-2" href="#" data-bs-toggle="dropdown">
                                    <div className="text-end d-none d-lg-block line-height-sm">
                                    <div className="fw-bold text-dark user-display-name" style={{ fontSize: '0.9rem' }}>{userName}</div>
                                    <div className="text-muted small user-display-role" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{userRole}</div>
                                    </div>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile" className="rounded-circle shadow-sm" style={{ width: '38px', height: '38px', objectFit: 'cover' }} />
                                ) : (
                                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm user-initial" style={{ width: '38px', height: '38px', fontSize: '1rem', background: 'linear-gradient(135deg, #862334, #ffc553)' }}>
                                            {(userName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg animate-fade-in">
                                    <li><div className="dropdown-header">Signed in as <strong className="user-display-name">{userName}</strong></div></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><Link className="dropdown-item py-2" to="/profile"><i className="bi bi-person-gear me-2 text-primary"></i>My Profile</Link></li>
                                    {isAdmin && <li><Link className="dropdown-item py-2" to="/admin"><i className="bi bi-sliders me-2 text-info"></i>Settings</Link></li>}
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><a className="dropdown-item py-2 text-danger" href="#" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Sign Out</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </nav>
                
                {/* Dito papasok ang laman ng bawat page (Dashboard, History, etc.) */}
                <div className="container-fluid px-4">
                    <Outlet />
                </div>
                
            </div>
        </div>
        </>
    );
}
