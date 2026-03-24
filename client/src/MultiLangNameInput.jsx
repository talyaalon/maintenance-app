import React, { useState } from 'react';
import { X, Languages } from 'lucide-react';

// Language display metadata
const LANG_BADGE   = { en: 'EN', he: 'HE', th: 'TH' };
const LANG_DIR     = { en: 'ltr', he: 'rtl', th: 'ltr' };
const LANG_PLACEHOLDER = {
  en: 'Name in English',
  he: 'שם בעברית',
  th: 'ชื่อภาษาไทย',
};

/**
 * MultiLangNameInput — Odoo-inspired tri-lingual name input.
 *
 * Props:
 *   value       {object}  — e.g. { name_en, name_he, name_th } or { full_name_en, … }
 *   onChange    {fn}      — called with the full updated object on any change
 *   lang        {string}  — current UI language ('en' | 'he' | 'th')
 *   prefix      {string}  — field prefix: 'name' (default) or 'full_name'
 *   disabled    {bool}
 *   required    {bool}
 *   label       {string}  — optional label above the input
 *   compact     {bool}    — smaller styling for inline config forms
 *   className   {string}  — extra wrapper class
 */
const MultiLangNameInput = ({
  value = {},
  onChange,
  lang = 'en',
  prefix = 'name',
  disabled = false,
  required = false,
  label,
  compact = false,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);

  const enKey = `${prefix}_en`;
  const heKey = `${prefix}_he`;
  const thKey = `${prefix}_th`;
  const activeKey = `${prefix}_${lang}`;

  const currentValue = value[activeKey] || '';

  const handlePrimary = (e) => {
    onChange({ ...value, [activeKey]: e.target.value });
  };

  const handleLangField = (langCode, newVal) => {
    onChange({ ...value, [`${prefix}_${langCode}`]: newVal });
  };

  // ── Styling helpers ──────────────────────────────────────────────────────────
  const inputCls = compact
    ? `w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-xs transition${
        lang === 'he' ? ' pl-10' : ' pr-10'
      }`
    : `w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-default${
        lang === 'he' ? ' pl-12' : ' pr-12'
      }`;

  const labelCls = compact
    ? 'text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-0.5'
    : 'block text-xs font-semibold text-slate-500 mb-1.5';

  const badgeCls = `absolute top-1/2 -translate-y-1/2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition select-none
    ${disabled
      ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-default'
      : 'text-[#714B67] bg-purple-50 border-purple-200 hover:bg-purple-100 cursor-pointer'}
    ${lang === 'he' ? 'left-2' : 'right-2'}`;

  return (
    <div className={className}>
      {label && (
        <label className={labelCls}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* ── Primary input with language badge ─────────────────────────────── */}
      <div className="relative">
        <input
          type="text"
          dir={LANG_DIR[lang] || 'ltr'}
          placeholder={LANG_PLACEHOLDER[lang]}
          value={currentValue}
          onChange={handlePrimary}
          disabled={disabled}
          required={required}
          className={inputCls}
        />
        <button
          type="button"
          title="Translate / Add other languages"
          onClick={() => !disabled && setShowModal(true)}
          className={badgeCls}
        >
          {LANG_BADGE[lang] || lang.toUpperCase()}
        </button>
      </div>

      {/* ── Translation Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden animate-scale-in"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100"
                 style={{ background: 'linear-gradient(135deg, rgba(113,75,103,0.06) 0%, rgba(139,92,246,0.06) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                  <Languages size={17} className="text-[#714B67]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">Translate: Name</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Fill in each language below</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Language fields */}
            <div className="p-5 space-y-4">
              {/* English */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-md leading-none">EN</span>
                  <span className="text-xs font-semibold text-slate-600">English</span>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="Name in English"
                  value={value[enKey] || ''}
                  onChange={e => handleLangField('en', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white focus:border-transparent transition-all"
                />
              </div>

              {/* Hebrew */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-white bg-[#714B67] px-1.5 py-0.5 rounded-md leading-none">HE</span>
                  <span className="text-xs font-semibold text-slate-600">עברית (Hebrew)</span>
                </div>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="שם בעברית"
                  value={value[heKey] || ''}
                  onChange={e => handleLangField('he', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#714B67]/50 focus:bg-white focus:border-transparent transition-all"
                />
              </div>

              {/* Thai */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-md leading-none">TH</span>
                  <span className="text-xs font-semibold text-slate-600">ภาษาไทย (Thai)</span>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="ชื่อภาษาไทย"
                  value={value[thKey] || ''}
                  onChange={e => handleLangField('th', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Footer / Done button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-[#714B67] text-white rounded-xl font-bold text-sm hover:bg-[#5a3b52] transition shadow-sm active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiLangNameInput;
