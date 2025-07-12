-- Add language management tables
-- Migration: 20250710060000_add_language_management.sql

-- Create languages table
CREATE TABLE IF NOT EXISTS languages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'ne', 'es', 'hi'
    name VARCHAR(100) NOT NULL, -- e.g., 'Nepali', 'Spanish', 'Hindi'
    native_name VARCHAR(100), -- e.g., 'नेपाली', 'Español', 'हिन्दी'
    flag_emoji VARCHAR(10), -- e.g., '🇳🇵', '🇪🇸', '🇮🇳'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create language_proficiencies table for user language preferences
CREATE TABLE IF NOT EXISTS language_proficiencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced, native
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, language_id)
);

-- Add language_id to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES languages(id) ON DELETE CASCADE;

-- Add language_id to test_sets table
ALTER TABLE test_sets ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES languages(id) ON DELETE CASCADE;

-- Add language_id to flashcards table
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES languages(id) ON DELETE CASCADE;

-- Add language_id to vocab_list_items table
ALTER TABLE vocab_list_items ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES languages(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_language_id ON categories(language_id);
CREATE INDEX IF NOT EXISTS idx_test_sets_language_id ON test_sets(language_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_language_id ON flashcards(language_id);
CREATE INDEX IF NOT EXISTS idx_vocab_list_items_language_id ON vocab_list_items(language_id);
CREATE INDEX IF NOT EXISTS idx_language_proficiencies_user_id ON language_proficiencies(user_id);
CREATE INDEX IF NOT EXISTS idx_language_proficiencies_language_id ON language_proficiencies(language_id);

-- Insert default languages
INSERT INTO languages (code, name, native_name, flag_emoji) VALUES
('en', 'English', 'English', '🇺🇸'),
('ne', 'Nepali', 'नेपाली', '🇳🇵'),
('es', 'Spanish', 'Español', '🇪🇸'),
('hi', 'Hindi', 'हिन्दी', '🇮🇳'),
('zh', 'Chinese', '中文', '🇨🇳'),
('ar', 'Arabic', 'العربية', '🇸🇦'),
('fr', 'French', 'Français', '🇫🇷'),
('de', 'German', 'Deutsch', '🇩🇪'),
('ja', 'Japanese', '日本語', '🇯🇵'),
('ko', 'Korean', '한국어', '🇰🇷')
ON CONFLICT (code) DO NOTHING;

-- Update existing categories to use English language
UPDATE categories SET language_id = (SELECT id FROM languages WHERE code = 'en') WHERE language_id IS NULL;

-- Update existing test_sets to use English language
UPDATE test_sets SET language_id = (SELECT id FROM languages WHERE code = 'en') WHERE language_id IS NULL;

-- Update existing flashcards to use English language
UPDATE flashcards SET language_id = (SELECT id FROM languages WHERE code = 'en') WHERE language_id IS NULL;

-- Update existing vocab_list_items to use English language
UPDATE vocab_list_items SET language_id = (SELECT id FROM languages WHERE code = 'en') WHERE language_id IS NULL;

-- Make language_id NOT NULL after setting defaults
ALTER TABLE categories ALTER COLUMN language_id SET NOT NULL;
ALTER TABLE test_sets ALTER COLUMN language_id SET NOT NULL;
ALTER TABLE flashcards ALTER COLUMN language_id SET NOT NULL;
ALTER TABLE vocab_list_items ALTER COLUMN language_id SET NOT NULL;

-- Create RLS policies for languages
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active languages
CREATE POLICY "Allow authenticated users to read active languages" ON languages
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Allow super_admin to manage all languages
CREATE POLICY "Allow super_admin to manage languages" ON languages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'admin')
        )
    );

-- Create RLS policies for language_proficiencies
ALTER TABLE language_proficiencies ENABLE ROW LEVEL SECURITY;

-- Users can manage their own language proficiencies
CREATE POLICY "Users can manage their own language proficiencies" ON language_proficiencies
    FOR ALL USING (user_id = auth.uid());

-- Create functions for language management
CREATE OR REPLACE FUNCTION get_user_languages(user_uuid UUID)
RETURNS TABLE (
    language_id UUID,
    language_code VARCHAR(10),
    language_name VARCHAR(100),
    native_name VARCHAR(100),
    flag_emoji VARCHAR(10),
    proficiency_level VARCHAR(20),
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.code,
        l.name,
        l.native_name,
        l.flag_emoji,
        lp.proficiency_level,
        lp.is_primary
    FROM languages l
    LEFT JOIN language_proficiencies lp ON l.id = lp.language_id AND lp.user_id = user_uuid
    WHERE l.is_active = true
    ORDER BY lp.is_primary DESC NULLS LAST, l.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get categories by language
CREATE OR REPLACE FUNCTION get_categories_by_language(lang_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    language_id UUID,
    language_name VARCHAR(100),
    language_code VARCHAR(10),
    test_set_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.language_id,
        l.name as language_name,
        l.code as language_code,
        COUNT(ts.id) as test_set_count
    FROM categories c
    JOIN languages l ON c.language_id = l.id
    LEFT JOIN test_sets ts ON c.id = ts.category_id
    WHERE c.language_id = lang_id
    GROUP BY c.id, c.name, c.description, c.created_by, c.created_at, c.updated_at, c.language_id, l.name, l.code
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get test sets by language
CREATE OR REPLACE FUNCTION get_test_sets_by_language(lang_id UUID)
RETURNS TABLE (
    id UUID,
    category_id UUID,
    name VARCHAR(255),
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    language_id UUID,
    language_name VARCHAR(100),
    language_code VARCHAR(10),
    category_name VARCHAR(255),
    flashcard_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.category_id,
        ts.name,
        ts.description,
        ts.created_by,
        ts.created_at,
        ts.updated_at,
        ts.language_id,
        l.name as language_name,
        l.code as language_code,
        c.name as category_name,
        COUNT(f.id) as flashcard_count
    FROM test_sets ts
    JOIN languages l ON ts.language_id = l.id
    JOIN categories c ON ts.category_id = c.id
    LEFT JOIN flashcards f ON ts.id = f.test_set_id
    WHERE ts.language_id = lang_id
    GROUP BY ts.id, ts.category_id, ts.name, ts.description, ts.created_by, ts.created_at, ts.updated_at, ts.language_id, l.name, l.code, c.name
    ORDER BY c.name, ts.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 