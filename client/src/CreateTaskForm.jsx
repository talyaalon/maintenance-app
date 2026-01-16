import React, { useState, useEffect } from 'react';

const CreateTaskForm = ({ onTaskCreated, onCancel }) => {
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    urgency: 'Normal',
    due_date: '',
    location_id: '' // שדה חדש לבחירת מיקום
  });

  // טעינת רשימת המיקומים בעת פתיחת הטופס
  useEffect(() => {
    const fetchLocations = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://localhost:3001/locations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setLocations(data);
      } catch (err) {
        console.error("Error loading locations");
      }
    };
    fetchLocations();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!formData.location_id) {
        alert("נא לבחור מיקום מהרשימה");
        return;
    }

    try {
      const response = await fetch('http://localhost:3001/tasks', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData) 
      });
      
      if (response.ok) {
        onTaskCreated();
      } else {
        alert("שגיאה ביצירת משימה");
      }
    } catch (error) {
      alert("שגיאת תקשורת");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" dir="rtl">
        <h2 className="text-xl font-bold mb-4 text-purple-700">משימה חדשה</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">מה צריך לבצע?</label>
            <input
              type="text"
              name="title"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              value={formData.title}
              onChange={handleChange}
              placeholder="לדוגמה: תיקון מזגן"
            />
          </div>

          {/* שדה בחירת מיקום החדש */}
          <div>
            <label className="block text-sm font-medium text-gray-700">מיקום:</label>
            <select
              name="location_id"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              value={formData.location_id}
              onChange={handleChange}
            >
              <option value="">-- בחר מיקום --</option>
              {locations.length > 0 ? (
                  locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))
              ) : (
                  <option disabled>אין מיקומים מוגדרים</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">דחיפות</label>
            <select
              name="urgency"
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              value={formData.urgency}
              onChange={handleChange}
            >
              <option value="Low">נמוכה (Low)</option>
              <option value="Normal">רגילה (Normal)</option>
              <option value="High">דחופה (High)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">תאריך יעד</label>
            <input
              type="date"
              name="due_date"
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              value={formData.due_date}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-2 border rounded">ביטול</button>
            <button type="submit" className="flex-1 py-2 bg-purple-700 text-white rounded">צור משימה</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskForm;