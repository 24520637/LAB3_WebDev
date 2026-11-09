/** DOM-facing event adapter used by the React Hook; no rendering or audio logic. */
const EDITABLE_SELECTOR = [
  'input', 'textarea', 'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]', '[role="searchbox"]', '[role="combobox"]',
  '[role="spinbutton"]',
].join(',');

function isEditableNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.isContentEditable === true) return true;
  if (typeof node.closest === 'function') {
    try {
      if (node.closest(EDITABLE_SELECTOR)) return true;
    } catch {
      // Ignore non-Element targets that do not support selector matching.
    }
  }
  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
  const role = typeof node.getAttribute === 'function' ? node.getAttribute('role') : null;
  if (['textbox', 'searchbox', 'combobox', 'spinbutton'].includes(role)) return true;
  const editable = typeof node.getAttribute === 'function' ? node.getAttribute('contenteditable') : null;
  return editable != null && editable.toLowerCase() !== 'false';
}

export function isEditableEvent(event, hostWindow) {
  if (hostWindow.document?.designMode?.toLowerCase() === 'on') return true;
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  return [...path, event.target, hostWindow.document?.activeElement].some(isEditableNode);
}

/**
 * Registers only the listeners required to manage physical key presses.
 * Every valid initial keydown uses the shared onHit(padId) pathway.
 */
export function createDrumKeyboardController({ hostWindow, padMap, onHit, onActiveChange }) {
  const pressed = new Map(); // insertion order = most recently pressed last
  let composing = false;

  const currentActiveId = () => {
    const ids = [...pressed.values()];
    return ids.at(-1) ?? null;
  };

  const clearPressed = () => {
    if (pressed.size === 0) return;
    pressed.clear();
    onActiveChange(null);
  };

  const onKeyDown = (event) => {
    if (composing || event.isComposing || event.repeat) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const pad = padMap.get(event.code);
    if (!pad || pressed.has(event.code) || isEditableEvent(event, hostWindow)) return;
    event.preventDefault();
    pressed.set(event.code, pad.id);
    onHit(pad.id);
  };

  const onKeyUp = (event) => {
    if (!pressed.has(event.code)) return;
    // Release still applies even if focus has since moved into an editor.
    if (!isEditableEvent(event, hostWindow) && !composing && !event.isComposing) {
      event.preventDefault();
    }
    pressed.delete(event.code);
    onActiveChange(currentActiveId());
  };

  const onCompositionStart = () => {
    composing = true;
    clearPressed();
  };
  const onCompositionEnd = () => { composing = false; };
  const onBlur = () => { composing = false; clearPressed(); };

  hostWindow.addEventListener('keydown', onKeyDown);
  hostWindow.addEventListener('keyup', onKeyUp);
  hostWindow.addEventListener('blur', onBlur);
  hostWindow.addEventListener('compositionstart', onCompositionStart);
  hostWindow.addEventListener('compositionend', onCompositionEnd);

  return () => {
    hostWindow.removeEventListener('keydown', onKeyDown);
    hostWindow.removeEventListener('keyup', onKeyUp);
    hostWindow.removeEventListener('blur', onBlur);
    hostWindow.removeEventListener('compositionstart', onCompositionStart);
    hostWindow.removeEventListener('compositionend', onCompositionEnd);
    pressed.clear();
  };
}
