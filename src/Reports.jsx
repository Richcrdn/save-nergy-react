import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
    const [activeTab, setActiveTab] = useState('alerts');
    const [alerts, setAlerts] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Kunin ang System Alerts
            const { data: alertsData } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(100);
            if (alertsData) setAlerts(alertsData);

            // Kunin ang Audit / Activity Logs
            const { data: auditData } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
            if (auditData) setActivities(auditData);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTimestamp = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString + (dateString.includes('T') ? '' : ' UTC')).toLocaleString();
    };

    const handleExportPDF = (e) => {
        e.preventDefault();
        const doc = new jsPDF();
        const brandColor = [134, 35, 52];
        
        doc.setFontSize(18);
        doc.setTextColor(...brandColor);
        doc.text(`System Reports - ${activeTab === 'alerts' ? 'System Alerts' : 'Activity Logs'}`, 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);

        if (activeTab === 'alerts') {
            if (alerts.length === 0) return alert("No alerts to export.");
            const tableBody = alerts.map(a => [ formatDate(a.created_at), a.type.toUpperCase(), a.message ]);
            autoTable(doc, { startY: 35, head: [['Date & Time', 'Alert Type', 'Message']], body: tableBody, theme: 'striped', headStyles: { fillColor: brandColor } });
        } else {
            if (activities.length === 0) return alert("No activities to export.");
            const tableBody = activities.map(a => [ formatDate(a.created_at), a.username || 'System', a.action.replace(/_/g, ' ').toUpperCase(), a.details || 'N/A' ]);
            autoTable(doc, { startY: 35, head: [['Date & Time', 'User', 'Action', 'Details']], body: tableBody, theme: 'striped', headStyles: { fillColor: brandColor } });
        }
        doc.save(`SaveNergy_${activeTab}_Report_${getTimestamp()}.pdf`);
    };

    const handleExportCSV = (e) => {
        e.preventDefault();
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (activeTab === 'alerts') {
            if (alerts.length === 0) return alert("No alerts to export.");
            csvContent += "Date & Time,Alert Type,Message\n";
            alerts.forEach(a => { csvContent += `"${formatDate(a.created_at)}","${a.type}","${a.message}"\n`; });
        } else {
            if (activities.length === 0) return alert("No activities to export.");
            csvContent += "Date & Time,User,Action,Details\n";
            activities.forEach(a => { csvContent += `"${formatDate(a.created_at)}","${a.username || 'System'}","${a.action}","${a.details || ''}"\n`; });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SaveNergy_${activeTab}_Report_${getTimestamp()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in">
            <div className="row mb-4">
                <div className="col-12 d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                        <h2 className="fw-bold text-dark mb-1">System Reports</h2>
                        <p className="text-muted mb-0">View and export system alerts and activity logs.</p>
                    </div>
                    <div className="mt-3 mt-md-0">
                        <button className="btn btn-outline-success me-2" onClick={handleExportCSV}><i className="bi bi-filetype-csv me-2"></i>Export CSV</button>
                        <button className="btn btn-danger" onClick={handleExportPDF}><i className="bi bi-file-earmark-pdf me-2"></i>Export PDF</button>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white pt-3 pb-0 border-bottom-0">
                    <ul className="nav nav-tabs border-bottom-0" style={{ gap: '5px' }}>
                        <li className="nav-item">
                            <button className={`nav-link fw-bold border-0 ${activeTab === 'alerts' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`} 
                                onClick={() => setActiveTab('alerts')} style={{ background: 'transparent' }}>
                                <i className="bi bi-exclamation-triangle me-2"></i>System Alerts
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link fw-bold border-0 ${activeTab === 'activities' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`} 
                                onClick={() => setActiveTab('activities')} style={{ background: 'transparent' }}>
                                <i className="bi bi-list-ul me-2"></i>Activity Logs
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center p-5"><div className="spinner-border text-primary" role="status"></div></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-custom table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="ps-4 py-3">Date & Time</th>
                                        <th className="py-3">{activeTab === 'alerts' ? 'Type' : 'User'}</th>
                                        <th className="py-3">{activeTab === 'alerts' ? 'Message' : 'Action'}</th>
                                        <th className="pe-4 py-3">{activeTab === 'alerts' ? '' : 'Details'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTab === 'alerts' && alerts.length === 0 && <tr><td colSpan="4" className="text-center p-4 text-muted">No alerts found.</td></tr>}
                                    {activeTab === 'alerts' && alerts.map(alert => ( <tr key={alert.id}><td className="ps-4 text-muted small">{formatDate(alert.created_at)}</td><td><span className={`badge ${alert.type === 'overload' ? 'bg-danger' : 'bg-warning text-dark'}`}>{alert.type.toUpperCase()}</span></td><td className="pe-4" colSpan="2">{alert.message}</td></tr> ))}
                                    {activeTab === 'activities' && activities.length === 0 && <tr><td colSpan="4" className="text-center p-4 text-muted">No activity logs found.</td></tr>}
                                    {activeTab === 'activities' && activities.map(act => ( <tr key={act.id}><td className="ps-4 text-muted small">{formatDate(act.created_at)}</td><td className="fw-bold">{act.username || 'System'}</td><td>{act.action.replace(/_/g, ' ').toUpperCase()}</td><td className="pe-4 text-muted small">{act.details || 'N/A'}</td></tr> ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}