import React, { useState } from 'react';
import { Download, FileText, Database, Image, Loader2 } from 'lucide-react';

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  dateRange?: {
    start: string;
    end: string;
  };
  includeAnalytics?: boolean;
  includeProgress?: boolean;
  includeAchievements?: boolean;
}

interface DataExportProps {
  data: any;
  filename: string;
  onExport?: (options: ExportOptions) => Promise<void>;
  className?: string;
}

const DataExport: React.FC<DataExportProps> = ({
  data,
  filename,
  onExport,
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAnalytics: true,
    includeProgress: true,
    includeAchievements: false
  });

  const handleExport = async (format: ExportOptions['format']) => {
    setIsExporting(true);
    
    try {
      const options = { ...exportOptions, format };
      
      if (onExport) {
        await onExport(options);
      } else {
        await defaultExport(options);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowOptions(false);
    }
  };

  const defaultExport = async (options: ExportOptions) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = `${filename}-${timestamp}`;

    switch (options.format) {
      case 'json':
        exportJSON(data, exportFilename);
        break;
      case 'csv':
        exportCSV(data, exportFilename);
        break;
      case 'xlsx':
        // Would require a library like xlsx
        console.warn('XLSX export not implemented');
        break;
      case 'pdf':
        // Would require a library like jsPDF
        console.warn('PDF export not implemented');
        break;
    }
  };

  const exportJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    downloadBlob(blob, `${filename}.json`);
  };

  const exportCSV = (data: any, filename: string) => {
    let csvContent = '';
    
    if (Array.isArray(data)) {
      if (data.length > 0) {
        // Use first object keys as headers
        const headers = Object.keys(data[0]);
        csvContent = headers.join(',') + '\n';
        
        // Add data rows
        csvContent += data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ).join('\n');
      }
    } else if (typeof data === 'object') {
      // Convert object to key-value CSV
      csvContent = 'Key,Value\n';
      csvContent += Object.entries(data)
        .map(([key, value]) => `${key},"${value}"`)
        .join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `${filename}.csv`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFormats = [
    { 
      format: 'csv' as const, 
      label: 'CSV', 
      icon: FileText, 
      description: 'Comma-separated values for spreadsheets' 
    },
    { 
      format: 'json' as const, 
      label: 'JSON', 
      icon: Database, 
      description: 'JavaScript Object Notation for developers' 
    },
    { 
      format: 'xlsx' as const, 
      label: 'Excel', 
      icon: FileText, 
      description: 'Microsoft Excel format' 
    },
    { 
      format: 'pdf' as const, 
      label: 'PDF', 
      icon: Image, 
      description: 'Portable Document Format' 
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
      </button>

      {showOptions && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Export Options</h3>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {exportFormats.map(({ format, label, icon: Icon, description }) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={exportOptions.dateRange?.start || ''}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      start: e.target.value,
                      end: prev.dateRange?.end || ''
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="date"
                  value={exportOptions.dateRange?.end || ''}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    dateRange: {
                      start: prev.dateRange?.start || '',
                      ...prev.dateRange,
                      end: e.target.value
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Include Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Data
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAnalytics}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeAnalytics: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Analytics Data</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeProgress}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeProgress: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Progress Data</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAchievements}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeAchievements: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Achievements</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowOptions(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExport;