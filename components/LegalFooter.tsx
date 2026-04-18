// components/LegalFooter.tsx
import Link from "next/link";
import { cityHref } from "@/lib/cityRouting";

interface LegalFooterProps {
  className?: string;
}

export default function LegalFooter({ className = "" }: LegalFooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`border-t border-slate-200 bg-slate-50 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Powered by CiviPortal with logo */}
          <a 
            href="https://civiportal.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <span>Powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/civiportal-logo.png"
              alt=""
              className="h-7 w-7 object-contain"
            />
            <span className="font-semibold text-slate-700">CiviPortal</span>
            <span className="sr-only">(opens in new tab)</span>
          </a>
          
          {/* Resource links */}
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Link href={cityHref("/taxpayer-receipt")} className="hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
              Taxpayer receipt
            </Link>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <Link href={cityHref("/glossary")} className="hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
              Glossary
            </Link>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <Link href={cityHref("/about")} className="hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
              About this data
            </Link>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span suppressHydrationWarning>© {currentYear} CiviPortal LLC</span>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <Link href="/terms" className="hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
              Terms
            </Link>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <Link href="/privacy" className="hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
