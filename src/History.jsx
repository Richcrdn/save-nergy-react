import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function History() {
    const [period, setPeriod] = useState('daily');
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [summary, setSummary] = useState({
        h205: { total_kwh: 0, estimated_cost: 0 },
        h208: { total_kwh: 0, estimated_cost: 0 }
    });
    const [rawData, setRawData] = useState([]);

    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const titleMap = {
        daily: 'Daily Energy Consumption (Last 7 Days)',
        weekly: 'Weekly Energy Consumption (Last 4 Weeks)',
        monthly: 'Monthly Energy Consumption (Last 6 Months)'
    };

    useEffect(() => {
        const fetchDataAndRender = async () => {
            setLoading(true);
            setErrorMsg('');
            try {
                // Kunin ang data gamit ang Supabase RPC
                const { data, error } = await supabase.rpc('get_historical_data', { p_period: period });
                if (error) throw new Error(error.message);

                if (data?.summary) {
                    // AUTOMATED ACCURATE COSTING
                    // Standard average electricity rate sa Pilipinas (approx 12.00 PHP / kWh)
                    const AUTOMATED_RATE = 12.00; 
                    data.summary.h205.estimated_cost = data.summary.h205.total_kwh * AUTOMATED_RATE;
                    data.summary.h208.estimated_cost = data.summary.h208.total_kwh * AUTOMATED_RATE;
                    setSummary(data.summary);
                }
                if (data?.raw_chart) setRawData(data.raw_chart);

                // I-format ang data para sa Chart.js
                let labels = [];
                const mapH205 = {};
                const mapH208 = {};

                if (data?.raw_chart) {
                    data.raw_chart.forEach(row => {
                        if (!labels.includes(row.period_label)) labels.push(row.period_label);
                        const roomName = (row.room_name || '').toLowerCase();
                        if (roomName.includes('205')) mapH205[row.period_label] = row.avg_kw;
                        if (roomName.includes('208')) mapH208[row.period_label] = row.avg_kw;
                    });
                }

                // FIX: Kung iisa pa lang ang araw na may data (kaya nagiging tuldok lang),
                // magdadagdag tayo ng "Start" point (0) sa unahan para may mahatak na guhit.
                if (labels.length === 1) {
                    labels.unshift('Start');
                } else if (labels.length === 0) {
                    labels.push('No Data');
                }

                const primaryColor = '#862334';
                const secondaryColor = '#ffc553';

                const chartFormat = {
                    labels: labels,
                    datasets: [
                        { label: 'Room H205 (kW)', data: labels.map(l => mapH205[l] || 0), borderColor: primaryColor, backgroundColor: `${primaryColor}33`, tension: 0.4, fill: true, borderWidth: 2 },
                        { label: 'Room H208 (kW)', data: labels.map(l => mapH208[l] || 0), borderColor: secondaryColor, backgroundColor: `${secondaryColor}33`, tension: 0.4, fill: true, borderWidth: 2 }
                    ]
                };

                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                if (chartRef.current) {
                    const ctx = chartRef.current.getContext('2d');
                    chartInstance.current = new Chart(ctx, {
                        type: 'line',
                        data: chartFormat,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                            scales: {
                                x: { display: true, title: { display: true, text: 'Period' } },
                                y: { display: true, title: { display: true, text: 'Energy (kWh)' }, beginAtZero: true }
                            }
                        }
                    });
                }
            } catch (err) {
                setErrorMsg(err.message);
                console.error("Failed to fetch or render chart data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDataAndRender();

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [period]);

    const getTimestamp = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}`;
    };

    const handleExportCSV = (e) => {
        e.preventDefault();
        if (!rawData || rawData.length === 0) return alert('No data to export.');
        let csvContent = "data:text/csv;charset=utf-8,Period,Room,Average Power (kW)\n";
        rawData.forEach(row => {
            csvContent += `"${row.period_label}","${row.room_name}",${row.avg_kw.toFixed(4)}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `energy_report_${period}_${getTimestamp()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = (e) => {
        e.preventDefault();
        if (!rawData || rawData.length === 0) return alert('No data to export.');
        const doc = new jsPDF();
        const brandColor = [134, 35, 52];
        doc.setFontSize(18);
        doc.setTextColor(...brandColor);
        doc.text(`Historical Energy Report (${period.toUpperCase()})`, 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
        
        // White background workaround para sa canvas -> image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = chartRef.current.width;
        tempCanvas.height = chartRef.current.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(chartRef.current, 0, 0);
        const canvasImage = tempCanvas.toDataURL('image/jpeg', 1.0);

        doc.addImage(canvasImage, 'JPEG', 14, 35, 180, 70);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text('Consumption Summary:', 14, 115);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Room H205: ${summary.h205.total_kwh.toFixed(2)} kWh | Est. Cost: PHP ${summary.h205.estimated_cost.toFixed(2)}`, 14, 122);
        doc.text(`Room H208: ${summary.h208.total_kwh.toFixed(2)} kWh | Est. Cost: PHP ${summary.h208.estimated_cost.toFixed(2)}`, 14, 128);

        const tableBody = rawData.map(row => [ row.period_label, row.room_name, row.avg_kw.toFixed(4) ]);
        autoTable(doc, {
            startY: 135,
            head: [['Period', 'Room', 'Average Power (kW)']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: brandColor }
        });
        doc.save(`energy_report_${period}_${getTimestamp()}.pdf`);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12 text-center">
                    <h2 className="fw-bold text-dark">Historical Analytics</h2>
                    <p className="text-muted">Energy consumption trends for AC units</p>
                    {errorMsg && (
                        <div className="alert alert-danger mt-3 text-start shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <strong>Database Error:</strong> {errorMsg}. <br/>
                            Siguraduhing na-run mo ang SQL Query para sa <code>get_historical_data</code> sa Supabase.
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row g-4 mb-4">
                <div className="col-md-6">
                    <div className="card summary-widget h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #862334' }}>
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="widget-icon-circle bg-primary-soft p-3 me-3">
                                    <i className="bi bi-building fs-3 text-primary"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="mb-1 text-muted fw-bold text-uppercase small">Room H205 Consumption</h6>
                                    <h4 className="mb-0 fw-bold">{summary.h205.total_kwh.toFixed(2)} <small className="fs-6 text-muted">kWh</small></h4>
                                    <small className="text-muted">Est. Cost: PHP <strong>{summary.h205.estimated_cost.toFixed(2)}</strong></small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card summary-widget h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #198754' }}>
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="widget-icon-circle bg-success-soft p-3 me-3">
                                    <i className="bi bi-building fs-3 text-success"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="mb-1 text-muted fw-bold text-uppercase small">Room H208 Consumption</h6>
                                    <h4 className="mb-0 fw-bold">{summary.h208.total_kwh.toFixed(2)} <small className="fs-6 text-muted">kWh</small></h4>
                                    <small className="text-muted">Est. Cost: PHP <strong>{summary.h208.estimated_cost.toFixed(2)}</strong></small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="row">
                <div className="col-12">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent py-3 border-0 d-flex flex-wrap justify-content-between align-items-center">
                            <h5 className="mb-2 mb-md-0 fw-bold text-dark">{titleMap[period]}</h5>
                            <div className="d-flex flex-wrap align-items-center">
                                <div className="btn-group btn-group-sm me-3" role="group">
                                    <button type="button" className={`btn btn-outline-primary ${period === 'daily' ? 'active' : ''}`} onClick={() => setPeriod('daily')}>Daily (7d)</button>
                                    <button type="button" className={`btn btn-outline-primary ${period === 'weekly' ? 'active' : ''}`} onClick={() => setPeriod('weekly')}>Weekly (4w)</button>
                                    <button type="button" className={`btn btn-outline-primary ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>Monthly (6m)</button>
                                </div>
                                <button className="btn btn-sm btn-success" onClick={handleExportCSV}><i className="bi bi-download me-1"></i>Export CSV</button>
                                <button className="btn btn-sm btn-danger ms-2" onClick={handleExportPDF}><i className="bi bi-file-earmark-pdf me-1"></i>Export PDF</button>
                            </div>
                        </div>
                        <div className="card-body position-relative" style={{ height: '400px' }}>
                            {loading && (
                                <div className="loader-container position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white" style={{ zIndex: 10, opacity: 0.8 }}>
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
