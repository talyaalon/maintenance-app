import React from 'react';
import { Settings, Building2, Users, Bell, Lock, ChevronRight } from 'lucide-react';

export default function CompanyManagerSettingsTab({ t, user, token, lang }) {
  const isRTL = lang === 'he';

  const sections = [
    {
      icon: Building2,
      label: lang === 'he' ? 'פרטי החברה' : lang === 'th' ? 'ข้อมูลบริษัท' : 'Company Details',
      sub:   lang === 'he' ? 'שם, כתובת, לוגו' : lang === 'th' ? 'ชื่อ, ที่อยู่, โลโก้' : 'Name, address, logo',
    },
    {
      icon: Users,
      label: lang === 'he' ? 'ניהול עובדים' : lang === 'th' ? 'จัดการพนักงาน' : 'Employee Management',
      sub:   lang === 'he' ? 'הרשאות ותפקידים' : lang === 'th' ? 'สิทธิ์และบทบาท' : 'Permissions & roles',
    },
    {
      icon: Bell,
      label: lang === 'he' ? 'התראות' : lang === 'th' ? 'การแจ้งเตือน' : 'Notifications',
      sub:   lang === 'he' ? 'הגדרות הודעות' : lang === 'th' ? 'การตั้งค่าการแจ้งเตือน' : 'Notification preferences',
    },
    {
      icon: Lock,
      label: lang === 'he' ? 'אבטחה' : lang === 'th' ? 'ความปลอดภัย' : 'Security',
      sub:   lang === 'he' ? 'סיסמאות וגישה' : lang === 'th' ? 'รหัสผ่านและการเข้าถึง' : 'Passwords & access',
    },
  ];

  return (
    <div className="p-4 space-y-4 animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#714B67]/10 flex items-center justify-center flex-shrink-0">
          <Settings size={20} className="text-[#714B67]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">{t.nav_config}</h1>
          {user?.company_name && (
            <p className="text-xs text-gray-400">{user.company_name}</p>
          )}
        </div>
      </div>

      {/* Settings list */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {sections.map(({ icon: Icon, label, sub }) => (
          <button
            key={label}
            disabled
            className="w-full flex items-center gap-3 px-4 py-4 text-start opacity-50 cursor-not-allowed"
          >
            <div className="w-8 h-8 rounded-lg bg-[#714B67]/10 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-[#714B67]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 truncate">{sub}</p>
            </div>
            <ChevronRight size={16} className={`text-gray-300 flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </div>

      {/* Coming soon banner */}
      <div className="bg-[#714B67]/5 border border-[#714B67]/20 rounded-2xl px-4 py-5 text-center">
        <p className="text-xs font-semibold text-[#714B67] uppercase tracking-widest mb-1">
          {lang === 'he' ? 'בקרוב' : lang === 'th' ? 'เร็วๆ นี้' : 'Coming Soon'}
        </p>
        <p className="text-xs text-gray-400">
          {lang === 'he'
            ? 'הגדרות החברה יהיו זמינות בגרסה הבאה'
            : lang === 'th'
            ? 'การตั้งค่าบริษัทจะพร้อมใช้งานในเวอร์ชันถัดไป'
            : 'Company settings will be available in the next release'}
        </p>
      </div>

    </div>
  );
}
