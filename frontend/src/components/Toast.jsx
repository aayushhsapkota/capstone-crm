const TYPE_STYLES = {
  success: 'bg-slate-800 text-white',
  error: 'bg-red-600 text-white',
};

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 left-4 sm:left-auto text-base px-6 py-4 rounded-lg shadow-lg z-50 sm:max-w-md ${TYPE_STYLES[toast.type] ?? TYPE_STYLES.success}`}
    >
      {toast.message}
    </div>
  );
}
