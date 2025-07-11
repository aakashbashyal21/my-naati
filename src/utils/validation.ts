import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
export const urlSchema = z.string().url('Invalid URL');

// User-related schemas
export const userProfileSchema = z.object({
  email: emailSchema,
  role: z.enum(['user', 'admin', 'super_admin']),
  name: z.string().min(1).max(100).optional(),
  avatar_url: urlSchema.optional()
});

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional()
});

// Test set schemas
export const testSetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional()
});

// Flashcard schemas
export const flashcardSchema = z.object({
  english: z.string().min(1, 'English text is required').max(500, 'English text must be 500 characters or less'),
  translation: z.string().min(1, 'Translation is required').max(500, 'Translation must be 500 characters or less'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional()
});

// Advertisement schemas
export const advertisementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  type: z.enum(['banner', 'block', 'popover']),
  placement: z.enum(['header', 'footer', 'sidebar_left', 'sidebar_right', 'content', 'modal', 'between_sessions', 'after_practice', 'category_list']),
  content_html: z.string().max(10000, 'HTML content must be 10000 characters or less').optional(),
  image_url: urlSchema.optional(),
  click_url: urlSchema,
  width: z.number().min(1).max(2000),
  height: z.number().min(1).max(2000),
  is_active: z.boolean(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  target_audience: z.record(z.string(), z.any()).optional(),
  device_compatibility: z.array(z.enum(['desktop', 'mobile', 'tablet'])),
  display_duration: z.number().min(0),
  priority: z.number().min(1).max(10),
  max_impressions_per_user: z.number().min(0),
  max_impressions_per_day: z.number().min(0)
});

// Vocab list schemas
export const vocabListItemSchema = z.object({
  english: z.string().min(1, 'English text is required').max(500, 'English text must be 500 characters or less'),
  translation: z.string().min(1, 'Translation is required').max(500, 'Translation must be 500 characters or less'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional()
});

// CSV validation schema
export const csvDataSchema = z.array(
  z.array(z.string()).min(2, 'Each row must have at least 2 columns')
).min(1, 'CSV must contain at least one row');

// Form validation helpers
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map((err) => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
};

// Admin Panel Validation Schemas
export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

export const testSetFormSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

export const userRoleSchema = z.enum(['user', 'admin', 'super_admin']);

// Type exports for use in components
export type CategoryFormData = z.infer<typeof categoryFormSchema>;
export type TestSetFormData = z.infer<typeof testSetFormSchema>;
export type FlashcardFormData = z.infer<typeof flashcardSchema>;
export type AdvertisementFormData = z.infer<typeof advertisementSchema>;
export type VocabListItemFormData = z.infer<typeof vocabListItemSchema>; 
export type UserRole = z.infer<typeof userRoleSchema>; 