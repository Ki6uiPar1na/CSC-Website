import { Search, X } from "lucide-react";

interface SearchBoxProps {
  query: string;
  setQuery: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({ query, setQuery, placeholder = "Search...", className = "" }: SearchBoxProps) {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full group-focus-within:bg-primary/20 transition-all duration-500 opacity-0 group-focus-within:opacity-100"></div>
      <div className="relative flex items-center bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-md focus-within:border-primary/50 transition-all duration-300">
        <Search className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm outline-none px-3"
        />
        {query && (
          <button 
            onClick={() => setQuery("")}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
