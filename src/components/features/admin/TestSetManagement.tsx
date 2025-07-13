import React, { useState, useEffect } from 'react';
import { FileText, Edit3, Trash2, Plus, Upload } from 'lucide-react';
import { TestSet, Category, getActiveLanguages } from '../../../lib/database';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { useToast } from '../../../hooks/useToast';
import { useLanguage } from '../../../contexts/LanguageContext';
import { testSetFormSchema, TestSetFormData } from '../../../utils/validation';
import { sanitizeInput } from '../../../utils/sanitization';
import { Language } from '../../../types/language';

interface TestSetManagementProps {
  testSets: TestSet[];
  categories: Category[];
  onRefresh: () => void;
  onCreateTestSet: (data: TestSetFormData) => Promise<void>;
  onUpdateTestSet: (id: string, data: TestSetFormData) => Promise<void>;
  onDeleteTestSet: (id: string) => Promise<void>;
  onUploadCSV: (testSetId: string, csvData: string[][]) => Promise<void>;
}

export const TestSetManagement: React.FC<TestSetManagementProps> = ({
  testSets,
  categories,
  onRefresh,
  onCreateTestSet,
  onUpdateTestSet,
  onDeleteTestSet,
  onUploadCSV
}) => {
  const [showTestSetModal, setShowTestSetModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTestSet, setEditingTestSet] = useState<TestSet | null>(null);
  const [formData, setFormData] = useState<TestSetFormData>({ categoryId: '', name: '', description: '' });
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [selectedTestSetForUpload, setSelectedTestSetForUpload] = useState<string>('');
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filteredTestSets, setFilteredTestSets] = useState<TestSet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { showToast } = useToast();
  const { selectedLanguageId: userSelectedLanguageId } = useLanguage();

  // Load languages on component mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const activeLanguages = await getActiveLanguages();
        setLanguages(activeLanguages);
        // Default to user's selected language if available, otherwise first language
        if (activeLanguages.length > 0 && !selectedLanguageId) {
          const userLanguage = activeLanguages.find(lang => lang.id === userSelectedLanguageId);
          setSelectedLanguageId(userLanguage?.id || activeLanguages[0]?.id || '');
        }
      } catch (error) {
        showToast('Failed to load languages', 'error');
      }
    };
    loadLanguages();
  }, [userSelectedLanguageId]);

  // Filter categories and test sets by selected language
  useEffect(() => {
    if (selectedLanguageId) {
      const filtered = categories.filter(cat => cat.language_id === selectedLanguageId);
      setFilteredCategories(filtered);
      
      const filteredTestSets = testSets.filter(ts => ts.language_id === selectedLanguageId);
      setFilteredTestSets(filteredTestSets);
    } else {
      setFilteredCategories(categories);
      setFilteredTestSets(testSets);
    }
  }, [selectedLanguageId, categories, testSets]);

  const resetForm = () => {
    setFormData({ categoryId: '', name: '', description: '' });
    setErrors({});
    setEditingTestSet(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowTestSetModal(true);
  };

  const openEditModal = (testSet: TestSet) => {
    setFormData({
      categoryId: testSet.category_id,
      name: testSet.name,
      description: testSet.description || ''
    });
    setEditingTestSet(testSet);
    setShowTestSetModal(true);
  };

  const validateForm = (): boolean => {
    try {
      testSetFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof Error) {
        const zodError = error as any;
        const newErrors: Record<string, string> = {};
        zodError.errors?.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleTestSetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedData = {
        categoryId: formData.categoryId,
        name: sanitizeInput(formData.name),
        description: formData.description ? sanitizeInput(formData.description) : ''
      };

      if (editingTestSet) {
        await onUpdateTestSet(editingTestSet.id, sanitizedData);
        showToast('Test set updated successfully', 'success');
      } else {
        await onCreateTestSet(sanitizedData);
        showToast('Test set created successfully', 'success');
      }
      
      setShowTestSetModal(false);
      resetForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test set? This will also delete all associated flashcards.')) {
      return;
    }

    try {
      await onDeleteTestSet(id);
      showToast('Test set deleted successfully', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete test set', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const lines = csvText.split('\n').map(line => line.split(',').map(cell => cell.trim()));
      setCsvData(lines.filter(line => line.length >= 2 && line[0] && line[1]));
    };
    reader.readAsText(file);
  };

  const handleUploadFlashcards = async () => {
    if (!selectedTestSetForUpload || csvData.length === 0) return;
    
    try {
      await onUploadCSV(selectedTestSetForUpload, csvData);
      showToast(`Successfully uploaded ${csvData.length} flashcards`, 'success');
      setCsvData([]);
      setSelectedTestSetForUpload('');
      setShowUploadModal(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload flashcards', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Test Sets</h2>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="primary"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
          <Button
            onClick={openCreateModal}
            variant="primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Test Set
          </Button>
        </div>
      </div>

      {/* Language Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Language
        </label>
        <select
          value={selectedLanguageId}
          onChange={(e) => setSelectedLanguageId(e.target.value)}
          className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">All Languages</option>
          {languages.map((language) => (
            <option key={language.id} value={language.id}>
              {language.flag_emoji} {language.name} ({language.code})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cards
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTestSets.map((testSet) => (
              <tr key={testSet.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{testSet.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-600">{testSet.category?.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-600">{testSet.flashcard_count}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(testSet.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      onClick={() => openEditModal(testSet)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(testSet.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Test Set Modal */}
      {showTestSetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTestSet ? 'Edit Test Set' : 'Create Test Set'}
            </h3>
            <form onSubmit={handleTestSetSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.categoryId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                    disabled={!!editingTestSet}
                  >
                    <option value="">Select a category</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-red-600 text-sm mt-1">{errors.categoryId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  onClick={() => setShowTestSetModal(false)}
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                >
                  {editingTestSet ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Upload CSV Flashcards</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Set
                </label>
                <select
                  value={selectedTestSetForUpload}
                  onChange={(e) => setSelectedTestSetForUpload(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a test set</option>
                  {filteredTestSets.map((testSet) => (
                    <option key={testSet.id} value={testSet.id}>
                      {testSet.category?.name} - {testSet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: English, Translation (one pair per row)
                </p>
              </div>
              {csvData.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Preview: {csvData.length} flashcard pairs loaded
                  </p>
                  <div className="mt-2 text-xs text-gray-600">
                    <div>First pair: {csvData[0]?.[0]} → {csvData[0]?.[1]}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setCsvData([]);
                  setSelectedTestSetForUpload('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadFlashcards}
                disabled={!selectedTestSetForUpload || csvData.length === 0}
                variant="primary"
              >
                Upload Flashcards
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 