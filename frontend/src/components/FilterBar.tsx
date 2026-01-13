import { useState } from 'react';

interface FilterBarProps {
  onFilter: (filters: { from?: string; to?: string; hash?: string }) => void;
  onClear: () => void;
}

export function FilterBar({ onFilter, onClear }: FilterBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'hash' | 'from' | 'to'>('hash');

  const handleSearch = () => {
    if (!searchValue.trim()) {
      onClear();
      return;
    }

    const filters: { from?: string; to?: string; hash?: string } = {};
    if (searchType === 'hash') {
      filters.hash = searchValue.trim();
    } else if (searchType === 'from') {
      filters.from = searchValue.trim();
    } else {
      filters.to = searchValue.trim();
    }

    onFilter(filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchValue('');
    onClear();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={searchType}
        onChange={(e) => setSearchType(e.target.value as 'hash' | 'from' | 'to')}
        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
      >
        <option value="hash">Transaction Hash</option>
        <option value="from">From Address</option>
        <option value="to">To Address</option>
      </select>

      <div className="flex-1 flex gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Search by ${searchType}...`}
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
        />

        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>

        {searchValue && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
