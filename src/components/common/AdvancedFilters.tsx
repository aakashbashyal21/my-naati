import React, { useState } from 'react';
import { Filter, X, Calendar, Search, Tag, BarChart3 } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'range' | 'search';
  options?: { value: string; label: string }[];
  value?: any;
}

interface AdvancedFiltersProps {
  filters: FilterOption[];
  onFiltersChange: (filters: FilterOption[]) => void;
  onReset: () => void;
  className?: string;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const updateFilter = (filterId: string, value: any) => {
    const updatedFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, value } : filter
    );
    onFiltersChange(updatedFilters);
  };

  const getActiveFilterCount = () => {
    return filters.filter(filter => {
      if (Array.isArray(filter.value)) {
        return filter.value.length > 0;
      }
      return filter.value !== undefined && filter.value !== '' && filter.value !== null;
    }).length;
  };

  const renderFilterInput = (filter: FilterOption) => {
    switch (filter.type) {
      case 'search':
        return (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filter.value || ''}
              onChange={(e) => updateFilter(filter.id, e.target.value)}
              placeholder={`Search ${filter.label.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {filter.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(filter.value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = filter.value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: string) => v !== option.value);
                    updateFilter(filter.id, newValues);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filter.value?.start || ''}
              onChange={(e) => updateFilter(filter.id, {
                ...filter.value,
                start: e.target.value
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={filter.value?.end || ''}
              onChange={(e) => updateFilter(filter.id, {
                ...filter.value,
                end: e.target.value
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={filter.value?.min || ''}
                onChange={(e) => updateFilter(filter.id, {
                  ...filter.value,
                  min: e.target.value
                })}
                placeholder="Min"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                value={filter.value?.max || ''}
                onChange={(e) => updateFilter(filter.id, {
                  ...filter.value,
                  max: e.target.value
                })}
                placeholder="Max"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`relative ${className}`}>
      {/* Filter Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="h-4 w-4 text-gray-600" />
        <span className="text-gray-700">Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filters
            .filter(filter => {
              if (Array.isArray(filter.value)) {
                return filter.value.length > 0;
              }
              return filter.value !== undefined && filter.value !== '' && filter.value !== null;
            })
            .map(filter => (
              <span
                key={filter.id}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                <Tag className="h-3 w-3" />
                <span>{filter.label}: {
                  Array.isArray(filter.value) 
                    ? filter.value.length + ' selected'
                    : typeof filter.value === 'object'
                    ? `${filter.value.start || 'Any'} - ${filter.value.end || 'Any'}`
                    : filter.value
                }</span>
                <button
                  onClick={() => updateFilter(filter.id, undefined)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          <button
            onClick={onReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-6">
              {filters.map(filter => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {filter.label}
                  </label>
                  {renderFilterInput(filter)}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={onReset}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;