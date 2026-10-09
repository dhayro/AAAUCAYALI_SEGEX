import { useState, useRef, useEffect } from "react";
import Label from "./Label";

type Props = {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ id: string | number; nombre: string; [key: string]: any }>;
  onSearch: (term: string) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
};

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  onSearch,
  placeholder = "Buscar...",
  isLoading = false,
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length > 0) {
      await onSearch(term);
    }
  };

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <div ref={containerRef} className="relative">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : selectedOption?.nombre || ""}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 text-sm disabled:opacity-50"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? "Buscando..." : "Sin resultados"}
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === option.id
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                    : "hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                {option.nombre}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
