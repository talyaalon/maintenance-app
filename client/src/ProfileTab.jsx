import React, { useState } from 'react';
import { Camera, Save, X, LogOut, Eye, EyeOff, Phone } from 'lucide-react'; // הוספתי Phone

const ProfileTab = ({ user, token, t, onLogout, onUpdateUser, lang }) => { // הוספתי את lang
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: user.name || '',
    email: user.email || '', 
    phone: user.phone || '', // שדה חדש לטלפון
    password: '', 
  });

  const [previewImage, setPreviewImage] = useState(user.profile_picture_url);
  const [fileToUpload, setFileToUpload] = useState(null);

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
    dataToSend.append('email', formData.email);
    dataToSend.append('phone', formData.phone); // שליחת הטלפון לשרת
    
    if (formData.password) {
        dataToSend.append('password', formData.password);
    }
    
    if (fileToUpload) {
        dataToSend.append('profile_picture', fileToUpload);
    } else {
        dataToSend.append('existing_picture', user.profile_picture_url || '');
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
        onUpdateUser(data.user); 
        setIsEditing(false);
        setFormData(prev => ({ ...prev, password: '' })); 
        setShowPassword(false); 
      } else {
        alert(t.alert_update_error || "Error updating profile");
      }
    } catch (err) {
      console.error(err);
      alert(t.server_error || "Communication error");
    }
  };

  return (
    <div className="p-4 flex flex-col items-center pb-24 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t.nav_profile}</h2>

      {/* אזור תמונת הפרופיל - ממורכז */}
      <div className="relative mb-4 group flex flex-col items-center">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-purple-100 flex items-center justify-center relative">
            {previewImage ? (
                <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <span className="text-4xl font-bold text-purple-600">
                    {user.name?.charAt(0).toUpperCase()}
                </span>
            )}
            
            {/* כפתור המצלמה - ממורכז בתוך העיגול או בצד */}
            {isEditing && (
                <label className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full text-white cursor-pointer hover:bg-purple-700 shadow-md transition-transform transform hover:scale-110 z-10">
                    <Camera size={18} />
                    <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </label>
            )}
        </div>
        
        {/* שם ותפקיד מתחת לתמונה */}
        <div className="mt-3 text-center">
            <h3 className="text-xl font-bold text-gray-900">{formData.full_name}</h3>
            <p className="text-sm text-gray-500">{user.role}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        
        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t.full_name_label}</label>
            <input 
                type="text" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                disabled={!isEditing}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t.email_label}</label>
            <input 
                type="email" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
                dir="ltr"
            />
        </div>

        {/* --- שדה טלפון החדש --- */}
        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                <Phone size={16} className="text-gray-400"/> {t.phone_label || "Phone Number"}
            </label>
            <input 
                type="tel" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing}
                dir="ltr" // מספרים תמיד משמאל לימין
                placeholder="050-0000000"
            />
        </div>

        {isEditing && (
            <div className="animate-fade-in relative">
                <label className="block text-sm font-medium text-gray-500 mb-1">{t.password_placeholder_edit}</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none pr-10" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder={t.password_placeholder_edit}
                        autoComplete="new-password"
                    />
                    {/* --- תיקון מיקום העין --- */}
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 focus:outline-none ${lang === 'he' ? 'left-3' : 'right-3'}`}
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
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex justify-center gap-2">
                        <X size={20} /> {t.cancel}
                    </button>
                    <button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex justify-center gap-2 shadow-md">
                        <Save size={20} /> {t.save}
                    </button>
                </>
            ) : (
                <button type="button" onClick={() => setIsEditing(true)} className="w-full py-3 bg-[#6A0DAD] text-white rounded-lg hover:bg-purple-800 transition flex justify-center gap-2 items-center">
                      <Camera size={18} /> {t.edit_profile_btn || "Edit Profile"}
                </button>
            )}
        </div>
      </form>
        
      <button onClick={onLogout} className="mt-8 text-red-500 flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-full transition">
          <LogOut size={18} /> {t.logout}
      </button>

    </div>
  );
};

export default ProfileTab;