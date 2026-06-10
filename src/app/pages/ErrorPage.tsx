import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router";
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from "lucide-react";

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Something went wrong";
  let message = "See I told you! You fucked it up again you dumb fuck. You gwak gwak suckkkkkkkk!\nFix this shit";
  let details = "";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page Not Found";
      message = "We couldn't find the page you're looking for.";
    } else {
      title = `${error.status} Error`;
      message = error.statusText || message;
      if (error.data) {
        details = typeof error.data === 'string' ? error.data : JSON.stringify(error.data);
      }
    }
  } else if (error instanceof Error) {
    message = error.message;
    details = error.stack || "";
  } else if (typeof error === 'string') {
    message = error;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-rose-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-2 shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)]">
            <AlertTriangle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-100">{title}</h1>
            <p className="text-zinc-400 whitespace-pre-wrap">{message}</p>
          </div>

          {details && (
            <div className="w-full mt-4 text-left">
              <details className="group cursor-pointer">
                <summary className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider mb-2 select-none">
                  View Error Details
                </summary>
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 overflow-x-auto max-h-40 custom-scrollbar">
                  <pre className="text-[10px] text-rose-400/80 font-mono whitespace-pre-wrap break-words">
                    {details}
                  </pre>
                </div>
              </details>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-4">
            <button 
              onClick={() => navigate(-1)} 
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
