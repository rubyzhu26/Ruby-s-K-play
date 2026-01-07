
import { GoogleGenAI, Type, Schema, Modality, Chat } from "@google/genai";
import { ImageAssistantResult, DictionaryResult, LuckyResult, ImagePromptModules, TrendAnalysisResult } from "../types";

// Helper to get client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Schema Definitions ---

const imagePromptModulesSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      core: { type: Type.STRING },
      subject: { type: Type.STRING },
      rendering: { type: Type.STRING },
      aesthetics: { type: Type.STRING },
      layout: { type: Type.STRING },
    },
    required: ["core", "subject", "rendering", "aesthetics", "layout"],
};

const motionGuideSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        visual_movement: { type: Type.STRING },
        atmosphere: { type: Type.STRING },
        music_recommendation: { type: Type.STRING },
        duration: { type: Type.STRING },
    },
    required: ["title", "visual_movement", "atmosphere", "music_recommendation", "duration"],
};

const imageAssistantSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    search_keywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          kr: { type: Type.STRING },
          en: { type: Type.STRING },
        },
        required: ["kr", "en"],
      },
    },
    visual_style: {
      type: Type.OBJECT,
      properties: {
        color_palettes: {
          type: Type.ARRAY,
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        illustration_features: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        reference_image_descriptions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["color_palettes", "illustration_features", "reference_image_descriptions"],
    },
    prompt_modules: imagePromptModulesSchema,
    motion_guide: motionGuideSchema,
  },
  required: ["search_keywords", "visual_style", "prompt_modules", "motion_guide"],
};

const dictionarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    basics: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING },
        cn_meaning: { type: Type.STRING },
      },
      required: ["target", "cn_meaning"],
    },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sentence: { type: Type.STRING },
          cn: { type: Type.STRING },
        },
        required: ["sentence", "cn"],
      },
    },
    usage_guide: { type: Type.STRING },
    concept_art_prompt: { type: Type.STRING },
  },
  required: ["basics", "examples", "usage_guide", "concept_art_prompt"],
};

const luckySchema: Schema = {
    type: Type.OBJECT,
    properties: {
        theme: { type: Type.STRING },
        image_prompt: { type: Type.STRING },
        korean_sentence: { type: Type.STRING },
        chinese_translation: { type: Type.STRING }
    },
    required: ["theme", "image_prompt", "korean_sentence", "chinese_translation"]
}

const trendAnalysisSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        color_palette: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 hex color codes extracted from the image"
        },
        design_style: { type: Type.STRING, description: "A concise description of the visual style" },
        extracted_text: {
            type: Type.OBJECT,
            properties: {
                headline: { type: Type.STRING, description: "Main big text/title found in the image" },
                subtext: { type: Type.STRING, description: "Secondary smaller text/subtitle found in the image" }
            },
            required: ["headline", "subtext"]
        },
        copy_suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING }
                },
                required: ["title", "subtitle"]
            },
            description: "3 sets of catchy marketing copy suggestions suitable for this style"
        },
        background_prompts: {
            type: Type.ARRAY,
            items: { 
                type: Type.OBJECT, 
                properties: {
                    style_label: { type: Type.STRING, description: "Label for the style variation (e.g., 'Consistent', 'Refined', 'Reimagined')" },
                    prompt: { type: Type.STRING, description: "The image generation prompt. Must explicitly state NO TEXT." }
                },
                required: ["style_label", "prompt"]
            },
            description: "3 distinct prompts for different variations"
        }
    },
    required: ["color_palette", "design_style", "extracted_text", "copy_suggestions", "background_prompts"]
};

// --- API Functions ---

