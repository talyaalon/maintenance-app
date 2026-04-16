import React, { useState, useEffect } from 'react';
import { Camera, Save, X, LogOut, Eye, EyeOff, Globe } from 'lucide-react';
import MultiLangNameInput from './MultiLangNameInput';

const ROLE_LABELS = {
  BIG_BOSS:        { en: 'Big Boss',          he: 'בוס גדול' },
  COMPANY_MANAGER: { en: 'Department Manager', he: 'מנהל מחלקה' },
  MANAGER:         { en: 'Manager',            he: 'מנהל' },
  EMPLOYEE:        { en: 'Employee',           he: 'עובד' },
};
const formatRole = (role, lang) => {
  const entry = ROLE_LABELS[role];
  if (!entry) return role || 'User';
  return (lang === 'he' ? entry.he : entry.en);
};

const ProfileTab = ({ user, token, t, onLogout, onUpdateUser, lang }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: user.name || user.full_name || '',
    full_name_he: user.full_name_he || '',
    full_name_en: user.full_name_en || '',
    full_name_th: user.full_name_th || '',
    email: user.email || '',
    phone: user.phone || '',
    password: '',
    preferred_language: user.preferred_language || 'he',
    line_user_id: user.line_user_id || ''
  });

  const [previewImage, setPreviewImage] = useState(user.profile_picture_url);
  const [fileToUpload, setFileToUpload] = useState(null);

  // Sync form fields whenever the user prop changes (e.g. on page load / after parent updates state).
  // Falls back to localStorage so that a hard refresh still shows the correct data.
  useEffect(() => {
      let localUser = {};
      try {
          const raw = localStorage.getItem('user');
          if (raw) localUser = JSON.parse(raw);
      } catch (e) {}

      // Prefer the live prop; fall back to localStorage only when the prop is missing key fields
      const src = (user && user.email) ? user : localUser;

      setFormData({
          full_name:          src.full_name     || src.name || '',
          full_name_he:       src.full_name_he  || '',
          full_name_en:       src.full_name_en  || '',
          full_name_th:       src.full_name_th  || '',
          email:              src.email         || '',
          phone:              src.phone         || '',
          password:           '',
          preferred_language: src.preferred_language || localUser.preferred_language || 'he',
          line_user_id:       src.line_user_id  || '',
      });
      setPreviewImage(src.profile_picture_url || null);
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
      setPreviewImage(URL.createObjectURL(file)); 
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const dataToSend = new FormData();
    dataToSend.append('full_name', formData.full_name);
    dataToSend.append('full_name_he', formData.full_name_he);
    dataToSend.append('full_name_en', formData.full_name_en);
    dataToSend.append('full_name_th', formData.full_name_th);
    dataToSend.append('email', formData.email);
    dataToSend.append('phone', formData.phone);
    dataToSend.append('preferred_language', formData.preferred_language);
    dataToSend.append('line_user_id', formData.line_user_id || '');

    if (formData.password) {
        dataToSend.append('password', formData.password);
    }
    
    if (fileToUpload) {
        dataToSend.append('profile_picture', fileToUpload);
    } else {
        dataToSend.append('existing_picture', previewImage || '');
    }

    try {
      const res = await fetch('https://maintenance-app-staging.onrender.com/users/profile', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}` 
        },
        body: dataToSend
      });

      const data = await res.json();
      if (res.ok) {
        alert(t.alert_update_success || "Profile updated successfully!");

        // Build the definitive user object from the DB response (RETURNING *)
        const dbUser = data.user || {};
        const updatedUser = {
            ...user,
            ...dbUser,
            // Hard-guarantee the two most volatile fields
            email:               dbUser.email               || formData.email,
            profile_picture_url: dbUser.profile_picture_url || previewImage,
            preferred_language:  dbUser.preferred_language  || formData.preferred_language,
        };

        // 1. Persist to localStorage so a hard refresh restores everything
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // 2. Bubble up to App so all tabs receive the fresh user immediately
        onUpdateUser(updatedUser);

        // 3. Immediately update local form state from DB response — don't wait for
        //    the useEffect re-run, which could lag behind React batched renders
        setFormData({
            full_name:          dbUser.full_name          || formData.full_name,
            full_name_he:       dbUser.full_name_he       ?? formData.full_name_he,
            full_name_en:       dbUser.full_name_en       ?? formData.full_name_en,
            full_name_th:       dbUser.full_name_th       ?? formData.full_name_th,
            email:              dbUser.email              || formData.email,
            phone:              dbUser.phone              || formData.phone,
            password:           '',
            preferred_language: dbUser.preferred_language || formData.preferred_language,
            line_user_id:       dbUser.line_user_id       ?? formData.line_user_id,
        });
        setPreviewImage(dbUser.profile_picture_url || previewImage);
        setFileToUpload(null);   // clear the staged file — picture is now saved
        setIsEditing(false);
        setShowPassword(false);
      } else {
        alert(data.error || t.alert_update_error || "Error updating profile");
      }
    } catch (err) {
      console.error(err);
      alert(t.server_error || "Communication error");
    }
  };

  return (
    <div className="px-3 sm:px-4 pt-4 pb-24 max-w-3xl mx-auto animate-fade-in">

      {/* ── Identity / Hero ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-purple-50 border-4 border-white shadow-md bg-slate-50 flex items-center justify-center">
            {previewImage ? (
              <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-[#714B67]">
                {(formData.full_name || user.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 bg-[#714B67] p-2 rounded-full text-white cursor-pointer hover:bg-[#5a3b52] shadow-md transition-transform transform hover:scale-110 z-20">
              <Camera size={16} />
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </label>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{formData.full_name || user.name}</h2>
        <span className="bg-[#ede8f0] text-[#4d2d5a] text-xs font-semibold px-3 py-1 rounded-md uppercase tracking-widest">
          {formatRole(user?.role, lang)}
        </span>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

        {/* ── Names Group ────────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t.full_name_label || 'Name'}</h3>
          <MultiLangNameInput
            value={{ full_name_en: formData.full_name_en, full_name_he: formData.full_name_he, full_name_th: formData.full_name_th }}
            onChange={updated => setFormData(prev => ({ ...prev, ...updated }))}
            lang={lang}
            prefix="full_name"
            disabled={!isEditing}
            required
          />
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100" />

        {/* ── Contact Group ──────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.email_label || 'Email'}</label>
              <input
                type="email"
                dir="ltr"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-default"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.phone_label || 'Phone Number'}</label>
              <input
                type="tel"
                dir="ltr"
                placeholder="050-0000000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-default"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100" />

        {/* ── System Group ───────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">System</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.line_user_id || 'LINE User ID'}</label>
              <input
                type="text"
                dir="ltr"
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-default"
                value={formData.line_user_id}
                onChange={e => setFormData({...formData, line_user_id: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.preferred_language || 'Notification Language'}</label>
              <div className="relative">
                <Globe className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${lang === 'he' ? 'right-3' : 'left-3'}`} size={16} />
                <select
                  className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-default ${lang === 'he' ? 'pr-10' : 'pl-10'}`}
                  value={formData.preferred_language}
                  onChange={e => setFormData({...formData, preferred_language: e.target.value})}
                  disabled={!isEditing}
                >
                  <option value="he">עברית (Hebrew)</option>
                  <option value="en">English</option>
                  <option value="th">ภาษาไทย (Thai)</option>
                </select>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">* {t.lang_note || 'Daily reports will be sent in this language'}</p>
            </div>
          </div>
        </div>

        {/* ── Password (edit mode only) ───────────────────────────────────────── */}
        {isEditing && (
          <>
            <div className="border-t border-gray-100" />
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.password_placeholder || 'New Password'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white focus:border-transparent transition-all pr-12"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#714B67] focus:outline-none transition ${lang === 'he' ? 'left-3' : 'right-3'}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">* {t.password_security_note || 'Old password hidden for security'}</p>
            </div>
          </>
        )}

        {/* ── Action Buttons ─────────────────────────────────────────────────── */}
        <div className="pt-1 flex gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-slate-600 hover:bg-gray-50 flex justify-center items-center gap-2 transition text-sm font-semibold"
              >
                <X size={17} /> {t.cancel}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#714B67] text-white rounded-xl hover:bg-[#5a3b52] flex justify-center items-center gap-2 shadow-md transition active:scale-95 text-sm font-bold"
              >
                <Save size={17} /> {t.save}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full py-3 bg-[#714B67] text-white rounded-xl hover:bg-[#5a3b52] flex justify-center items-center gap-2 shadow-md transition active:scale-95 text-sm font-bold"
            >
              <Camera size={16} /> {t.edit_profile_btn || 'Edit Profile'}
            </button>
          )}
        </div>
      </form>

      <button onClick={onLogout} className="mt-5 mx-auto flex items-center gap-2 text-red-500 hover:bg-red-50 px-5 py-2.5 rounded-full transition font-semibold text-sm">
        <LogOut size={17} /> {t.logout || 'Logout'}
      </button>

    </div>
  );
};

export default ProfileTab;