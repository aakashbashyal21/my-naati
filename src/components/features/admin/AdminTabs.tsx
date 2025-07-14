import React from 'react';
import { FolderPlus, FileText, Users, Globe, BarChart3, AudioLines } from 'lucide-react';
import AudioDialogManagement from './AudioDialogManagement';

export type AdminTab = 'categories' | 'testsets' | 'users' | 'languages' | 'analytics' | 'audio-dialogs';

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const tabs = [
  { id: 'categories' as const, label: 'Categories', icon: FolderPlus },
  { id: 'testsets' as const, label: 'Test Sets', icon: FileText },
  { id: 'users' as const, label: 'Users', icon: Users },
  { id: 'languages' as const, label: 'Languages', icon: Globe },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'audio-dialogs' as const, label: 'Audio Dialogs', icon: AudioLines },
];

export const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="mb-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {activeTab === 'audio-dialogs' && <AudioDialogManagement />}
    </div>
  );
}; 