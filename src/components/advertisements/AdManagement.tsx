import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  BarChart3, 
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Image,
  Code,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { 
  Advertisement, 
  AdvertisementAnalytics,
  getAllAdvertisements, 
  createAdvertisement, 
  updateAdvertisement, 
  deleteAdvertisement,
  getAdvertisementAnalytics
} from '../../lib/advertisements';
import AdFormModal from './AdFormModal';

const AdManagement: React.FC = () => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [analytics, setAnalytics] = useState<AdvertisementAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [selectedAdForAnalytics, setSelectedAdForAnalytics] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlacement, setFilterPlacement] = useState<string>('all');

  useEffect(() => {
    loadAdvertisements();
    loadAnalytics();
  }, []);

  const loadAdvertisements = async () => {
    try {
      setLoading(true);
      setError(null);
      const ads = await getAllAdvertisements();
      setAdvertisements(ads);
    } catch (err) {
      console.error('Error loading advertisements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await getAdvertisementAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      // Don't show error to user for analytics loading failures
      // as the main functionality still works without analytics
      setAnalytics([]);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleCreateAd = async (adData: Omit<Advertisement, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await createAdvertisement(adData);
      showSuccess('Advertisement created successfully');
      setShowCreateModal(false);
      loadAdvertisements();
      loadAnalytics();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create advertisement');
    }
  };

  const handleUpdateAd = async (id: string, updates: Partial<Advertisement>) => {
    try {
      await updateAdvertisement(id, updates);
      showSuccess('Advertisement updated successfully');
      setEditingAd(null);
      loadAdvertisements();
      loadAnalytics();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update advertisement');
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteAdvertisement(id);
      showSuccess('Advertisement deleted successfully');
      loadAdvertisements();
      loadAnalytics();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete advertisement');
    }
  };

  const toggleAdStatus = async (ad: Advertisement) => {
    await handleUpdateAd(ad.id, { is_active: !ad.is_active });
  };

  const filteredAdvertisements = advertisements.filter(ad => {
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'active' && ad.is_active) ||
      (filterStatus === 'inactive' && !ad.is_active);
    
    const placementMatch = filterPlacement === 'all' || ad.placement === filterPlacement;
    
    return statusMatch && placementMatch;
  });

  const getAdAnalytics = (adId: string) => {
    return analytics.find(a => a.advertisement_id === adId);
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getPlacementLabel = (placement: string) => {
    const labels: Record<string, string> = {
      'header': 'Header',
      'footer': 'Footer',
      'sidebar_left': 'Left Sidebar',
      'sidebar_right': 'Right Sidebar',
      'content': 'Content Area',
      'modal': 'Modal/Popup',
      'between_sessions': 'Between Sessions',
      'after_practice': 'After Practice',
      'category_list': 'Category List'
    };
    return labels[placement] || placement;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'banner': 'Banner',
      'block': 'Block',
      'popover': 'Popover'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="text-gray-600">Loading advertisements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Advertisement Management</h1>
            <p className="text-gray-600">Manage advertisements and track their performance</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span>View Analytics</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Advertisement</span>
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filterPlacement}
            onChange={(e) => setFilterPlacement(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Placements</option>
            <option value="header">Header</option>
            <option value="footer">Footer</option>
            <option value="sidebar_left">Left Sidebar</option>
            <option value="sidebar_right">Right Sidebar</option>
            <option value="content">Content Area</option>
            <option value="modal">Modal/Popup</option>
            <option value="between_sessions">Between Sessions</option>
            <option value="after_practice">After Practice</option>
            <option value="category_list">Category List</option>
          </select>
        </div>
      </div>

      {/* Advertisements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Advertisement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Placement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status & Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAdvertisements.map((ad) => {
              const adAnalytics = getAdAnalytics(ad.id);
              return (
                <tr key={ad.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {ad.image_url ? (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {ad.content_html ? (
                              <Code className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Image className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{ad.title}</div>
                        <div className="text-sm text-gray-500">
                          {ad.width} × {ad.height}px
                        </div>
                        {ad.click_url && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <ExternalLink className="h-3 w-3" />
                            <span>Has click URL</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getTypeLabel(ad.type)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getPlacementLabel(ad.placement)}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {ad.device_compatibility.map((device) => (
                          <div key={device} className="text-gray-400">
                            {getDeviceIcon(device)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ad.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ad.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {ad.start_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          Start: {new Date(ad.start_date).toLocaleDateString()}
                        </div>
                      )}
                      {ad.end_date && (
                        <div className="text-xs text-gray-500">
                          End: {new Date(ad.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {adAnalytics ? (
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          {adAnalytics.total_impressions.toLocaleString()} impressions
                        </div>
                        <div className="text-gray-500">
                          {adAnalytics.total_clicks} clicks ({adAnalytics.click_through_rate}% CTR)
                        </div>
                        <div className="text-gray-500">
                          {adAnalytics.unique_users} unique users
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No data</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => toggleAdStatus(ad)}
                        className={`p-2 rounded-lg transition-colors ${
                          ad.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={ad.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {ad.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdForAnalytics(ad.id);
                          setShowAnalyticsModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingAd(ad)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAdvertisements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No advertisements found</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Create your first advertisement
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAd) && (
        <AdFormModal
          advertisement={editingAd}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAd(null);
          }}
          onSubmit={editingAd ? 
            (data) => handleUpdateAd(editingAd.id, data) :
            handleCreateAd
          }
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <AnalyticsModal
          advertisementId={selectedAdForAnalytics}
          analytics={analytics}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedAdForAnalytics(null);
          }}
        />
      )}
    </div>
  );
};


// Analytics Modal Component (simplified for brevity)
const AnalyticsModal: React.FC<{
  advertisementId?: string | null;
  analytics: AdvertisementAnalytics[];
  onClose: () => void;
}> = ({ advertisementId, analytics, onClose }) => {
  const relevantAnalytics = advertisementId 
    ? analytics.filter(a => a.advertisement_id === advertisementId)
    : analytics;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Advertisement Analytics</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Analytics content would go here */}
        <div className="space-y-6">
          {relevantAnalytics.map((analytic) => (
            <div key={analytic.advertisement_id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">{analytic.advertisement_title}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytic.total_impressions.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Impressions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytic.total_clicks}</div>
                  <div className="text-sm text-gray-600">Clicks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{analytic.click_through_rate}%</div>
                  <div className="text-sm text-gray-600">CTR</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{analytic.unique_users}</div>
                  <div className="text-sm text-gray-600">Unique Users</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdManagement;