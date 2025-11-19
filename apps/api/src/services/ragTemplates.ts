/**
 * RAG Templates - Localized templates for RAG context injection
 * Templates are language-specific to ensure proper LLM response language
 *
 * IMPORTANT: These templates use STRONG directives to ensure LLMs actually use the context.
 * Weak phrases like "you can ignore it" cause models (especially smaller ones like llama3.1:8b)
 * to skip the context entirely.
 */

const SEPARATOR = '='.repeat(80);

export const RAG_TEMPLATES: Record<string, string> = {
  'hr': `
${SEPARATOR}
VAŽNO: KONTEKST IZ BAZE ZNANJA
${SEPARATOR}

PRIMJER KAKO KORISTITI KONTEKST:

Kontekst: "Naša trgovina radi od 09:00 do 20:00."
Pitanje: "Kada radite?"
Odgovor: "Prema bazi znanja, radimo od 09:00 do 20:00."

TVOJ KONTEKST:

`,

  'en': `
${SEPARATOR}
IMPORTANT: KNOWLEDGE BASE CONTEXT
${SEPARATOR}

EXAMPLE OF HOW TO USE CONTEXT:

Context: "Our store is open from 09:00 to 20:00."
Question: "What are your hours?"
Answer: "According to our knowledge base, we're open from 09:00 to 20:00."

YOUR CONTEXT:

`,

  'de': `
${SEPARATOR}
WICHTIG: WISSENSBASIS-KONTEXT
${SEPARATOR}

BEISPIEL ZUR VERWENDUNG DES KONTEXTS:

Kontext: "Unser Geschäft ist von 09:00 bis 20:00 geöffnet."
Frage: "Wann haben Sie geöffnet?"
Antwort: "Laut unserer Wissensbasis sind wir von 09:00 bis 20:00 geöffnet."

IHR KONTEXT:

`,

  'fr': `
${SEPARATOR}
IMPORTANT: CONTEXTE DE LA BASE DE CONNAISSANCES
${SEPARATOR}

EXEMPLE D'UTILISATION DU CONTEXTE:

Contexte: "Notre magasin est ouvert de 09:00 à 20:00."
Question: "Quels sont vos horaires?"
Réponse: "Selon notre base de connaissances, nous sommes ouverts de 09:00 à 20:00."

VOTRE CONTEXTE:

`,

  'es': `
${SEPARATOR}
IMPORTANTE: CONTEXTO DE LA BASE DE CONOCIMIENTOS
${SEPARATOR}

EJEMPLO DE CÓMO USAR EL CONTEXTO:

Contexto: "Nuestra tienda está abierta de 09:00 a 20:00."
Pregunta: "¿Cuál es su horario?"
Respuesta: "Según nuestra base de conocimientos, estamos abiertos de 09:00 a 20:00."

SU CONTEXTO:

`,

  'it': `
${SEPARATOR}
IMPORTANTE: CONTESTO DELLA BASE DI CONOSCENZA
${SEPARATOR}

ESEMPIO DI COME UTILIZZARE IL CONTESTO:

Contesto: "Il nostro negozio è aperto dalle 09:00 alle 20:00."
Domanda: "Qual è il vostro orario?"
Risposta: "Secondo la nostra base di conoscenza, siamo aperti dalle 09:00 alle 20:00."

IL TUO CONTESTO:

`,

  'pt': `
${SEPARATOR}
IMPORTANTE: CONTEXTO DA BASE DE CONHECIMENTO
${SEPARATOR}

EXEMPLO DE COMO USAR O CONTEXTO:

Contexto: "Nossa loja está aberta das 09:00 às 20:00."
Pergunta: "Qual é o horário de funcionamento?"
Resposta: "De acordo com nossa base de conhecimento, estamos abertos das 09:00 às 20:00."

SEU CONTEXTO:

`,

  'nl': `
${SEPARATOR}
BELANGRIJK: KENNISBANK CONTEXT
${SEPARATOR}

VOORBEELD VAN HOE DE CONTEXT TE GEBRUIKEN:

Context: "Onze winkel is geopend van 09:00 tot 20:00."
Vraag: "Wat zijn uw openingstijden?"
Antwoord: "Volgens onze kennisbank zijn we geopend van 09:00 tot 20:00."

UW CONTEXT:

`,

  'pl': `
${SEPARATOR}
WAŻNE: KONTEKST BAZY WIEDZY
${SEPARATOR}

PRZYKŁAD UŻYCIA KONTEKSTU:

Kontekst: "Nasz sklep jest otwarty od 09:00 do 20:00."
Pytanie: "Jakie są godziny otwarcia?"
Odpowiedź: "Według naszej bazy wiedzy jesteśmy otwarci od 09:00 do 20:00."

TWÓJ KONTEKST:

`,

  'ru': `
${SEPARATOR}
ВАЖНО: КОНТЕКСТ БАЗЫ ЗНАНИЙ
${SEPARATOR}

ПРИМЕР ИСПОЛЬЗОВАНИЯ КОНТЕКСТА:

Контекст: "Наш магазин работает с 09:00 до 20:00."
Вопрос: "Каковы часы работы?"
Ответ: "Согласно нашей базе знаний, мы работаем с 09:00 до 20:00."

ВАШ КОНТЕКСТ:

`,

  'cs': `
${SEPARATOR}
DŮLEŽITÉ: KONTEXT ZNALOSTNÍ BÁZE
${SEPARATOR}

PŘÍKLAD POUŽITÍ KONTEXTU:

Kontext: "Naše prodejna je otevřena od 09:00 do 20:00."
Otázka: "Jaká je vaše otevírací doba?"
Odpověď: "Podle naší znalostní báze jsme otevřeni od 09:00 do 20:00."

VÁŠ KONTEXT:

`,

  'sl': `
${SEPARATOR}
POMEMBNO: KONTEKST BAZE ZNANJA
${SEPARATOR}

PRIMER UPORABE KONTEKSTA:

Kontekst: "Naša trgovina je odprta od 09:00 do 20:00."
Vprašanje: "Kateri so vaši odpiralni časi?"
Odgovor: "Glede na našo bazo znanja smo odprti od 09:00 do 20:00."

VAŠ KONTEKST:

`,

  'sr': `
${SEPARATOR}
ВАЖНО: КОНТЕКСТ БАЗЕ ЗНАЊА
${SEPARATOR}

ПРИМЕР КОРИШЋЕЊА КОНТЕКСТА:

Контекст: "Наша радња ради од 09:00 до 20:00."
Питање: "Када радите?"
Одговор: "Према нашој бази знања, радимо од 09:00 до 20:00."

ВАШ КОНТЕКСТ:

`,
};

// Add closing instruction for each language
const CLOSING_INSTRUCTIONS: Record<string, string> = {
  'hr': `
${SEPARATOR}
UPAMTI: Koristi PRVENSTVENO gornji kontekst za odgovor!
Ako kontekst ne sadrži odgovor, reci "Nemam tu informaciju u bazi znanja."
Odgovaraj ISKLJUČIVO na hrvatskom jeziku.
${SEPARATOR}
`,

  'en': `
${SEPARATOR}
REMEMBER: Use PRIMARILY the context above to answer!
If the context doesn't contain the answer, say "I don't have that information in my knowledge base."
${SEPARATOR}
`,

  'de': `
${SEPARATOR}
DENKEN SIE DARAN: Verwenden Sie IN ERSTER LINIE den obigen Kontext für die Antwort!
Wenn der Kontext die Antwort nicht enthält, sagen Sie "Ich habe diese Information nicht in meiner Wissensbasis."
Antworten Sie NUR auf Deutsch.
${SEPARATOR}
`,

  'fr': `
${SEPARATOR}
RAPPELEZ-VOUS: Utilisez PRINCIPALEMENT le contexte ci-dessus pour répondre!
Si le contexte ne contient pas la réponse, dites "Je n'ai pas cette information dans ma base de connaissances."
Répondez UNIQUEMENT en français.
${SEPARATOR}
`,

  'es': `
${SEPARATOR}
RECUERDE: ¡Use PRINCIPALMENTE el contexto anterior para responder!
Si el contexto no contiene la respuesta, diga "No tengo esa información en mi base de conocimientos."
Responda SOLO en español.
${SEPARATOR}
`,

  'it': `
${SEPARATOR}
RICORDA: Usa PRINCIPALMENTE il contesto sopra per rispondere!
Se il contesto non contiene la risposta, di' "Non ho quell'informazione nella mia base di conoscenza."
Rispondi SOLO in italiano.
${SEPARATOR}
`,

  'pt': `
${SEPARATOR}
LEMBRE-SE: Use PRINCIPALMENTE o contexto acima para responder!
Se o contexto não contiver a resposta, diga "Não tenho essa informação em minha base de conhecimento."
Responda APENAS em português.
${SEPARATOR}
`,

  'nl': `
${SEPARATOR}
ONTHOUD: Gebruik PRIMAIR de bovenstaande context om te antwoorden!
Als de context het antwoord niet bevat, zeg dan "Ik heb die informatie niet in mijn kennisbank."
Antwoord ALLEEN in het Nederlands.
${SEPARATOR}
`,

  'pl': `
${SEPARATOR}
PAMIĘTAJ: Użyj PRZEDE WSZYSTKIM powyższego kontekstu do odpowiedzi!
Jeśli kontekst nie zawiera odpowiedzi, powiedz "Nie mam tej informacji w mojej bazie wiedzy."
Odpowiadaj TYLKO po polsku.
${SEPARATOR}
`,

  'ru': `
${SEPARATOR}
ПОМНИТЕ: Используйте В ПЕРВУЮ ОЧЕРЕДЬ приведенный выше контекст для ответа!
Если контекст не содержит ответа, скажите "У меня нет этой информации в моей базе знаний."
Отвечайте ТОЛЬКО на русском языке.
${SEPARATOR}
`,

  'cs': `
${SEPARATOR}
PAMATUJTE: Použijte PŘEDNOSTNĚ výše uvedený kontext pro odpověď!
Pokud kontext neobsahuje odpověď, řekněte "Nemám tuto informaci ve své znalostní bázi."
Odpovídejte POUZE v češtině.
${SEPARATOR}
`,

  'sl': `
${SEPARATOR}
ZAPOMNITE: Uporabite PREDVSEM zgornji kontekst za odgovor!
Če kontekst ne vsebuje odgovora, recite "Nimam te informacije v svoji bazi znanja."
Odgovarjajte SAMO v slovenščini.
${SEPARATOR}
`,

  'sr': `
${SEPARATOR}
ЗАПАМТИТЕ: Користите ПРВЕНСТВЕНО горњи контекст за одговор!
Ако контекст не садржи одговор, реците "Немам ту информацију у својој бази знања."
Одговарајте САМО на српском језику.
${SEPARATOR}
`,
};

/**
 * Get RAG template for a specific language
 * @param language - ISO 639-1 language code (e.g., 'hr', 'en', 'de')
 * @param context - The context text to inject
 * @param similarity - Similarity score (0-1) for quality-based prompting
 * @param fallback - Fallback language if requested language not found (default: 'en')
 * @returns Complete RAG template string with context and closing instructions
 */
export function getRagTemplate(language: string, context: string, similarity: number = 1, fallback: string = 'en'): string {
  const lang = language in RAG_TEMPLATES ? language : fallback;
  const opening = RAG_TEMPLATES[lang] || RAG_TEMPLATES['en'];
  const closing = CLOSING_INSTRUCTIONS[lang] || CLOSING_INSTRUCTIONS['en'];

  return `${opening}${context}${closing}`;
}

/**
 * Get all supported languages for RAG templates
 * @returns Array of ISO 639-1 language codes
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(RAG_TEMPLATES);
}

/**
 * Check if a language is supported
 * @param language - ISO 639-1 language code
 * @returns true if language has a template
 */
export function isLanguageSupported(language: string): boolean {
  return language in RAG_TEMPLATES;
}
