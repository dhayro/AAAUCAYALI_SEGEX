import { useState } from "react";
import Label from "@/components/form/Label";

type Props = {
  label?: string;
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function DatePickerLima({
  label,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled = false,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleDateSelect = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(dateStr);
    setShowPicker(false);
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (value) {
              const [y, m] = value.split("-");
              setYear(parseInt(y));
              setMonth(parseInt(m) - 1);
            }
            setShowPicker(!showPicker);
          }}
          disabled={disabled}
          className="w-full rounded border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-base text-start hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {value ? formatDisplay(value) : placeholder}
        </button>

        {showPicker && !disabled && (
          <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                ←
              </button>
              <div className="flex gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map(d => (
                <div key={d} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getFirstDayOfMonth(year, month) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = value === dateStr;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`p-2 text-sm rounded text-center ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="w-full mt-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