export const generateImageAssistantData = async (keyword: string): Promise<ImageAssistantResult> => {
  const ai = getAiClient();
  const prompt = `
    Role: Expert Visual Director specializing in Korean Culture.
    Task: Create a visual guide for the keyword: "${keyword}".
    Style: Bright, High Contrast, Fun, Masterful Layout.
    
    *** KOREAN CULTURAL VISUAL KNOWLEDGE BASE (Strictly adhere to this if applicable) ***
    - **Solar New Year (Jan 1st / 新年 / 元旦)**:
      - Context: Modern celebration of the Gregorian New Year (Jan 1st).
      - Elements: **Golden Sunrise** (often at Jeongdongjin beach), Fireworks, "Happy New Year" typography, Champagne, Calendar turning, Modern Winter Fashion.
      - Vibe: Hopeful, Modern, Energetic, Global.
      - Colors: Gold, Navy Blue, White, Neon.
      
    - **Seollal (Lunar New Year / 春节 / Korean Traditional New Year)**: 
      - Context: Traditional family holiday based on the Lunar Calendar.
      - **CRITICAL**: Identify the **Zodiac Animal of the CURRENT/UPCOMING YEAR** (e.g., 2024 Blue Dragon, 2025 Snake, 2026 Horse).
      - Elements: **Cute Zodiac Animal wearing Hanbok**, Tteokguk (white rice cake soup), Bokjumeoni (Silk lucky bag), Sebae-don (New Year's Cash Envelopes), Yutnori (Game sticks), Gift Sets (Bojagi wrapped boxes).
      - Colors:
        1. **Festive Pastel**: Soft Pink background, Yellow/Mint Hanbok, White accents.
        2. **Traditional Vivid**: Red (Luck), Gold (Wealth), Navy Blue, White.
      - Vibe: Traditional, Family Love, "Saehae Bok Mani Badeuseyo", Respectful.

    - **Chuseok (Harvest Festival)**: 
      - Elements: Songpyeon (Half-moon rice cakes in pink/white/green), Full Moon (Bright & large), Persimmons, Golden Rice Fields, Bojagi (Elegant fabric gift wrapping).
      - Colors:
        1. **Soft Elegant**: Beige background, Pastel Pink flowers, Soft Blue Bojagi.
        2. **Retro Autumn**: Burnt Orange (Persimmon), Dark Green (Leaves), Teal, Dark Brown.
        3. **Modern Pop**: Bright Pink background, Navy Blue, Persimmon Orange.
      - Vibe: Abundance, Gratitude, Autumn leaves.
      
    - **Buddha's Birthday**: 
      - Elements: Colorful Lotus Lanterns (Red, Pink, Green, Yellow), Temples at night.
      
    - **Dano**: 
      - Elements: Iris flowers (Changpo), Women washing hair, Swings (Geune), Men wrestling (Ssireum), Traditional Fans.
      
    - **Samiljeol / Gwangbokjeol (National Holidays)**: 
      - Elements: Taegeukgi (Korean Flag), Mugunghwa (Rose of Sharon flower), Handprints.
      
    - **General Tradition**: 
      - Elements: Hanok (Roofs), Dancheong (Palace painting patterns), Celadon (Green pottery), White Porcelain (Moon jar).
    
    Requirements:
    1. 5 Pairs of Search Keywords (Korean/English) for Naver/Pinterest.
    2. Visual Style: 
       - **Contextual Color Analysis**: Determine if "${keyword}" is a "Universal/International Holiday" (e.g., Christmas, Halloween, Solar New Year) OR a "Korean Traditional/Cultural Event" (e.g., Seollal, Chuseok).
         - **IF SOLAR NEW YEAR**: Use Gold/Navy/Sunrise themes.
         - **IF SEOLLAL (LUNAR)**: Use Hanbok/Zodiac/Traditional themes.
       - Provide 3 Color palettes (hex codes) based on this analysis.
       - 3 Illustration features.
       - 5 descriptions of reference images. **If it is a Korean holiday, strictly use the KNOWLEDGE BASE above for visual elements.**
    3. Image Prompt Modules (English Only):
       - Core: **Children's Book Style, High Contrast, Vibrant Colors**. **Include specific color tones matching the analysis above**. **Background must be SIMPLE and MINIMALIST**.
       - Subject: **Select ONLY 1-2 representative elements** from the Knowledge Base to keep it clean. Elements strictly restricted to **edges or bottom**. Center must be empty.
       - Rendering: Digital illustration, Vector, Childlike art, Bold lines, Flat design.
       - Aesthetics: Masterful layout, **Clean, Uncluttered, Simple**, Colorful.
       - Layout: **AspectRatio 1:1**, **Large Central Negative Space** (Solid White or very soft gradient). **NO complex background patterns or textures**.
       - **CRITICAL: ABSOLUTELY NO TEXT OR CHARACTERS IN THE GENERATED IMAGE.**
    4. Motion & Video Recipe: 
       - Create a guide for animating the generated static image into a 3-5 second social media video (Reels/TikTok).
       - Focus on subtle micro-animations (e.g., characters nodding/waving/blinking, background lights/stars/snow flickering or floating).
       - Atmosphere: Healing, Comfortable, Slow.
       - Duration: 5-10 seconds.
       - Music: Korean Chill/Cool Pop or Cute Electronic.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: imageAssistantSchema,
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as ImageAssistantResult;
};

export const regenerateImagePrompts = async (keyword: string): Promise<ImagePromptModules> => {
    const ai = getAiClient();
    const prompt = `
      Role: Creative Art Director.
      Task: The previous visual concept for "${keyword}" was good, but we want something **FRESH and DISTINCTLY DIFFERENT**.
      
      Requirements:
      1. Brainstorm a NEW angle or interpretation for "${keyword}". Change the color mood, the subject focus, or the artistic interpretation slightly (while keeping it fun and bright).
      2. Strict Layout Rules (Must Maintain): 
         - **AspectRatio 1:1**
         - **Large Central Negative Space** for text.
         - Elements on edges or bottom.
         - **BACKGROUND MUST BE SIMPLE/PLAIN**.
      
      Output ONLY the Image Prompt Modules.
      
      - Core: Children's Book Style, High Contrast, Vibrant Colors. (Try a different color combination if possible). **Minimalist Background**.
      - Subject: Choose **different** representative elements if possible, or arrange them differently.
      - Rendering: Digital illustration, Vector, Childlike art.
      - Aesthetics: Masterful layout, **Clean, Simple, Uncluttered**, Colorful.
      - Layout: **AspectRatio 1:1**, **Large Central Negative Space**. **Avoid busy patterns**. **ABSOLUTELY NO TEXT.**
    `;
  
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: imagePromptModulesSchema,
        temperature: 0.9, // Higher temp for variety
      },
    });
  
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as ImagePromptModules;
};

export const generateDictionaryData = async (input: string): Promise<DictionaryResult> => {
  const ai = getAiClient();
  const prompt = `
    Role: Fun, Cool Korean Language Tutor (Ruby's K-Play Tutor).
    Task: Analyze the user input: "${input}".
    The input can be Chinese, English, or Korean. It can be a word, a phrase, or a full sentence.
    
    Requirements:
    A. Basics: 
       - target: The corresponding Korean expression/sentence. (If input is CN/EN, translate to natural Korean. If input is KR, refine/use it).
       - cn_meaning: The Chinese meaning/translation.
    B. Examples: Provide **3** distinct example sentences (or dialogue snippets) that use the 'target' expression or relate to the sentence context.
       - Format: { sentence: "Korean string", cn: "Chinese string" }
    C. Usage Guide: Chatty, energetic tone! Explain context, nuance, grammar points, and slang if applicable. Write in Chinese.
    D. Concept Art Prompt: A detailed description for a **Studio Ghibli Hayao Miyazaki style** illustration that visualizes the **meaning/scene** of the input "${input}".
       - Style: Watercolor texture, lush green and blue tones, soft lighting, peaceful, healing, fresh and natural atmosphere.
       - **IMPORTANT: Keep the background SIMPLE and UNCLUTTERED. Focus on the main subject. Do not add too many details in the background. ABSOLUTELY NO TEXT.**
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: dictionarySchema,
      temperature: 0.8,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as DictionaryResult;
};

export const generateLuckyContent = async (): Promise<LuckyResult> => {
    const ai = getAiClient();
    const prompt = `
      Role: Curator of Healing Moments.
      Task: Pick a random, beautiful, healing theme (e.g., Sunset, First Snow, Spring Breeze, Cat in Sunlight, Old Bookstore).
      
      Requirements:
      1. Theme: The name of the theme.
      2. Image Prompt: A description for a 1:1 image. Style: Soft pastel colors, dreamy, Lo-Fi, Ghibli-esque, or cute illustration. High quality, peaceful atmosphere. **Must have clear negative space in the center for text. Background should be simple and clean. ABSOLUTELY NO TEXT.**
      3. Korean Sentence: A beautiful, poetic, or inspiring short sentence related to the theme.
      4. Chinese Translation: The Chinese translation of the sentence.
    `;
  
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: luckySchema,
        temperature: 1.0, // Higher temperature for randomness
      },
    });
  
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as LuckyResult;
  };

