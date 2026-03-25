import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, ChevronRight, LayoutGrid, Users, MapPin, Tag, Box, Shield, X, Pencil, Trash2, ArrowLeft, Loader2, Settings, UserCheck, Send, FileSpreadsheet, AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';
import ScopedTasksModal from './ScopedTasksModal';
import MultiLangNameInput from './MultiLangNameInput';
import ConfigExcelPanel from './ConfigExcelPanel';

const BASE = 'https://maintenance-app-staging.onrender.com';

// ─── Confirm delete modal (kept as modal — it's just a confirmation, not an edit form) ──
const ConfirmDeleteModal = ({ message, onConfirm, onCancel, t }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
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
    </div>
);

// ─── Company Deletion: Blocker Modal (company has data) ──────────────────────
const DeletionBlockerModal = ({ company, counts, onClose, t }) => {
    const items = [
        { key: 'users',      label: t?.users_label      || 'users' },
        { key: 'tasks',      label: t?.tasks_label      || 'tasks' },
        { key: 'locations',  label: t?.locations_label  || 'locations' },
        { key: 'categories', label: t?.categories_label || 'categories' },
        { key: 'assets',     label: t?.assets_label     || 'assets' },
    ].filter(i => counts[i.key] > 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                    <h3 className="font-bold text-gray-800 text-base">{t?.cannot_delete || 'Cannot Delete Company'}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                    {t?.delete_blocker_intro || 'Please remove all associated data first:'}
                </p>
                <ul className="space-y-1 mb-5">
                    {items.map(i => (
                        <li key={i.key} className="flex items-center gap-2 text-sm text-red-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            {counts[i.key]} {i.label}
                        </li>
                    ))}
                </ul>
                <button onClick={onClose} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold transition text-sm">
                    {t?.close || 'Close'}
                </button>
            </div>
        </div>
    );
};

// ─── Company Deletion: Confirmation Modal (company is empty, request email) ──
const DeletionConfirmModal = ({ company, onConfirm, onCancel, requesting, emailSent, t }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
            {emailSent ? (
                <div className="text-center">
                    <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-800 text-base mb-2">{t?.email_sent_title || 'Email Sent!'}</h3>
                    <p className="text-sm text-gray-500 mb-5">
                        {t?.email_sent_body || 'A confirmation link has been sent to your email address. The link expires in 15 minutes.'}
                    </p>
                    <button onClick={onCancel} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold transition text-sm">
                        {t?.close || 'Close'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <Mail size={20} className="text-[#714B67] shrink-0" />
                        <h3 className="font-bold text-gray-800 text-base">{t?.confirm_delete_title || 'Request Company Deletion'}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                        {t?.confirm_delete_company || 'Delete company'}{' '}
                        <strong>"{company?.name_en || company?.name}"</strong>?
                    </p>
                    <p className="text-sm text-gray-400 mb-5">
                        {t?.deletion_email_note || 'A confirmation link will be emailed to your address. You must click it within 15 minutes to complete the deletion.'}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onCancel} disabled={requesting} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition text-sm">
                            {t?.cancel || 'Cancel'}
                        </button>
                        <button onClick={onConfirm} disabled={requesting} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition text-sm">
                            {requesting && <Loader2 size={13} className="animate-spin" />}
                            {t?.send_email || 'Send Email'}
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
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
        {/* Add panel — rendered below all rows when the Add button is active */}
        {addPanel && (
            <div className="px-4 py-2.5 text-sm text-slate-700 border-t border-slate-200 bg-slate-50">
                {addPanel}
            </div>
        )}
    </div>
);

// ─── Shared inline accordion style helpers ────────────────────────────────────
// Used for row-embedded edit/perm/team panels (extends full-width via -mx-4)
const rowPanelCls = "mt-2 pt-3 border-y border-slate-200 space-y-2 animate-fade-in bg-slate-50 shadow-inner rounded-b-xl -mx-4 px-4 pb-3";
// Used for add-new panel inside SectionCard addPanel slot (no -mx-4 needed)
const addPanelCls = "space-y-2 animate-fade-in";
const inputCls  = "w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-xs transition";
const labelCls  = "text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-0.5";
const saveBtnCls = "flex-1 py-1.5 text-xs bg-[#714B67] text-white rounded-lg font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-1";
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

    const roleLabel = (role === 'SUPERVISOR' || role === 'MANAGER') ? 'Manager' : role === 'COMPANY_MANAGER' ? 'Company Manager' : 'Employee';
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
                    <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} className={inputCls} />
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
        if (!form.code?.trim()) { alert('Code is required (3 chars max)'); return; }
        setSaving(true);
        try {
            const payload = {
                name_en: form.name_en, name_he: form.name_he, name_th: form.name_th,
                code:    form.code.toUpperCase().slice(0, 3),
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
                <label className={labelCls}>Code (3 chars) *</label>
                <input type="text" value={form.code} maxLength={3}
                    onChange={e => set('code', e.target.value.toUpperCase().slice(0, 3))}
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

// ─── Company detail view ──────────────────────────────────────────────────────
const CompanyDetail = ({ company, token, t, lang, user, onBack }) => {
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Unified accordion/panel state ──────────────────────────────────────────
    // Key format: "edit-user:{id}" | "perm:{id}" | "team:{id}" |
    //             "edit-loc:{id}"  | "edit-cat:{id}" | "edit-asset:{id}" |
    //             "add-user-cm"    | "add-user-manager" | "add-user-employee" |
    //             "add-loc"        | "add-cat"          | "add-asset"
    const [openPanel, setOpenPanel] = useState(null);

    // ── Excel import/export panel ──────────────────────────────────────────────
    const [openExcelSection, setOpenExcelSection] = useState(null);
    const toggleExcelSection = (s) => setOpenExcelSection(prev => prev === s ? null : s);
    const canUseExcel = ['BIG_BOSS', 'COMPANY_MANAGER'].includes(user?.role);

    // ── Active list filter — 'all' = show all; string key = show only that section ──
    const [activeListView, setActiveListView] = useState('all');

    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Permission form state (populated when perm panel opens)
    const [permForm, setPermForm] = useState({});
    const [permSaving, setPermSaving] = useState(false);

    // Team assignment state (populated when team panel opens)
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState(new Set());
    const [teamSaving, setTeamSaving] = useState(false);

    // Daily report sending state — tracks which user IDs are currently dispatching
    const [reportSendingIds, setReportSendingIds] = useState(new Set());

    const cid = company?.id;

    const fetchData = async () => {
        const headers = { Authorization: `Bearer ${token}` };
        const [rawUsers, rawLocs, rawCats, rawAssets] = await Promise.all([
            fetch(`${BASE}/users?company_id=${cid}`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${BASE}/locations?company_id=${cid}`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${BASE}/categories?company_id=${cid}`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${BASE}/assets?company_id=${cid}`, { headers }).then(r => r.json()).catch(() => []),
        ]);
        setUsers((rawUsers ?? []).filter(u => u?.company_id === cid));
        setLocations(rawLocs ?? []);
        setCategories(rawCats ?? []);
        setAssets(rawAssets ?? []);
        setLoading(false);
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [cid, token]);

    const companyManagers = (users ?? []).filter(u => u?.role === 'COMPANY_MANAGER');
    const managers  = (users ?? []).filter(u => u?.role === 'MANAGER' || u?.role === 'SUPERVISOR');
    const employees = (users ?? []).filter(u => u?.role === 'EMPLOYEE');
    const primaryManagerId = (users ?? []).find(u => u?.role === 'MANAGER')?.id ?? managers[0]?.id ?? null;

    const userName = u => u?.['full_name_' + lang] || u?.full_name_en || u?.full_name || u?.name || '—';
    const itemName = item => item?.['name_' + lang] || item?.name_en || item?.name || '—';

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
                body: JSON.stringify({ full_name: u.full_name_en || u.full_name, email: u.email, role: u.role, ...permForm }),
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

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const { type, id } = deleteConfirm;
        try {
            const res = await fetch(`${BASE}/${type}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) fetchData();
            else { const d = await res.json().catch(() => ({})); alert(d?.message || d?.error || 'Error deleting item. It may be in use.'); }
        } catch { alert('Server error'); }
        setDeleteConfirm(null);
    };

    // ── Row action buttons ─────────────────────────────────────────────────────
    // editOpen: highlights pencil when edit panel is open for this row
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#714B67]" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <button onClick={onBack} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                    <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div className="flex items-center gap-3">
                    {company?.profile_image_url ? (
                        <img src={company.profile_image_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#714B67]/10 flex items-center justify-center">
                            <Building2 size={20} className="text-[#714B67]" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{company?.name}</h2>
                        <p className="text-xs text-gray-400">{t?.company_detail_subtitle || 'Company Dashboard'}</p>
                    </div>
                </div>
            </div>

            {/* Company Managers card — supports multiple co-admins */}
            <div className="bg-white rounded-2xl border border-[#714B67]/20 overflow-hidden mb-5">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-[#714B67]/5">
                    <Shield size={16} className="text-[#714B67]" />
                    <h3 className="text-sm font-bold text-slate-700">Company Managers</h3>
                    <span className="ml-auto text-xs font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                        {companyManagers.length}
                    </span>
                    <button
                        onClick={() => togglePanel('add-user-cm')}
                        className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#714B67] text-white text-[10px] font-bold hover:bg-[#5a3b52] transition"
                    >
                        <Plus size={11} /> Add
                    </button>
                </div>
                <div className="divide-y divide-gray-100">
                    {companyManagers.length === 0 && openPanel !== 'add-user-cm' && (
                        <p className="px-4 py-3 text-xs text-gray-400 italic">No Company Managers Assigned</p>
                    )}
                    {companyManagers.map(cm => (
                        <div key={cm.id} className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                {cm.profile_picture_url ? (
                                    <img src={cm.profile_picture_url} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" alt="" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#714B67]/10 flex items-center justify-center text-sm font-bold text-[#714B67] shrink-0">
                                        {(userName(cm)[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {userName(cm)}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 px-1.5 py-0.5 rounded mt-0.5">
                                        Company Manager
                                    </span>
                                </div>
                                <RowActions
                                    onEdit={() => togglePanel(`edit-user:${cm.id}`)}
                                    editOpen={openPanel === `edit-user:${cm.id}`}
                                    onSettings={() => openPermission(cm)}
                                    settingsOpen={openPanel === `perm:${cm.id}`}
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: cm.id, name: userName(cm) })}
                                />
                            </div>
                            {openPanel === `edit-user:${cm.id}` && (
                                <InlineUserForm
                                    editUser={cm}
                                    role="COMPANY_MANAGER"
                                    token={token}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setOpenPanel(null)}
                                    onSaved={fetchData}
                                />
                            )}
                            {openPanel === `perm:${cm.id}` && (
                                <PermissionAccordion
                                    permForm={permForm}
                                    setPermForm={setPermForm}
                                    onSave={() => savePermissions(cm)}
                                    onClose={() => setOpenPanel(null)}
                                    saving={permSaving}
                                    t={t}
                                    onSendReport={() => sendDailyReport(cm)}
                                    reportSending={reportSendingIds.has(cm.id)}
                                />
                            )}
                        </div>
                    ))}
                </div>
                {openPanel === 'add-user-cm' && (
                    <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50">
                        <InlineUserForm
                            role="COMPANY_MANAGER"
                            companyId={cid}
                            token={token}
                            t={t}
                            lang={lang}
                            onClose={() => setOpenPanel(null)}
                            onSaved={fetchData}
                            isAddPanel
                        />
                    </div>
                )}
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
                            <LayoutGrid size={16} className={`mx-auto mb-1 ${isActive ? 'text-white' : 'text-[#714B67]'}`} />
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

                {/* ── Managers ── */}
                {(activeListView === 'all' || activeListView === 'managers') && <SectionCard
                    icon={Shield}
                    title={t?.managers_label || 'Managers'}
                    items={managers}
                    emptyLabel={t?.no_managers || 'No managers assigned'}
                    onAdd={() => togglePanel('add-user-manager')}
                    headerExtras={canUseExcel && (
                        <button
                            onClick={() => toggleExcelSection('managers')}
                            className={`ml-1 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'managers' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Managers — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'managers' && (
                        <ConfigExcelPanel section="managers" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} companyId={cid} />
                    )}
                    addPanel={openPanel === 'add-user-manager' ? (
                        <InlineUserForm
                            role="MANAGER"
                            companyId={cid}
                            parentManagerId={primaryManagerId}
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
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: u?.id, name: userName(u) })}
                                    onSettings={() => openPermission(u)}
                                    settingsOpen={openPanel === `perm:${u.id}`}
                                    onTeam={() => openTeamPanel(u)}
                                    teamOpen={openPanel === `team:${u.id}`}
                                    isManager={u?.role === 'MANAGER'}
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
                                    scopedUserRole={u?.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE'}
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
                            className={`ml-1 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'employees' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Employees — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'employees' && (
                        <ConfigExcelPanel section="employees" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} companyId={cid} />
                    )}
                    addPanel={openPanel === 'add-user-employee' ? (
                        <InlineUserForm
                            role="EMPLOYEE"
                            parentManagerId={primaryManagerId}
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
                                    onEdit={() => togglePanel(`edit-user:${u.id}`)}
                                    editOpen={openPanel === `edit-user:${u.id}`}
                                    onDelete={() => setDeleteConfirm({ type: 'users', id: u?.id, name: userName(u) })}
                                    onSettings={() => openPermission(u)}
                                    settingsOpen={openPanel === `perm:${u.id}`}
                                    isManager={false}
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
                            className={`ml-1 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'locations' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Locations — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'locations' && (
                        <ConfigExcelPanel section="locations" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} companyId={cid} />
                    )}
                    addPanel={openPanel === 'add-loc' ? (
                        <InlineLocationForm
                            createdBy={primaryManagerId}
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
                                <span className="flex-1 min-w-0 truncate">
                                    {itemName(l)}
                                </span>
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
                                    createdBy={primaryManagerId}
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
                            className={`ml-1 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'categories' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Categories — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'categories' && (
                        <ConfigExcelPanel section="categories" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} companyId={cid} />
                    )}
                    addPanel={openPanel === 'add-cat' ? (
                        <InlineCategoryForm
                            createdBy={primaryManagerId}
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
                                <span className="flex-1 min-w-0 truncate">
                                    {itemName(c)}
                                </span>
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
                                    createdBy={primaryManagerId}
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
                            className={`ml-1 p-1 rounded-lg transition border-none text-[#714B67] ${openExcelSection === 'assets' ? 'bg-[#fdf4ff]' : 'bg-white hover:bg-[#fdf4ff]'}`}
                            title="Assets — Excel ייבוא / ייצוא"
                        >
                            <FileSpreadsheet size={13} />
                        </button>
                    )}
                    excelPanel={canUseExcel && openExcelSection === 'assets' && (
                        <ConfigExcelPanel section="assets" t={t} onClose={() => setOpenExcelSection(null)} token={token} onSuccess={() => { fetchData(); setOpenExcelSection(null); }} companyId={cid} />
                    )}
                    addPanel={openPanel === 'add-asset' ? (
                        <InlineAssetForm
                            createdBy={primaryManagerId}
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
                                <span className="flex-1 min-w-0 truncate">
                                    {itemName(a)}
                                </span>
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
                                    createdBy={primaryManagerId}
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

            {/* Delete confirmation modal (kept as modal — just a confirmation, not an edit form) */}
            {deleteConfirm && (
                <ConfirmDeleteModal
                    message={`Delete "${deleteConfirm?.name}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm(null)}
                    t={t}
                />
            )}
        </div>
    );
};

// ─── Inline Company Form (Create or Edit — replaces popup modal) ──────────────
const InlineCompanyForm = ({ company, token, t, lang, onClose, onSaved }) => {
    const isEdit = !!company;
    const [form, setForm] = useState({
        name_en: company?.name_en || company?.name || '',
        name_he: company?.name_he || '',
        name_th: company?.name_th || '',
        default_notification_lang: company?.default_notification_lang || 'en',
    });
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);

    const [mgr, setMgr] = useState({
        name_en: '', name_he: '', name_th: '',
        email: '', password: '', phone: '', line_id: '',
    });
    const [managerUser, setManagerUser] = useState(null);
    const [mgrLoading, setMgrLoading] = useState(false);

    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const setM = (k, v) => setMgr(p => ({ ...p, [k]: v }));

    useEffect(() => {
        if (!isEdit) return;
        setMgrLoading(true);
        fetch(`${BASE}/users?company_id=${company.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(users => {
                const found = (Array.isArray(users) ? users : []).find(u => u?.role === 'COMPANY_MANAGER');
                if (found) {
                    setManagerUser(found);
                    setMgr({
                        name_en:  found.full_name_en || found.full_name || '',
                        name_he:  found.full_name_he || '',
                        name_th:  found.full_name_th || '',
                        email:    found.email || '',
                        password: '',
                        phone:    found.phone || '',
                        line_id:  found.line_user_id || '',
                    });
                }
            })
            .catch(() => {})
            .finally(() => setMgrLoading(false));
    }, [isEdit, company?.id]);

    const handleSave = async () => {
        if (!form.name_en.trim() && !form.name_he.trim()) {
            alert(t?.company_name_required || 'Company name (EN or HE) is required');
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name_en', form.name_en.trim());
            formData.append('name_he', form.name_he.trim());
            formData.append('name_th', form.name_th.trim());
            formData.append('name',    form.name_en.trim() || form.name_he.trim());
            formData.append('default_notification_lang', form.default_notification_lang);
            if (imageFile) formData.append('profile_image', imageFile);
            if (company?.profile_image_url) formData.append('existing_image', company.profile_image_url);

            if (!isEdit) {
                if (mgr.name_en.trim() && mgr.email.trim() && mgr.password.trim()) {
                    formData.append('manager_name_en',  mgr.name_en.trim());
                    formData.append('manager_name_he',  mgr.name_he.trim());
                    formData.append('manager_name_th',  mgr.name_th.trim());
                    formData.append('manager_email',    mgr.email.trim().toLowerCase());
                    formData.append('manager_password', mgr.password.trim());
                    if (mgr.phone)   formData.append('manager_phone',   mgr.phone.trim());
                    if (mgr.line_id) formData.append('manager_line_id', mgr.line_id.trim());
                }
            } else if (managerUser) {
                formData.append('manager_name_en',  mgr.name_en.trim());
                formData.append('manager_name_he',  mgr.name_he.trim());
                formData.append('manager_name_th',  mgr.name_th.trim());
                if (mgr.email.trim())    formData.append('manager_email',    mgr.email.trim().toLowerCase());
                if (mgr.password.trim()) formData.append('manager_password', mgr.password.trim());
                formData.append('manager_phone',   mgr.phone.trim());
                formData.append('manager_line_id', mgr.line_id.trim());
            }

            const method = isEdit ? 'PUT' : 'POST';
            const url    = isEdit ? `${BASE}/companies/${company.id}` : `${BASE}/companies`;
            const res = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json().catch(() => ({})); alert(d?.error || 'Error saving company'); }
        } catch (e) { console.error(e); alert(t?.server_error || 'Server error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider">
                    {isEdit ? (t?.edit_company || 'Edit Company') : (t?.create_company || 'Create Company')}
                </p>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#714B67]/10 text-[#714B67] transition"><X size={14} /></button>
            </div>

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company Info</p>
            <MultiLangNameInput
                value={{ name_en: form.name_en, name_he: form.name_he, name_th: form.name_th }}
                onChange={updated => setForm(p => ({ ...p, ...updated }))}
                lang={lang || 'en'}
                prefix="name"
                label="Name *"
                compact
            />
            <div>
                <label className={labelCls}>Default Notification Language</label>
                <select value={form.default_notification_lang} onChange={e => setF('default_notification_lang', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-[#714B67]">
                    <option value="en">English</option>
                    <option value="he">Hebrew</option>
                    <option value="th">Thai</option>
                </select>
            </div>
            <div>
                <label className={labelCls}>{t?.company_logo_label || 'Logo (optional)'}</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-[#714B67] cursor-pointer" />
                {company?.profile_image_url && !imageFile && (
                    <img src={company.profile_image_url} alt="" className="mt-1 h-8 rounded-lg object-contain border border-gray-200" />
                )}
            </div>

            <div className="pt-1">
                <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider mb-1.5">
                    Company Manager{' '}
                    {!isEdit && <span className="text-gray-400 font-normal normal-case">(optional — can be added later)</span>}
                </p>
                {isEdit && mgrLoading && (
                    <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                        <Loader2 size={12} className="animate-spin" /> Loading manager info…
                    </div>
                )}
                {isEdit && !mgrLoading && !managerUser && (
                    <p className="text-xs text-gray-400 italic py-1">No company manager found for this company.</p>
                )}
                {(!isEdit || (!mgrLoading && managerUser)) && (
                    <div className="space-y-2 bg-white rounded-xl p-2.5 border border-slate-200">
                        <MultiLangNameInput
                            value={{ name_en: mgr.name_en, name_he: mgr.name_he, name_th: mgr.name_th }}
                            onChange={updated => setMgr(p => ({ ...p, ...updated }))}
                            lang={lang || 'en'}
                            prefix="name"
                            label="Manager Name"
                            compact
                        />
                        {[
                            { label: 'Manager Email',                                                 key: 'email',    type: 'email' },
                            { label: isEdit ? 'Password (blank = keep current)' : 'Manager Password', key: 'password', type: 'password' },
                            { label: 'Manager Phone',                                                 key: 'phone',    type: 'text' },
                            { label: 'Manager LINE ID',                                               key: 'line_id',  type: 'text' },
                        ].map(({ label, key, type }) => (
                            <div key={key}>
                                <label className={labelCls}>{label}</label>
                                <input type={type} className={inputCls} value={mgr[key]} onChange={e => setM(key, e.target.value)} />
                            </div>
                        ))}
                    </div>
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

// ─── Main CompaniesTab ────────────────────────────────────────────────────────
const CompaniesTab = ({ token, t, user, lang }) => {
    const [companies, setCompanies] = useState([]);
    const [companyManagers, setCompanyManagers] = useState({}); // { company_id: userObj }
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [openPanel, setOpenPanel] = useState(null); // 'new-company' | 'edit-company:{id}'
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    // Deletion 2FA flow state
    const [deletionState, setDeletionState] = useState(null); // { company, phase: 'checking'|'blocked'|'confirm', counts?, requesting?, emailSent? }
    // Used to restore selected company once after initial fetch (F5 reload persistence)
    const didRestoreCompany = useRef(false);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [companiesData, usersData] = await Promise.all([
                fetch(`${BASE}/companies`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${BASE}/users`, { headers }).then(r => r.json()).catch(() => []),
            ]);
            const list = Array.isArray(companiesData) ? companiesData : [];
            setCompanies(list);
            // Build map of company_id -> COMPANY_MANAGER for list display
            const mgrs = {};
            (Array.isArray(usersData) ? usersData : []).forEach(u => {
                if (u?.role === 'COMPANY_MANAGER' && u?.company_id) {
                    mgrs[u.company_id] = u;
                }
            });
            setCompanyManagers(mgrs);
            // Restore selected company on first load (F5 reload)
            if (!didRestoreCompany.current && list.length > 0) {
                didRestoreCompany.current = true;
                const storedId = sessionStorage.getItem('selectedCompanyId');
                if (storedId) {
                    const found = list.find(c => String(c.id) === storedId);
                    if (found) setSelectedCompany(found);
                }
            }
        } catch (e) {
            console.error('fetchCompanies error:', e);
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCompanies(); }, [token]);

    // Step 1: check-deletion → decide which modal to show
    const handleDeleteClick = async (company) => {
        setDeletionState({ company, phase: 'checking' });
        try {
            const res = await fetch(`${BASE}/companies/${company.id}/check-deletion`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.isDeletable) {
                setDeletionState({ company, phase: 'confirm', emailSent: false, requesting: false });
            } else {
                setDeletionState({ company, phase: 'blocked', counts: data.counts });
            }
        } catch (e) {
            console.error(e);
            setDeletionState(null);
        }
    };

    // Step 2: request-deletion → send confirmation email
    const handleRequestDeletion = async () => {
        if (!deletionState?.company) return;
        setDeletionState(prev => ({ ...prev, requesting: true }));
        try {
            const res = await fetch(`${BASE}/companies/${deletionState.company.id}/request-deletion`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setDeletionState(prev => ({ ...prev, requesting: false, emailSent: true }));
            } else {
                const d = await res.json();
                alert(d?.error || 'Error requesting deletion');
                setDeletionState(prev => ({ ...prev, requesting: false }));
            }
        } catch (e) {
            console.error(e);
            setDeletionState(prev => ({ ...prev, requesting: false }));
        }
    };

    const togglePanel = (key) => setOpenPanel(prev => prev === key ? null : key);

    if (selectedCompany) {
        return (
            <div className="p-4 pb-6">
                <CompanyDetail
                    company={selectedCompany}
                    token={token}
                    t={t}
                    lang={lang}
                    user={user}
                    onBack={() => { setSelectedCompany(null); sessionStorage.removeItem('selectedCompanyId'); }}
                />
            </div>
        );
    }

    return (
        <div className="p-4 pb-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 size={20} className="text-[#714B67]" />
                        {t?.companies_tab || 'Companies'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">{t?.companies_subtitle || 'Manage all your tenant companies'}</p>
                </div>
                <button
                    onClick={() => togglePanel('new-company')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition active:scale-95 shadow-sm ${openPanel === 'new-company' ? 'bg-[#5a3b52] text-white' : 'bg-[#714B67] text-white hover:bg-[#5a3b52]'}`}
                >
                    <Plus size={16} />
                    {t?.create_company_btn || 'New Company'}
                </button>
            </div>

            {/* New Company inline accordion — expands below header */}
            {openPanel === 'new-company' && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in shadow-inner">
                    <InlineCompanyForm
                        token={token}
                        t={t}
                        lang={lang}
                        onClose={() => setOpenPanel(null)}
                        onSaved={() => { fetchCompanies(); setOpenPanel(null); }}
                    />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-[#714B67]" />
                </div>
            ) : (companies ?? []).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t?.no_companies || 'No companies yet'}</p>
                    <p className="text-sm mt-1">{t?.create_first_company || 'Create your first company to get started'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(companies ?? []).map(company => {
                        const manager = companyManagers[company?.id];
                        const isEditOpen = openPanel === `edit-company:${company?.id}`;
                        return (
                            <div key={company?.id}>
                                {/* Company card row */}
                                <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden ${isEditOpen ? 'border-[#714B67]/30' : 'border-gray-200'}`}>
                                    <button
                                        className="w-full flex items-center gap-3 p-4 text-left"
                                        onClick={() => { setSelectedCompany(company); sessionStorage.setItem('selectedCompanyId', String(company.id)); }}
                                    >
                                        {/* Logo / Avatar */}
                                        {company?.profile_image_url ? (
                                            <img src={company.profile_image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                                                <Building2 size={22} className="text-[#714B67]" />
                                            </div>
                                        )}

                                        {/* Vertical text block */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{company?.name}</p>
                                            {manager ? (
                                                <>
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                        <span className="font-semibold">{t?.manager_label || 'Manager'}:</span>{' '}
                                                        {manager.full_name_en || manager.full_name || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 truncate">
                                                        <span className="font-semibold">{t?.email_label || 'Email'}:</span>{' '}
                                                        {manager.email}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-xs text-gray-400 mt-0.5">{t?.company_id_label || 'ID'}: {company?.id}</p>
                                            )}
                                        </div>

                                        <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                    </button>

                                    <div className="flex border-t border-gray-100">
                                        <button
                                            onClick={e => { e.stopPropagation(); togglePanel(`edit-company:${company?.id}`); }}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition ${isEditOpen ? 'bg-[#714B67]/10 text-[#714B67]' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <Pencil size={13} />
                                            {t?.edit_btn || 'Edit'}
                                        </button>
                                        <div className="w-px bg-gray-100" />
                                        <button
                                            onClick={() => handleDeleteClick(company)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-50 transition"
                                        >
                                            {deletionState?.company?.id === company.id && deletionState.phase === 'checking'
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <Trash2 size={13} />}
                                            {t?.delete_btn || 'Delete'}
                                        </button>
                                    </div>
                                </div>

                                {/* Edit accordion — inline panel directly beneath the row */}
                                {isEditOpen && (
                                    <div className="mt-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in shadow-inner">
                                        <InlineCompanyForm
                                            company={company}
                                            token={token}
                                            t={t}
                                            lang={lang}
                                            onClose={() => setOpenPanel(null)}
                                            onSaved={() => { fetchCompanies(); setOpenPanel(null); }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {deletionState?.phase === 'blocked' && (
                <DeletionBlockerModal
                    company={deletionState.company}
                    counts={deletionState.counts}
                    onClose={() => setDeletionState(null)}
                    t={t}
                />
            )}
            {(deletionState?.phase === 'confirm') && (
                <DeletionConfirmModal
                    company={deletionState.company}
                    onConfirm={handleRequestDeletion}
                    onCancel={() => setDeletionState(null)}
                    requesting={deletionState.requesting}
                    emailSent={deletionState.emailSent}
                    t={t}
                />
            )}
        </div>
    );
};

export default CompaniesTab;
