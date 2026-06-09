import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CustomSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  hideArrow?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  hideArrow = false,
}: CustomSelectProps) {
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

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors ${
          hideArrow ? 'justify-center' : 'justify-between'
        }`}
      >
        <span className={selectedOption ? 'text-zinc-200' : 'text-zinc-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {!hideArrow && (
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-zinc-800 ${
                option.value === value
                  ? 'bg-zinc-800/50 text-emerald-400 font-medium'
                  : 'text-zinc-300'
              }`}
            >
              {option.label}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500 text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
