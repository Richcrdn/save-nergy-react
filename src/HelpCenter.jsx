import { Link } from 'react-router-dom';

export default function HelpCenter() {
    return (
        <div className="animate-fade-in">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex align-items-center mb-1">
                        <Link to="/profile" className="btn btn-link text-decoration-none p-0 me-3 text-secondary">
                            <i className="bi bi-arrow-left fs-4"></i>
                        </Link>
                        <h2 className="fw-bold text-dark mb-0">Help Center</h2>
                    </div>
                    <p className="text-muted mb-0" style={{ marginLeft: '40px' }}>Guides and Frequently Asked Questions</p>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-question-circle-fill me-2 text-primary"></i>Frequently Asked Questions</h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="accordion" id="faqAccordion">
                                <div className="accordion-item border-0 mb-3 shadow-sm rounded">
                                    <h2 className="accordion-header" id="headingOne">
                                        <button className="accordion-button rounded fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                                            How does the system calculate estimated cost?
                                        </button>
                                    </h2>
                                    <div id="collapseOne" className="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#faqAccordion">
                                        <div className="accordion-body text-muted">
                                        The estimated cost is automatically calculated by multiplying your accurate total kilowatt-hours (kWh) consumption by the standard average electricity rate (approx. ₱12.00/kWh). This ensures accurate and automated costing without needing manual configuration.
                                        </div>
                                    </div>
                                </div>

                                <div className="accordion-item border-0 mb-3 shadow-sm rounded">
                                    <h2 className="accordion-header" id="headingTwo">
                                        <button className="accordion-button collapsed rounded fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                                            What triggers a peak usage or overload alert?
                                        </button>
                                    </h2>
                                    <div id="collapseTwo" className="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#faqAccordion">
                                        <div className="accordion-body text-muted">
                                            An overload alert is automatically triggered when a room's active power consumption exceeds the maximum power threshold configured in the Admin settings. Peak usage is an indicator showing which room is currently consuming the most power.
                                        </div>
                                    </div>
                                </div>

                                <div className="accordion-item border-0 shadow-sm rounded">
                                    <h2 className="accordion-header" id="headingThree">
                                        <button className="accordion-button collapsed rounded fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                                            How do I reset my password?
                                        </button>
                                    </h2>
                                    <div id="collapseThree" className="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#faqAccordion">
                                        <div className="accordion-body text-muted">
                                            You can reset your password directly from the <strong>My Profile</strong> page by entering a new password and clicking "Save Changes". Alternatively, use the "Forgot Password" link on the login page.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm mb-4" style={{ background: 'linear-gradient(135deg, #862334 0%, #5e1322 100%)', color: 'white' }}>
                        <div className="card-body p-4 text-center">
                            <i className="bi bi-headset display-1 mb-3 opacity-75"></i>
                            <h4 className="fw-bold">Need more help?</h4>
                            <p className="small opacity-75 mb-4">Our support team is always ready to assist you with any technical issues.</p>
                            <a href="mailto:support@save-nergy.com" className="btn btn-light rounded-pill px-4 fw-bold text-primary" style={{ color: '#862334' }}>Contact Support</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
