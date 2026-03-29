'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-black text-xl tracking-tighter hover:opacity-70 transition-opacity">
          VERIFY<span className="text-blue-600">.</span>
        </Link>

        <nav className="flex items-center gap-8">
          <Link 
            href="/" 
            className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all ${
              pathname === '/' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            News
          </Link>
          <Link 
            href="/video" 
            className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all ${
              pathname.includes('/video') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            Videos
          </Link>
        </nav>
      </div>
    </header>
  );
}