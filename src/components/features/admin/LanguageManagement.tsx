import React, { useState, useEffect } from 'react';
import { 
  getAllLanguages, 
  createLanguage, 
  updateLanguage, 
  deleteLanguage,
  Language 
} from '../../../lib/database';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { useToast } from '../../../hooks/useToast';
import { LanguageFormData } from '../../../types/language';

const LanguageManagement: React.FC = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [formData, setFormData] = useState<LanguageFormData>({
    code: '',
    name: '',
    native_name: '',
    flag_emoji: '',
    is_active: true
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const data = await getAllLanguages();
      setLanguages(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load languages';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      showToast('Language code and name are required', 'error');
      return;
    }

    try {
      if (editingLanguage) {
        await updateLanguage(editingLanguage.id, formData);
        showToast('Language updated successfully', 'success');
      } else {
        await createLanguage(formData);
        showToast('Language created successfully', 'success');
      }
      
      setShowForm(false);
      setEditingLanguage(null);
      resetForm();
      loadLanguages();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save language';
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      code: language.code,
      name: language.name,
      native_name: language.native_name || '',
      flag_emoji: language.flag_emoji || '',
      is_active: language.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (language: Language) => {
    if (!confirm(`Are you sure you want to delete ${language.name}? This will also delete all associated categories, test sets, and flashcards.`)) {
      return;
    }

    try {
      await deleteLanguage(language.id);
      showToast('Language deleted successfully', 'success');
      loadLanguages();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete language';
      showToast(errorMessage, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      native_name: '',
      flag_emoji: '',
      is_active: true
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLanguage(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading languages...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Language Management</h2>
        <Button
          onClick={() => setShowForm(true)}
          variant="primary"
          disabled={showForm}
        >
          Add New Language
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">
            {editingLanguage ? 'Edit Language' : 'Add New Language'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language Code *
                </label>
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., ne, es, hi"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  ISO language code (2-3 characters)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Nepali, Spanish, Hindi"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Native Name
                </label>
                <Input
                  type="text"
                  value={formData.native_name}
                  onChange={(e) => setFormData({ ...formData, native_name: e.target.value })}
                  placeholder="e.g., नेपाली, Español, हिन्दी"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flag Emoji
                </label>
                <Input
                  type="text"
                  value={formData.flag_emoji}
                  onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })}
                  placeholder="e.g., 🇳🇵, 🇪🇸, 🇮🇳"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active (available to users)
              </label>
            </div>

            <div className="flex space-x-3">
              <Button type="submit" variant="primary">
                {editingLanguage ? 'Update Language' : 'Create Language'}
              </Button>
              <Button type="button" onClick={handleCancel} variant="secondary">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Languages ({languages.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Native Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {languages.map((language) => (
                <tr key={language.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{language.flag_emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {language.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {language.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {language.native_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      language.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {language.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(language.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => handleEdit(language)}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(language)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {languages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No languages found. Create your first language to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageManagement; 