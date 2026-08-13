// Small spinning ring in the current text color, so it matches whatever badge it's
// dropped into without needing its own color prop.
export default function LoadingSpinner({ className = 'w-2.5 h-2.5' }) {
  return (
    <span
      className={`inline-block ${className} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  );
}
