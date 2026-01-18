import React, { useState } from 'react';

// מקבלים את lang ואת setLang מהאבא (App.js)
const Login = ({ onLoginSuccess, t, lang, setLang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('https://maintenance-app-h84v.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        onLoginSuccess(data.user);
      } else {
        setError(data.error || t.login_failed);
      }
    } catch (err) {
      setError(t.server_error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
        
        {/* --- זה השינוי: כפתור שפה אמיתי --- */}
        <div className="absolute top-5 right-5">
           <select 
             value={lang} 
             onChange={(e) => setLang(e.target.value)}
             className="bg-transparent text-gray-600 text-sm font-bold cursor-pointer outline-none border-none hover:text-purple-700"
             style={{ direction: 'ltr' }} // כדי שהאייקונים לא יקפצו
           >
             <option value="en">🇺🇸 English</option>
             <option value="he">🇮🇱 עברית</option>
             <option value="th">🇹🇭 Thai</option>
           </select>
        </div>

        {/* כותרת מתורגמת */}
        <h2 className="text-2xl font-bold text-center text-[#5D4A66] mb-8 mt-4 tracking-wide">
          {t.login_title}
        </h2>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">{t.login_email}</label>
            <input
              type="email"
              className="w-full p-3 bg-[#EEF2F6] rounded-lg border-none focus:ring-2 focus:ring-purple-300 outline-none text-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">{t.login_password}</label>
            <input
              type="password"
              className="w-full p-3 bg-[#EEF2F6] rounded-lg border-none focus:ring-2 focus:ring-purple-300 outline-none text-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#6A4C6D] hover:bg-[#533a56] text-white font-bold rounded-lg transition-all duration-200 shadow-md mt-4"
          >
            {t.login_btn}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;