export const generateVisualImage = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
        parts: [{ text: prompt }]
    },
    config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
    }
  });

  // Extract image
  let base64Image = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
      }
  }

  if (!base64Image) {
      throw new Error("Failed to generate image");
  }

  return `data:image/png;base64,${base64Image}`;
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: {
      parts: [{ text: text }],
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("No audio generated");
  return audioData;
};

// Create a chat session specifically for the Dictionary "Chatty Guide"
export const createDictionaryChatSession = (currentWord: string): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
            systemInstruction: `
                You are a fun, trendy, and super energetic Korean Language Tutor (Ruby's K-Play Tutor).
                The user is currently learning the word/phrase/sentence: "${currentWord}".
                
                Your Task:
                1. Chat with the user about this expression.
                2. Answer their questions in **Chinese** (because the user is asking in Chinese).
                3. Keep the tone very casual, like a close friend. Use emojis! ✨
                4. If they ask about grammar, nuances, or politeness levels, explain it simply and interestingly.
                5. Keep responses concise (under 3-4 sentences).
            `
        }
    });
};

export const generateVocabularyStory = async (words: string[]): Promise<string> => {
    const ai = getAiClient();
    const wordsList = words.join(", ");
    
    const prompt = `
      Role: Imaginative Storyteller for language learners.
      Task: Create a short, fun, and cohesive story (approx 150 words) using the following Korean words: [${wordsList}].
      
      Requirements:
      1. Write the story primarily in **Korean**.
      2. Ensure all the provided words are used and **bolded** (e.g., **word**) in the text.
      3. Provide a full **Chinese translation** below the Korean story.
      4. The tone should be cute, whimsical, and easy for beginners to understand.
    `;
  
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });
  
    return response.text || "Could not generate story.";
};

