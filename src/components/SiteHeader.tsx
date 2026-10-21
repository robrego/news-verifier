'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Moon, Newspaper, Sun, Video, Wrench } from 'lucide-react';

export type NavKey = 'news' | 'video' | 'tools';

// Dark mode is remembered across pages in this browser. Storage can be blocked, so every access is guarded.
export function useTheme(): [boolean, (v: boolean) => void] {
  const [isDark, setDark] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('vn-theme') === 'dark') setDark(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const set = (v: boolean) => {
    setDark(v);
    try {
      localStorage.setItem('vn-theme', v ? 'dark' : 'light');
    } catch {
      // ignore
    }
  };
  return [isDark, set];
}

const ITEMS: { key: NavKey; href: string; label: string; Icon: typeof Newspaper; activeLight: string }[] = [
  { key: 'news', href: '/', label: 'News', Icon: Newspaper, activeLight: 'text-blue-700' },
  { key: 'video', href: '/video', label: 'Videos', Icon: Video, activeLight: 'text-purple-700' },
  { key: 'tools', href: '/tools', label: 'Tools', Icon: Wrench, activeLight: 'text-blue-700' },
];

// The same top menu on every page: brand badge, section links, dark mode switch.
export function SiteHeader({ isDark, onToggle, active }: { isDark: boolean; onToggle: () => void; active: NavKey }) {
  return (
    <header className="mb-16 sm:mb-28 flex w-full items-center justify-between gap-4">
      <Link
        href="/"
        className={`font-display whitespace-nowrap text-[15px] font-bold uppercase tracking-[0.12em] ${isDark ? 'text-white' : 'text-slate-900'}`}
      >
        Verify News
      </Link>

      <div className="flex items-center gap-4 sm:gap-8">
        <nav className="flex gap-4 sm:gap-7" aria-label="Sections">
          {ITEMS.map(({ key, href, label, Icon, activeLight }) => {
            const on = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`font-display flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] transition-all sm:text-[13px] ${
                  on
                    ? isDark ? 'text-white' : activeLight
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="hidden h-4 w-4 sm:block" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={onToggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`relative flex h-7 w-12 items-center rounded-full border transition-all duration-500 ${
            isDark ? 'border-white/15 bg-zinc-800' : 'border-slate-300 bg-slate-200'
          }`}
        >
          <span
            className={`absolute flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
              isDark ? 'left-[24px] bg-blue-500 text-white' : 'left-[4px] bg-white text-amber-500'
            }`}
          >
            {isDark ? <Moon className="h-3 w-3" aria-hidden /> : <Sun className="h-3 w-3" aria-hidden />}
          </span>
        </button>
      </div>
    </header>
  );
}
