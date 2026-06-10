import { useState } from "react";
import { createPortal } from "react-dom";
import { vaultTemplates } from "../data/vaultTemplates";
import * as Icons from "lucide-react";
import { X, ChevronRight, Check } from "lucide-react";

interface VaultSetupWizardProps {
  onClose: () => void;
  onConfirm: (templateId: string, withDemoData?: boolean) => void;
  vaultName: string;
}

export function VaultSetupWizard({ onClose, onConfirm, vaultName }: VaultSetupWizardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 bg-zinc-900/40 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Setup Vault: {vaultName}</h2>
            <p className="text-sm text-zinc-400 mt-1">Choose a template to automatically configure your categories and accounts.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {vaultTemplates.map(template => {
              const Icon = (Icons as any)[template.icon] || Icons.LayoutTemplate;
              const isSelected = selectedTemplate === template.id;
              
              return (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`relative p-5 rounded-xl border transition-all cursor-pointer flex flex-col h-full ${
                    isSelected 
                      ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                      : "bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/50"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 text-indigo-400 bg-indigo-500/20 p-1 rounded-full">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    isSelected ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <h3 className={`font-semibold mb-2 ${isSelected ? "text-indigo-300" : "text-zinc-200"}`}>
                    {template.name}
                  </h3>
                  
                  <p className="text-xs text-zinc-500 leading-relaxed flex-1">
                    {template.description}
                  </p>
                  
                  {(template.accounts.length > 0 || template.categories.length > 0) ? (
                    <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-4 text-xs font-medium text-zinc-400">
                      <span className="flex items-center gap-1.5"><Icons.Landmark className="w-3.5 h-3.5"/> {template.accounts.length}</span>
                      <span className="flex items-center gap-1.5"><Icons.Tags className="w-3.5 h-3.5"/> {template.categories.length}</span>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center text-xs font-medium text-zinc-500">
                      Completely Empty
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <button 
            onClick={() => onConfirm("blank", false)}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Start with Blank Canvas
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => onConfirm("default")}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Skip
            </button>
            <button 
              onClick={() => onConfirm(selectedTemplate)}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              Create Vault <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
