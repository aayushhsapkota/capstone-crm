import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// A contentEditable div can render markup (tags, styling) with no leading/trailing
// text, so a plain .trim() on the raw HTML string isn't a reliable "is this actually
// empty" check.
function isHtmlEmpty(html) {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

// Dual-mode (visual / raw HTML) editor for a saved block of HTML — used for the email
// signature and the two full-email templates. Exposes setContent(html) via ref for the
// parent to call at specific moments (initial load, after "Generate") — deliberately
// NOT driven by a value prop watched in a useEffect, because contentEditable's DOM is
// mutated directly by the browser as the user types, outside React's knowledge, and an
// effect re-syncing it on every render races that and can crash (see EmailComposer,
// which hit this for real before the fix). onChange still fires on every keystroke —
// it's the caller's job to store it, this component just doesn't feed it back in.
const HtmlTemplateEditor = forwardRef(function HtmlTemplateEditor(
  { initialValue, onChange, placeholderReference, rows = 8, minHeight = '9.5rem', maxHeight = '24rem' },
  ref
) {
  const [mode, setMode] = useState('visual');
  const [empty, setEmpty] = useState(isHtmlEmpty(initialValue));
  const [rawValue, setRawValue] = useState(initialValue || '');
  const editorRef = useRef(null);
  const mountedRef = useRef(false);

  const setContent = (html) => {
    setRawValue(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setEmpty(isHtmlEmpty(html));
  };

  useImperativeHandle(ref, () => ({ setContent }));

  // Puts the initial value into the visual editor's DOM exactly once, the first time
  // the DOM node exists — a ref callback fires reliably when that happens, unlike
  // trying to do this during render (editorRef.current isn't guaranteed to exist yet).
  // Wrapped in useCallback with empty deps so it's a stable function identity — an
  // inline ref callback would get called with null then the node again on every
  // render (React detaches+reattaches when a ref callback's identity changes).
  const handleEditorRef = useCallback((node) => {
    editorRef.current = node;
    if (node && !mountedRef.current) {
      mountedRef.current = true;
      node.innerHTML = initialValue || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    setRawValue(html);
    setEmpty(isHtmlEmpty(html));
    onChange?.(html);
  };

  const handleTextareaChange = (e) => {
    setRawValue(e.target.value);
    setEmpty(isHtmlEmpty(e.target.value));
    onChange?.(e.target.value);
  };

  const handleSwitchMode = (next) => {
    // Coming back into visual mode, the editor's DOM may be stale against whatever was
    // typed into the raw-HTML textarea while it was the active mode — resync from state.
    if (next === 'visual' && editorRef.current) editorRef.current.innerHTML = rawValue;
    setMode(next);
  };

  return (
    <div>
      <div className="flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => handleSwitchMode('visual')}
          className={`px-2 py-1 rounded-md ${
            mode === 'visual' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Edit visually
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMode('html')}
          className={`px-2 py-1 rounded-md ${
            mode === 'html' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Edit HTML
        </button>
      </div>

      {placeholderReference && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {placeholderReference.map(({ token, description }) => (
            <span key={token} title={description}>
              <code className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{token}</code>
            </span>
          ))}
        </div>
      )}

      {/* Both modes stay mounted — toggled with `hidden` rather than conditionally
          rendered, so the visual editor's DOM (and cursor position, if focused) never
          gets torn down and rebuilt by switching tabs. */}
      <div className={`mt-2 ${mode === 'visual' ? '' : 'hidden'}`}>
        <p className={`text-xs text-slate-400 mb-1 ${empty ? '' : 'hidden'}`}>
          Nothing yet — try "Generate from profile".
        </p>
        <div
          ref={handleEditorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm prose-sm overflow-auto focus:outline-none focus:ring-1 focus:ring-slate-400"
          style={{ minHeight, maxHeight }}
        />
      </div>
      <div className={`mt-2 ${mode === 'html' ? '' : 'hidden'}`}>
        <textarea
          value={rawValue}
          onChange={handleTextareaChange}
          rows={rows}
          placeholder="<p>Best regards,<br/>Your Name</p>"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none font-mono"
        />
      </div>
    </div>
  );
});

export default HtmlTemplateEditor;