export const analyzeTrendImage = async (file: File): Promise<TrendAnalysisResult> => {
    const ai = getAiClient();
    const base64Data = await fileToGenerativePart(file);

    const prompt = `
        Role: Senior Art Director and Marketing Expert.
        Task: Analyze this "best-selling" Korean poster image.
        
        Requirements:
        1. **Color Analysis**: Extract the 5 most dominant/impactful hex color codes from the image.
        2. **Design Style**: Describe the visual style, layout strategy, and vibe in 1 sentence.
        3. **Copywriting**: Suggest 3 sets of catchy "Title" and "Subtitle" ideas for a similar poster. Mix Korean, English, and Chinese for maximum appeal.
        4. **Text Extraction**: Identify and extract the main **Headline** (big text) and **Subtext** (smaller details) visibly present in the image. Return them in the 'extracted_text' field.
        5. **Background Prompts**: Create 3 distinct background prompts based on similarity to the original:
           
           - **Variation 1 (Consistent)**: Style Label: "Consistent". 
             **Strictly Maintain**: Composition, Layout Structure, and Negative Space must be IDENTICAL to the original.
             **Micro-Change**: Only refine line weights or texture quality slightly. 95% similarity to original composition.
           
           - **Variation 2 (Refined)**: Style Label: "Refined". 
             **Strictly Maintain**: Composition, Layout Structure, and Negative Space.
             **Change**: Optimize the color balance or element spacing for better aesthetics. 80% similarity.
           
           - **Variation 3 (Reimagined)**: Style Label: "Reimagined". 
             **Strictly Maintain**: Composition, Layout Structure, and Negative Space.
             **Change**: Switch the rendering style (e.g. from 3D to Flat) but keep the layout. 50% similarity in style, but 100% similarity in layout.
           
           - **CRITICAL**: The generated background prompts must explicitly state **"ABSOLUTELY NO TEXT"**, "clean layout", "1:1 aspect ratio", and "large central negative space".
    `;

    // 1. Multimodal Analysis
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: trendAnalysisSchema,
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to analyze image");
    const result = JSON.parse(text) as TrendAnalysisResult;

    // 2. Generate Backgrounds (Parallel)
    // Map object structure back to generated backgrounds
    const bgPromises = result.background_prompts.map(async (item) => {
        try {
            const url = await generateVisualImage(item.prompt);
            return { url, prompt: item.prompt, style_label: item.style_label };
        } catch (e) {
            console.error("Failed to generate background variation", e);
            return null;
        }
    });

    const backgrounds = await Promise.all(bgPromises);
    result.generated_backgrounds = backgrounds.filter(bg => bg !== null) as { url: string; prompt: string; style_label: string }[];

    return result;
};
