import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Calendar, 
  Globe, 
  Monitor, 
  Smartphone, 
  Tablet,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Link,
  Type,
  Settings,
  Target,
  Clock,
  Star
} from 'lucide-react';
import { Advertisement } from '../../lib/advertisements';

interface AdFormModalProps {
  advertisement?: Advertisement | null;
  onClose: () => void;
  onSubmit: (data: Omit<Advertisement, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const AdFormModal: React.FC<AdFormModalProps> = ({ advertisement, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(advertisement?.image_url || null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    title: advertisement?.title || '',
    description: '', // New field for description
    type: advertisement?.type || 'banner' as const,
    placement: advertisement?.placement || 'header' as const,
    content_html: advertisement?.content_html || '',
    image_url: advertisement?.image_url || '',
    click_url: advertisement?.click_url || '',
    width: advertisement?.width || 300,
    height: advertisement?.height || 250,
    is_active: advertisement?.is_active ?? true,
    start_date: advertisement?.start_date ? new Date(advertisement.start_date).toISOString().slice(0, 16) : '',
    end_date: advertisement?.end_date ? new Date(advertisement.end_date).toISOString().slice(0, 16) : '',
    target_audience: advertisement?.target_audience || {},
    device_compatibility: advertisement?.device_compatibility || ['desktop', 'mobile', 'tablet'],
    display_duration: advertisement?.display_duration || 0,
    priority: advertisement?.priority || 1,
    max_impressions_per_user: advertisement?.max_impressions_per_user || 0,
    max_impressions_per_day: advertisement?.max_impressions_per_day || 0
  });

  const bannerTypes = [
    { value: 'banner', label: 'Horizontal Banner', description: 'Wide horizontal advertisement' },
    { value: 'block', label: 'Vertical Block', description: 'Square or rectangular block' },
    { value: 'popover', label: 'Square Popover', description: 'Modal overlay advertisement' }
  ];

  const placements = [
    { value: 'header', label: 'Header', description: 'Top of the page' },
    { value: 'footer', label: 'Footer', description: 'Bottom of the page' },
    { value: 'sidebar_left', label: 'Left Sidebar', description: 'Left side of content' },
    { value: 'sidebar_right', label: 'Right Sidebar', description: 'Right side of content' },
    { value: 'content', label: 'Content Area', description: 'Within main content' },
    { value: 'modal', label: 'Modal/Popup', description: 'Overlay modal' },
    { value: 'between_sessions', label: 'Between Sessions', description: 'Between study sessions' },
    { value: 'after_practice', label: 'After Practice', description: 'After practice completion' },
    { value: 'category_list', label: 'Category List', description: 'In category listings' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleDeviceToggle = (device: string) => {
    setFormData(prev => ({
      ...prev,
      device_compatibility: prev.device_compatibility.includes(device)
        ? prev.device_compatibility.filter(d => d !== device)
        : [...prev.device_compatibility, device]
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setFormData(prev => ({ ...prev, image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (formData.title.length > 100) {
      setError('Title must be 100 characters or less');
      return false;
    }
    if (!formData.click_url.trim()) {
      setError('Target URL is required');
      return false;
    }
    try {
      new URL(formData.click_url);
    } catch {
      setError('Please enter a valid URL');
      return false;
    }
    if (!formData.start_date) {
      setError('Start date is required');
      return false;
    }
    if (!formData.end_date) {
      setError('End date is required');
      return false;
    }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('End date must be after start date');
      return false;
    }
    if (formData.device_compatibility.length === 0) {
      setError('At least one device type must be selected');
      return false;
    }
    if (!formData.image_url && !formData.content_html) {
      setError('Either an image or HTML content is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      };
      
      await onSubmit(submitData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save advertisement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {advertisement ? 'Edit Advertisement' : 'Create New Advertisement'}
              </h2>
              <p className="text-purple-100 text-sm">
                Fill out all required fields to create your advertisement
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Type className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter a clear, descriptive title for your advertisement"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Provide detailed information about your advertisement"
                    rows={3}
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(formData.description || '').length}/500 characters
                  </p>
                </div>

                {/* Banner Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Type <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {bannerTypes.map((type) => (
                      <label key={type.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Target URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="url"
                      value={formData.click_url}
                      onChange={(e) => handleInputChange('click_url', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Timing */}
            <div className="bg-blue-50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Calendar className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Schedule & Timing</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="bg-green-50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <ImageIcon className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">Image Upload</h3>
              </div>
              
              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive 
                      ? 'border-green-500 bg-green-100' 
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, image_url: '' }));
                        }}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          Drop your image here, or{' '}
                          <label className="text-green-600 hover:text-green-700 cursor-pointer">
                            browse
                            <input
                              type="file"
                              accept="image/jpeg,image/png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported formats: JPG, PNG • Max size: 2MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 300)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      min="50"
                      max="1200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 250)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      min="50"
                      max="800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Display Location */}
            <div className="bg-yellow-50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Target className="h-6 w-6 text-yellow-600" />
                <h3 className="text-xl font-semibold text-gray-900">Display Location</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {placements.map((placement) => (
                  <label key={placement.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="placement"
                      value={placement.value}
                      checked={formData.placement === placement.value}
                      onChange={(e) => handleInputChange('placement', e.target.value)}
                      className="text-yellow-600 focus:ring-yellow-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{placement.label}</div>
                      <div className="text-xs text-gray-500">{placement.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Settings & Configuration */}
            <div className="bg-indigo-50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Settings className="h-6 w-6 text-indigo-600" />
                <h3 className="text-xl font-semibold text-gray-900">Settings & Configuration</h3>
              </div>
              
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="status"
                        checked={formData.is_active}
                        onChange={() => handleInputChange('is_active', true)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-green-700 font-medium">Active</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="status"
                        checked={!formData.is_active}
                        onChange={() => handleInputChange('is_active', false)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-red-700 font-medium">Inactive</span>
                    </label>
                  </div>
                </div>

                {/* Priority Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-bold text-lg text-indigo-600">{formData.priority}</span>
                      <span className="text-sm text-gray-500">(1 = Highest)</span>
                    </div>
                  </div>
                </div>

                {/* Device Compatibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device Compatibility <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-4">
                    {[
                      { value: 'desktop', label: 'Desktop', icon: Monitor },
                      { value: 'mobile', label: 'Mobile', icon: Smartphone },
                      { value: 'tablet', label: 'Tablet', icon: Tablet }
                    ].map((device) => {
                      const Icon = device.icon;
                      return (
                        <label key={device.value} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.device_compatibility.includes(device.value)}
                            onChange={() => handleDeviceToggle(device.value)}
                            className="text-indigo-600 focus:ring-indigo-500 rounded"
                          />
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="text-gray-700">{device.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={formData.display_duration}
                      onChange={(e) => handleInputChange('display_duration', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      min="0"
                      placeholder="0 = No auto-close"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Impressions per Day
                    </label>
                    <input
                      type="number"
                      value={formData.max_impressions_per_day}
                      onChange={(e) => handleInputChange('max_impressions_per_day', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      min="0"
                      placeholder="0 = Unlimited"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{advertisement ? 'Update Advertisement' : 'Create Advertisement'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdFormModal;