
export interface SearchKeyword {
  kr: string;
  en: string;
}

export interface VisualStyle {
  color_palettes: string[][]; // Array of hex code arrays
  illustration_features: string[];
  reference_image_descriptions: string[]; // Text descriptions of reference images
}

export interface ImagePromptModules {
  core: string;
  subject: string;
  rendering: string;
  aesthetics: string;
  layout: string;
}

export interface MotionGuide {
  title: string;
  visual_movement: string;
  atmosphere: string;
  music_recommendation: string;
  duration: string;
}

export interface ImageAssistantResult {
  search_keywords: SearchKeyword[];
  visual_style: VisualStyle;
  prompt_modules: ImagePromptModules;
  motion_guide: MotionGuide;
}

export interface DictionaryExample {
  sentence: string;
  cn: string;
}

export interface DictionaryResult {
  basics: {
    target: string;
    cn_meaning: string;
  };
  examples: DictionaryExample[];
  usage_guide: string;
  concept_art_prompt: string;
}

export interface LuckyResult {
    theme: string;
    image_prompt: string;
    korean_sentence: string;
    chinese_translation: string;
}

export interface SavedWord {
    id: string;
    target: string;
    cn_meaning: string;
    examples: DictionaryExample[];
    image_url: string | null;
    date: number;
}

export interface CopySuggestion {
    title: string;
    subtitle: string;
}

export interface TrendAnalysisResult {
    color_palette: string[];
    design_style: string;
    extracted_text: {
        headline: string;
        subtext: string;
    };
    copy_suggestions: CopySuggestion[];
    // Updated to support distinct style labels
    background_prompts: { prompt: string; style_label: string }[]; 
    generated_backgrounds: { url: string; prompt: string; style_label: string }[];
}

export type AppMode = 'image-assistant' | 'dictionary' | 'vocabulary' | 'trend-analyzer';

export interface GeneratedImage {
  url: string;
  prompt: string;
}
