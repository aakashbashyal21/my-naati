import React from 'react';
import { Eye, CheckCircle, AlertCircle } from 'lucide-react';

interface CSVPreviewProps {
  csvData: string[][];
  onConfirm: () => void;
  onCancel: () => void;
}

const CSVPreview: React.FC<CSVPreviewProps> = ({ csvData, onConfirm, onCancel }) => {
  const validRows = csvData.filter(row => row.length >= 2 && row[0] && row[1]);
  const previewRows = validRows.slice(0, 5);
  const hasMoreRows = validRows.length > 5;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Eye className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">CSV Preview</h2>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              {validRows.length} valid flashcard pairs found
            </span>
          </div>
          
          {csvData.length !== validRows.length && (
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                {csvData.length - validRows.length} rows skipped (missing data)
              </span>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  English
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Translation
                </th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                    {row[0].replace(/^"|"$/g, '')}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                    {row[1].replace(/^"|"$/g, '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {hasMoreRows && (
            <div className="text-center mt-4 text-sm text-gray-600">
              ... and {validRows.length - 5} more rows
            </div>
          )}
        </div>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Learning ({validRows.length} cards)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSVPreview;