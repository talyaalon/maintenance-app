import React, { useState, useEffect } from 'react';
import { Camera, Save, X, LogOut, Eye, EyeOff, Globe } from 'lucide-react'; 

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
      const res = await fetch('https://maintenance-app-h84v.onrender.com/users/profile', {
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
    <div className="px-4 pt-2 pb-24 flex flex-col items-center max-w-lg mx-auto animate-fade-in">

      <h1 className="text-xl font-semibold text-[#714B67] mb-3 self-start">{t.nav_profile || 'Profile'}</h1>

      <div className="relative mb-4 group flex flex-col items-center">
        <div className="relative">
            {/* 🚀 תוקן צבע הרקע כאן לסגול המדויק */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-[#714B67] bg-opacity-10 flex items-center justify-center">
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
                    <Camera size={18} />
                    <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </label>
            )}
        </div>
        
        <div className="mt-3 text-center">
            <h3 className="text-xl font-bold text-gray-900">{formData.full_name}</h3>
            <p className="text-sm text-gray-500">{user?.role || 'User'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        
        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t.full_name_label || 'Full Name'}</label>
            <div className="space-y-2">
                <input
                    type="text"
                    dir="rtl"
                    placeholder={t.name_he_placeholder || 'שם בעברית'}
                    className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                    value={formData.full_name_he}
                    onChange={e => setFormData({...formData, full_name_he: e.target.value})}
                    disabled={!isEditing}
                />
                <input
                    type="text"
                    dir="ltr"
                    placeholder={t.name_en_placeholder || 'Name in English'}
                    className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                    value={formData.full_name_en}
                    onChange={e => setFormData({...formData, full_name_en: e.target.value})}
                    disabled={!isEditing}
                />
                <input
                    type="text"
                    dir="ltr"
                    placeholder={t.name_th_placeholder || 'ชื่อภาษาไทย'}
                    className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                    value={formData.full_name_th}
                    onChange={e => setFormData({...formData, full_name_th: e.target.value})}
                    disabled={!isEditing}
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t.email_label || 'Email'}</label>
            <input 
                type="email" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
                dir="ltr"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
                {t.phone_label || "Phone Number"}
            </label>
            <input 
                type="tel" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing}
                dir="ltr"
                placeholder="050-0000000"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
                {t.line_user_id || "LINE User ID"}
            </label>
            <input
                type="text"
                dir="ltr"
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                value={formData.line_user_id}
                onChange={e => setFormData({...formData, line_user_id: e.target.value})}
                disabled={!isEditing}
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
        </div>

        <div className="relative">
            <label className="block text-sm font-medium text-gray-500 mb-1">
                {t.preferred_language || "Preferred Notifications Language"}
            </label>
            <div className="relative">
                <Globe className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${lang === 'he' ? 'right-3' : 'left-3'}`} size={18} />
                <select
                    className={`w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition ${lang === 'he' ? 'pr-10' : 'pl-10'}`}
                    value={formData.preferred_language}
                    onChange={e => setFormData({...formData, preferred_language: e.target.value})}
                    disabled={!isEditing}
                >
                    <option value="he">עברית (Hebrew)</option>
                    <option value="en">English</option>
                    <option value="th">ภาษาไทย (Thai)</option>
                </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">* {t.lang_note || "Daily reports will be sent in this language"}</p>
        </div>

        {isEditing && (
            <div className="animate-fade-in relative">
                <label className="block text-sm font-medium text-gray-500 mb-1">{t.password_placeholder || "New Password"}</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-[#714B67]/30 outline-none pr-10 transition" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder="********"
                        autoComplete="new-password"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#714B67] focus:outline-none transition ${lang === 'he' ? 'left-3' : 'right-3'}`}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">* {t.password_security_note || "Old password hidden for security"}</p>
            </div>
        )}

        <div className="pt-4 flex gap-3">
            {isEditing ? (
                <>
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex justify-center gap-2 transition">
                        <X size={20} /> {t.cancel}
                    </button>
                    <button type="submit" className="flex-1 py-3 bg-[#714B67] text-white rounded-lg hover:bg-[#5a3b52] flex justify-center gap-2 shadow-md transition transform active:scale-95">
                        <Save size={20} /> {t.save}
                    </button>
                </>
            ) : (
                <button type="button" onClick={() => setIsEditing(true)} className="w-full py-3 bg-[#714B67] text-white rounded-lg hover:bg-[#5a3b52] transition flex justify-center gap-2 items-center shadow-md transform active:scale-95">
                      <Camera size={18} /> {t.edit_profile_btn || "Edit Profile"}
                </button>
            )}
        </div>
      </form>
        
      <button onClick={onLogout} className="mt-8 text-red-500 flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-full transition font-bold">
          <LogOut size={18} /> {t.logout || "Logout"}
      </button>

    </div>
  );
};

export default ProfileTab;