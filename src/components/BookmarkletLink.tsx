'use client';

import { useEffect, useRef } from 'react';

// React refuses javascript: URLs passed as props, so the href is set on the element directly.
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const origin = window.location.origin;
    const code =
      `(function(){var t=String(window.getSelection?window.getSelection():'').trim();` +
      `window.open('${origin}/?q='+encodeURIComponent((t||location.href).slice(0,1800)),'_blank');})()`;
    ref.current?.setAttribute('href', 'javascript:' + code);
  }, []);

  return (
    <a
      ref={ref}
      href="#"
      onClick={(e) => {
        // A click here would run the bookmarklet on this page, which is pointless: explain instead.
        e.preventDefault();
      }}
      draggable
      className="inline-block cursor-grab rounded-2xl bg-slate-950 px-6 py-4 text-[13px] font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-blue-500/10 hover:bg-blue-600 active:cursor-grabbing"
    >
      Verify this page
    </a>
  );
}
