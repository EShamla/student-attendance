// ── קובץ קבועים גלובלי — ייבא מכאן בכל רכיב שצריך תגיות תפקיד/סטטוס ──────────

export const ROLE_LABELS: Record<string, string> = {
  student: 'סטודנט',
  lecturer: 'מרצה',
  admin: 'מנהל',
};

// צבעי תג לפי תפקיד (Tailwind classes)
export const ROLE_STYLES: Record<string, string> = {
  student: 'bg-sky-100 text-sky-700 border-sky-200',
  lecturer: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  pending: 'ממתין',
  suspended: 'מושהה',
};

// צבעי תג לפי סטטוס (Tailwind classes)
export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
};
