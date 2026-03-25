import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Tag, Box, MapPin, Pencil, X, ChevronDown, ChevronRight, FolderTree, Image as ImageIcon, Map, Layers, User, ChevronUp, Settings, Upload, Send, Loader2, FileSpreadsheet } from 'lucide-react';
import ConfigExcelPanel from './ConfigExcelPanel';
import MultiLangNameInput from './MultiLangNameInput';

const ConfigurationTab = ({ token, t, user, lang }) => { 
  const [activeSubTab, setActiveSubTab] = useState(() => {
      return localStorage.getItem('configActiveSubTab') || 'tree';
  });

  useEffect(() => {
      localStorage.setItem('configActiveSubTab', activeSubTab);
  }, [activeSubTab]);

  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [globalFields, setGlobalFields] = useState([]);
  const [managers, setManagers] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Top-level tab for Big Boss: 'workspaces' | 'permissions'
  const [bossMainTab, setBossMainTab] = useState('workspaces');

  // Excel import/export panel: which section is currently open
  const [openExcelSection, setOpenExcelSection] = useState(null);
  const toggleExcelSection = (section) => setOpenExcelSection(prev => prev === section ? null : section);
  const canUseExcel = ['BIG_BOSS', 'COMPANY_MANAGER'].includes(user?.role);

  const [expandedBossManager, setExpandedBossManager] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);

  const [showTreeModal, setShowTreeModal] = useState(false);
  const [treeNodeType, setTreeNodeType] = useState('category');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFieldsSettingsModal, setShowFieldsSettingsModal] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ id: null, name_he: '', name_en: '', name_th: '', code: '', created_by: null });
  const [assetForm, setAssetForm] = useState({ id: null, name_he: '', name_en: '', name_th: '', category_id: '', location_id: '', code: '', created_by: null });

  const [locationForm, setLocationForm] = useState({ id: null, name_he: '', name_en: '', name_th: '', address: '', existing_image: '', created_by: null });
  const [isGeolocating, setIsGeolocating] = useState(false);
  const locationAddressRef = useRef(null);
  const mapsScriptLoaded = useRef(false);
  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState(null);

  const [dynamicValues, setDynamicValues] = useState({});
  const [dynamicFiles, setDynamicFiles] = useState({});
  const [newField, setNewField] = useState({ name_he: '', name_en: '', name_th: '', type: 'text' });

  useEffect(() => {
      fetchData();
      if (user?.role === 'BIG_BOSS') { fetchManagers(); fetchCompanies(); }
  }, [user]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [catRes, assetRes, locRes, fieldsRes] = await Promise.all([
        fetch('https://maintenance-app-staging.onrender.com/categories', { headers }),
        fetch('https://maintenance-app-staging.onrender.com/assets', { headers }),
        fetch('https://maintenance-app-staging.onrender.com/locations', { headers }),
        fetch('https://maintenance-app-staging.onrender.com/location-fields', { headers }),
      ]);
      if (catRes.ok)    { const d = await catRes.json();    setCategories(Array.isArray(d) ? d : []); }
      if (assetRes.ok)  { const d = await assetRes.json();  setAssets(Array.isArray(d) ? d : []); }
      if (locRes.ok)    { const d = await locRes.json();    setLocations(Array.isArray(d) ? d : []); }
      if (fieldsRes.ok) { const d = await fieldsRes.json(); setGlobalFields(Array.isArray(d) ? d : []); }
    } catch (e) { console.error(e); }
  };

  const fetchManagers = async () => {
      try {
          const res = await fetch('https://maintenance-app-staging.onrender.com/managers', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { const d = await res.json(); setManagers(Array.isArray(d) ? d : []); }
      } catch (e) { console.error(e); }
  };

  const fetchCompanies = async () => {
      try {
          const res = await fetch('https://maintenance-app-staging.onrender.com/companies', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { const d = await res.json(); setCompanies(Array.isArray(d) ? d : []); }
      } catch (e) { console.error(e); }
  };

  // ── Google Maps: load script once ────────────────────────────────────────
  useEffect(() => {
    const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (mapsScriptLoaded.current || !MAPS_KEY) return;
    if (window.google?.maps?.places) { mapsScriptLoaded.current = true; return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsScriptLoaded.current = true; };
    document.head.appendChild(script);
  }, []);

  // ── Init autocomplete when location modal opens ───────────────────────────
  useEffect(() => {
    if (!showLocationModal) return;
    const tryInit = () => {
      if (!window.google?.maps?.places || !locationAddressRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(locationAddressRef.current, { types: ['geocode'] });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        setLocationForm(prev => ({ ...prev, address: place.formatted_address || locationAddressRef.current.value }));
      });
    };
    const timer = setTimeout(tryInit, 300);
    return () => clearTimeout(timer);
  }, [showLocationModal]);

  const handleUseCurrentLocation = async () => {
    const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${MAPS_KEY}`
          );
          const data = await res.json();
          const address = data.results?.[0]?.formatted_address || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
          setLocationForm(prev => ({ ...prev, address }));
          if (locationAddressRef.current) locationAddressRef.current.value = address;
        } catch {
          const address = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
          setLocationForm(prev => ({ ...prev, address }));
          if (locationAddressRef.current) locationAddressRef.current.value = address;
        }
        setIsGeolocating(false);
      },
      () => { alert('Could not get your location'); setIsGeolocating(false); }
    );
  };

  // Toggle a boolean permission field on a manager via PUT /users/:id
  const handleTogglePermission = async (manager, field) => {
      // Fields that are "true by default when undefined" must use !== false semantics
      const defaultTrueFields = ['can_manage_fields', 'allowed_lang_he', 'allowed_lang_en', 'allowed_lang_th'];
      const currentValue = defaultTrueFields.includes(field) ? manager[field] !== false : !!manager[field];
      const newValue = !currentValue;

      // Optimistic update: flip the toggle immediately so the UI reacts on click
      setManagers(prev => prev.map(m => m.id === manager.id ? { ...m, [field]: newValue } : m));

      try {
          const res = await fetch(`https://maintenance-app-staging.onrender.com/users/${manager.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                  full_name: manager.full_name,
                  email: manager.email,
                  phone: manager.phone || '',
                  role: manager.role,
                  preferred_language: manager.preferred_language || 'he',
                  [field]: newValue
              })
          });
          if (res.ok) {
              fetchManagers(); // confirm from server
          } else {
              // Revert optimistic update on failure
              setManagers(prev => prev.map(m => m.id === manager.id ? { ...m, [field]: currentValue } : m));
              try {
                  const d = await res.json();
                  alert(d.error || 'Error updating permission');
              } catch { alert('Error updating permission'); }
          }
      } catch (e) {
          // Revert on network error
          setManagers(prev => prev.map(m => m.id === manager.id ? { ...m, [field]: currentValue } : m));
          alert('Server error');
      }
  };

  const [sendingReportId, setSendingReportId] = useState(null);

  const handleSendReport = async (managerId) => {
      setSendingReportId(managerId);
      try {
          await fetch('https://maintenance-app-staging.onrender.com/api/trigger-daily-reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ manager_id: managerId }),
          });
      } catch (e) { console.error(e); }
      finally { setSendingReportId(null); }
  };

  // Reusable inline toggle switch — strict #714B67 palette
  const PermissionToggle = ({ label, hint, value, onToggle }) => (
      <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div>
              <p className="font-bold text-gray-800 text-sm">{label}</p>
              {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
          </div>
          <button
              onClick={onToggle}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none shrink-0 ${value ? 'bg-[#714B67]' : 'bg-gray-300'}`}
          >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? 'right-1' : 'left-1'}`} />
          </button>
      </div>
  );

  const getFieldName = (nameStr) => {
      try {
          const parsed = JSON.parse(nameStr);
          return parsed[lang] || parsed.en || parsed.he || nameStr;
      } catch (e) { return nameStr; }
  };

  const toggleCategory = (catId) => setExpandedCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);

  const handleDelete = async (type, id) => {
      if (!window.confirm(t.confirm_delete || "האם למחוק פריט זה?")) return;
      try {
          const res = await fetch(`https://maintenance-app-staging.onrender.com/${type}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) {
              fetchData();
          } else {
              const data = await res.json().catch(() => ({}));
              alert(data.message || "לא ניתן למחוק. ייתכן והפריט בשימוש במערכת.");
          }
      } catch (e) { alert("Server Error"); }
  };

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

  const handleApiError = async (res) => {
      try {
          const text = await res.text();
          try {
              const data = JSON.parse(text);
              if (data.error && data.error.includes("כפילות")) {
                  alert("⚠️ שים לב: " + data.error);
              } else {
                  alert("❌ שגיאה: " + (data.error || "תקלה בשמירה."));
              }
          } catch (e) {
              alert("❌ שגיאת שרת: התקבלה תגובה לא תקינה מהשרת.");
          }
      } catch (e) {
          alert("❌ שגיאת תקשורת מול השרת.");
      }
  };

  const handleSaveTreeItem = async (e) => {
      e.preventDefault();
      let url = '', method = 'POST', payload = {};

      if (treeNodeType === 'category') {
          method = categoryForm.id ? 'PUT' : 'POST';
          url = categoryForm.id ? `https://maintenance-app-staging.onrender.com/categories/${categoryForm.id}` : 'https://maintenance-app-staging.onrender.com/categories';
          payload = { name_he: categoryForm.name_he, name_en: categoryForm.name_en, name_th: categoryForm.name_th, code: categoryForm.code.toUpperCase().slice(0, 5), created_by: categoryForm.created_by };
      } else {
          method = assetForm.id ? 'PUT' : 'POST';
          url = assetForm.id ? `https://maintenance-app-staging.onrender.com/assets/${assetForm.id}` : 'https://maintenance-app-staging.onrender.com/assets';
          const finalCode = assetForm.id ? assetForm.code : generateAssetCode(assetForm.category_id);
          payload = { name_he: assetForm.name_he, name_en: assetForm.name_en, name_th: assetForm.name_th, category_id: assetForm.category_id, location_id: assetForm.location_id, code: finalCode, created_by: assetForm.created_by };
      }
      try {
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
          if (res.ok) { setShowTreeModal(false); fetchData(); } 
          else { await handleApiError(res); }
      } catch (e) { alert("Server Error"); }
  };

  const openTreeModal = (type, targetManagerId, item = null) => {
      setTreeNodeType(type);
      if (type === 'category') setCategoryForm(item
        ? { id: item.id, name_he: item.name_he || '', name_en: item.name_en || item.name || '', name_th: item.name_th || '', code: item.code || '', created_by: targetManagerId }
        : { id: null, name_he: '', name_en: '', name_th: '', code: '', created_by: targetManagerId });
      else setAssetForm(item
        ? { id: item.id, name_he: item.name_he || '', name_en: item.name_en || item.name || '', name_th: item.name_th || '', category_id: item.category_id || '', location_id: item.location_id || '', code: item.code || '', created_by: targetManagerId }
        : { id: null, name_he: '', name_en: '', name_th: '', category_id: item?.category_id || '', location_id: '', code: '', created_by: targetManagerId });
      setShowTreeModal(true);
  };

  const handleAddGlobalField = async (targetManagerId) => {
      if (!newField.name_he && !newField.name_en && !newField.name_th) return alert("יש למלא לפחות שם באחת השפות");
      const nameObjectStr = JSON.stringify({
          he: newField.name_he || newField.name_en,
          en: newField.name_en || newField.name_he,
          th: newField.name_th || newField.name_en
      });

      try {
          const res = await fetch('https://maintenance-app-staging.onrender.com/location-fields', {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ name: nameObjectStr, type: newField.type, created_by: targetManagerId })
          });
          if (res.ok) {
              setNewField({ name_he: '', name_en: '', name_th: '', type: 'text' });
              fetchData();
          } else { await handleApiError(res); }
      } catch(e){ alert("שגיאה בהוספת שדה"); }
  };

  const handleLocationImageChange = (e) => {
      const file = e.target.files[0];
      if (file) { setLocationImageFile(file); setLocationImagePreview(URL.createObjectURL(file)); }
  };

  const handleSaveLocation = async (e) => {
      e.preventDefault();
      const method = locationForm.id ? 'PUT' : 'POST';
      const url = locationForm.id ? `https://maintenance-app-staging.onrender.com/locations/${locationForm.id}` : 'https://maintenance-app-staging.onrender.com/locations';
      
      const formData = new FormData();
      formData.append('name_he', locationForm.name_he || '');
      formData.append('name_en', locationForm.name_en || '');
      formData.append('name_th', locationForm.name_th || '');
      formData.append('created_by', locationForm.created_by);
      formData.append('map_link', locationForm.address || '');
      
      if (locationImageFile) formData.append('main_image', locationImageFile);
      else if (locationForm.existing_image) formData.append('existing_image', locationForm.existing_image);

      const fieldsToSave = [];
      const managerFields = globalFields.filter(f => f.created_by === locationForm.created_by);
      
      managerFields.forEach(f => {
          // משתמשים ב-ID, ואם אין - משתמשים בשם. זה מכסה את כל המקרים!
          const key = f.id || f.name; 
          let val = dynamicValues[key] || dynamicValues[f.name] || ''; 
          
          if ((f.type === 'file' || f.type === 'media') && dynamicFiles[key]) {
              // אורזים את השם/ID כדי שיעבור בטוח לשרת!
              const safeName = encodeURIComponent(key);
              formData.append(`dynamic_${safeName}`, dynamicFiles[key]);
              val = 'pending_upload';
          }
          fieldsToSave.push({ id: f.id, name: f.name, type: f.type, value: val });
      });
      formData.append('dynamic_fields', JSON.stringify(fieldsToSave));

      try {
          const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body: formData });
          if (res.ok) { setShowLocationModal(false); fetchData(); } 
          else { await handleApiError(res); }
      } catch (e) { alert("Server Error"); }
  };
  const openLocationModal = (targetManagerId, loc = null) => {
      setLocationImageFile(null);
      if (loc) {
          let parsedFields = [], parsedMap = '';
          try { parsedFields = typeof loc.dynamic_fields === 'string' ? JSON.parse(loc.dynamic_fields) : (loc.dynamic_fields || []); } catch(e){}
          try { parsedMap = (typeof loc.coordinates === 'string' ? JSON.parse(loc.coordinates) : loc.coordinates)?.link || ''; } catch(e){}

          const fullImgUrl = loc.image_url && loc.image_url.startsWith('/') ? `https://maintenance-app-staging.onrender.com${loc.image_url}` : loc.image_url;

          setLocationForm({ id: loc.id, name_he: loc.name_he || '', name_en: loc.name_en || loc.name || '', name_th: loc.name_th || '', address: parsedMap, existing_image: loc.image_url || '', created_by: targetManagerId });
          setLocationImagePreview(fullImgUrl);

          let vals = {};
          parsedFields.forEach(f => {
              const key = f.id || f.name;
              vals[key] = f.value;
          });
          setDynamicValues(vals);
          setDynamicFiles({});
      } else {
          setLocationForm({ id: null, name_he: '', name_en: '', name_th: '', address: '', existing_image: '', created_by: targetManagerId });
          setLocationImagePreview(null);
          setDynamicValues({});
          setDynamicFiles({});
      }
      setShowLocationModal(true);
  };

  const getMapEmbedUrl = () => {
      const query = locationForm.address || locationForm.name_en || locationForm.name_he;
      if (!query) return '';
      return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  };

  const renderWorkspace = (targetManagerId) => {
      // MANAGER with can_manage_fields explicitly set to false loses access to Field Settings
      const canManageFields = !(user?.role === 'MANAGER' && user?.can_manage_fields === false);
      const wCategories = (Array.isArray(categories) ? categories : []).filter(c => c?.created_by === targetManagerId);
      const wAssets     = (Array.isArray(assets) ? assets : []).filter(a => a?.created_by === targetManagerId);
      const wLocations  = (Array.isArray(locations) ? locations : []).filter(l => l?.created_by === targetManagerId);
      const mFields     = (Array.isArray(globalFields) ? globalFields : []).filter(f => f?.created_by === targetManagerId);

      return (
          <div className="space-y-6 mt-4 border-t pt-4">
              <div className="flex gap-1.5 mb-4 bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button onClick={() => setActiveSubTab('tree')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'tree' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><FolderTree size={16}/> {t.tab_categories_assets || 'קטגוריות ונכסים'}</button>
                  <button onClick={() => setActiveSubTab('locations')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'locations' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><MapPin size={16}/> {t.nav_locations || 'מיקומים'}</button>
                  <button onClick={() => setActiveSubTab('users')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'users' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><User size={16}/> {t.tab_users || 'משתמשים'}</button>
              </div>

              {activeSubTab === 'tree' && (
                  <div className="animate-fade-in space-y-4">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-md font-bold text-gray-700">{t.hierarchy_tree_title || 'עץ היררכיה'}</h3>
                          <div className="flex items-center gap-2">
                              {canUseExcel && (
                                  <>
                                      <button
                                          onClick={() => toggleExcelSection('categories')}
                                          className={`p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'categories' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                                          title="Categories — Excel ייבוא / ייצוא"
                                      >
                                          <FileSpreadsheet size={14} />
                                      </button>
                                      <button
                                          onClick={() => toggleExcelSection('assets')}
                                          className={`p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'assets' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                                          title="Assets — Excel ייבוא / ייצוא"
                                      >
                                          <FileSpreadsheet size={14} />
                                      </button>
                                  </>
                              )}
                              <button onClick={() => openTreeModal('category', targetManagerId)} className="bg-[#714B67] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:opacity-90 flex items-center gap-1"><Plus size={14}/> {t.add_category_btn || 'הוסף קטגוריה'}</button>
                          </div>
                      </div>
                      {openExcelSection === 'categories' && (
                          <ConfigExcelPanel section="categories" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                      )}
                      {openExcelSection === 'assets' && (
                          <ConfigExcelPanel section="assets" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                      )}
                      <div className="space-y-3">
                          {wCategories.length === 0 && <p className="text-gray-400 text-center text-sm py-4">{t.no_categories_for_manager || 'אין קטגוריות למנהל זה.'}</p>}
                          {wCategories.map(category => {
                              const categoryAssets = wAssets.filter(a => a.category_id === category.id);
                              const isExpanded = expandedCategories.includes(category.id);
                              return (
                                  <div key={category.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                      <div className="p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 cursor-pointer transition" onClick={() => toggleCategory(category.id)}>
                                          <div className="flex items-center gap-3">
                                              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Tag size={16}/></div>
                                              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">{category['name_' + lang] || category.name_en || category.name} <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 rounded-full uppercase">{category.code}</span></h4>
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
                                                  <div className="p-3 text-center text-xs text-gray-400">{t.no_assets_in_category_tree || 'אין נכסים תחת קטגוריה זו.'}</div>
                                              ) : (
                                                  <div className="divide-y divide-gray-50">
                                                      {categoryAssets.map(asset => {
                                                          const _locObj = wLocations.find(l => l.id === asset.location_id);
                                                          const locName = _locObj ? (_locObj['name_' + lang] || _locObj.name_en || _locObj.name) : 'ללא מיקום';
                                                          return (
                                                              <div key={asset.id} className="p-2 pl-6 flex justify-between items-center hover:bg-gray-50 pr-3 ml-4 border-l-2 border-purple-200">
                                                                  <div className="flex items-center gap-2">
                                                                      <Box size={14} className="text-gray-400"/>
                                                                      <div>
                                                                          <span className="font-bold text-gray-700 text-sm block">{asset['name_' + lang] || asset.name_en || asset.name}</span>
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

              {activeSubTab === 'users' && (
                  <div className="animate-fade-in space-y-6">
                      {/* ── Managers section ── */}
                      <div>
                          <div className="flex justify-between items-center mb-3">
                              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><User size={15} className="text-[#714B67]"/> {t.managers_title || 'מנהלים'}</h3>
                              {canUseExcel && (
                                  <button
                                      onClick={() => toggleExcelSection('managers')}
                                      className={`p-1 rounded-lg flex items-center gap-1 transition border-none text-[#714B67] ${openExcelSection === 'managers' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                                      title="Managers — Excel ייבוא / ייצוא"
                                  >
                                      <FileSpreadsheet size={12} />
                                  </button>
                              )}
                          </div>
                          {openExcelSection === 'managers' && (
                              <ConfigExcelPanel section="managers" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                          )}
                      </div>

                      {/* ── Employees section ── */}
                      <div>
                          <div className="flex justify-between items-center mb-3">
                              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><User size={15} className="text-blue-500"/> {t.employees_title || 'עובדים'}</h3>
                              {canUseExcel && (
                                  <button
                                      onClick={() => toggleExcelSection('employees')}
                                      className={`p-1 rounded-lg flex items-center gap-1 transition border-none text-[#714B67] ${openExcelSection === 'employees' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                                      title="Employees — Excel ייבוא / ייצוא"
                                  >
                                      <FileSpreadsheet size={12} />
                                  </button>
                              )}
                          </div>
                          {openExcelSection === 'employees' && (
                              <ConfigExcelPanel section="employees" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                          )}
                      </div>
                  </div>
              )}

              {activeSubTab === 'locations' && (
                  <div className="animate-fade-in space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                          <h3 className="text-sm sm:text-base font-bold text-gray-700">{t.manage_locations_title || 'ניהול מיקומים'}</h3>
                          <div className="flex gap-2">
                              {canManageFields && (
                                  <button onClick={() => setShowFieldsSettingsModal(true)} className="bg-gray-200 text-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold hover:bg-gray-300 flex items-center gap-1 shadow-sm"><Settings size={13}/> <span>{t.field_settings || 'הגדרות שדות'}</span></button>
                              )}
                              {canUseExcel && (
                                  <button
                                      onClick={() => toggleExcelSection('locations')}
                                      className={`p-1 rounded-lg flex items-center gap-1 transition border-none text-[#714B67] ${openExcelSection === 'locations' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                                      title="Excel ייבוא / ייצוא"
                                  >
                                      <FileSpreadsheet size={12} />
                                  </button>
                              )}
                              <button onClick={() => openLocationModal(targetManagerId)} className="bg-[#714B67] text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow hover:opacity-90 flex items-center gap-1"><Plus size={13}/> <span>{t.add_location_btn || 'הוסף מיקום'}</span></button>
                          </div>
                      </div>
                      {openExcelSection === 'locations' && (
                          <ConfigExcelPanel section="locations" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {wLocations.length === 0 && <p className="text-gray-400 text-center text-sm py-4 col-span-2">{t.no_locations_for_manager || 'אין מיקומים למנהל זה.'}</p>}
                          {wLocations.map(loc => {
                              let fieldsCount = 0;
                              try { fieldsCount = (typeof loc.dynamic_fields === 'string' ? JSON.parse(loc.dynamic_fields) : (loc.dynamic_fields || [])).length; } catch(e){}
                              
                              const fullImgUrl = loc.image_url && loc.image_url.startsWith('/') ? `https://maintenance-app-staging.onrender.com${loc.image_url}` : loc.image_url;

                              return (
                                  <div key={loc.id} className="bg-white p-3 rounded-xl border border-gray-200 group">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex gap-2 items-center">
                                              {fullImgUrl ? (
                                                  <img src={fullImgUrl} alt={loc.name} className="w-10 h-10 rounded-lg object-cover border" />
                                              ) : (
                                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border"><MapPin size={16}/></div>
                                              )}
                                              <div>
                                                  <h4 className="font-bold text-gray-800 text-sm">{loc['name_' + lang] || loc.name_en || loc.name}</h4>
                                                  {loc.code && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-mono">{loc.code}</span>}
                                              </div>
                                          </div>
                                          <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                              <button onClick={() => openLocationModal(targetManagerId, loc)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil size={14}/></button>
                                              <button onClick={() => handleDelete('locations', loc.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                                          </div>
                                      </div>
                                      <div className="flex gap-3 text-[10px] text-gray-500 border-t pt-2 mt-2">
                                          <span className="flex items-center gap-1"><Layers size={12}/> {fieldsCount} {t.custom_fields_count || 'שדות מותאמים'}</span>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {showFieldsSettingsModal && (
                          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                              <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-200 p-5 animate-scale-in">
                                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Settings size={20} className="text-gray-500"/> {t.custom_fields_title || 'שדות מיקום מותאמים'}</h3>
                                      <button onClick={() => setShowFieldsSettingsModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                                  </div>
                                  
                                  <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                                      {mFields.length === 0 && <p className="text-center text-sm text-gray-400 italic">{t.no_fields_defined || 'לא הוגדרו שדות.'}</p>}
                                      {mFields.map(f => (
                                          <div key={f.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border text-sm">
                                              <div className="flex items-center gap-2 font-medium">
                                                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> 
                                                  {getFieldName(f.name)}
                                                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase">{f.type}</span>
                                              </div>
                                              <button onClick={() => handleDelete('location-fields', f.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                          </div>
                                      ))}
                                  </div>

                                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 space-y-3">
                                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t.add_field_title || 'הוספת שדה חדש (הזן שפות):'}</h4>
                                      <div className="grid grid-cols-2 gap-2">
                                          <input type="text" placeholder={t.field_name_he_placeholder || 'שם בעברית (חובה)'} className="w-full p-2 border rounded-lg text-xs outline-none" value={newField.name_he} onChange={e => setNewField({...newField, name_he: e.target.value})} />
                                          <input type="text" placeholder="Name in English" className="w-full p-2 border rounded-lg text-xs outline-none" value={newField.name_en} onChange={e => setNewField({...newField, name_en: e.target.value})} />
                                          <input type="text" placeholder="ชื่อภาษาไทย" className="w-full p-2 border rounded-lg text-xs outline-none" value={newField.name_th} onChange={e => setNewField({...newField, name_th: e.target.value})} />
                                          <select className="w-full p-2 border rounded-lg text-xs outline-none bg-white" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})}>
                                              <option value="text">טקסט</option>
                                              <option value="number">מספרים</option>
                                              <option value="file">קובץ / מסמך / תמונה</option>
                                          </select>
                                      </div>
                                      <button onClick={() => handleAddGlobalField(targetManagerId)} className="w-full bg-[#714B67] text-white p-2 rounded-lg hover:bg-[#5a3b52] shadow-sm text-sm font-bold mt-2">{t.add_field_btn || 'הוסף שדה למערכת'}</button>
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
    <div className="px-3 sm:px-4 pt-3 pb-32 max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">{t.config_title || 'Configuration'}</h1>
      {user?.role === 'BIG_BOSS' ? (
          <div className="space-y-4">
              {/* ── Top-level tab bar for Big Boss ── */}
              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-5">
                  <button
                      onClick={() => setBossMainTab('workspaces')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${bossMainTab === 'workspaces' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                      <Settings size={15}/> {t.config_title || 'Workspaces'}
                  </button>
                  <button
                      onClick={() => setBossMainTab('permissions')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${bossMainTab === 'permissions' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                      <User size={15}/> {t.permissions_tab || 'Permissions / General'}
                  </button>
              </div>

              {/* ── Permissions / General panel ── */}
              {bossMainTab === 'permissions' && (
                  <div className="space-y-6 animate-fade-in">
                      <p className="text-sm text-gray-500">{t.permissions_desc || 'Manage field-level permissions and task behaviour for each manager, grouped by company.'}</p>
                      {(Array.isArray(companies) ? companies : []).length === 0 && <p className="text-center text-gray-400 py-6">No companies found.</p>}
                      {(Array.isArray(companies) ? companies : []).map(company => {
                          const companyManagers = (Array.isArray(managers) ? managers : []).filter(m => m.company_id === company.id);
                          if (companyManagers.length === 0) return null;
                          return (
                              <div key={company.id} className="space-y-3">
                                  {/* Company header */}
                                  <div className="flex items-center gap-2 px-1 pb-1 border-b border-gray-200">
                                      {company.profile_image_url ? (
                                          <img src={company.profile_image_url} alt={company.name} className="w-7 h-7 rounded-lg object-cover border border-gray-200 shrink-0" />
                                      ) : (
                                          <div className="w-7 h-7 rounded-lg bg-[#714B67]/10 flex items-center justify-center shrink-0">
                                              <Settings size={14} className="text-[#714B67]" />
                                          </div>
                                      )}
                                      <h3 className="font-bold text-[#714B67] text-sm">{company.name}</h3>
                                  </div>
                                  {/* Managers in this company */}
                                  {companyManagers.map(manager => {
                                      const initial = (manager.full_name || '?').charAt(0).toUpperCase();
                                      return (
                                          <div key={manager.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                              {/* Manager header */}
                                              <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-gray-200">
                                                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-gray-200 bg-slate-50 flex items-center justify-center">
                                                      {manager.profile_picture_url ? (
                                                          <img src={manager.profile_picture_url} alt={manager.full_name} className="w-full h-full object-cover" />
                                                      ) : (
                                                          <span className="text-sm font-bold text-[#714B67]">{initial}</span>
                                                      )}
                                                  </div>
                                                  <div className="flex-1">
                                                      <p className="font-bold text-gray-800">{manager.full_name}</p>
                                                      <p className="text-xs text-gray-400">{manager.email}</p>
                                                  </div>
                                                  <button
                                                      onClick={() => handleSendReport(manager.id)}
                                                      disabled={sendingReportId === manager.id}
                                                      className="bg-[#714B67] text-white text-xs px-3 py-1.5 rounded flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                                  >
                                                      {sendingReportId === manager.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                      {t.btn_send_report || 'Send Daily Report'}
                                                  </button>
                                              </div>
                                              {/* Toggle rows */}
                                              <div className="px-4 py-2">
                                                  <PermissionToggle
                                                      label={t.perm_can_manage_fields || 'Field Settings Permission'}
                                                      hint={t.perm_can_manage_fields_hint || 'Allow this manager to create/edit custom location fields'}
                                                      value={manager.can_manage_fields !== false}
                                                      onToggle={() => handleTogglePermission(manager, 'can_manage_fields')}
                                                  />
                                                  <PermissionToggle
                                                      label={t.perm_auto_approve || 'Auto-Approve Tasks'}
                                                      hint={t.perm_auto_approve_hint || "Skip 'Waiting Approval' — tasks complete instantly when workers submit"}
                                                      value={!!manager.auto_approve_tasks}
                                                      onToggle={() => handleTogglePermission(manager, 'auto_approve_tasks')}
                                                  />
                                                  <PermissionToggle
                                                      label={t.perm_stuck_skip_approval || 'Stuck Tasks Skip Approval'}
                                                      hint={t.perm_stuck_skip_approval_hint || "When ON, stuck tasks go directly to History instead of Pending Approval"}
                                                      value={!!manager.stuck_skip_approval}
                                                      onToggle={() => handleTogglePermission(manager, 'stuck_skip_approval')}
                                                  />
                                                  <PermissionToggle
                                                      label={t.perm_lang_he || 'Allow Hebrew (HE)'}
                                                      hint={t.perm_lang_he_hint || 'Allow this manager and their employees to use the Hebrew interface'}
                                                      value={manager.allowed_lang_he !== false}
                                                      onToggle={() => handleTogglePermission(manager, 'allowed_lang_he')}
                                                  />
                                                  <PermissionToggle
                                                      label={t.perm_lang_en || 'Allow English (EN)'}
                                                      hint={t.perm_lang_en_hint || 'Allow this manager and their employees to use the English interface'}
                                                      value={manager.allowed_lang_en !== false}
                                                      onToggle={() => handleTogglePermission(manager, 'allowed_lang_en')}
                                                  />
                                                  <PermissionToggle
                                                      label={t.perm_lang_th || 'Allow Thai (TH)'}
                                                      hint={t.perm_lang_th_hint || 'Allow this manager and their employees to use the Thai interface'}
                                                      value={manager.allowed_lang_th !== false}
                                                      onToggle={() => handleTogglePermission(manager, 'allowed_lang_th')}
                                                  />
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          );
                      })}
                  </div>
              )}

              {/* ── Workspaces panel (existing) ── */}
              {bossMainTab === 'workspaces' && (Array.isArray(managers) ? managers : []).map(manager => {
                  const isExpanded = expandedBossManager === manager.id;
                  return (
                      <div key={manager.id} className={`bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-[#714B67]/30' : ''}`}>
                          <div className={`px-4 py-3 flex justify-between items-center cursor-pointer transition ${isExpanded ? 'bg-slate-50' : 'hover:bg-gray-50'}`} onClick={() => setExpandedBossManager(isExpanded ? null : manager.id)}>
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-gray-200 bg-slate-50 flex items-center justify-center">
                                      {manager.profile_picture_url ? (
                                          <img src={manager.profile_picture_url} alt={manager.full_name} className="w-full h-full object-cover" />
                                      ) : (
                                          <span className="text-sm font-bold text-[#714B67]">{(manager.full_name || '?').charAt(0).toUpperCase()}</span>
                                      )}
                                  </div>
                                  <div><h3 className="font-bold text-gray-800 text-lg">{manager.full_name}</h3><span className="text-xs text-gray-500">{t.manage_workspace_subtitle || 'ניהול סביבת עבודה'}</span></div>
                              </div>
                              <div className="text-gray-400">{isExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</div>
                          </div>
                          {isExpanded && <div className="p-4 bg-white border-t animate-slide-down">{renderWorkspace(manager.id)}</div>}
                      </div>
                  )
              })}
          </div>
      ) : (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200">{renderWorkspace(user.id)}</div>
      )}

      {showTreeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-200 p-5 animate-scale-in">
                  <div className="flex justify-between mb-4 border-b border-gray-200 pb-2"><h3 className="font-bold text-base text-slate-800">{treeNodeType === 'category' ? (categoryForm.id ? (t.category_modal_title_edit || 'עריכת קטגוריה') : (t.category_modal_title_add || 'הגדרת קטגוריה')) : (assetForm.id ? (t.asset_modal_title_edit || 'עריכת נכס') : (t.asset_modal_title_add || 'הגדרת נכס'))}</h3><button onClick={() => setShowTreeModal(false)} className="hover:bg-gray-100 p-1 rounded-full"><X/></button></div>
                  <form onSubmit={handleSaveTreeItem} className="space-y-4">
                      {treeNodeType === 'category' ? (
                          <>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.category_name_label || 'שם הקטגוריה'}</label>
                                  <MultiLangNameInput
                                      value={{ name_en: categoryForm.name_en, name_he: categoryForm.name_he, name_th: categoryForm.name_th }}
                                      onChange={updated => setCategoryForm(prev => ({ ...prev, ...updated }))}
                                      lang={lang}
                                      prefix="name"
                                      required
                                  />
                              </div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">{t.category_code_label || 'קוד זיהוי (1-5 אותיות)'}</label><input type="text" required maxLength="5" pattern="[a-zA-Z]{1,5}" title="Code must be 1-5 English letters" className="w-full p-3 border rounded-lg bg-gray-50 uppercase font-mono" value={categoryForm.code} onChange={e => setCategoryForm({...categoryForm, code: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase()})} /></div>
                          </>
                      ) : (
                          <>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.asset_name_label || 'שם הנכס'}</label>
                                  <MultiLangNameInput
                                      value={{ name_en: assetForm.name_en, name_he: assetForm.name_he, name_th: assetForm.name_th }}
                                      onChange={updated => setAssetForm(prev => ({ ...prev, ...updated }))}
                                      lang={lang}
                                      prefix="name"
                                      required
                                  />
                              </div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">קטגוריה</label><select required className="w-full p-3 border rounded-lg bg-gray-50" value={assetForm.category_id} onChange={e => setAssetForm({...assetForm, category_id: e.target.value})}><option value="">בחר...</option>{categories.filter(c => c.created_by === assetForm.created_by).map(c => <option key={c.id} value={c.id}>{c['name_' + lang] || c.name_en || c.name}</option>)}</select></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">מיקום</label><select required className="w-full p-3 border rounded-lg bg-gray-50" value={assetForm.location_id} onChange={e => setAssetForm({...assetForm, location_id: e.target.value})}><option value="">בחר...</option>{locations.filter(l => l.created_by === assetForm.created_by).map(l => <option key={l.id} value={l.id}>{l['name_' + lang] || l.name_en || l.name}</option>)}</select></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-1">קוד</label><input type="text" disabled className="w-full p-3 border rounded-lg bg-gray-100 font-mono text-gray-400 italic" value={assetForm.id ? assetForm.code : ''} placeholder="Auto-generated" /></div>
                          </>
                      )}
                      <button type="submit" className="w-full py-2.5 bg-[#714B67] text-white rounded-xl font-bold mt-2 shadow-sm hover:bg-[#5a3b52] transition">{t.save || 'שמור'}</button>
                  </form>
              </div>
          </div>
      )}

      {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-gray-200 flex flex-col max-h-[90vh] animate-scale-in">
                  <div className="px-4 py-3.5 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl"><h3 className="font-bold text-base text-slate-800">{t.location_modal_title || 'כרטיסיית מיקום'}</h3><button onClick={() => setShowLocationModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"><X size={18}/></button></div>
                  <div className="p-6 overflow-y-auto space-y-5">
                      
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

                      {/* ── Multilingual names ── */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">{t.location_name_label || 'שם המיקום'} <span className="text-red-500">*</span></label>
                          <MultiLangNameInput
                              value={{ name_en: locationForm.name_en, name_he: locationForm.name_he, name_th: locationForm.name_th }}
                              onChange={updated => setLocationForm(prev => ({ ...prev, ...updated }))}
                              lang={lang}
                              prefix="name"
                              required
                          />
                      </div>

                      {/* ── Address / Google Maps ── */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Map size={16} className="text-blue-500"/> {t.address_label || 'כתובת / מיקום'}</label>
                          <div className="flex gap-2 mb-3">
                              <input
                                  ref={locationAddressRef}
                                  type="text"
                                  dir="ltr"
                                  defaultValue={locationForm.address}
                                  onChange={e => setLocationForm({...locationForm, address: e.target.value})}
                                  placeholder={t.address_placeholder || 'Start typing an address…'}
                                  className="flex-1 p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                              />
                              <button
                                  type="button"
                                  onClick={handleUseCurrentLocation}
                                  disabled={isGeolocating}
                                  title={t.use_current_location || 'Use current location'}
                                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60 shrink-0"
                              >
                                  {isGeolocating
                                      ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                                      : <Map size={15} />}
                                  <span>{t.use_current_location_short || 'GPS'}</span>
                              </button>
                          </div>
                          {(locationForm.address || locationForm.name_en || locationForm.name_he) && (
                              <div className="w-full h-48 rounded-xl overflow-hidden border shadow-sm relative z-10">
                                  <iframe
                                      width="100%"
                                      height="100%"
                                      style={{border:0}}
                                      src={getMapEmbedUrl()}
                                      allowFullScreen
                                  ></iframe>
                              </div>
                          )}
                      </div>

                      {(Array.isArray(globalFields) ? globalFields : []).filter(f => f?.created_by === locationForm.created_by).length > 0 && (
                          <div className="border-t pt-5 mt-2 space-y-4">
                              <h4 className="font-bold text-[#714B67] text-sm flex items-center gap-1"><Layers size={18}/> נתונים ומסמכים נוספים</h4>
                              {(Array.isArray(globalFields) ? globalFields : []).filter(f => f?.created_by === locationForm.created_by).map(field => {
                                  const key = field.id; 
                                  return (
                                      <div key={key} className="bg-gray-50 p-3 rounded-xl border">
                                          <label className="block text-xs font-bold text-gray-700 mb-2">{getFieldName(field.name)} <span className="text-[10px] font-normal text-gray-400 bg-white px-1 py-0.5 rounded border ml-2">{field.type}</span></label>
                                          
                                          {field.type === 'text' || field.type === 'number' ? (
                                              <input type={field.type} placeholder="הכנס נתון..." className="w-full p-2.5 border rounded-lg bg-white text-sm outline-none" value={dynamicValues[key] || dynamicValues[field.name] || ''} onChange={e => setDynamicValues({...dynamicValues, [key]: e.target.value})} />
                                          ) : (
                                              <div className="flex items-center gap-3">
                                                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
                                                      <Upload size={14} className="text-gray-500"/>
                                                      <span className="text-gray-700 font-medium">בחר קובץ...</span>
                                                      <input type="file" hidden onChange={e => setDynamicFiles({...dynamicFiles, [key]: e.target.files[0]})} />
                                                  </label>
                                                  
                                                  {dynamicFiles[key] ? (
                                                      <span className="text-xs text-blue-600 font-medium">נבחר קובץ: {dynamicFiles[key].name}</span>
                                                  ) : (dynamicValues[key] || dynamicValues[field.name]) && (dynamicValues[key] || dynamicValues[field.name]).includes('/uploads/') ? (
                                                      <a href={`https://maintenance-app-staging.onrender.com${dynamicValues[key] || dynamicValues[field.name]}`} target="_blank" rel="noreferrer" className="text-xs text-green-600 font-medium hover:underline flex items-center gap-1">✓ צפה בקובץ הקיים</a>
                                                  ) : (
                                                      <span className="text-xs text-gray-400">לא נבחר קובץ</span>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                      <button type="button" onClick={handleSaveLocation} className="w-full py-3 bg-[#714B67] text-white rounded-xl font-bold shadow-sm hover:bg-[#5a3b52] transition">{t.save_location_btn || 'שמור כרטיסיית מיקום'}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConfigurationTab;