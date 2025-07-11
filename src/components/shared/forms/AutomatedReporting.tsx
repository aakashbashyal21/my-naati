import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Mail, 
  Clock, 
  Settings, 
  Play, 
  Pause, 
  Edit3,
  Trash2,
  Plus,
  FileText,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';

interface ReportSchedule {
  id: string;
  name: string;
  type: 'progress' | 'analytics' | 'achievements' | 'summary';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive: boolean;
  lastSent?: Date;
  nextScheduled?: Date;
  format: 'pdf' | 'csv' | 'json';
  filters?: any;
}

interface AutomatedReportingProps {
  onScheduleReport?: (schedule: Omit<ReportSchedule, 'id'>) => Promise<void>;
  onUpdateSchedule?: (id: string, schedule: Partial<ReportSchedule>) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
  className?: string;
}

const AutomatedReporting: React.FC<AutomatedReportingProps> = ({
  onScheduleReport,
  onUpdateSchedule,
  onDeleteSchedule,
  className = ''
}) => {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'progress' as ReportSchedule['type'],
    frequency: 'weekly' as ReportSchedule['frequency'],
    recipients: [''],
    format: 'pdf' as ReportSchedule['format'],
    isActive: true
  });

  useEffect(() => {
    // Load existing schedules
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    // Mock data - in real app, load from API
    const mockSchedules: ReportSchedule[] = [
      {
        id: '1',
        name: 'Weekly Progress Report',
        type: 'progress',
        frequency: 'weekly',
        recipients: ['user@example.com'],
        isActive: true,
        lastSent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        format: 'pdf'
      },
      {
        id: '2',
        name: 'Monthly Analytics Summary',
        type: 'analytics',
        frequency: 'monthly',
        recipients: ['admin@example.com', 'manager@example.com'],
        isActive: false,
        lastSent: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextScheduled: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        format: 'csv'
      }
    ];
    setSchedules(mockSchedules);
  };

  const handleCreateSchedule = async () => {
    const newSchedule = {
      ...formData,
      recipients: formData.recipients.filter(email => email.trim() !== '')
    };

    if (onScheduleReport) {
      await onScheduleReport(newSchedule);
    }

    // Add to local state (in real app, this would be handled by API response)
    const schedule: ReportSchedule = {
      ...newSchedule,
      id: Date.now().toString(),
      nextScheduled: calculateNextScheduled(newSchedule.frequency)
    };
    
    setSchedules(prev => [...prev, schedule]);
    setShowCreateModal(false);
    resetForm();
  };

  const handleUpdateSchedule = async (id: string, updates: Partial<ReportSchedule>) => {
    if (onUpdateSchedule) {
      await onUpdateSchedule(id, updates);
    }

    setSchedules(prev => prev.map(schedule =>
      schedule.id === id ? { ...schedule, ...updates } : schedule
    ));
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report schedule?')) return;

    if (onDeleteSchedule) {
      await onDeleteSchedule(id);
    }

    setSchedules(prev => prev.filter(schedule => schedule.id !== id));
  };

  const calculateNextScheduled = (frequency: ReportSchedule['frequency']): Date => {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      default:
        return now;
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'progress',
      frequency: 'weekly',
      recipients: [''],
      format: 'pdf',
      isActive: true
    });
    setEditingSchedule(null);
  };

  const addRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const updateRecipient = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.map((recipient, i) => 
        i === index ? email : recipient
      )
    }));
  };

  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const getReportTypeIcon = (type: ReportSchedule['type']) => {
    switch (type) {
      case 'progress': return TrendingUp;
      case 'analytics': return BarChart3;
      case 'achievements': return Users;
      case 'summary': return FileText;
      default: return FileText;
    }
  };

  const getFrequencyLabel = (frequency: ReportSchedule['frequency']) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Automated Reporting</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.length > 0 ? (
          schedules.map((schedule) => {
            const TypeIcon = getReportTypeIcon(schedule.type);
            return (
              <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      schedule.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <TypeIcon className={`h-5 w-5 ${
                        schedule.isActive ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{schedule.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>{getFrequencyLabel(schedule.frequency)}</span>
                        <span>•</span>
                        <span>{schedule.format.toUpperCase()}</span>
                        <span>•</span>
                        <span>{schedule.recipients.length} recipient{schedule.recipients.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUpdateSchedule(schedule.id, { isActive: !schedule.isActive })}
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.isActive 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={schedule.isActive ? 'Pause' : 'Resume'}
                    >
                      {schedule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setFormData({
                          name: schedule.name,
                          type: schedule.type,
                          frequency: schedule.frequency,
                          recipients: schedule.recipients,
                          format: schedule.format,
                          isActive: schedule.isActive
                        });
                        setShowCreateModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {schedule.nextScheduled && (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>
                      Next: {schedule.nextScheduled.toLocaleDateString()} at {schedule.nextScheduled.toLocaleTimeString()}
                    </span>
                    {schedule.lastSent && (
                      <>
                        <span>•</span>
                        <span>Last sent: {schedule.lastSent.toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No automated reports scheduled</p>
            <p className="text-sm">Create your first report schedule to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingSchedule ? 'Edit Report Schedule' : 'Create Report Schedule'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Weekly Progress Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="progress">Progress Report</option>
                  <option value="analytics">Analytics Summary</option>
                  <option value="achievements">Achievements Report</option>
                  <option value="summary">Complete Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients
                </label>
                <div className="space-y-2">
                  {formData.recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={recipient}
                        onChange={(e) => updateRecipient(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@example.com"
                      />
                      {formData.recipients.length > 1 && (
                        <button
                          onClick={() => removeRecipient(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addRecipient}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add recipient
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingSchedule ? 'Update' : 'Create'} Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedReporting;