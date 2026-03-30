import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Users, MapPin, Tag, Box, Shield, Pencil, Trash2, Loader2, Plus, Settings, UserCheck, LayoutGrid, Send, FileSpreadsheet } from 'lucide-react';
import ScopedTasksModal from './ScopedTasksModal';
import ConfigExcelPanel from './ConfigExcelPanel';
import MultiLangNameInput from './MultiLangNameInput';

const BASE = 'https://maintenance-app-staging.onrender.com';

// ─── Confirm delete modal (kept as modal — just a confirmation, not an edit form) ──
const ConfirmDeleteModal = ({ message, onConfirm, onCancel, t }) => createPortal(
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
            <p className="text-gray-800 font-medium text-center mb-6">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">
                    {t?.cancel || 'Cancel'}
                </button>
                <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">
                    {t?.delete_btn || 'Delete'}
                </button>
            </div>
        </div>
    </div>,
    document.body
);

// ─── Section card with optional Add button + addPanel slot ────────────────────
const SectionCard = ({ icon: Icon, title, items, renderItem, emptyLabel, onAdd, addPanel, headerExtras, excelPanel }) => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-slate-50">
            <Icon size={16} className="text-[#714B67]" />
            <h3 className="text-sm font-bold text-slate-700">{title}</h3>
            <span className="ml-auto text-xs font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                {(items ?? []).length}
            </span>
            {headerExtras}
            {onAdd && (
                <button
                    onClick={onAdd}
                    className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#714B67] text-white text-[10px] font-bold hover:bg-[#5a3b52] transition"
                >
                    <Plus size={11} /> Add
                </button>
            )}
        </div>
        {excelPanel && (
            <div className="px-3 py-2 border-b border-gray-100 bg-white">{excelPanel}</div>
        )}
        <div className="divide-y divide-gray-100">
            {/* Add panel — rendered above all rows when the Add button is active */}
            {addPanel && (
                <div className="px-4 py-2.5 text-sm text-slate-700 bg-slate-50">
                    {addPanel}
                </div>
            )}
            {(items ?? []).length === 0 && !addPanel ? (
                <p className="px-4 py-3 text-xs text-gray-400 italic">{emptyLabel}</p>
            ) : (
                (items ?? []).map((item, idx) => (
                    <div key={item?.id ?? idx} className="px-4 py-2.5 text-sm text-slate-700">
                        {renderItem(item)}
                    </div>
                ))
            )}
        </div>
    </div>
);

// ─── Shared inline style helpers ──────────────────────────────────────────────
const rowPanelCls  = "mt-2 pt-3 border-y border-slate-200 space-y-2 animate-fade-in bg-slate-50 shadow-inner rounded-b-xl -mx-4 px-4 pb-3";
const addPanelCls  = "space-y-2 animate-fade-in";
const inputCls     = "w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-xs transition";
const labelCls     = "text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-0.5";
const saveBtnCls   = "flex-1 py-1.5 text-xs bg-[#714B67] text-white rounded-lg font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-1";
const cancelBtnCls = "flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition";

// ─── Inline User Form (Edit or Add) ──────────────────────────────────────────
const InlineUserForm = ({ editUser, role, parentManagerId, companyId = null, token, t, lang, onClose, onSaved, isAddPanel = false }) => {
    const isEdit = !!editUser;
    const [form, setForm] = useState({
        full_name_en: editUser?.full_name_en || editUser?.full_name || '',
        full_name_he: editUser?.full_name_he || '',
        full_name_th: editUser?.full_name_th || '',
        email:        editUser?.email || '',
        password:     '',
        phone:        editUser?.phone || '',
        preferred_language: editUser?.preferred_language || 'en',
        line_user_id: editUser?.line_user_id || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.full_name_en?.trim() || !form.email?.trim()) { alert('Name and email are required'); return; }
        if (!isEdit && !form.password?.trim()) { alert('Password is required for new users'); return; }
        setSaving(true);
        try {
            const payload = {
                full_name:    form.full_name_en,
                full_name_en: form.full_name_en,
                full_name_he: form.full_name_he || undefined,
                full_name_th: form.full_name_th || undefined,
                email:        form.email.toLowerCase(),
                phone:        form.phone || undefined,
                preferred_language: form.preferred_language,
                line_user_id: form.line_user_id || undefined,
                role,
            };
            if (!isEdit) { payload.password = form.password; payload.parent_manager_id = parentManagerId; if (companyId) payload.company_id = companyId; }
            if (form.password?.trim() && isEdit) payload.password = form.password;
            const method = isEdit ? 'PUT' : 'POST';
            const url    = isEdit ? `${BASE}/users/${editUser.id}` : `${BASE}/users`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving user'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    const roleLabel = (role === 'MANAGER' || role === 'COMPANY_MANAGER') ? 'Manager' : 'Employee';
    return (
        <div className={isAddPanel ? addPanelCls : rowPanelCls}>
            <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider mb-1">
                {isEdit ? `Edit ${roleLabel}` : `Add ${roleLabel}`}
            </p>
            <MultiLangNameInput
                value={{ full_name_en: form.full_name_en, full_name_he: form.full_name_he, full_name_th: form.full_name_th }}
                onChange={updated => setForm(p => ({ ...p, ...updated }))}
                lang={lang || 'en'}
                prefix="full_name"
                label="Name *"
                compact
            />
            {[
                { label: 'Email *',                                          key: 'email',        type: 'email' },
                { label: isEdit ? 'Password (blank = keep)' : 'Password *', key: 'password',     type: 'password' },
                { label: 'Phone',                                            key: 'phone',        type: 'text' },
                { label: 'LINE User ID',                                     key: 'line_user_id', type: 'text' },
            ].map(({ label, key, type }) => (
                <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} className={inputCls} autoComplete={key === 'password' ? 'new-password' : undefined} />
                </div>
            ))}
            <div>
                <label className={labelCls}>Language</label>
                <select value={form.preferred_language} onChange={e => set('preferred_language', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-[#714B67]">
                    <option value="en">English</option>
                    <option value="he">Hebrew</option>
                    <option value="th">Thai</option>
                </select>
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={onClose} className={cancelBtnCls}>{t?.cancel || 'Cancel'}</button>
                <button onClick={handleSave} disabled={saving} className={saveBtnCls}>
                    {saving && <Loader2 size={10} className="animate-spin" />}
                    {t?.save || 'Save'}
                </button>
            </div>
        </div>
    );
};

// ─── Inline Location Form ─────────────────────────────────────────────────────
const InlineLocationForm = ({ editLocation, createdBy, token, t, lang, onClose, onSaved, isAddPanel = false }) => {
    const isEdit = !!editLocation;
    const [form, setForm] = useState({
        name_en:  editLocation?.name_en || editLocation?.name || '',
        name_he:  editLocation?.name_he || '',
        name_th:  editLocation?.name_th || '',
        address:  '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        if (editLocation?.coordinates) {
            try {
                const coords = typeof editLocation.coordinates === 'string'
                    ? JSON.parse(editLocation.coordinates)
                    : editLocation.coordinates;
                setForm(p => ({ ...p, address: coords?.link || '' }));
            } catch {}
        }
    }, []);

    const handleSave = async () => {
        if (!form.name_en?.trim() && !form.name_he?.trim()) { alert('Name is required'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name_en', form.name_en);
            fd.append('name_he', form.name_he);
            fd.append('name_th', form.name_th);
            fd.append('map_link', form.address);
            fd.append('dynamic_fields', JSON.stringify([]));
            if (!isEdit) fd.append('created_by', createdBy);
            if (imageFile) fd.append('main_image', imageFile);
            else if (editLocation?.image_url) fd.append('existing_image', editLocation.image_url);
            const method = isEdit ? 'PUT' : 'POST';
            const url    = isEdit ? `${BASE}/locations/${editLocation.id}` : `${BASE}/locations`;
            const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving location'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className={isAddPanel ? addPanelCls : rowPanelCls}>
            <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider mb-1">
                {isEdit ? 'Edit Location' : 'Add Location'}
            </p>
            <MultiLangNameInput
                value={{ name_en: form.name_en, name_he: form.name_he, name_th: form.name_th }}
                onChange={updated => setForm(p => ({ ...p, ...updated }))}
                lang={lang || 'en'}
                prefix="name"
                label="Name *"
                compact
            />
            <div>
                <label className={labelCls}>Address / Map Link</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
            </div>
            <div>
                <label className={labelCls}>Image (optional)</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-[#714B67] cursor-pointer" />
                {editLocation?.image_url && !imageFile && (
                    <img src={editLocation.image_url} alt="" className="mt-1 h-8 rounded-lg object-contain border border-gray-200" />
                )}
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={onClose} className={cancelBtnCls}>{t?.cancel || 'Cancel'}</button>
                <button onClick={handleSave} disabled={saving} className={saveBtnCls}>
                    {saving && <Loader2 size={10} className="animate-spin" />}
                    {t?.save || 'Save'}
                </button>
            </div>
        </div>
    );
};

// ─── Inline Category Form ─────────────────────────────────────────────────────
const InlineCategoryForm = ({ editCategory, createdBy, token, t, lang, onClose, onSaved, isAddPanel = false }) => {
    const isEdit = !!editCategory;
    const [form, setForm] = useState({
        name_en: editCategory?.name_en || editCategory?.name || '',
        name_he: editCategory?.name_he || '',
        name_th: editCategory?.name_th || '',
        code:    editCategory?.code || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name_en?.trim() && !form.name_he?.trim()) { alert('Name is required'); return; }
        if (!form.code?.trim()) { alert('Code is required (5 chars max)'); return; }
        setSaving(true);
        try {
            const payload = {
                name_en: form.name_en, name_he: form.name_he, name_th: form.name_th,
                code:    form.code.toUpperCase().slice(0, 5),
                created_by: createdBy,
            };
            const method = isEdit ? 'PUT' : 'POST';
            const url    = isEdit ? `${BASE}/categories/${editCategory.id}` : `${BASE}/categories`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving category'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className={isAddPanel ? addPanelCls : rowPanelCls}>
            <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider mb-1">
                {isEdit ? 'Edit Category' : 'Add Category'}
            </p>
            <MultiLangNameInput
                value={{ name_en: form.name_en, name_he: form.name_he, name_th: form.name_th }}
                onChange={updated => setForm(p => ({ ...p, ...updated }))}
                lang={lang || 'en'}
                prefix="name"
                label="Name *"
                compact
            />
            <div>
                <label className={labelCls}>Code (5 chars) *</label>
                <input type="text" value={form.code} maxLength={5}
                    onChange={e => set('code', e.target.value.toUpperCase().slice(0, 5))}
                    className={`${inputCls} font-mono`} />
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={onClose} className={cancelBtnCls}>{t?.cancel || 'Cancel'}</button>
                <button onClick={handleSave} disabled={saving} className={saveBtnCls}>
                    {saving && <Loader2 size={10} className="animate-spin" />}
                    {t?.save || 'Save'}
                </button>
            </div>
        </div>
    );
};

// ─── Inline Asset Form ────────────────────────────────────────────────────────
const InlineAssetForm = ({ editAsset, createdBy, categories, locations, token, t, lang, onClose, onSaved, isAddPanel = false }) => {
    const isEdit = !!editAsset;
    const [form, setForm] = useState({
        name_en:     editAsset?.name_en || editAsset?.name || '',
        name_he:     editAsset?.name_he || '',
        name_th:     editAsset?.name_th || '',
        category_id: editAsset?.category_id ? String(editAsset.category_id) : '',
        location_id: editAsset?.location_id ? String(editAsset.location_id) : '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name_en?.trim() && !form.name_he?.trim()) { alert('Name is required'); return; }
        if (!form.category_id) { alert('Category is required'); return; }
        setSaving(true);
        try {
            const payload = {
                name_en: form.name_en, name_he: form.name_he, name_th: form.name_th,
                category_id: form.category_id,
                location_id: form.location_id || null,
                created_by:  createdBy,
            };
            const method = isEdit ? 'PUT' : 'POST';
            const url    = isEdit ? `${BASE}/assets/${editAsset.id}` : `${BASE}/assets`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving asset'); }
        } catch { alert('Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className={isAddPanel ? addPanelCls : rowPanelCls}>
            <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider mb-1">
                {isEdit ? 'Edit Asset' : 'Add Asset'}
            </p>
            <MultiLangNameInput
                value={{ name_en: form.name_en, name_he: form.name_he, name_th: form.name_th }}
                onChange={updated => setForm(p => ({ ...p, ...updated }))}
                lang={lang || 'en'}
                prefix="name"
                label="Name *"
                compact
            />
            <div>
                <label className={labelCls}>Category *</label>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-[#714B67]">
                    <option value="">Select category…</option>
                    {(categories ?? []).map(c => (
                        <option key={c.id} value={String(c.id)}>{c['name_' + lang] || c.name_en || c.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className={labelCls}>Location (optional)</label>
                <select value={form.location_id} onChange={e => set('location_id', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-[#714B67]">
                    <option value="">None</option>
                    {(locations ?? []).map(l => (
                        <option key={l.id} value={String(l.id)}>{l['name_' + lang] || l.name_en || l.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={onClose} className={cancelBtnCls}>{t?.cancel || 'Cancel'}</button>
                <button onClick={handleSave} disabled={saving} className={saveBtnCls}>
                    {saving && <Loader2 size={10} className="animate-spin" />}
                    {t?.save || 'Save'}
                </button>
            </div>
        </div>
    );
};

// ─── Row action buttons ────────────────────────────────────────────────────────
// editOpen: highlights pencil when inline edit panel is open for this row
const RowActions = ({ onEdit, onDelete, onSettings, settingsOpen, onTeam, teamOpen, isManager, editOpen }) => (
    <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
            onClick={onEdit}
            className={`p-1 rounded-lg transition ${editOpen ? 'bg-[#714B67] text-white' : 'hover:bg-gray-100 text-gray-400'}`}
            title="Edit"
        >
            <Pencil size={12} />
        </button>
        {onSettings && (
            <button
                onClick={onSettings}
                className={`p-1 rounded-lg transition ${settingsOpen ? 'bg-[#714B67] text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                title="Permissions"
            >
                <Settings size={12} />
            </button>
        )}
        {isManager && (
            <button
                onClick={onTeam}
                className={`p-1 rounded-lg transition ${teamOpen ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                title="Assign Team"
            >
                <UserCheck size={12} />
            </button>
        )}
        <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition" title="Delete">
            <Trash2 size={12} />
        </button>
    </div>
);

// ─── Permission Accordion ─────────────────────────────────────────────────────
const PermissionAccordion = ({ permForm, setPermForm, onSave, onClose, saving, t, onSendReport, reportSending }) => (
    <div className="mt-2 pt-3 border-y border-slate-200 space-y-3 animate-fade-in bg-slate-50 shadow-inner rounded-b-xl -mx-4 px-4 pb-3">
        <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider">Permissions</p>
        <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Languages</p>
            <div className="flex gap-2">
                {[
                    { key: 'allowed_lang_he', label: '🇮🇱 HE' },
                    { key: 'allowed_lang_en', label: '🇺🇸 EN' },
                    { key: 'allowed_lang_th', label: '🇹🇭 TH' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setPermForm(p => ({ ...p, [key]: !p[key] }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${permForm[key] ? 'bg-[#714B67] text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
        <div className="space-y-2">
            {[
                { key: 'auto_approve_tasks',  label: t?.perm_auto_approve  || 'Auto-approve tasks' },
                { key: 'stuck_skip_approval', label: t?.perm_stuck_skip    || 'Stuck task skip approval' },
                { key: 'can_manage_fields',   label: t?.perm_manage_fields || 'Can manage fields' },
            ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer gap-2">
                    <span className="text-xs text-gray-600">{label}</span>
                    <button
                        type="button"
                        onClick={() => setPermForm(p => ({ ...p, [key]: !p[key] }))}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${permForm[key] ? 'bg-[#714B67]' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${permForm[key] ? 'translate-x-4' : ''}`} />
                    </button>
                </label>
            ))}
        </div>
        {onSendReport && (
            <div className="pt-1 border-t border-slate-200">
                <button
                    type="button"
                    onClick={onSendReport}
                    disabled={reportSending}
                    className="w-full py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                    {reportSending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                    Send Daily Report
                </button>
            </div>
        )}
        <div className="flex gap-2 pt-1">
            <button onClick={onClose} className={cancelBtnCls}>{t?.cancel || 'Cancel'}</button>
            <button onClick={onSave} disabled={saving} className={saveBtnCls}>
                {saving && <Loader2 size={10} className="animate-spin" />}
                {t?.save || 'Save'}
            </button>
        </div>
    </div>
);

// ─── Team Assign Accordion ─────────────────────────────────────────────────────
const TeamAssignAccordion = ({ employees, assignedIds, setAssignedIds, onSave, onClose, saving, userName }) => (
    <div className="mt-2 pt-3 border-y border-slate-200 space-y-3 animate-fade-in bg-slate-50 shadow-inner rounded-b-xl -mx-4 px-4 pb-3">
        <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider">Assign Team</p>
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {employees.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No employees in this company</p>
            ) : (
                employees.map(e => (
                    <label key={e.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                            type="checkbox"
                            checked={assignedIds.has(e.id)}
                            onChange={() => setAssignedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                                return next;
                            })}
                            className="rounded accent-[#714B67]"
                        />
                        <span className="text-xs text-gray-600">{userName(e)}</span>
                    </label>
                ))
            )}
        </div>
        <div className="flex gap-2 pt-1">
            <button onClick={onClose} className={cancelBtnCls}>Cancel</button>
            <button onClick={onSave} disabled={saving} className={saveBtnCls}>
                {saving && <Loader2 size={10} className="animate-spin" />}
                Save
            </button>
        </div>
    </div>
);

// ─── Edit Department Modal (for COMPANY_MANAGER to edit their own dept) ───────
const EditDeptModal = ({ companyId, token, t, lang, onClose, onSaved }) => {
    const [form, setForm] = useState({ name_en: '', name_he: '', name_th: '' });
    const [imageFile, setImageFile] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${BASE}/companies`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                const company = Array.isArray(data) ? data.find(c => String(c.id) === String(companyId)) || data[0] : data;
                if (company) {
                    setForm({ name_en: company.name_en || '', name_he: company.name_he || '', name_th: company.name_th || '' });
                    setExistingImage(company.profile_image_url || null);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [companyId, token]);

    const handleSave = async () => {
        if (!form.name_en.trim() && !form.name_he.trim()) {
            alert(t?.company_name_required || 'Department name is required');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name_en', form.name_en.trim());
            fd.append('name_he', form.name_he.trim());
            fd.append('name_th', form.name_th.trim());
            fd.append('name', form.name_en.trim() || form.name_he.trim());
            if (imageFile) fd.append('profile_image', imageFile);
            else if (existingImage) fd.append('existing_image', existingImage);
            const res = await fetch(`${BASE}/companies/${companyId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            if (res.ok) {
                const updated = await res.json();
                onSaved(updated);
            } else {
                const d = await res.json().catch(() => ({}));
                alert(d?.error || 'Error saving department');
            }
        } catch { alert('Server error'); }
        setSaving(false);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
                <h3 className="text-base font-bold text-slate-800 mb-4">{t?.edit_company || 'Edit Department'}</h3>
                {loading ? (
                    <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-[#714B67]" /></div>
                ) : (
                    <>
                        <div className="mb-3">
                            <label className={labelCls}>{t?.company_name_label || 'Department Name'}</label>
                            <MultiLangNameInput
                                value={form}
                                onChange={setForm}
                                lang={lang}
                                prefix="name"
                                label={t?.company_name_label || 'Department Name'}
                            />
                        </div>
                        <div className="mb-5">
                            <label className={labelCls}>{t?.company_logo_label || 'Logo (optional)'}</label>
                            {(imageFile ? URL.createObjectURL(imageFile) : existingImage) && (
                                <img
                                    src={imageFile ? URL.createObjectURL(imageFile) : existingImage}
                                    className="w-16 h-16 rounded-xl object-cover mb-2 border border-gray-200"
                                    alt="logo"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setImageFile(e.target.files[0] || null)}
                                className="text-xs w-full"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className={cancelBtnCls}>{t?.cancel || 'Cancel'}</button>
                            <button onClick={handleSave} disabled={saving} className={saveBtnCls}>
                                {saving && <Loader2 size={10} className="animate-spin" />}
                                {t?.save_btn || 'Save'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

// ─── Main COMPANY_MANAGER Settings Tab ────────────────────────────────────────
export default function CompanyManagerSettingsTab({ t, user, token, lang }) {
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Unified accordion/panel state ──────────────────────────────────────────
    // Key format: "edit-user:{id}" | "perm:{id}" | "team:{id}" |
    //             "edit-loc:{id}"  | "edit-cat:{id}" | "edit-asset:{id}" |
    //             "add-user-manager" | "add-user-employee" |
    //             "add-loc"          | "add-cat"            | "add-asset"
    const [openPanel, setOpenPanel]             = useState(null);
    const [openExcelSection, setOpenExcelSection] = useState(null);
    const toggleExcelSection = (s) => setOpenExcelSection(prev => prev === s ? null : s);
    const canUseExcel = ['BIG_BOSS', 'COMPANY_MANAGER'].includes(user?.role);

    // ── Active list filter — 'all' = show all; string key = show only that section ──
    const [activeListView, setActiveListView] = useState('all');

    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editDeptOpen, setEditDeptOpen] = useState(false);
    const [localCompanyName, setLocalCompanyName] = useState(user?.company_name || '');

    // Permission form state
    const [permForm, setPermForm] = useState({});
    const [permSaving, setPermSaving] = useState(false);

    // Team assignment state
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState(new Set());
    const [teamSaving, setTeamSaving] = useState(false);

    // Daily report sending state — tracks which user IDs are currently dispatching
    const [reportSendingIds, setReportSendingIds] = useState(new Set());

    // ── Panel helpers ──────────────────────────────────────────────────────────
    const togglePanel = (key) => setOpenPanel(prev => prev === key ? null : key);

    const openPermission = (u) => {
        const key = `perm:${u.id}`;
        if (openPanel === key) { setOpenPanel(null); return; }
        setOpenPanel(key);
        setPermForm({
            auto_approve_tasks:  u.auto_approve_tasks  ?? false,
            stuck_skip_approval: u.stuck_skip_approval ?? false,
            allowed_lang_he:     u.allowed_lang_he     !== false,
            allowed_lang_en:     u.allowed_lang_en     !== false,
            allowed_lang_th:     u.allowed_lang_th     !== false,
            can_manage_fields:   u.can_manage_fields    !== false,
        });
    };

    const openTeamPanel = async (u) => {
        const key = `team:${u.id}`;
        if (openPanel === key) { setOpenPanel(null); return; }
        setOpenPanel(key);
        // Fetch current M:M assignments from the junction table (source of truth).
        // Falling back to parent_manager_id would miss employees assigned via M:M
        // to multiple managers, causing a silent wipe on next save.
        try {
            const r = await fetch(`${BASE}/users?manager_id=${u.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const assigned = await r.json().catch(() => []);
            setAssignedEmployeeIds(new Set(Array.isArray(assigned) ? assigned.map(e => e.id) : []));
        } catch {
            setAssignedEmployeeIds(new Set(
                (users ?? []).filter(e => e.role === 'EMPLOYEE' && e.parent_manager_id === u.id).map(e => e.id)
            ));
        }
    };

    const savePermissions = async (u) => {
        setPermSaving(true);
        try {
            const res = await fetch(`${BASE}/users/${u.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    full_name: u.full_name_en || u.full_name,
                    email: u.email,
                    role: u.role,
                    ...permForm,
                }),
            });
            if (res.ok) { fetchData(); setOpenPanel(null); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving permissions'); }
        } catch { alert('Server error'); }
        setPermSaving(false);
    };

    const saveTeamAssignment = async (managerId) => {
        setTeamSaving(true);
        try {
            const res = await fetch(`${BASE}/users/${managerId}/assign-employees-to-manager`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ employeeIds: Array.from(assignedEmployeeIds) }),
            });
            if (res.ok) { fetchData(); setOpenPanel(null); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving team'); }
        } catch { alert('Server error'); }
        setTeamSaving(false);
    };

    const sendDailyReport = async (u) => {
        setReportSendingIds(prev => new Set([...prev, u.id]));
        try {
            const res = await fetch(`${BASE}/api/send-daily-report/${u.id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok) alert(`Daily report sent to ${userName(u)}`);
            else alert(d?.error || 'Error sending report');
        } catch { alert('Server error'); }
        setReportSendingIds(prev => { const next = new Set(prev); next.delete(u.id); return next; });
    };

    const fetchData = async () => {
        const headers = { Authorization: `Bearer ${token}` };
        const cid = user?.company_id ? `?company_id=${user.company_id}` : '';
        try {
            const [rawUsers, rawLocs, rawCats, rawAssets] = await Promise.all([
                fetch(`${BASE}/users`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/locations${cid}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/categories${cid}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/assets${cid}`, { headers }).then(r => r.json()).catch(() => []),
            ]);
            const companyUsers = Array.isArray(rawUsers) ? rawUsers : [];
            setUsers(user?.company_id
                ? companyUsers.filter(u => u?.company_id === user.company_id)
                : companyUsers
            );
            setLocations(Array.isArray(rawLocs) ? rawLocs : []);
            setCategories(Array.isArray(rawCats) ? rawCats : []);
            setAssets(Array.isArray(rawAssets) ? rawAssets : []);
        } catch (e) {
            console.error('CompanyManagerSettingsTab fetchData error:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [token, user?.company_id]);

    // Exclude the logged-in user from the managers list — they appear in the self section.
    // COMPANY_MANAGER should only see MANAGER users, NOT other co-admins (COMPANY_MANAGER peers).
    const managers  = (users ?? []).filter(u => u?.role === 'MANAGER' && u?.id !== user?.id);
    const employees = (users ?? []).filter(u => u?.role === 'EMPLOYEE');
    const selfUser  = (users ?? []).find(u => u?.id === user?.id) ?? user;

    const createdBy = user?.id ?? null;

    const userName = u => u?.['full_name_' + lang] || u?.full_name_en || u?.full_name || u?.name || '—';
    const itemName = item => item?.['name_' + lang] || item?.name_en || item?.name || '—';

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const { type, id } = deleteConfirm;
        try {
            const res = await fetch(`${BASE}/${type}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.message || 'Error deleting item. It may be in use.');
            }
        } catch { alert('Server error'); }
        setDeleteConfirm(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#714B67]" />
            </div>
        );
    }

    return (
        <div className="px-3 sm:px-4 pt-3 pb-32 max-w-4xl mx-auto animate-fade-in">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-[#714B67]" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800 truncate">
                            {localCompanyName || t?.nav_config || 'Settings'}
                        </h2>
                        <button
                            onClick={() => setEditDeptOpen(true)}
                            title={t?.edit_company || 'Edit Department'}
                            className="shrink-0 p-1 rounded-lg text-[#714B67] hover:bg-[#714B67]/10 transition"
                        >
                            <Pencil size={15} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        {user?.name ? `Welcome, ${user.name}` : (t?.company_detail_subtitle || 'Company Dashboard')}
                    </p>
                </div>
            </div>

            {/* ── Self-management section ── */}
            <div className="bg-white rounded-2xl border border-[#714B67]/20 overflow-hidden mb-5">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-[#714B67]/5">
                    <Shield size={16} className="text-[#714B67]" />
                    <h3 className="text-sm font-bold text-slate-700">My Account</h3>
                </div>
                <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {selfUser?.profile_picture_url ? (
                            <img src={selfUser.profile_picture_url} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" alt="" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#714B67]/10 flex items-center justify-center text-sm font-bold text-[#714B67] shrink-0">
                                {(userName(selfUser)[0] || '?').toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{userName(selfUser)}</p>
                            <span className="inline-block text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 px-1.5 py-0.5 rounded mt-0.5">
                                Company Manager
                            </span>
                        </div>
                        <RowActions
                            onEdit={() => togglePanel(`edit-user:${selfUser?.id}`)}
                            editOpen={openPanel === `edit-user:${selfUser?.id}`}
                            onSettings={() => openPermission(selfUser)}
                            settingsOpen={openPanel === `perm:${selfUser?.id}`}
                            onDelete={() => setDeleteConfirm({ type: 'users', id: selfUser?.id, name: userName(selfUser) })}
                        />
                    </div>
                    {openPanel === `edit-user:${selfUser?.id}` && (
                        <InlineUserForm
                            editUser={selfUser}
                            role="COMPANY_MANAGER"
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                        />
                    )}
                    {openPanel === `perm:${selfUser?.id}` && (
                        <PermissionAccordion
                            permForm={permForm}
                            setPermForm={setPermForm}
                            onSave={() => savePermissions(selfUser)}
                            onClose={() => setOpenPanel(null)}
                            saving={permSaving}
                            t={t}
                            onSendReport={() => sendDailyReport(selfUser)}
                            reportSending={reportSendingIds.has(selfUser?.id)}
                        />
                    )}
                </div>
            </div>

            {/* Stats row — 'all' = show everything; string key = isolate that section */}
            <div className="flex overflow-x-auto gap-2 mb-5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(() => {
                    const isActive = activeListView === 'all';
                    return (
                        <button
                            onClick={() => setActiveListView('all')}
                            className={`flex-none w-[90px] sm:flex-1 sm:w-auto sm:max-w-none rounded-xl border p-2.5 text-center transition-all ${isActive ? 'bg-[#714B67] border-[#714B67] shadow-md' : 'bg-white border-gray-200 hover:border-[#714B67]/40 hover:shadow-sm'}`}
                        >
                            <LayoutGrid size={28} className={`mx-auto mb-1 ${isActive ? 'text-white' : 'text-[#714B67]'}`} />
                            <p className={`text-[10px] font-medium leading-tight ${isActive ? 'text-white/80' : 'text-gray-400'}`}>All</p>
                        </button>
                    );
                })()}
                {[
                    { label: t?.managers_label  || 'Managers',   count: managers.length,   icon: Shield, key: 'managers'   },
                    { label: t?.employees_label || 'Employees',  count: employees.length,  icon: Users,  key: 'employees'  },
                    { label: t?.locations_title || 'Locations',  count: locations.length,  icon: MapPin, key: 'locations'  },
                    { label: t?.categories_title|| 'Categories', count: categories.length, icon: Tag,    key: 'categories' },
                    { label: t?.assets_title    || 'Assets',     count: assets.length,     icon: Box,    key: 'assets'     },
                ].map(({ label, count, icon: Icon, key }) => {
                    const isActive = activeListView === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveListView(key)}
                            className={`flex-none w-[90px] sm:flex-1 sm:w-auto sm:max-w-none rounded-xl border p-2.5 text-center transition-all ${isActive ? 'bg-[#714B67] border-[#714B67] shadow-md' : 'bg-white border-gray-200 hover:border-[#714B67]/40 hover:shadow-sm'}`}
                        >
                            <Icon size={16} className={`mx-auto mb-1 ${isActive ? 'text-white' : 'text-[#714B67]'}`} />
                            <p className={`text-lg font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>{count}</p>
                            <p className={`text-[10px] font-medium leading-tight ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Detail sections */}
            <div className="space-y-4">

                {/* ── Managers (COMPANY_MANAGERs, excluding self) ── */}
                {(activeListView === 'all' || activeListView === 'managers') && <SectionCard
                    icon={Shield}
                    title={t?.managers_label || 'Managers'}
                    items={managers}
                    emptyLabel={t?.no_managers || 'No managers assigned'}
                    onAdd={() => togglePanel('add-user-manager')}
                    headerExtras={canUseExcel && (
                        <button
                            onClick={() => toggleExcelSection('managers')}
                            className={`ml-2 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'managers' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Managers — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'managers' && (
                        <ConfigExcelPanel section="managers" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                    )}
                    addPanel={openPanel === 'add-user-manager' ? (
                        <InlineUserForm
                            role="MANAGER"
                            parentManagerId={createdBy}
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                            isAddPanel
                        />
                    ) : null}
                    renderItem={u => (
                        <>
                            <div className="flex items-center gap-2">
                                {u?.profile_picture_url ? (
                                    <img src={u.profile_picture_url} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[10px] font-bold text-[#714B67] shrink-0">
                                        {(userName(u)[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <button
                                    onClick={() => togglePanel(`tasks:${u.id}`)}
                                    className="flex-1 min-w-0 truncate text-left hover:underline decoration-violet-400 hover:text-violet-700 transition-colors"
                                    title="View Tasks"
                                >
                                    {userName(u)}
                                </button>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{u?.role}</span>
                                <RowActions
                                    onEdit={() => togglePanel(`edit-user:${u.id}`)}
                                    editOpen={openPanel === `edit-user:${u.id}`}
                                    onSettings={() => openPermission(u)}
                                    settingsOpen={openPanel === `perm:${u.id}`}
                                    onTeam={() => openTeamPanel(u)}
                                    teamOpen={openPanel === `team:${u.id}`}
                                    isManager={true}
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: u?.id, name: userName(u) })}
                                />
                            </div>
                            {openPanel === `edit-user:${u.id}` && (
                                <InlineUserForm
                                    editUser={u}
                                    role={u.role}
                                    token={token}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setOpenPanel(null)}
                                    onSaved={fetchData}
                                />
                            )}
                            {openPanel === `perm:${u.id}` && (
                                <PermissionAccordion
                                    permForm={permForm}
                                    setPermForm={setPermForm}
                                    onSave={() => savePermissions(u)}
                                    onClose={() => setOpenPanel(null)}
                                    saving={permSaving}
                                    t={t}
                                    onSendReport={() => sendDailyReport(u)}
                                    reportSending={reportSendingIds.has(u.id)}
                                />
                            )}
                            {openPanel === `team:${u.id}` && (
                                <TeamAssignAccordion
                                    employees={employees}
                                    assignedIds={assignedEmployeeIds}
                                    setAssignedIds={setAssignedEmployeeIds}
                                    onSave={() => saveTeamAssignment(u.id)}
                                    onClose={() => setOpenPanel(null)}
                                    saving={teamSaving}
                                    userName={userName}
                                />
                            )}
                            {openPanel === `tasks:${u.id}` && (
                                <ScopedTasksModal
                                    scopedUser={u}
                                    scopedUserRole="MANAGER"
                                    token={token}
                                    lang={lang}
                                    t={t}
                                    onClose={() => setOpenPanel(null)}
                                />
                            )}
                        </>
                    )}
                />}

                {/* ── Employees ── */}
                {(activeListView === 'all' || activeListView === 'employees') && <SectionCard
                    icon={Users}
                    title={t?.employees_label || 'Employees'}
                    items={employees}
                    emptyLabel={t?.no_employees || 'No employees assigned'}
                    onAdd={() => togglePanel('add-user-employee')}
                    headerExtras={canUseExcel && (
                        <button
                            onClick={() => toggleExcelSection('employees')}
                            className={`ml-2 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'employees' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Employees — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'employees' && (
                        <ConfigExcelPanel section="employees" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                    )}
                    addPanel={openPanel === 'add-user-employee' ? (
                        <InlineUserForm
                            role="EMPLOYEE"
                            parentManagerId={createdBy}
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                            isAddPanel
                        />
                    ) : null}
                    renderItem={u => (
                        <>
                            <div className="flex items-center gap-2">
                                {u?.profile_picture_url ? (
                                    <img src={u.profile_picture_url} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                        {(userName(u)[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <button
                                    onClick={() => togglePanel(`tasks:${u.id}`)}
                                    className="flex-1 min-w-0 truncate text-left hover:underline decoration-violet-400 hover:text-violet-700 transition-colors"
                                    title="View Tasks"
                                >
                                    {userName(u)}
                                </button>
                                <RowActions
                                    onSettings={() => openPermission(u)}
                                    settingsOpen={openPanel === `perm:${u.id}`}
                                    onEdit={() => togglePanel(`edit-user:${u.id}`)}
                                    editOpen={openPanel === `edit-user:${u.id}`}
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: u?.id, name: userName(u) })}
                                />
                            </div>
                            {openPanel === `edit-user:${u.id}` && (
                                <InlineUserForm
                                    editUser={u}
                                    role="EMPLOYEE"
                                    token={token}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setOpenPanel(null)}
                                    onSaved={fetchData}
                                />
                            )}
                            {openPanel === `perm:${u.id}` && (
                                <PermissionAccordion
                                    permForm={permForm}
                                    setPermForm={setPermForm}
                                    onSave={() => savePermissions(u)}
                                    onClose={() => setOpenPanel(null)}
                                    saving={permSaving}
                                    t={t}
                                    onSendReport={() => sendDailyReport(u)}
                                    reportSending={reportSendingIds.has(u.id)}
                                />
                            )}
                            {openPanel === `tasks:${u.id}` && (
                                <ScopedTasksModal
                                    scopedUser={u}
                                    scopedUserRole="EMPLOYEE"
                                    token={token}
                                    lang={lang}
                                    t={t}
                                    onClose={() => setOpenPanel(null)}
                                />
                            )}
                        </>
                    )}
                />}

                {/* ── Locations ── */}
                {(activeListView === 'all' || activeListView === 'locations') && <SectionCard
                    icon={MapPin}
                    title={t?.locations_title || 'Locations'}
                    items={locations}
                    emptyLabel={t?.no_locations || 'No locations'}
                    onAdd={() => togglePanel('add-loc')}
                    headerExtras={canUseExcel && (
                        <button
                            onClick={() => toggleExcelSection('locations')}
                            className={`ml-2 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'locations' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Locations — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'locations' && (
                        <ConfigExcelPanel section="locations" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                    )}
                    addPanel={openPanel === 'add-loc' ? (
                        <InlineLocationForm
                            createdBy={createdBy}
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                            isAddPanel
                        />
                    ) : null}
                    renderItem={l => (
                        <>
                            <div className="flex items-center gap-2">
                                {l?.image_url ? (
                                    <img src={l.image_url} className="w-6 h-6 rounded object-cover shrink-0 border border-gray-200" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                        <MapPin size={12} className="text-gray-400" />
                                    </div>
                                )}
                                <span className="flex-1 min-w-0 truncate">{itemName(l)}</span>
                                {l?.code && <span className="text-[10px] text-gray-400 font-mono shrink-0">{l.code}</span>}
                                <RowActions
                                    onEdit={() => togglePanel(`edit-loc:${l.id}`)}
                                    editOpen={openPanel === `edit-loc:${l.id}`}
                                    onDelete={() => setDeleteConfirm({ type: 'locations', id: l?.id, name: itemName(l) })}
                                />
                            </div>
                            {openPanel === `edit-loc:${l.id}` && (
                                <InlineLocationForm
                                    editLocation={l}
                                    createdBy={createdBy}
                                    token={token}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setOpenPanel(null)}
                                    onSaved={fetchData}
                                />
                            )}
                        </>
                    )}
                />}
                {/* ── Categories ── */}
                {(activeListView === 'all' || activeListView === 'categories') && <SectionCard
                    icon={Tag}
                    title={t?.categories_title || 'Categories'}
                    items={categories}
                    emptyLabel={t?.no_categories || 'No categories'}
                    onAdd={() => togglePanel('add-cat')}
                    headerExtras={canUseExcel && (
                        <button
                            onClick={() => toggleExcelSection('categories')}
                            className={`ml-2 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'categories' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Categories — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'categories' && (
                        <ConfigExcelPanel section="categories" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                    )}
                    addPanel={openPanel === 'add-cat' ? (
                        <InlineCategoryForm
                            createdBy={createdBy}
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                            isAddPanel
                        />
                    ) : null}
                    renderItem={c => (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="flex-1 min-w-0 truncate">{itemName(c)}</span>
                                {c?.code && <span className="text-xs text-gray-400 font-mono shrink-0">{c.code}</span>}
                                <RowActions
                                    onEdit={() => togglePanel(`edit-cat:${c.id}`)}
                                    editOpen={openPanel === `edit-cat:${c.id}`}
                                    onDelete={() => setDeleteConfirm({ type: 'categories', id: c?.id, name: itemName(c) })}
                                />
                            </div>
                            {openPanel === `edit-cat:${c.id}` && (
                                <InlineCategoryForm
                                    editCategory={c}
                                    createdBy={createdBy}
                                    token={token}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setOpenPanel(null)}
                                    onSaved={fetchData}
                                />
                            )}
                        </>
                    )}
                />}
                {/* ── Assets ── */}
                {(activeListView === 'all' || activeListView === 'assets') && <SectionCard
                    icon={Box}
                    title={t?.assets_title || 'Assets'}
                    items={assets}
                    emptyLabel={t?.no_assets || 'No assets'}
                    onAdd={() => togglePanel('add-asset')}
                    headerExtras={canUseExcel && (
                        <button
                            onClick={() => toggleExcelSection('assets')}
                            className={`ml-2 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'assets' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Assets — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'assets' && (
                        <ConfigExcelPanel section="assets" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} />
                    )}
                    addPanel={openPanel === 'add-asset' ? (
                        <InlineAssetForm
                            createdBy={createdBy}
                            categories={categories}
                            locations={locations}
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                            isAddPanel
                        />
                    ) : null}
                    renderItem={a => (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="flex-1 min-w-0 truncate">{itemName(a)}</span>
                                {a?.code && <span className="text-xs text-gray-400 font-mono shrink-0">{a.code}</span>}
                                <RowActions
                                    onEdit={() => togglePanel(`edit-asset:${a.id}`)}
                                    editOpen={openPanel === `edit-asset:${a.id}`}
                                    onDelete={() => setDeleteConfirm({ type: 'assets', id: a?.id, name: itemName(a) })}
                                />
                            </div>
                            {openPanel === `edit-asset:${a.id}` && (
                                <InlineAssetForm
                                    editAsset={a}
                                    createdBy={createdBy}
                                    categories={categories}
                                    locations={locations}
                                    token={token}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setOpenPanel(null)}
                                    onSaved={fetchData}
                                />
                            )}
                        </>
                    )}
                />}
            </div>

            {/* Delete confirmation modal (kept as modal — just a confirmation) */}
            {deleteConfirm && (
                <ConfirmDeleteModal
                    message={`Delete "${deleteConfirm?.name}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm(null)}
                    t={t}
                />
            )}

            {/* Edit Department modal */}
            {editDeptOpen && user?.company_id && (
                <EditDeptModal
                    companyId={user.company_id}
                    token={token}
                    t={t}
                    lang={lang}
                    onClose={() => setEditDeptOpen(false)}
                    onSaved={(updated) => {
                        const newName = updated?.['name_' + lang] || updated?.name_en || updated?.name_he || updated?.name || localCompanyName;
                        setLocalCompanyName(newName);
                        setEditDeptOpen(false);
                    }}
                />
            )}
        </div>
    );
}
