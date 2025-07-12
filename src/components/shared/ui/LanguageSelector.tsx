import React, { useState, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { getActiveLanguages, getUserLanguages, setUserLanguageProficiency } from '../../../lib/database';
import { useAuth } from '../../../hooks/useAuth';
import { Language, UserLanguage } from '../../../types/language';
import { useToast } from '../../../hooks/useToast';

interface LanguageSelectorProps {
  selectedLanguageId?: string | undefined;
  onLanguageChange: (languageId: string) => void;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguageId,
  onLanguageChange,
  className = ''
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [userLanguages, setUserLanguages] = useState<UserLanguage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserLanguages();
    }
  }, [user]);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const data = await getActiveLanguages();
      setLanguages(data);
    } catch (err) {
      console.error('Failed to load languages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLanguages = async () => {
    if (!user) return;
    
    try {
      const data = await getUserLanguages(user.id);
      setUserLanguages(data);
    } catch (err) {
      console.error('Failed to load user languages:', err);
    }
  };

  const handleLanguageSelect = async (language: Language) => {
    if (!user) {
      onLanguageChange(language.id);
      setIsOpen(false);
      return;
    }

    try {
      // Set this language as primary for the user
      await setUserLanguageProficiency(
        user.id,
        language.id,
        'beginner', // Default proficiency level
        true // Set as primary
      );
      
      // Update local state
      await loadUserLanguages();
      
      // Notify parent component
      onLanguageChange(language.id);
      setIsOpen(false);
      
      showToast(`Switched to ${language.name}`, 'success');
    } catch (err) {
      console.error('Failed to set language preference:', err);
      showToast('Failed to set language preference', 'error');
    }
  };

  const getSelectedLanguage = () => {
    if (selectedLanguageId) {
      return languages.find(lang => lang.id === selectedLanguageId);
    }
    
    // Find user's primary language
    const primaryLanguage = userLanguages.find(lang => lang.is_primary);
    if (primaryLanguage) {
      return languages.find(lang => lang.id === primaryLanguage.language_id);
    }
    
    // Default to first available language
    return languages[0];
  };

  const selectedLanguage = getSelectedLanguage();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 text-gray-500 ${className}`}>
        <Globe className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {selectedLanguage?.flag_emoji && (
          <span className="text-lg">{selectedLanguage.flag_emoji}</span>
        )}
        <span className="text-sm font-medium">
          {selectedLanguage?.name || 'Select Language'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-3 py-2">
              Select Language
            </div>
            
            {languages.map((language) => {
              const userLang = userLanguages.find(ul => ul.language_id === language.id);
              const isSelected = selectedLanguage?.id === language.id;
              
              return (
                <button
                  key={language.id}
                  onClick={() => handleLanguageSelect(language)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-left rounded-md transition-colors
                    ${isSelected 
                      ? 'bg-purple-50 text-purple-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{language.flag_emoji}</span>
                    <div>
                      <div className="text-sm font-medium">
                        {language.name}
                      </div>
                      {language.native_name && (
                        <div className="text-xs text-gray-500">
                          {language.native_name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {userLang && (
                      <span className={`
                        text-xs px-2 py-1 rounded-full
                        ${userLang.is_primary 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {userLang.is_primary ? 'Primary' : userLang.proficiency_level}
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector; 