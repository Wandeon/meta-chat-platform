/**
 * Language Detection Service
 * Uses franc library for automatic language detection
 */

import { franc } from 'franc';

/**
 * ISO 639-3 to ISO 639-1 language code mapping
 * franc returns 3-letter codes, we normalize to 2-letter codes
 */
const ISO_639_3_TO_639_1: Record<string, string> = {
  'hrv': 'hr',   // Croatian
  'eng': 'en',   // English
  'deu': 'de',   // German
  'fra': 'fr',   // French
  'spa': 'es',   // Spanish
  'ita': 'it',   // Italian
  'por': 'pt',   // Portuguese
  'nld': 'nl',   // Dutch
  'pol': 'pl',   // Polish
  'rus': 'ru',   // Russian
  'ukr': 'uk',   // Ukrainian
  'ces': 'cs',   // Czech
  'slk': 'sk',   // Slovak
  'slv': 'sl',   // Slovenian
  'srp': 'sr',   // Serbian
  'bul': 'bg',   // Bulgarian
  'ron': 'ro',   // Romanian
  'hun': 'hu',   // Hungarian
  'tur': 'tr',   // Turkish
  'ara': 'ar',   // Arabic
  'heb': 'he',   // Hebrew
  'hin': 'hi',   // Hindi
  'jpn': 'ja',   // Japanese
  'kor': 'ko',   // Korean
  'cmn': 'zh',   // Chinese (Mandarin)
  'vie': 'vi',   // Vietnamese
  'tha': 'th',   // Thai
  'swe': 'sv',   // Swedish
  'dan': 'da',   // Danish
  'nor': 'no',   // Norwegian
  'fin': 'fi',   // Finnish
  'ell': 'el',   // Greek
  'und': 'unknown' // Undetermined
};

/**
 * Detect language from text using franc library
 * @param text - Text to analyze (minimum 10 characters recommended)
 * @param defaultLanguage - Fallback language if detection fails (default: 'en')
 * @returns ISO 639-1 language code (e.g., 'hr', 'en', 'de')
 */
export function detectLanguage(text: string, defaultLanguage: string = 'en'): string {
  if (!text || text.trim().length < 5) {
    // Text too short for reliable detection
    return defaultLanguage;
  }

  try {
    // franc returns ISO 639-3 code or 'und' for undetermined
    const detected = franc(text, { minLength: 10 });

    // Map to ISO 639-1 or return default
    const language = ISO_639_3_TO_639_1[detected];

    if (!language || language === 'unknown') {
      console.log(`[LanguageDetection] Could not detect language for text: "${text.substring(0, 50)}..." (franc result: ${detected})`);
      return defaultLanguage;
    }

    console.log(`[LanguageDetection] Detected language: ${language} (${detected}) for text: "${text.substring(0, 50)}..."`);
    return language;
  } catch (error) {
    console.error('[LanguageDetection] Error detecting language:', error);
    return defaultLanguage;
  }
}

/**
 * Check if text is in the expected language
 * @param text - Text to analyze
 * @param expectedLanguage - Expected ISO 639-1 language code
 * @returns true if text matches expected language or is undetermined
 */
export function isTextInLanguage(text: string, expectedLanguage: string): boolean {
  const detected = detectLanguage(text, expectedLanguage);
  return detected === expectedLanguage || detected === 'unknown';
}

/**
 * Detect language with confidence score
 * @param text - Text to analyze
 * @returns Object with language code and confidence (0-1)
 */
export function detectLanguageWithConfidence(text: string): { language: string; confidence: number } {
  if (!text || text.trim().length < 5) {
    return { language: 'unknown', confidence: 0 };
  }

  try {
    // franc-min provides confidence scores
    const detected = franc(text, { minLength: 10 });
    const language = ISO_639_3_TO_639_1[detected] || 'unknown';

    // franc doesn't provide confidence directly, so we estimate based on text length
    // Longer text = higher confidence
    const textLength = text.length;
    const confidence = language === 'unknown'
      ? 0
      : Math.min(0.5 + (textLength / 1000), 1.0);

    return { language, confidence };
  } catch (error) {
    console.error('[LanguageDetection] Error detecting language with confidence:', error);
    return { language: 'unknown', confidence: 0 };
  }
}

/**
 * Detect most common language from multiple text samples
 * Useful for analyzing conversation history
 * @param texts - Array of text samples
 * @returns Most common language code
 */
export function detectDominantLanguage(texts: string[]): string {
  if (!texts || texts.length === 0) {
    return 'en';
  }

  const languageCounts: Record<string, number> = {};

  for (const text of texts) {
    const lang = detectLanguage(text);
    if (lang !== 'unknown') {
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
  }

  // Find language with highest count
  let dominantLanguage = 'en';
  let maxCount = 0;

  for (const [lang, count] of Object.entries(languageCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantLanguage = lang;
    }
  }

  return dominantLanguage;
}
