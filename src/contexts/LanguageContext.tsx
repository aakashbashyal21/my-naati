import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserLanguages } from '../lib/database';
import { UserLanguage } from '../types/language';
import { supabase } from '../lib/supabase';

interface LanguageContextType {
  selectedLanguageId: string | undefined;
  userLanguages: UserLanguage[];
  setSelectedLanguageId: (languageId: string) => void;
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

  const loadUserLanguages = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const languages = await getUserLanguages(user.id);
      setUserLanguages(languages);
      
      // Set primary language as selected
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

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguageId(languageId);
    // Here you could also update the user's primary language preference
  };

  return (
    <LanguageContext.Provider
      value={{
        selectedLanguageId,
        userLanguages,
        setSelectedLanguageId: handleLanguageChange,
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