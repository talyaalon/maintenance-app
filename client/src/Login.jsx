import React, { useState } from 'react';
import { Globe } from 'lucide-react'; // אייקון קטן לשפה

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
        // שימוש בתרגום לשגיאה
        setError(data.error || t.login_failed || "Login failed");
      }
    } catch (err) {
      setError(t.server_error || "Server error");
    }
  };

  // פונקציה לשינוי כיוון הטקסט לפי השפה
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans" dir={dir}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative border-t-4 border-[#714B67]">
        
        {/* בחירת שפה */}
        <div className={`absolute top-4 ${lang === 'he' ? 'left-4' : 'right-4'} flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-200`}>
           <Globe size={14} className="text-gray-400"/>
           <select 
             value={lang} 
             onChange={(e) => setLang(e.target.value)}
             className="bg-transparent text-gray-600 text-xs font-bold cursor-pointer outline-none border-none hover:text-purple-700 appearance-none pr-2"
             style={{ direction: 'ltr' }} 
           >
             <option value="en">English</option>
             <option value="he">עברית</option>
             <option value="th">ไทย</option>
           </select>
        </div>

        {/* כותרת */}
        <div className="text-center mb-8 mt-4">
            <h2 className="text-3xl font-bold text-[#714B67] tracking-wide mb-1">
            {t.app_name || "Maintenance App"}
            </h2>
            <p className="text-gray-400 text-sm font-medium">{t.login_title}</p>
        </div>
        
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-100 animate-pulse">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">{t.login_email}</label>
            <input
              type="email"
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">{t.login_password}</label>
            <input
              type="password"
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#714B67] hover:#5a3b52 text-white font-bold rounded-xl transition-all duration-200 shadow-lg mt-2 flex justify-center items-center gap-2"
          >
            {t.login_btn}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;