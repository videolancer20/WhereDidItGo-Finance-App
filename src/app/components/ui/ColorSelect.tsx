import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { STANDARD_COLORS } from '../../utils';

export interface ColorSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function ColorSelect({ value, onChange }: ColorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedColor = STANDARD_COLORS.find((c) => c.id === value);
  const displayLabel = selectedColor ? selectedColor.label : 'Default (Grey)';
  const displayBg = selectedColor ? selectedColor.value : 'bg-zinc-500';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${displayBg}`} />
          <span>{displayLabel}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg max-h-60 overflow-auto py-1">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 ${
              !value ? 'bg-zinc-800/50 font-medium text-zinc-200' : 'text-zinc-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-zinc-500" />
            <span>Default (Grey)</span>
          </button>
          
          {STANDARD_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => {
                onChange(color.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 ${
                color.id === value ? 'bg-zinc-800/50 font-medium text-zinc-200' : 'text-zinc-300'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${color.value}`} />
              <span>{color.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
