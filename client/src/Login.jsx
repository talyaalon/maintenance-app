import React, { useState, useRef } from 'react';
import { Globe, Eye, EyeOff, Loader2, X, KeyRound, ArrowLeft } from 'lucide-react';

const API = 'https://maintenance-app-h84v.onrender.com';

// ── Forgot/Reset Password Modal ──────────────────────────────────────────────
const ForgotPasswordModal = ({ t, lang, onClose }) => {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'newpw'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });
  const otpRefs = useRef([]);

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', isError: false });
    try {
      const res = await fetch(`${API}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMsg({ text: t.forgot_password_sent, isError: false });
        setTimeout(() => { setMsg({ text: '', isError: false }); setStep('otp'); }, 1500);
      } else {
        const d = await res.json();
        setMsg({ text: d.error || t.server_error, isError: true });
      }
    } catch {
      setMsg({ text: t.server_error, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.join('').length < 6) {
      setMsg({ text: t.otp_invalid || 'Please enter the full 6-digit code', isError: true });
      return;
    }
    setMsg({ text: '', isError: false });
    setStep('newpw');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ text: t.passwords_do_not_match || 'Passwords do not match', isError: true });
      return;
    }
    setIsLoading(true);
    setMsg({ text: '', isError: false });
    try {
      const res = await fetch(`${API}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otp.join(''), new_password: newPassword, email }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ text: t.reset_password_success, isError: false });
        setTimeout(onClose, 2200);
      } else {
        setMsg({ text: d.error || t.server_error, isError: true });
      }
    } catch {
      setMsg({ text: t.server_error, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const stepIndex = { email: 0, otp: 1, newpw: 2 };
  const stepTitles = {
    email: t.forgot_password_title,
    otp: t.otp_title || 'Enter Code',
    newpw: t.reset_password_title,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border-t-4 border-[#714B67] relative p-6" dir={dir}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-[#714B67] transition" aria-label="close">
          <X size={20} />
        </button>

        {/* Step progress dots */}
        <div className="flex justify-center gap-2 mb-5">
          {['email', 'otp', 'newpw'].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ? 'w-8 bg-[#714B67]' : stepIndex[step] > i ? 'w-4 bg-[#714B67]/40' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Icon + Title */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 rounded-full bg-[#714B67]/10 flex items-center justify-center mb-3">
            <KeyRound size={24} className="text-[#714B67]" />
          </div>
          <h3 className="text-xl font-bold text-[#714B67]">{stepTitles[step]}</h3>
          {step === 'email' && <p className="text-sm text-gray-400 text-center mt-1">{t.forgot_password_desc}</p>}
          {step === 'otp' && (
            <p className="text-sm text-gray-400 text-center mt-1">
              {t.otp_desc ? t.otp_desc.replace('{email}', email) : `Code sent to ${email}`}
            </p>
          )}
        </div>

        {/* Feedback */}
        {msg.text && (
          <div className={`text-sm text-center p-2.5 rounded-lg mb-4 border ${msg.isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
            {msg.text}
          </div>
        )}

        {/* ── Step 1: Enter Email ── */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.forgot_password_email_placeholder}
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-[#714B67]/50 focus:ring-2 focus:ring-[#714B67]/20 outline-none text-gray-800"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLoading ? t.forgot_password_sending : t.forgot_password_send_btn}
            </button>
            <button type="button" onClick={onClose} className="w-full text-sm text-gray-400 hover:text-[#714B67] transition text-center">
              {t.reset_back_to_login}
            </button>
          </form>
        )}

        {/* ── Step 2: Enter 6-digit OTP ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste} dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 text-center text-2xl font-bold bg-gray-50 rounded-lg border border-gray-200 focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/20 outline-none text-[#714B67] transition"
                  style={{ height: '3.25rem' }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {t.otp_verify_btn || 'Verify Code'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setMsg({ text: '', isError: false }); }}
                className="flex items-center gap-1 text-gray-400 hover:text-[#714B67] transition"
              >
                <ArrowLeft size={14} /> {t.reset_back_to_login || 'Back'}
              </button>
              <button
                type="button"
                onClick={() => handleSendCode(null)}
                disabled={isLoading}
                className="text-[#714B67] hover:underline font-medium disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin inline" /> : null} {t.resend_code || 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: New Password + Confirm ── */}
        {step === 'newpw' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">{t.reset_password_new_label}</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.reset_password_new_placeholder}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-[#714B67]/50 focus:ring-2 focus:ring-[#714B67]/20 outline-none text-gray-800 pr-10"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-[#714B67] transition">
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">{t.confirm_password_label || 'Confirm Password'}</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirm_password_placeholder || '••••••••'}
                  className={`w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/20 outline-none text-gray-800 pr-10 transition ${
                    confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-[#714B67]/50'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-[#714B67] transition">
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{t.passwords_do_not_match || 'Passwords do not match'}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || (!!confirmPassword && newPassword !== confirmPassword)}
              className="w-full py-3 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLoading ? t.reset_password_submitting : t.reset_password_submit_btn}
            </button>
            <button
              type="button"
              onClick={() => { setStep('otp'); setMsg({ text: '', isError: false }); }}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-[#714B67] transition"
            >
              <ArrowLeft size={14} /> {t.reset_back_to_login || 'Back'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ── Main Login Component ─────────────────────────────────────────────────────
const Login = ({ onLoginSuccess, t, lang, setLang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setError(data.error || t.login_failed || 'Login failed');
      }
    } catch {
      setError(t.server_error || 'Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <>
      {showForgot && (
        <ForgotPasswordModal t={t} lang={lang} onClose={() => setShowForgot(false)} />
      )}

      <div className="min-h-screen flex items-center justify-center bg-[#fdf4ff] font-sans" dir={dir}>
        <div className="bg-white p-5 sm:p-8 rounded-xl shadow-2xl w-full max-w-md relative border-t-4 border-[#714B67]">

          {/* Language selector */}
          <div className={`absolute top-4 ${lang === 'he' ? 'left-4' : 'right-4'} flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-200`}>
            <Globe size={14} className="text-gray-400" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-gray-600 text-xs font-bold cursor-pointer outline-none border-none hover:text-[#714B67] appearance-none pr-2"
              style={{ direction: 'ltr' }}
            >
              <option value="en">English</option>
              <option value="he">עברית</option>
              <option value="th">ไทย</option>
            </select>
          </div>

          {/* Title */}
          <div className="text-center mb-8 mt-8">
            <h2 className="text-3xl font-bold text-[#714B67] tracking-wide mb-1">
              {t.app_name || 'Maintenance App'}
            </h2>
            <p className="text-gray-400 text-sm font-medium">{t.login_title}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-100 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">{t.login_email}</label>
              <input
                type="email"
                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-[#714B67]/50 focus:ring-2 focus:ring-[#714B67]/20 outline-none transition-all text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-gray-600">{t.login_password}</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[#714B67] hover:underline font-medium"
                >
                  {t.forgot_password_link}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-[#714B67]/50 focus:ring-2 focus:ring-[#714B67]/20 outline-none transition-all text-gray-800 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-[#714B67] transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded-xl transition-all duration-200 shadow-lg mt-2 flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : t.login_btn}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
