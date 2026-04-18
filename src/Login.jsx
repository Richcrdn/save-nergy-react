import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

export default function Login() {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    const [showOtp, setShowOtp] = useState(false);
    const [otpType, setOtpType] = useState('signup'); // 'signup' o 'recovery'
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        // Manual Validations (Gaya ng sa original login.js)
        if (!email.trim()) return setErrorMsg('Please enter your Email Address.');
        if (!email.includes('@')) return setErrorMsg('Please enter a valid Email Address (e.g. name@example.com).');
        if (!password) return setErrorMsg('Please enter your Password.');
        if (isSignUp && !username.trim()) return setErrorMsg('Please enter a Username to create an account.');
        if (isSignUp && password !== confirmPassword) return setErrorMsg('Passwords do not match.');

        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username, role: 'student' } }
                });
                if (error) throw error;
                if (data.user && !data.session) setShowOtp(true);
                else navigate('/');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/');
            }
        } catch (err) {
            setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setOtpError('');
        setLoading(true);
        try {
            if (otpType === 'recovery') {
                if (!newPassword || newPassword.length < 6) {
                    throw new Error('New password must be at least 6 characters long.');
                }
            }

            const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: otpType });
            if (error) throw error;
            
            if (otpType === 'recovery') {
                // I-update agad ang password dahil verified na ang OTP
                const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
                if (updateError) throw updateError;
                
                navigate('/');
            } else {
                navigate('/');
            }
        } catch (err) {
            setOtpError(err.message || 'Failed to verify OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!email.trim()) return setErrorMsg('Please enter your Email Address.');
        if (!email.includes('@')) return setErrorMsg('Please enter a valid Email Address.');

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            
            // Ipakita ang OTP form para sa Password Reset
            setOtpType('recovery');
            setShowOtp(true);
            setIsForgotPassword(false);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async (e) => {
        e.preventDefault();
        setOtpError('Resending OTP...');
        
        // Kung recovery ang hinihingi, resetPasswordForEmail ulit ang tawagin
        const { error } = otpType === 'recovery' 
            ? await supabase.auth.resetPasswordForEmail(email)
            : await supabase.auth.resend({ type: 'signup', email });
            
        if (error) setOtpError(error.message);
        else setOtpError('A new OTP has been sent to your email.');
    };

    return (
        <div className="login-body d-flex align-items-center justify-content-center vh-100 position-relative">
            {/* Background Animation */}
            <ul className="login-bg-animation">
                <li></li><li></li><li></li><li></li><li></li>
                <li></li><li></li><li></li><li></li><li></li>
            </ul>

            <div className="login-container w-100" style={{ maxWidth: '900px', zIndex: 1 }}>
                <div className="card login-card border-0 shadow-lg overflow-hidden animate-fade-in" style={{ padding: 0, borderRadius: '20px' }}>
                    <div className="row g-0">
                        {/* Left Side: Branding */}
                        <div className="col-md-6 d-none d-md-flex flex-column align-items-center justify-content-center p-5 text-white position-relative" style={{ background: 'linear-gradient(135deg, #862334 0%, #5e1322 100%)' }}>
                            <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.1) 0%, transparent 20%), radial-gradient(circle at 90% 90%, rgba(255, 197, 83, 0.1) 0%, transparent 20%)' }}></div>
                            <img src="/logos.png" alt="Logo" className="mb-4" style={{ height: '120px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
                            <h2 className="fw-bold mb-2">Save-Nergy</h2>
                            <p className="text-white-50 text-center px-4">Efficient. Reliable. Smart.<br/>Monitor your AC consumption in real-time.</p>
                        </div>

                        {/* Right Side: Form */}
                        <div className="col-md-6 bg-white p-4 p-md-5">
                            <div className="text-center mb-4 d-md-none">
                                <img src="/logos.png" alt="Logo" style={{ height: '70px' }} />
                            </div>
                            
                            {!showOtp ? (
                                <div className="animate-fade-in" key={isForgotPassword ? 'forgot' : isSignUp ? 'signup' : 'signin'}>
                                    <h3 className="fw-bold text-dark mb-1">
                                        {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
                                    </h3>
                                    <p className="text-muted small mb-4">
                                        {isForgotPassword ? 'Enter your email to receive reset instructions.' : isSignUp ? 'Enter your details to register a new account.' : 'Please enter your details to sign in.'}
                                    </p>
                                    {errorMsg && <div className="alert alert-danger shadow-sm border-0 small"><i className="bi bi-exclamation-triangle-fill me-2"></i>{errorMsg}</div>}
                                    {successMsg && <div className="alert alert-success shadow-sm border-0 small"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</div>}
                                    
                                    {isForgotPassword ? (
                                        <form onSubmit={handleResetPassword} noValidate>
                                            <div className="form-floating mb-4">
                                                <input type="email" id="email" className="form-control" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                                <label htmlFor="email"><i className="bi bi-envelope me-2"></i>Email Address</label>
                                            </div>
                                            <div className="d-grid mb-3">
                                                <button type="submit" className="btn btn-primary btn-lg btn-login" disabled={loading}>
                                                    {loading ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...</> : <>Send Reset Email <i className="bi bi-envelope-paper ms-1"></i></>}
                                                </button>
                                            </div>
                                            <div className="text-center mt-3">
                                                <small className="text-muted">
                                                    Remember your password? <a href="#" className="fw-bold text-decoration-none" style={{ color: '#862334' }} onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setErrorMsg(''); setSuccessMsg(''); }}>Sign In</a>
                                                </small>
                                            </div>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleAuth} noValidate>
                                        {isSignUp && (
                                            <div className="form-floating mb-3">
                                                <input type="text" id="username" className="form-control" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                                                <label htmlFor="username"><i className="bi bi-person me-2"></i>Username</label>
                                            </div>
                                        )}
                                        <div className="form-floating mb-3">
                                            <input type="email" id="email" className="form-control" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                            <label htmlFor="email"><i className="bi bi-envelope me-2"></i>Email Address</label>
                                        </div>
                                        <div className="form-floating mb-3 position-relative">
                                            <input type={showPassword ? "text" : "password"} id="password" className="form-control" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                                            <label htmlFor="password"><i className="bi bi-lock me-2"></i>Password</label>
                                            <span className="position-absolute top-50 end-0 translate-middle-y me-2 p-2" style={{ cursor: 'pointer', zIndex: 10 }} onClick={() => setShowPassword(!showPassword)}>
                                                <i className={`bi ${showPassword ? 'bi-eye' : 'bi-eye-slash'} fs-5 text-muted`}></i>
                                            </span>
                                        </div>
                                        {isSignUp && (
                                            <div className="form-floating mb-3 position-relative">
                                                <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" className="form-control" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                                <label htmlFor="confirmPassword"><i className="bi bi-shield-lock me-2"></i>Confirm Password</label>
                                                <span className="position-absolute top-50 end-0 translate-middle-y me-2 p-2" style={{ cursor: 'pointer', zIndex: 10 }} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                    <i className={`bi ${showConfirmPassword ? 'bi-eye' : 'bi-eye-slash'} fs-5 text-muted`}></i>
                                                </span>
                                            </div>
                                        )}
                                        {!isSignUp && (
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <div className="form-check">
                                                    <input className="form-check-input" type="checkbox" id="rememberMe" />
                                                    <label className="form-check-label small text-muted" htmlFor="rememberMe">Remember me</label>
                                                </div>
                                                <a href="#" className="small text-decoration-none fw-bold" style={{ color: '#862334' }} onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setErrorMsg(''); setSuccessMsg(''); }}>Forgot Password?</a>
                                            </div>
                                        )}
                                        <div className="d-grid">
                                            <button type="submit" className="btn btn-primary btn-lg btn-login" disabled={loading}>
                                                {loading ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> {isSignUp ? 'Signing up...' : 'Signing in...'}</> : <>{isSignUp ? 'Sign Up' : 'Sign In'} <i className={`bi ${isSignUp ? 'bi-person-plus' : 'bi-arrow-right-short'} ms-1`}></i></>}
                                            </button>
                                        </div>

                                        <div className="text-center mt-3">
                                            <small className="text-muted">
                                                {isSignUp ? 'Already have an account?' : "Don't have an account?"} <a href="#" className="fw-bold text-decoration-none" style={{ color: '#862334' }} onClick={(e) => { e.preventDefault(); setIsSignUp(!isSignUp); setIsForgotPassword(false); setErrorMsg(''); setSuccessMsg(''); setConfirmPassword(''); setShowConfirmPassword(false); }}>{isSignUp ? 'Sign In' : 'Sign Up'}</a>
                                            </small>
                                        </div>
                                    </form>
                                    )}
                                </div>
                            ) : (
                                <div id="otp-container" className="text-center animate-fade-in">
                                    <div className="mb-4">
                                        <i className={`bi ${otpType === 'recovery' ? 'bi-shield-lock' : 'bi-envelope-check'}`} style={{ fontSize: '3rem', color: '#862334' }}></i>
                                    </div>
                                    <h4 className="fw-bold text-dark mb-2">{otpType === 'recovery' ? 'Reset Password' : 'Verify Your Email'}</h4>
                                    <p className="text-muted small mb-4">We've sent a code to <br/><strong className="text-dark">{email}</strong>. Please enter it below.</p>
                                    
                                    {otpError && <div className={`alert ${String(otpError).includes('sent') ? 'alert-success' : 'alert-danger'} text-start small shadow-sm`}><i className={`bi ${String(otpError).includes('sent') ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>{String(otpError)}</div>}

                                    <form onSubmit={handleVerifyOtp} noValidate>
                                        <div className="form-floating mb-4">
                                            <input type="text" id="otpCode" className="form-control text-center fw-bold" placeholder="000000" maxLength="8" style={{ fontSize: '1.5rem', letterSpacing: '0.5rem' }} value={otpCode} onChange={e => setOtpCode(e.target.value)} required />
                                            <label htmlFor="otpCode">Enter OTP Code</label>
                                        </div>
                                        
                                        {otpType === 'recovery' && (
                                            <div className="form-floating mb-4 position-relative">
                                                <input type={showNewPassword ? "text" : "password"} id="newPassword" className="form-control" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength="6" />
                                                <label htmlFor="newPassword"><i className="bi bi-lock me-2"></i>New Password</label>
                                                <span className="position-absolute top-50 end-0 translate-middle-y me-2 p-2" style={{ cursor: 'pointer', zIndex: 10 }} onClick={() => setShowNewPassword(!showNewPassword)}>
                                                    <i className={`bi ${showNewPassword ? 'bi-eye' : 'bi-eye-slash'} fs-5 text-muted`}></i>
                                                </span>
                                            </div>
                                        )}

                                        <div className="d-grid mb-3">
                                            <button type="submit" className="btn btn-primary btn-lg btn-otp" disabled={loading}>
                                                {loading ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying & Saving...</> : <>{otpType === 'recovery' ? 'Verify & Reset Password' : 'Verify & Sign In'} <i className="bi bi-check2-circle ms-1"></i></>}
                                            </button>
                                        </div>
                                        <small className="text-muted">Didn't receive the code? <a href="#" className="text-decoration-none fw-bold" style={{ color: '#862334' }} onClick={handleResendOtp}>Resend</a></small>
                                        {otpType === 'recovery' && (
                                            <div className="mt-3">
                                                <small className="text-muted"><a href="#" className="text-decoration-none fw-bold" style={{ color: '#862334' }} onClick={(e) => { e.preventDefault(); setShowOtp(false); setIsForgotPassword(false); setOtpCode(''); setOtpError(''); setNewPassword(''); setShowNewPassword(false); }}>Back to Sign In</a></small>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-center mt-4">
                    <small className="text-muted opacity-75">&copy; {new Date().getFullYear()} Save-Nergy. All Rights Reserved.</small>
                </div>
            </div>
        </div>
    );
}
