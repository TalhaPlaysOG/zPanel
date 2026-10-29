import React from 'react';
import { Terminal } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="pb-6 mb-6 border-b border-[rgba(139,92,246,0.18)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {subtitle && (
            <p className="font-mono text-xs text-[#a78bfa] tracking-[0.2em] flex items-center gap-2 mb-1.5 uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {subtitle}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f0f4ff]">
            {title}
          </h1>
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
