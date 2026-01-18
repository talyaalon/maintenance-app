import React, { useState } from 'react';
import { Camera, Save, X, LogOut, Eye, EyeOff } from 'lucide-react'; // הוספתי Eye, EyeOff

const ProfileTab = ({ user, token, t, onLogout, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // סטייט חדש להצגת סיסמה
  
  // State לנתוני הטופס
  const [formData, setFormData] = useState({
    full_name: user.name || '',
    email: user.email || '', 
    password: '', // סיסמה תמיד מתחילה ריקה
  });

  const [previewImage, setPreviewImage] = useState(user.profile_picture_url);
  const [fileToUpload, setFileToUpload] = useState(null);

  // טיפול בבחירת תמונה חדשה
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
      setPreviewImage(URL.createObjectURL(file)); // מציג תצוגה מקדימה מיד
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // שימוש ב-FormData כדי לשלוח גם טקסט וגם קובץ
    const dataToSend = new FormData();
    dataToSend.append('full_name', formData.full_name);
    dataToSend.append('email', formData.email);
    if (formData.password) {
        dataToSend.append('password', formData.password);
    }
    // אם יש תמונה חדשה, שולחים אותה. אם לא, שולחים את ה-URL הישן
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
        alert("הפרטים עודכנו בהצלחה!");
        onUpdateUser(data.user); // עדכון ה-User ב-App.js
        setIsEditing(false);
        setFormData(prev => ({ ...prev, password: '' })); // איפוס שדה הסיסמה
        setShowPassword(false); // מחזירים למצב מוסתר
      } else {
        alert("שגיאה בעדכון הפרטים");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאת תקשורת");
    }
  };

  return (
    <div className="p-4 flex flex-col items-center pb-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.nav_profile}</h2>

      {/* אזור תמונת הפרופיל */}
      <div className="relative mb-6 group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-purple-100 flex items-center justify-center">
            {previewImage ? (
                <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <span className="text-4xl font-bold text-purple-600">
                    {user.name?.charAt(0).toUpperCase()}
                </span>
            )}
        </div>
        
        {/* כפתור החלפת תמונה (מופיע רק במצב עריכה) */}
        {isEditing && (
            <label className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full text-white cursor-pointer hover:bg-purple-700 shadow-md transition-transform transform hover:scale-110">
                <Camera size={20} />
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </label>
        )}
      </div>

      {/* הטופס */}
      <form onSubmit={handleSave} className="w-full max-w-md bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        
        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">שם מלא</label>
            <input 
                type="text" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                disabled={!isEditing}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">אימייל</label>
            <input 
                type="email" 
                className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
            />
        </div>

        {/* שדה סיסמה - מוצג רק בעריכה - עכשיו עם כפתור עין! */}
        {isEditing && (
            <div className="animate-fade-in relative">
                <label className="block text-sm font-medium text-gray-500 mb-1">סיסמה חדשה (השאר ריק כדי לא לשנות)</label>
                <div className="relative">
                    <input 
                        // כאן הקסם: אם showPassword הוא אמת, מציגים טקסט, אחרת סיסמה
                        type={showPassword ? "text" : "password"} 
                        className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-purple-200 outline-none pr-10" // pr-10 נותן מקום לאייקון
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder="הזן סיסמה חדשה..."
                        autoComplete="new-password"
                    />
                    {/* כפתור העין */}
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3 text-gray-400 hover:text-purple-600 focus:outline-none"
                        style={{ top: '12px', left: '10px' }} // כיוון עדין למיקום
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">* הסיסמה הישנה מוסתרת מטעמי אבטחה</p>
            </div>
        )}

        {/* כפתורי פעולה */}
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
                <button type="button" onClick={() => setIsEditing(true)} className="w-full py-3 bg-[#6A0DAD] text-white rounded-lg hover:bg-purple-800 transition flex justify-center gap-2">
                     {t.edit} פרטים
                </button>
            )}
        </div>
      </form>
        
      {/* כפתור יציאה - תמיד למטה */}
      <button onClick={onLogout} className="mt-8 text-red-500 flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-full transition">
          <LogOut size={18} /> {t.logout}
      </button>

    </div>
  );
};

export default ProfileTab;