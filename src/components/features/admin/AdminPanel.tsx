import React, { useState, useEffect } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getTestSets,
  createTestSet,
  updateTestSet,
  deleteTestSet,
  bulkCreateFlashcards,
  getAllUsers,
  updateUserRole,
  Category, 
  TestSet,
  UserProfile
} from '../../../lib/database';
import { csvToFlashcards } from '../../../utils/csvParser';
import { CategoryManagement } from './CategoryManagement';
import { TestSetManagement } from './TestSetManagement';
import { UserManagement } from './UserManagement';
import LanguageManagement from './LanguageManagement';
import { AdminTabs, AdminTab } from './AdminTabs';
import LoadingSpinner from '../../shared/ui/LoadingSpinner';
import ErrorBoundary from '../../shared/ui/ErrorBoundary';
import { useToast } from '../../../hooks/useToast';
import { CategoryFormData, TestSetFormData, UserRole } from '../../../utils/validation';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [categoriesData, testSetsData, usersData] = await Promise.all([
        getCategories(),
        getTestSets(),
        getAllUsers()
      ]);
      
      setCategories(categoriesData);
      setTestSets(testSetsData);
      setUsers(usersData);
    } catch (err) {
      console.error('AdminPanel: Error loading admin data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCreateCategory = async (data: CategoryFormData & { languageId?: string }) => {
    await createCategory(data.name, data.description || '', data.languageId);
    await loadData();
  };

  const handleUpdateCategory = async (id: string, data: CategoryFormData) => {
    await updateCategory(id, data.name, data.description || '');
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    await loadData();
  };

  // Test Set handlers
  const handleCreateTestSet = async (data: TestSetFormData) => {
    await createTestSet(data.categoryId, data.name, data.description || '');
    await loadData();
  };

  const handleUpdateTestSet = async (id: string, data: TestSetFormData) => {
    await updateTestSet(id, data.name, data.description || '');
    await loadData();
  };

  const handleDeleteTestSet = async (id: string) => {
    await deleteTestSet(id);
    await loadData();
  };

  const handleUploadCSV = async (testSetId: string, csvData: string[][]) => {
    const flashcards = csvToFlashcards(csvData);
    await bulkCreateFlashcards(testSetId, flashcards);
    await loadData();
  };

  // User handlers
  const handleUpdateUserRole = async (userId: string, role: UserRole) => {
    await updateUserRole(userId, role);
    await loadData();
  };



  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Admin Panel</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-600">Manage categories, test sets, and users</p>
        </div>

        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'categories' && (
          <CategoryManagement
            categories={categories}
            onRefresh={loadData}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'testsets' && (
          <TestSetManagement
            testSets={testSets}
            categories={categories}
            onRefresh={loadData}
            onCreateTestSet={handleCreateTestSet}
            onUpdateTestSet={handleUpdateTestSet}
            onDeleteTestSet={handleDeleteTestSet}
            onUploadCSV={handleUploadCSV}
          />
        )}

        {activeTab === 'users' && (
          <UserManagement
            users={users}
            onUpdateUserRole={handleUpdateUserRole}
          />
        )}

        {activeTab === 'languages' && (
          <LanguageManagement />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AdminPanel;