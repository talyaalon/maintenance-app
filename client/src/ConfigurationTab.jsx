import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Box, MapPin, Pencil, X, ChevronDown, ChevronRight, FolderTree, Image as ImageIcon, Layers, User, ChevronUp, Settings, Upload, Map } from 'lucide-react';

const ConfigurationTab = ({ token, t, user }) => { 
  const [activeSubTab, setActiveSubTab] = useState('tree'); 
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]); 
  const [globalFields, setGlobalFields] = useState([]); // שומר את כל השדות המותאמים של המנהלים
  const [managers, setManagers] = useState([]); 

  const [expandedBossManager, setExpandedBossManager] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);

  // מודאלים
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [treeNodeType, setTreeNodeType] = useState('category'); 
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFieldsSettingsModal, setShowFieldsSettingsModal] = useState(false);

  // טפסים
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', code: '', created_by: null });
  const [assetForm, setAssetForm] = useState({ id: null, name: '', category_id: '', location_id: '', code: '', created_by: null });
  
  // טופס מיקומים מתקדם
  const [locationForm, setLocationForm] = useState({ id: null, name: '', map_address: '', existing_image: '', created_by: null });
  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState(null);
  
  // שדות דינמיים של המיקום הספציפי שנערך כעת
  const [dynamicValues, setDynamicValues] = useState({});
  const [dynamicFiles, setDynamicFiles] = useState({});

  // הוספת שדה גלובלי חדש בהגדרות
  const [newField, setNewField] = useState({ name: '', type: 'text' });

  useEffect(() => { 
      fetchData(); 
      if (user?.role === 'BIG_BOSS') fetchManagers();
  }, [user]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const catRes = await fetch('https://maintenance-app-h84v.onrender.com/categories', { headers });
      const assetRes = await fetch('https://maintenance-app-h84v.onrender.com/assets', { headers });
      const locRes = await fetch('https://maintenance-app-h84v.onrender.com/locations', { headers }); 
      const fieldsRes = await fetch('https://maintenance-app-h84v.onrender.com/location-fields', { headers }); 
      
      if (catRes.ok) setCategories(await catRes.json());
      if (assetRes.ok) setAssets(await assetRes.json());
      if (locRes.ok) setLocations(await locRes.json());
      if (fieldsRes.ok) setGlobalFields(await fieldsRes.json());
    } catch (e) { console.error(e); }
  };

  const fetchManagers = async () => {
      try {
          const res = await fetch('https://maintenance-app-h84v.onrender.com/managers', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) setManagers(await res.json());
      } catch (e) {}
  };

  const toggleCategory = (catId) => setExpandedCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);

  const handleDelete = async (type, id) => {
      if (!window.confirm(t.confirm_delete || "האם למחוק פריט זה?")) return;
      try {
          const res = await fetch(`https://maintenance-app-h84v.onrender.com/${type}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) fetchData();
          else alert("לא ניתן למחוק. ייתכן והפריט בשימוש במערכת.");
      } catch (e) { alert("Server Error"); }
  };

  // --- עץ וקטגוריות ---
  const generateAssetCode = (categoryId) => {
      const category = categories.find(c => c.id === parseInt(categoryId));
      if (!category) return '';
      const catCode = (category.code || 'GEN').toUpperCase();
      const relevantAssets = assets.filter(a => a.code && a.code.startsWith(catCode + '-'));
      let maxNum = 0;
      relevantAssets.forEach(a => {
          const parts = a.code.split('-');
          if (parts.length === 2) {
              const numPart = parseInt(parts[1]);
              if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
          }
      });
      return `${catCode}-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const handleSaveTreeItem = async (e) => {
      e.preventDefault();
      let url = '', method = 'POST', payload = {};

      if (treeNodeType === 'category') {
          method = categoryForm.id ? 'PUT' : 'POST';
          url = categoryForm.id ? `https://maintenance-app-h84v.onrender.com/categories/${categoryForm.id}` : 'https://maintenance-app-h84v.onrender.com/categories';
          payload = { name: categoryForm.name, code: categoryForm.code.toUpperCase().slice(0, 3), created_by: categoryForm.created_by };
      } else {
          method = assetForm.id ? 'PUT' : 'POST';
          url = assetForm.id ? `https://maintenance-app-h84v.onrender.com/assets/${assetForm.id}` : 'https://maintenance-app-h84v.onrender.com/assets';
          const finalCode = assetForm.id ? assetForm.code : generateAssetCode(assetForm.category_id);
          payload = { name: assetForm.name, category_id: assetForm.category_id, location_id: assetForm.location_id, code: finalCode, created_by: assetForm.created_by };
      }
      try {
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
          if (res.ok) { setShowTreeModal(false); fetchData(); } 
          else { const data = await res.json(); alert("Error: " + (data.error || "Failed")); }
      } catch (e) { alert("Server Error"); }
  };

  const openTreeModal = (type, targetManagerId, item = null) => {
      setTreeNodeType(type);
      if (type === 'category') setCategoryForm(item ? { ...item, created_by: targetManagerId } : { id: null, name: '', code: '', created_by: targetManagerId });
      else setAssetForm(item ? { ...item, created_by: targetManagerId } : { id: null, name: '', category_id: item?.category_id || '', location_id: '', code: '', created_by: targetManagerId });
      setShowTreeModal(true);
  };

  // --- הגדרות שדות מיקומים גלובליים ---
  const handleAddGlobalField = async (targetManagerId) => {
      if (!newField.name) return;
      try {
          const res = await fetch('https://maintenance-app-h84v.onrender.com/location-fields', {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ ...newField, created_by: targetManagerId })
          });
          if (res.ok) {
              setNewField({ name: '', type: 'text' });
              fetchData();
          }
      } catch(e){ alert("שגיאה בהוספת שדה"); }
  };

  // --- שמירת מיקום (כולל קבצים ושדות דינמיים) ---
  const handleLocationImageChange = (e) => {
      const file = e.target.files[0];
      if (file) { setLocationImageFile(file); setLocationImagePreview(URL.createObjectURL(file)); }
  };

  const handleSaveLocation = async (e) => {
      e.preventDefault();
      const method = locationForm.id ? 'PUT' : 'POST';
      const url = locationForm.id ? `https://maintenance-app-h84v.onrender.com/locations/${locationForm.id}` : 'https://maintenance-app-h84v.onrender.com/locations';
      
      const formData = new FormData();
      formData.append('name', locationForm.name);
      formData.append('created_by', locationForm.created_by);
      
      // המרת חיפוש הכתובת ללינק גוגל מפות אמיתי
      let finalMapLink = locationForm.map_address;
      if (finalMapLink && !finalMapLink.startsWith('http')) {
          finalMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalMapLink)}`;
      }
      formData.append('map_link', finalMapLink);
      
      if (locationImageFile) formData.append('main_image', locationImageFile);
      else if (locationForm.existing_image) formData.append('existing_image', locationForm.existing_image);

      // איסוף שדות דינמיים שרלוונטיים למנהל
      const fieldsToSave = [];
      const managerFields = globalFields.filter(f => f.created_by === locationForm.created_by);
      
      managerFields.forEach(f => {
          let val = dynamicValues[f.name] || '';
          if ((f.type === 'file' || f.type === 'media') && dynamicFiles[f.name]) {
              formData.append(`dynamic_${f.name}`, dynamicFiles[f.name]);
              val = 'pending_upload';
          }
          fieldsToSave.push({ name: f.name, type: f.type, value: val });
      });
      formData.append('dynamic_fields', JSON.stringify(fieldsToSave));

      try {
          const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body: formData });
          if (res.ok) { setShowLocationModal(false); fetchData(); } 
          else { alert("Error saving location"); }
      } catch (e) { alert("Server Error"); }
  };

  const openLocationModal = (targetManagerId, loc = null) => {
      setLocationImageFile(null);
      if (loc) {
          let parsedFields = [], parsedMap = '';
          try { parsedFields = typeof loc.dynamic_fields === 'string' ? JSON.parse(loc.dynamic_fields) : (loc.dynamic_fields || []); } catch(e){}
          try { parsedMap = (typeof loc.coordinates === 'string' ? JSON.parse(loc.coordinates) : loc.coordinates)?.link || ''; } catch(e){}
          
          // אם זה כבר לינק של גוגל מפות, ננסה לחלץ משם את הכתובת הידידותית
          let displayAddress = parsedMap;
          if (displayAddress.includes('query=')) {
              displayAddress = decodeURIComponent(displayAddress.split('query=')[1].split('&')[0]);
          }

          setLocationForm({ id: loc.id, name: loc.name, map_address: displayAddress, existing_image: loc.image_url || '', created_by: targetManagerId });
          setLocationImagePreview(loc.image_url);

          let vals = {};
          parsedFields.forEach(f => vals[f.name] = f.value);
          setDynamicValues(vals);
          setDynamicFiles({});
      } else {
          setLocationForm({ id: null, name: '', map_address: '', existing_image: '', created_by: targetManagerId });
          setLocationImagePreview(null);
          setDynamicValues({});
          setDynamicFiles({});
      }
      setShowLocationModal(true);
  };

  // --- רינדור סביבת העבודה (אזור העץ והמיקומים) ---
  const renderWorkspace = (targetManagerId) => {
      const wCategories = categories.filter(c => c.created_by === targetManagerId);
      const wAssets = assets.filter(a => a.created_by === targetManagerId);
      const wLocations = locations.filter(l => l.created_by === targetManagerId);
      const mFields = globalFields.filter(f => f.created_by === targetManagerId);

      return (
          <div className="space-y-6 mt-4 border-t pt-4">
              <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-xl shadow-inner border">
                  <button onClick={() => setActiveSubTab('tree')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'tree' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><FolderTree size={16}/> קטגוריות ונכסים</button>
                  <button onClick={() => setActiveSubTab('locations')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'locations' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><MapPin size={16}/> מיקומים</button>
              </div>

              {activeSubTab === 'tree' && (
                  <div className="animate-fade-in space-y-4">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-md font-bold text-gray-700">עץ היררכיה</h3>
                          <button onClick={() => openTreeModal('category', targetManagerId)} className="bg-[#714B67] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:opacity-90 flex items-center gap-1"><Plus size={14}/> הוסף קטגוריה</button>
                      </div>
                      <div className="space-y-3">
                          {wCategories.length === 0 && <p className="text-gray-400 text-center text-sm py-4">אין קטגוריות למנהל זה.</p>}
                          {wCategories.map(category => {
                              const categoryAssets = wAssets.filter(a => a.category_id === category.id);
                              const isExpanded = expandedCategories.includes(category.id);
                              return (
                                  <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                      <div className="p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 cursor-pointer transition" onClick={() => toggleCategory(category.id)}>
                                          <div className="flex items-center gap-3">
                                              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Tag size={16}/></div>
                                              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">{category.name} <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 rounded-full uppercase">{category.code}</span></h4>
                                          </div>
                                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                              <button onClick={() => openTreeModal('asset', targetManagerId, { category_id: category.id })} className="p-1.5 text-[#714B67] hover:bg-purple-100 rounded-full"><Plus size={16}/></button>
                                              <button onClick={() => openTreeModal('category', targetManagerId, category)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-full"><Pencil size={16}/></button>
                                              <button onClick={() => handleDelete('categories', category.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full"><Trash2 size={16}/></button>
                                              <button onClick={() => toggleCategory(category.id)} className="p-1.5 text-gray-400">
                                                  {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                              </button>
                                          </div>
                                      </div>
                                      {isExpanded && (
                                          <div className="bg-white border-t animate-slide-down">
                                              {categoryAssets.length === 0 ? (
                                                  <div className="p-3 text-center text-xs text-gray-400">אין נכסים תחת קטגוריה זו.</div>
                                              ) : (
                                                  <div className="divide-y divide-gray-50">
                                                      {categoryAssets.map(asset => {
                                                          const locName = wLocations.find(l => l.id === asset.location_id)?.name || 'ללא מיקום';
                                                          return (
                                                              <div key={asset.id} className="p-2 pl-6 flex justify-between items-center hover:bg-gray-50 pr-3 ml-4 border-l-2 border-purple-200">
                                                                  <div className="flex items-center gap-2">
                                                                      <Box size={14} className="text-gray-400"/>
                                                                      <div>
                                                                          <span className="font-bold text-gray-700 text-sm block">{asset.name}</span>
                                                                          <div className="text-[10px] text-gray-500 flex gap-2">
                                                                              <span className="font-mono bg-gray-100 px-1 rounded text-purple-600">{asset.code}</span>
                                                                              <span className="flex items-center gap-0.5"><MapPin size={10}/> {locName}</span>
                                                                          </div>
                                                                      </div>
                                                                  </div>
                                                                  <div className="flex gap-1">
                                                                      <button onClick={() => openTreeModal('asset', targetManagerId, asset)} className="p-1 text-gray-400 hover:text-blue-500"><Pencil size={14}/></button>
                                                                      <button onClick={() => handleDelete('assets', asset.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                                                  </div>
                                                              </div>
                                                          )
                                                      })}
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {activeSubTab === 'locations' && (
                  <div className="animate-fade-in space-y-4">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-md font-bold text-gray-700">ניהול מיקומים</h3>
                          <div className="flex gap-2">
                              {/* כפתור גלגל השיניים להגדרות השדות */}
                              <button onClick={() => setShowFieldsSettingsModal(true)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-300 flex items-center gap-1 shadow-sm"><Settings size={14}/> שדות</button>
                              <button onClick={() => openLocationModal(targetManagerId)} className="bg-[#714B67] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:opacity-90 flex items-center gap-1"><Plus size={14}/> מיקום</button>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {wLocations.length === 0 && <p className="text-gray-400 text-center text-sm py-4 col-span-2">אין מיקומים למנהל זה.</p>}
                          {wLocations.map(loc => {
                              let fieldsCount = 0;
                              try { fieldsCount = (typeof loc.dynamic_fields === 'string' ? JSON.parse(loc.dynamic_fields) : (loc.dynamic_fields || [])).length; } catch(e){}
                              return (
                                  <div key={loc.id} className="bg-white p-3 rounded-xl border shadow-sm group">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex gap-2 items-center">
                                              {loc.image_url ? (
                                                  <img src={loc.image_url} alt={loc.name} className="w-10 h-10 rounded-lg object-cover border" />
                                              ) : (
                                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border"><MapPin size={16}/></div>
                                              )}
                                              <div>
                                                  <h4 className="font-bold text-gray-800 text-sm">{loc.name}</h4>
                                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">{loc.code}</span>
                                              </div>
                                          </div>
                                          <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                              <button onClick={() => openLocationModal(targetManagerId, loc)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil size={14}/></button>
                                              <button onClick={() => handleDelete('locations', loc.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                                          </div>
                                      </div>
                                      <div className="flex gap-3 text-[10px] text-gray-500 border-t pt-2 mt-2">
                                          <span className="flex items-center gap-1"><Layers size={12}/> {fieldsCount} שדות מותאמים</span>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {/* מודאל הגדרות שדות גלובליים למנהל */}
                      {showFieldsSettingsModal && (
                          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 animate-scale-in">
                                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Settings size={20} className="text-gray-500"/> שדות מיקום מתקדמים</h3>
                                      <button onClick={() => setShowFieldsSettingsModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-4">השדות שתגדיר כאן יתווספו אוטומטית לכל המיקומים הקיימים והחדשים תחת אחריותך.</p>
                                  
                                  <div className="space-y-2 mb-6">
                                      {mFields.length === 0 && <p className="text-center text-sm text-gray-400 italic">לא הוגדרו עדיין שדות.</p>}
                                      {mFields.map(f => (
                                          <div key={f.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border text-sm">
                                              <div className="flex items-center gap-2 font-medium">
                                                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> {f.name}
                                                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase">{f.type}</span>
                                              </div>
                                              <button onClick={() => handleDelete('location-fields', f.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                          </div>
                                      ))}
                                  </div>

                                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex gap-2 items-end">
                                      <div className="flex-1">
                                          <label className="text-xs font-bold text-purple-800 block mb-1">שם השדה (למשל: סרטון הדרכה)</label>
                                          <input type="text" className="w-full p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-purple-300" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                                      </div>
                                      <div className="w-1/3">
                                          <label className="text-xs font-bold text-purple-800 block mb-1">סוג</label>
                                          <select className="w-full p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-purple-300" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})}>
                                              <option value="text">טקסט</option>
                                              <option value="number">מספרים</option>
                                              <option value="file">קובץ / מסמך</option>
                                              <option value="media">תמונה / מדיה</option>
                                          </select>
                                      </div>
                                      <button onClick={() => handleAddGlobalField(targetManagerId)} className="bg-purple-600 text-white p-2.5 rounded-lg hover:bg-purple-700 shadow-md"><Plus size={18}/></button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="p-4 pb-32 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">{t.config_title || "הגדרות מערכת"}</h2>
      
      {/* תצוגת BIG_BOSS */}
      {user?.role === 'BIG_BOSS' ? (
          <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">אתה מחובר כ-Big Boss. בחר מנהל כדי לנהל את אזור העבודה שלו.</p>
              {managers.map(manager => {
                  const isExpanded = expandedBossManager === manager.id;
                  return (
                      <div key={manager.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-purple-400' : ''}`}>
                          <div className={`p-4 flex justify-between items-center cursor-pointer transition ${isExpanded ? 'bg-purple-50' : 'hover:bg-gray-50'}`} onClick={() => setExpandedBossManager(isExpanded ? null : manager.id)}>
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${isExpanded ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}><User size={20}/></div>
                                  <div><h3 className="font-bold text-gray-800 text-lg">{manager.full_name}</h3><span className="text-xs text-gray-500">ניהול סביבת עבודה</span></div>
                              </div>
                              <div className="text-gray-400">{isExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</div>
                          </div>
                          {isExpanded && <div className="p-4 bg-white border-t animate-slide-down">{renderWorkspace(manager.id)}</div>}
                      </div>
                  )
              })}
          </div>
      ) : (
          /* תצוגת מנהל רגיל */
          <div className="bg-white p-6 rounded-2xl shadow-sm border">{renderWorkspace(user.id)}</div>
      )}

      {/* מודאל עץ קטגוריות / נכסים */}
      {showTreeModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 animate-scale-in">
                  <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-lg">{treeNodeType === 'category' ? 'הגדרת קטגוריה' : 'הגדרת נכס'}</h3><button onClick={() => setShowTreeModal(false)} className="hover:bg-gray-100 p-1 rounded-full"><X/></button></div>
                  <form onSubmit={handleSaveTreeItem} className="space-y-4">
                      {treeNodeType === 'category' ? (
                          <>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">שם הקטגוריה</label><input type="text" required className="w-full p-3 border rounded-lg bg-gray-50" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} /></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">קוד זיהוי (3 אותיות)</label><input type="text" required maxLength="3" className="w-full p-3 border rounded-lg bg-gray-50 uppercase font-mono" value={categoryForm.code} onChange={e => setCategoryForm({...categoryForm, code: e.target.value.toUpperCase()})} /></div>
                          </>
                      ) : (
                          <>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">שם הנכס</label><input type="text" required className="w-full p-3 border rounded-lg bg-gray-50" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} /></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">קטגוריה</label><select required className="w-full p-3 border rounded-lg bg-gray-50" value={assetForm.category_id} onChange={e => setAssetForm({...assetForm, category_id: e.target.value})}><option value="">בחר...</option>{categories.filter(c => c.created_by === assetForm.created_by).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">מיקום</label><select required className="w-full p-3 border rounded-lg bg-gray-50" value={assetForm.location_id} onChange={e => setAssetForm({...assetForm, location_id: e.target.value})}><option value="">בחר...</option>{locations.filter(l => l.created_by === assetForm.created_by).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                              {assetForm.id && <div><label className="block text-sm font-bold text-gray-700 mb-1">קוד (נוצר אוטומטית)</label><input type="text" disabled className="w-full p-3 border rounded-lg bg-gray-100 font-mono text-gray-500" value={assetForm.code} /></div>}
                          </>
                      )}
                      <button type="submit" className="w-full py-3 bg-[#714B67] text-white rounded-xl font-bold mt-2 shadow">שמור</button>
                  </form>
              </div>
          </div>
      )}

      {/* מודאל מיקום (עם העלאת תמונה וחיפוש כתובת) */}
      {showLocationModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl"><h3 className="font-bold text-lg text-gray-800">כרטיסיית מיקום</h3><button onClick={() => setShowLocationModal(false)} className="hover:bg-gray-200 p-1 rounded-full"><X/></button></div>
                  <div className="p-6 overflow-y-auto space-y-5">
                      
                      {/* תמונת מיקום */}
                      <div className="flex flex-col items-center">
                          <div className="relative group">
                              <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                                  {locationImagePreview ? <img src={locationImagePreview} className="w-full h-full object-cover"/> : <ImageIcon size={40} className="text-gray-300"/>}
                              </div>
                              <label className="absolute -bottom-2 -right-2 bg-[#714B67] p-2.5 rounded-full text-white cursor-pointer shadow-md hover:scale-110 transition z-10">
                                  <Upload size={16} />
                                  <input type="file" hidden accept="image/*" onChange={handleLocationImageChange} />
                              </label>
                          </div>
                          <span className="text-xs text-gray-400 mt-2 font-medium">תמונת המיקום (אופציונלי)</span>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">שם המיקום <span className="text-red-500">*</span></label>
                          <input type="text" required placeholder="למשל: סניף תל אביב מרכז" className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none" value={locationForm.name} onChange={e => setLocationForm({...locationForm, name: e.target.value})} />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Map size={16} className="text-blue-500"/> חיפוש כתובת (מפות גוגל)</label>
                          <input type="text" placeholder="למשל: דיזנגוף סנטר, תל אביב..." className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none" value={locationForm.map_address} onChange={e => setLocationForm({...locationForm, map_address: e.target.value})} />
                          <p className="text-[10px] text-gray-400 mt-1">הכתובת תהפוך אוטומטית לקישור ניווט באפליקציה.</p>
                      </div>

                      {/* שדות דינמיים */}
                      {globalFields.filter(f => f.created_by === locationForm.created_by).length > 0 && (
                          <div className="border-t pt-5 mt-2 space-y-4">
                              <h4 className="font-bold text-[#714B67] text-sm flex items-center gap-1"><Layers size={18}/> נתונים נוספים</h4>
                              {globalFields.filter(f => f.created_by === locationForm.created_by).map(field => (
                                  <div key={field.id} className="bg-gray-50 p-3 rounded-xl border">
                                      <label className="block text-xs font-bold text-gray-700 mb-2">{field.name} <span className="text-[10px] font-normal text-gray-400 bg-white px-1 py-0.5 rounded border ml-2">{field.type}</span></label>
                                      
                                      {field.type === 'text' || field.type === 'number' ? (
                                          <input type={field.type} placeholder="הכנס נתון..." className="w-full p-2.5 border rounded-lg bg-white text-sm outline-none" value={dynamicValues[field.name] || ''} onChange={e => setDynamicValues({...dynamicValues, [field.name]: e.target.value})} />
                                      ) : (
                                          <div className="flex items-center gap-3">
                                              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
                                                  <Upload size={14} className="text-gray-500"/>
                                                  <span className="text-gray-700 font-medium">בחר קובץ...</span>
                                                  <input type="file" hidden onChange={e => setDynamicFiles({...dynamicFiles, [field.name]: e.target.files[0]})} />
                                              </label>
                                              
                                              {dynamicFiles[field.name] ? (
                                                  <span className="text-xs text-blue-600 font-medium">הקובץ נבחר וממתין לשמירה</span>
                                              ) : dynamicValues[field.name] && dynamicValues[field.name].includes('/uploads/') ? (
                                                  <a href={`https://maintenance-app-h84v.onrender.com${dynamicValues[field.name]}`} target="_blank" rel="noreferrer" className="text-xs text-green-600 font-medium hover:underline flex items-center gap-1">✓ צפה בקובץ הקיים</a>
                                              ) : (
                                                  <span className="text-xs text-gray-400">לא נבחר קובץ</span>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t bg-white rounded-b-2xl">
                      <button type="button" onClick={handleSaveLocation} className="w-full py-3.5 bg-[#714B67] text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition transform hover:scale-[1.01]">שמור כרטיסיית מיקום</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConfigurationTab;