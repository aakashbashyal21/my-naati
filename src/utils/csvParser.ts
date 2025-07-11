import { FlashcardPair } from '../types/flashcard';

export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.trim().split('\n');
  return lines.map(line => {
    // Simple CSV parser - handles basic cases
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  });
};

export const csvToFlashcards = (csvData: string[][]): FlashcardPair[] => {
  return csvData
    .filter(row => row.length >= 2 && row[0] && row[1])
    .map((row, index) => ({
      id: `card-${index}`,
      english: row[0].replace(/^"|"$/g, ''),
      translation: row[1].replace(/^"|"$/g, ''),
      isKnown: false,
      needsPractice: false
    }));
};

export const validateCSVData = (csvData: string[][]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (csvData.length === 0) {
    errors.push('CSV file is empty');
  }
  
  if (csvData.length > 0 && csvData[0].length < 2) {
    errors.push('CSV must have at least 2 columns');
  }
  
  const validRows = csvData.filter(row => row.length >= 2 && row[0] && row[1]);
  if (validRows.length === 0) {
    errors.push('No valid rows found with both English and translation');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};