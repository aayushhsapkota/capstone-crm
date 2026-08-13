const TYPE_STYLES = {
  success: 'bg-slate-800 text-white',
  error: 'bg-red-600 text-white',
};

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 text-sm px-4 py-2 rounded-md shadow-lg z-50 ${TYPE_STYLES[toast.type] ?? TYPE_STYLES.success}`}
    >
      {toast.message}
    </div>
  );
}
