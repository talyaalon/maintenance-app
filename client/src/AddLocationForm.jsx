import React, { useState } from 'react';

const AddLocationForm = ({ onClose }) => {
  const [name, setName] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('http://localhost:3001/locations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name })
      });
      
      if (res.ok) {
        alert('מיקום נוסף בהצלחה!');
        onClose();
      }
    } catch (err) {
      alert('שגיאה');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" dir="rtl">
        <h2 className="text-xl font-bold mb-4 text-purple-700">הוספת מיקום חדש</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="שם המיקום (למשל: מחסן ב')" 
            className="w-full p-2 border rounded mb-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded">ביטול</button>
            <button type="submit" className="flex-1 py-2 bg-purple-700 text-white rounded">שמור</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLocationForm;