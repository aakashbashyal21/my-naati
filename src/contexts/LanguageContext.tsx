import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserLanguages, setUserLanguageProficiency, getUserPreferredLanguage, setUserPreferredLanguage } from '../lib/database';
import { UserLanguage } from '../types/language';
import { supabase } from '../lib/supabase';

interface LanguageContextType {
  selectedLanguageId: string | undefined;
  userLanguages: UserLanguage[];
  setSelectedLanguageId: (languageId: string) => void;
  setLanguageWithoutUpdate: (languageId: string) => void;
  loadUserLanguagesOnly: () => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | undefined>();
  const [userLanguages, setUserLanguages] = useState<UserLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserLanguages();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Load user languages without changing the selected language
  const loadUserLanguagesOnly = async () => {
    if (!user) return;
    
    try {
      const languages = await getUserLanguages(user.id);
      setUserLanguages(languages);
    } catch (err) {
      console.error('Failed to load user languages:', err);
    }
  };

  const loadUserLanguages = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const [languages, preferredLanguageId] = await Promise.all([
        getUserLanguages(user.id),
        getUserPreferredLanguage(user.id)
      ]);
      
      setUserLanguages(languages);
      
      // First, try to use the user's preferred language
      if (preferredLanguageId) {
        // Check if the preferred language is in the user's available languages
        const preferredLanguage = languages.find(lang => lang.language_id === preferredLanguageId);
        if (preferredLanguage) {
          setSelectedLanguageId(preferredLanguageId);
          return;
        }
      }
      
      // If no preferred language or it's not available, use primary language
      const primaryLanguage = languages.find(lang => lang.is_primary);
      if (primaryLanguage) {
        setSelectedLanguageId(primaryLanguage.language_id);
      } else if (languages.length > 0) {
        // If no primary language, use the first one
        setSelectedLanguageId(languages[0]?.language_id);
      } else {
        // If no languages at all, we'll need to get the default English language
        try {
          if (supabase) {
            const { data: englishLang } = await supabase
              .from('languages')
              .select('id')
              .eq('code', 'en')
              .single();
            if (englishLang) {
              setSelectedLanguageId(englishLang.id);
              // Set this as the user's preferred language for future sessions
              await setUserPreferredLanguage(user.id, englishLang.id);
            }
          }
        } catch (err) {
          console.error('Failed to get default English language:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load user languages:', err);
      // Try to get default English language as fallback
      try {
        if (supabase) {
          const { data: englishLang } = await supabase
            .from('languages')
            .select('id')
            .eq('code', 'en')
            .single();
          if (englishLang) {
            setSelectedLanguageId(englishLang.id);
          }
        }
      } catch (fallbackErr) {
        console.error('Failed to get default English language:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (languageId: string) => {
    setSelectedLanguageId(languageId);
    
    // Update the user's preferred language in the database
    if (user) {
      try {
        await setUserPreferredLanguage(user.id, languageId);
        
        // Check if the user already has this language in their proficiencies
        const existingLanguage = userLanguages.find(lang => lang.language_id === languageId);
        
        if (existingLanguage) {
          // Update the user's primary language preference in language_proficiencies
          await setUserLanguageProficiency(user.id, languageId, 'beginner', true);
          
          // Update local user languages state without reloading
          setUserLanguages(prev => 
            prev.map(lang => ({
              ...lang,
              is_primary: lang.language_id === languageId
            }))
          );
        } else {
          // Add this language to the user's proficiencies
          await setUserLanguageProficiency(user.id, languageId, 'beginner', true);
          
          // Reload user languages to get the updated list
          await loadUserLanguagesOnly();
        }
      } catch (err) {
        console.error('Failed to update language preference:', err);
      }
    }
  };

  // Function to set language without updating database (for initial load)
  const setLanguageWithoutUpdate = (languageId: string) => {
    setSelectedLanguageId(languageId);
  };

  return (
    <LanguageContext.Provider
      value={{
        selectedLanguageId,
        userLanguages,
        setSelectedLanguageId: handleLanguageChange,
        setLanguageWithoutUpdate,
        loadUserLanguagesOnly,
        isLoading
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 