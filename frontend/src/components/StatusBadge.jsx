const STATUS_VALUES = [
  'NEW',
  'EMAIL_SENT',
  'AWAITING_REPLY',
  'FOLLOW_UP_SENT',
  'REPLIED',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const STATUS_STYLES = {
  NEW: 'bg-slate-100 text-slate-700',
  EMAIL_SENT: 'bg-blue-100 text-blue-700',
  AWAITING_REPLY: 'bg-amber-100 text-amber-700',
  FOLLOW_UP_SENT: 'bg-purple-100 text-purple-700',
  REPLIED: 'bg-teal-100 text-teal-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status, onChange }) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {STATUS_VALUES.map((value) => (
        <option key={value} value={value}>
          {value.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}
