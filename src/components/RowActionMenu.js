'use client';

import { useEffect, useId, useRef, useState } from 'react';

const MENU_WIDTH = 192;
const ITEM_HEIGHT = 40;

/**
 * Three-dot (kebab) menu for table rows.
 * items: [{ label, onSelect, danger?, disabled? }]
 * The menu is positioned with `fixed` so the table's overflow clipping never cuts it off.
 */
export default function RowActionMenu({ items, label = 'Row actions' }) {
  const [pos, setPos] = useState(null); // { top, left } when open
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const open = pos !== null;

  function close(returnFocus = false) {
    setPos(null);
    if (returnFocus) buttonRef.current?.focus();
  }

  function toggle() {
    if (open) return close();
    const rect = buttonRef.current.getBoundingClientRect();
    const height = items.length * ITEM_HEIGHT + 16;
    const fitsBelow = rect.bottom + height + 8 <= window.innerHeight;
    setPos({
      top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - height - 4),
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setPos(null);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setPos(null);
        buttonRef.current?.focus();
      }
    }
    const dismiss = () => setPos(null);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    menuRef.current?.querySelector('button:not([disabled])')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);

  function onMenuKeyDown(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = [...menuRef.current.querySelectorAll('button:not([disabled])')];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={onMenuKeyDown}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="z-50 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
              className={`block h-10 w-full px-4 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${item.danger ? 'text-red-700' : 'text-slate-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
