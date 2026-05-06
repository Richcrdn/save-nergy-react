import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';

export default function Dashboard() {
    const [userName, setUserName] = useState('User');
    const [isAdmin, setIsAdmin] = useState(true);
    const [welcomeText, setWelcomeText] = useState('Welcome back,');
    const [totalPower, setTotalPower] = useState('--');
    const [activeDevices, setActiveDevices] = useState('--');
    const [activeAlertsCount, setActiveAlertsCount] = useState(0);
    const [fetchError, setFetchError] = useState('');
    
    const [time, setTime] = useState('--:--:--');
    const [date, setDate] = useState('--');
    const [greeting, setGreeting] = useState('');

    const [rooms, setRooms] = useState({
        h205: { power: '--', temp: '--', status: null, timestamp: null, isPeak: false, isOverload: false },
        h208: { power: '--', temp: '--', status: null, timestamp: null, isPeak: false, isOverload: false }
    });
    const [activities, setActivities] = useState(null);
    const [recommendations, setRecommendations] = useState([]);

    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // --- 1. Clock & Greeting Logic ---
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString());
            setDate(now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
            const hour = now.getHours();
            if (hour >= 5 && hour < 12) setGreeting('Good Morning');
            else if (hour >= 12 && hour < 18) setGreeting('Good Afternoon');
            else setGreeting('Good Evening');
        };
        const timer = setInterval(updateClock, 1000);
        updateClock();
        return () => clearInterval(timer);
    }, []);

    // --- 2. Chart Initialization ---
    useEffect(() => {
        if (chartRef.current && !chartInstance.current) {
            const ctx = chartRef.current.getContext('2d');
            const primaryColor = '#862334';
            const secondaryColor = '#ffc553';
            
            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Room H205 (W)', borderColor: primaryColor, backgroundColor: primaryColor + '20', borderWidth: 2, fill: true, tension: 0.4, data: [] },
                        { label: 'Room H208 (W)', borderColor: secondaryColor, backgroundColor: secondaryColor + '20', borderWidth: 2, fill: true, tension: 0.4, data: [] }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { x: { display: false }, y: { beginAtZero: true } },
                    animation: { duration: 0 }
                }
            });
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, []);

    // --- 3. Data Fetching ---
    const fetchDataFromSupabase = async () => {
        try {
            setFetchError(''); // Reset error
            
            // Fetch Settings
            let threshold = 2500;
            try {
                const { data: settings } = await supabase.from('settings').select('setting_key, setting_value').in('setting_key', ['max_power_threshold']);
                if (settings) {
                    threshold = parseInt(settings.find(s => s.setting_key === 'max_power_threshold')?.setting_value) || 2500;
                }
            } catch (err) { console.warn("Settings error:", err); }

            // Fetch Devices
            const { data: devices, error: devErr } = await supabase.from('devices').select('id, name, locations ( name )');
            if (devErr) throw devErr;
            
            let totalPwr = 0;
            let activeDevs = 0;
            let activeAlerts = 0;

            const roomDataPromises = (devices || []).map(async (device) => {
                const { data: readingData } = await supabase
                    .from('sensor_readings')
                    .select('power_watts, temperature_celsius, timestamp')
                    .eq('device_id', device.id)
                    .order('timestamp', { ascending: false })
                    .limit(1);
                
                const reading = readingData && readingData.length > 0 ? readingData[0] : null;

                let isOnline = false;
                if (reading && reading.timestamp) {
                    try {
                        const readingTime = new Date(reading.timestamp + (reading.timestamp.includes('T') ? '' : ' UTC'));
                        const diffMinutes = (new Date().getTime() - readingTime.getTime()) / 60000;
                        if (diffMinutes <= 1) isOnline = true;
                    } catch (e) { console.warn("Date parse error", e); }
                }

                const locString = (device.locations?.name || '').toLowerCase();
                let roomKey = 'unknown';
                if (locString.includes('205')) roomKey = 'h205';
                else if (locString.includes('208')) roomKey = 'h208';

                return {
                    key: roomKey,
                    room_name: device.locations?.name || 'Unknown',
                    status: isOnline ? 'Online' : 'Offline',
                    power: isOnline && reading ? Math.round(reading.power_watts) : 0,
                    temperature: isOnline && reading ? parseFloat(reading.temperature_celsius).toFixed(1) : '--',
                    timestamp: reading ? reading.timestamp : null,
                    isOverload: isOnline && reading ? Math.round(reading.power_watts) > threshold : false
                };
            });

            const fetchedRooms = await Promise.all(roomDataPromises);
                    
            const h205Data = fetchedRooms.find(r => r.key === 'h205');
            const h208Data = fetchedRooms.find(r => r.key === 'h208');

            fetchedRooms.forEach(room => {
                totalPwr += room.power;
                if (room.status === 'Online') activeDevs++;
                if (room.status === 'Offline' || room.isOverload) activeAlerts++;
            });
            
            setTotalPower(fetchedRooms.length > 0 ? totalPwr.toLocaleString() : '--');
            setActiveDevices(fetchedRooms.length > 0 ? activeDevs : '--');
            setActiveAlertsCount(activeAlerts);
            
            const p205 = h205Data ? h205Data.power : 0;
            const p208 = h208Data ? h208Data.power : 0;

            setRooms({
                h205: { 
                    power: h205Data ? p205 : '--', temp: h205Data ? h205Data.temperature : '--', 
                    status: h205Data ? h205Data.status : 'Offline', timestamp: h205Data ? h205Data.timestamp : null, 
                    isPeak: (p205 > p208 && p205 > 10), isOverload: h205Data ? h205Data.isOverload : false 
                },
                h208: { 
                    power: h208Data ? p208 : '--', temp: h208Data ? h208Data.temperature : '--', 
                    status: h208Data ? h208Data.status : 'Offline', timestamp: h208Data ? h208Data.timestamp : null, 
                    isPeak: (p208 > p205 && p208 > 10), isOverload: h208Data ? h208Data.isOverload : false 
                }
            });

            // --- SMART RECOMMENDATIONS LOGIC ---
            const t205 = h205Data ? parseFloat(h205Data.temperature) : 0;
            const t208 = h208Data ? parseFloat(h208Data.temperature) : 0;
            const recs = [];
            
            if (p205 > threshold || p208 > threshold) {
                recs.push({ id: 1, icon: 'bi-exclamation-octagon-fill', color: 'text-danger', text: 'Danger: AC power consumption has exceeded the limit. Ensure it is turned off if the room is unoccupied to prevent overheating.' });
            } else if ((p205 > threshold * 0.7) || (p208 > threshold * 0.7)) {
                recs.push({ id: 2, icon: 'bi-lightning-fill', color: 'text-warning', text: 'High Consumption: Try setting the thermostat to 24°C. Studies show this can save up to 10% on electricity.' });
            }
            
            if (t205 > 26 || t208 > 26) {
                recs.push({ id: 6, icon: 'bi-thermometer-sun', color: 'text-danger', text: 'Too Hot: Room temperature is above 26°C. Consider turning on the AC or lowering the thermostat to 24°C to cool down the room efficiently.' });
            } else if ((t205 > 0 && t205 <= 21) || (t208 > 0 && t208 <= 21)) {
                recs.push({ id: 3, icon: 'bi-thermometer-snow', color: 'text-info', text: 'Too Cold: Room temperature is below 22°C. You can turn off the AC, switch to fan mode, or adjust it to 24°C to save energy and prevent freezing.' });
            }
            
            if (recs.length === 0 && activeDevs > 0) {
                recs.push({ id: 4, icon: 'bi-shield-check', color: 'text-success', text: 'Optimal: Temperature and power consumption are at good levels! Tip: Keep AC filters clean monthly to maintain efficiency.' });
            } else if (activeDevs === 0) {
                recs.push({ id: 5, icon: 'bi-plug-fill', color: 'text-secondary', text: 'Standby Mode: AC units are currently off. Ensure the main switch is unplugged if unused for long periods.' });
            }
            setRecommendations(recs);

            if (chartInstance.current) {
                const chart = chartInstance.current;
                chart.data.labels.push(new Date().toLocaleTimeString());
                chart.data.datasets[0].data.push(p205);
                chart.data.datasets[1].data.push(p208);
                if (chart.data.labels.length > 20) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                    chart.data.datasets[1].data.shift();
                }
                chart.update();
            }

            // Fetch Activity Log
            const { data: activityData } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(5);
            setActivities(activityData || []);

        } catch (error) {
            console.error("Fetch error:", error);
            setFetchError(error.message);
            setRooms(prev => ({
                h205: { ...prev.h205, status: 'Error' },
                h208: { ...prev.h208, status: 'Error' }
            }));
        }
    };

    // --- 4. Initialization and Realtime Subscription ---
    useEffect(() => {
        let isMounted = true;
        const initDashboard = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && isMounted) {
                    // Safe parsing ng email
                    const defaultName = user.email ? user.email.split('@')[0] : 'User';
                    setUserName(user.user_metadata?.username || defaultName);
                    
                    const role = user.user_metadata?.role || 'student';
                    const userIsAdmin = ['admin', 'prof'].includes(role);
                    setIsAdmin(userIsAdmin);

                    // Alamin kung new user (first login sa loob ng 5 minuto mula pag-register)
                    const createdAt = new Date(user.created_at).getTime();
                    const lastSignIn = new Date(user.last_sign_in_at).getTime();
                    const isNewUser = (lastSignIn - createdAt) < (1000 * 60 * 5);

                    if (userIsAdmin || !isNewUser) {
                        setWelcomeText('Welcome back,');
                    } else {
                        setWelcomeText('Welcome,');
                    }
                }
                if (isMounted) fetchDataFromSupabase();
            } catch (e) {
                console.error("Init Error", e);
                if (isMounted) fetchDataFromSupabase(); // Ituloy pa rin ang fetch kahit error ang user data
            }
            
            const channel = supabase.channel('realtime-dashboard')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, () => {
                    if (isMounted) fetchDataFromSupabase();
                })
                .subscribe();
                
            return () => { isMounted = false; supabase.removeChannel(channel) };
        };
        
        initDashboard();
    }, []);

    // Helper for formatting time safely without crashing
    const safeFormatTime = (ts) => {
        if (!ts) return '--:--:--';
        try { return new Date(ts + (ts.includes('T') ? '' : ' UTC')).toLocaleTimeString(); } 
        catch(e) { return '--:--:--'; }
    };

    const renderStatus = (status) => {
        if (status === 'Online') return <><span className="status-dot online"></span> <span className="text-success fw-bold small text-uppercase">Online</span></>;
        if (status === 'Offline') return <><span className="status-dot offline"></span> <span className="text-danger fw-bold small text-uppercase">Offline</span></>;
        if (status === 'Error') return <span className="badge bg-warning text-dark">Error</span>;
        return <span className="badge bg-secondary">Loading...</span>;
    };

    const getActivityIcon = (action) => {
        const icons = {
            login: { icon: 'bi-box-arrow-in-right', color: 'text-success' },
            logout: { icon: 'bi-box-arrow-left', color: 'text-danger' },
            settings_update: { icon: 'bi-gear-fill', color: 'text-primary' },
            user_create: { icon: 'bi-person-plus-fill', color: 'text-success' },
            user_update: { icon: 'bi-person-fill-gear', color: 'text-info' },
            user_status_change: { icon: 'bi-person-exclamation', color: 'text-warning' },
            profile_update: { icon: 'bi-shield-lock-fill', color: 'text-warning' },
            report_generate: { icon: 'bi-file-earmark-pdf-fill', color: 'text-danger' },
        };
        return icons[action] || { icon: 'bi-question-circle', color: 'text-muted' };
    };

    return (
        <>
            {fetchError && (
                <div className="alert alert-danger shadow-sm border-0 mb-4 animate-fade-in">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>System Error:</strong> {fetchError}
                </div>
            )}
            {/* Header */}
            <div className="row animate-fade-in">
                <div className="col-12">
                    <div className="dashboard-header">
                        <div>
                            <h2 className="text-body mb-1">{welcomeText} <span className="user-display-name">{userName}</span>!</h2>
                            <p className="text-secondary mb-0" id="dynamic-greeting">{greeting}! Here is your energy report for today.</p>
                        </div>
                        <div className="d-flex align-items-center gap-4 mt-3 mt-md-0">
                            <div className="text-end d-none d-md-block">
                                <div className="led-display">
                                    <div id="clock-time">{time}</div>
                                    <div id="clock-date">{date}</div>
                                </div>
                            </div>
                            <div className="d-flex align-items-center bg-body-secondary rounded-pill px-3 py-2">
                                <span className="status-dot online"></span> <span className="text-body fw-bold small">System Live</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Overview Widgets */}
            <div className="row g-4 mb-4 animate-fade-in delay-100">
                <div className="col-md-4" id="power-widget-container">
                    <Link to="/history" className="card stat-card primary-border h-100 text-decoration-none">
                        <div className="card-body d-flex align-items-center">
                            <div className="widget-icon-circle bg-primary-soft p-3 me-3">
                                <i className="bi bi-lightning-charge-fill fs-3 text-primary"></i>
                            </div>
                            <div>
                                <h6 className="mb-0 text-secondary text-uppercase small fw-bold">Total Power Load</h6>
                                <h3 className="mb-0 fw-bold text-body"><span id="total-power">{totalPower}</span> <small className="fs-6 text-secondary">W</small></h3>
                            </div>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    {isAdmin ? (
                        <Link to="/admin" className="card stat-card success-border h-100 text-decoration-none">
                            <div className="card-body d-flex align-items-center">
                                <div className="widget-icon-circle bg-success-soft p-3 me-3">
                                    <i className="bi bi-router-fill fs-3 text-success"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 text-secondary text-uppercase small fw-bold">Active Devices</h6>
                                    <h3 className="mb-0 fw-bold text-body"><span id="active-devices-count">{activeDevices}</span><small className="fs-6 text-secondary"> / 2</small></h3>
                                    <div className="progress mt-1" style={{ height: '5px' }}>
                                        <div id="active-devices-progress" className="progress-bar bg-success" role="progressbar" style={{ width: activeDevices !== '--' ? `${(activeDevices / 2) * 100}%` : '0%' }} aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="card stat-card success-border h-100">
                            <div className="card-body d-flex align-items-center">
                                <div className="widget-icon-circle bg-success-soft p-3 me-3">
                                    <i className="bi bi-router-fill fs-3 text-success"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 text-secondary text-uppercase small fw-bold">Active Devices</h6>
                                    <h3 className="mb-0 fw-bold text-body"><span id="active-devices-count">{activeDevices}</span><small className="fs-6 text-secondary"> / 2</small></h3>
                                    <div className="progress mt-1" style={{ height: '5px' }}>
                                        <div id="active-devices-progress" className="progress-bar bg-success" role="progressbar" style={{ width: activeDevices !== '--' ? `${(activeDevices / 2) * 100}%` : '0%' }} aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="col-md-4">
                    {isAdmin ? (
                        <Link to="/reports" className="card stat-card warning-border h-100 text-decoration-none">
                            <div className="card-body d-flex align-items-center">
                                <div id="alerts-widget-icon" className="widget-icon-circle bg-warning-soft p-3 me-3">
                                    <i className="bi bi-exclamation-triangle-fill fs-3 text-warning"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 text-secondary text-uppercase small fw-bold">Active Alerts</h6>
                                    <h3 className="mb-0 fw-bold text-body"><span id="active-alerts-count">{activeAlertsCount}</span></h3>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="card stat-card warning-border h-100">
                            <div className="card-body d-flex align-items-center">
                                <div id="alerts-widget-icon" className="widget-icon-circle bg-warning-soft p-3 me-3">
                                    <i className="bi bi-exclamation-triangle-fill fs-3 text-warning"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 text-secondary text-uppercase small fw-bold">Active Alerts</h6>
                                    <h3 className="mb-0 fw-bold text-body"><span id="active-alerts-count">{activeAlertsCount}</span></h3>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content & Sidebar */}
            <div className="row g-4">
                <div className={`${isAdmin ? "col-lg-8" : "col-lg-12"} animate-fade-in delay-200`} id="main-chart-container">
                    {/* Energy Saving Recommendations */}
                    <div className="card mb-4 border-0 shadow-sm" style={{ background: '#f8f9fa', borderLeft: '4px solid #f59e0b' }}>
                        <div className="card-body p-4">
                            <h5 className="fw-bold text-dark mb-3"><i className="bi bi-lightbulb-fill text-warning me-2"></i>Smart Energy Saving Tips</h5>
                            <div className="d-flex flex-column gap-2">
                                {recommendations.map(rec => (
                                    <div key={rec.id} className="d-flex align-items-start bg-white p-3 rounded shadow-sm border border-light">
                                        <i className={`bi ${rec.icon} ${rec.color} fs-4 me-3 mt-n1`}></i>
                                        <span className="text-secondary small fw-medium mt-1">{rec.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Real-time Chart */}
                    <div className="card mb-4">
                        <div className="card-header bg-transparent py-3">
                            <h5 className="mb-0 text-body"><i className="bi bi-graph-up-arrow me-2 text-primary"></i>Real-time Power Consumption</h5>
                        </div>
                        <div className="card-body">
                            <canvas id="realtimeChart" ref={chartRef} style={{ maxHeight: '300px' }}></canvas>
                        </div>
                    </div>

                    {/* Room Cards */}
                    <div className="row g-4">
                        {['h205', 'h208'].map(room => (
                            <div className="col-md-6" key={room}>
                                <Link to="/history" className="card h-100 room-card text-decoration-none">
                                    <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
                                        <div className="d-flex align-items-center">
                                            <h5 className="mb-0 text-body me-2"><i className="bi bi-geo-alt-fill text-primary me-2"></i>Room {room.toUpperCase()}</h5>
                                            <span id={`peak-${room}`} className={`badge bg-danger animate-fade-in ${!rooms[room].isPeak ? 'd-none' : ''}`} style={{ fontSize: '0.65rem' }}><i className="bi bi-fire me-1"></i>Peak Usage</span>
                                        </div>
                                        <div id={`status-${room}`} className="d-flex align-items-center">
                                            {renderStatus(rooms[room].status)}
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-6">
                                                <div className="room-stat-box">
                                                    <i className="bi bi-lightning-charge-fill text-primary fs-2 mb-2"></i>
                                                    <h6 className="text-secondary small text-uppercase fw-bold mb-1">Power</h6>
                                                    <div className={`fs-3 fw-bold ${rooms[room].isOverload ? 'text-danger' : 'text-body'}`}>
                                                        <span id={`power-${room}`}>{rooms[room].power}</span> <small className="fs-6 text-secondary fw-normal">W</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="room-stat-box">
                                                    <i className="bi bi-thermometer-half text-danger fs-2 mb-2"></i>
                                                    <h6 className="text-secondary small text-uppercase fw-bold mb-1">Temp</h6>
                                                    <div className="fs-3 fw-bold text-body">
                                                        <span id={`temp-${room}`}>{rooms[room].temp}</span> <small className="fs-6 text-secondary fw-normal">&deg;C</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-footer bg-transparent text-center py-3">
                                        <small className="text-secondary d-block mb-1"><i className="bi bi-snow me-1"></i>AC: Carrier</small>
                                        <small className="text-secondary d-block"><i className="bi bi-router me-1"></i>Device: {room.toUpperCase()}-AC-Monitor-1</small>
                                        <small className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                            Last updated: <span id={`updated-${room}`}>{safeFormatTime(rooms[room].timestamp)}</span>
                                        </small>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar: Recent Activity */}
                <div className={`col-lg-4 animate-fade-in delay-300 ${!isAdmin ? 'd-none' : ''}`}>
                    <div className="card h-100" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                        <div className="card-header bg-white py-3">
                            <h5 className="mb-0 text-body"><i className="bi bi-list-ul me-2 text-primary"></i>Recent Activity</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-custom mb-0">
                                    <thead>
                                        <tr>
                                            <th className="ps-4">Type</th>
                                            <th>Details</th>
                                            <th className="text-end pe-4">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody id="activity-log-body">
                                        {!activities ? (
                                            <tr><td colSpan="3" className="text-center p-4 text-secondary">Loading activity...</td></tr>
                                        ) : activities.length === 0 ? (
                                            <tr><td colSpan="3" className="text-center p-4 text-muted">No recent activity found.</td></tr>
                                        ) : (
                                            activities.map((act) => {
                                                const info = getActivityIcon(act.action);
                                                return (
                                                    <tr key={act.id}>
                                                        <td className="ps-3" style={{ width: '50px' }}><i className={`bi ${info.icon} ${info.color} fs-4`}></i></td>
                                                        <td>
                                                            <strong className="text-dark">{act.username || 'System'}</strong> {act.action.replace(/_/g, ' ')}
                                                            <div className="text-muted small">{act.details || ''}</div>
                                                        </td>
                                                        <td className="text-end text-muted pe-3 small" style={{ whiteSpace: 'nowrap' }}>
                                                            {new Date(act.created_at + (act.created_at.includes('T') ? '' : ' UTC')).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
