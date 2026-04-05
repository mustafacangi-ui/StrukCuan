import Tesseract from 'tesseract.js';

export interface AIReceiptResult {
  store_name: string | null;
  product_name: string | null;
  original_price: number | null;
  discount_price: number | null;
  discount_percent: number | null;
  expiry_date: string | null;
  red_label: boolean;
  suggested_ticket_reward: number;
  confidence: number;
  raw_text: string;
  ai_detected_keywords: string[];
}

// 1. Retailers (Indonesian + German)
const KNOWN_STORES = [
  'indomaret', 'alfamart', 'hypermart', 'transmart', 'super indo',
  'giant', 'hero', 'lotte mart', 'carrefour', 'guardian',
  'watsons', 'ranch market', 'farmer\'s market', 'farmers market',
  'dm', 'dm-drogerie', 'rossmann', 'müller', 'lidl', 'aldi', 'rewe', 
  'kaufland', 'edeka', 'netto', 'penny'
];

// 2. Discount Keywords
const DISCOUNT_KEYWORDS = [
  'diskon', 'promo', 'hemat', 'cashback', 'murah', 'potongan',
  'sale', 'clearance', 'markdown', 'red label', 'expiring soon',
  'near expiry', 'buy 1 get 1', 'b1g1', 'special price', '50%'
];

// 3. Expiry Keywords
const EXPIRY_KEYWORDS = [
  'exp', 'expiry', 'expired', 'best before', 'use before', 'bb', 'consume before'
];

// 4. Invalid Product Words (Metrics, Totals, Taxes - EN/ID/DE)
const INVALID_PRODUCT_WORDS = [
  'diskon', 'promo', 'hemat', 'cashback', 'expiry', 'exp', 'best before',
  'total', 'subtotal', 'tax', 'ppn', 'qty', 'amount', 'transaction', 'invoice', 
  'payment', 'kembali', 'tunai', 'cash', 'change', 'struk',
  'summe', 'eur', 'kauf', 'mwst', 'brutto', 'netto', 'kreditkarte', 'zahlen',
  'rabatt', 'payback', 'punkte', 'steuer', 'kartenzahlung', 'tse'
];

// 5. Preferred Product Words
const PREFERRED_PRODUCT_WORDS = [
  'food', 'nugget', 'milk', 'shampoo', 'bread', 'snack', 'coffee', 'yogurt', 'detergent',
  'cat', 'chicken', 'roti', 'susu', 'kopi', 'minuman', 'makanan', 'sabun'
];

export async function extractReceiptData(imageUrl: string): Promise<AIReceiptResult> {
  console.log('[extractReceiptData] Starting OCR pipeline');
  console.log('[OCR] imageUrl', imageUrl);

  try {
    console.log('[OCR] starting fetch');
    const response = await fetch(imageUrl);
    console.log('[OCR] fetch status', response.status);

    if (!response.ok) {
       console.error('[OCR] Image fetch failed!', response.statusText);
       console.log('[OCR] URL type check:', imageUrl.includes('supabase') ? 'Supabase Storage' : 'External');
    }

    const blob = await response.blob();
    console.log('[OCR] blob size', blob.size);

    const localImageUrl = URL.createObjectURL(blob);
    console.log('[OCR] localImageUrl created');

    console.log('[OCR] tesseract started');
    const result = await Tesseract.recognize(localImageUrl, 'eng', {
      logger: (m) => console.log(`[extractReceiptData] Tesseract progress: ${m.status} ${(m.progress * 100).toFixed(2)}%`),
      // @ts-ignore: Tesseract.js typings don't expose all worker parameters in the simple API
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/%€ '
    });
    console.log('[OCR] tesseract finished');

    URL.revokeObjectURL(localImageUrl); // cleanup memory

    const rawText = result.data.text;
    console.log('[OCR] raw text length', rawText.length);
    let confidence = result.data.confidence / 100; // Tesseract returns 0-100
    const lowercaseText = rawText.toLowerCase();

    console.log('[extractReceiptData] Raw text extracted. Base Confidence:', confidence);
    console.log('[extractReceiptData] OCR raw text:\n', rawText);

    const resultObj: AIReceiptResult = {
      store_name: null,
      product_name: null,
      original_price: null,
      discount_price: null,
      discount_percent: null,
      expiry_date: null,
      red_label: false,
      suggested_ticket_reward: 1,
      confidence: confidence, // Will be adjusted
      raw_text: rawText,
      ai_detected_keywords: []
    };

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // --- STORE DETECTION ---
    for (const store of KNOWN_STORES) {
      // Regex boundary for exact word matching or check if store is standalone
      // to avoid matching 'dm' inside 'admit'
      const storeRegex = new RegExp(`\\b${store}\\b`, 'i');
      if (storeRegex.test(lowercaseText) || lowercaseText.includes(store + '-drogerie') || lowercaseText.includes(store + ' gmbh')) {
        resultObj.store_name = store.toUpperCase();
        break;
      }
    }
    // Fallback store detection
    if (!resultObj.store_name && lines.length > 0) {
      const firstLineOnlyChars = lines[0].replace(/[^a-zA-Z0-9 &.-]/g, '').trim();
      if (firstLineOnlyChars.length > 3) {
         resultObj.store_name = firstLineOnlyChars;
      }
    }
    console.log('[extractReceiptData] Detected Store:', resultObj.store_name);

    // --- PRODUCT NAME DETECTION ---
    const candidateLines: string[] = [];
    const rejectedLines: string[] = [];

    for (const line of lines) {
      const lLower = line.toLowerCase();
      
      // Reject if line matches store name
      if (resultObj.store_name && lLower.includes(resultObj.store_name.toLowerCase())) {
          rejectedLines.push(`${line} (rejected: is store name)`);
          continue;
      }

      // Reject if numbers only or punctuation
      if (/^[\d.,\s\-%]+$/.test(line)) {
          rejectedLines.push(`${line} (rejected: numbers/punctuation only)`);
          continue;
      }

      // Reject if contains Rp, EUR, %, dates
      if (lLower.includes('rp') || lLower.includes('eur') || line.includes('%') || /\b(\d{2}[\/\-.\\]\d{2}[\/\-.\\]\d{4})\b/.test(line)) {
          rejectedLines.push(`${line} (rejected: contains price/percent/date format)`);
          continue;
      }

      // Reject if contains general invalid metrics words
      const hasInvalid = INVALID_PRODUCT_WORDS.some(w => lLower.includes(w));
      if (hasInvalid) {
          rejectedLines.push(`${line} (rejected: contains invalid receipt metric word)`);
          continue;
      }

      // Medium length limit (5-40)
      if (line.length < 5 || line.length > 40) {
          rejectedLines.push(`${line} (rejected: length out of bounds)`);
          continue;
      }

      candidateLines.push(line);
    }

    console.log('[extractReceiptData] Rejected Product Lines:\n', rejectedLines.join('\n'));
    console.log('[extractReceiptData] Candidate Product Lines:\n', candidateLines.join('\n'));

    if (candidateLines.length > 0) {
       const scoredCandidates = candidateLines.map(cand => {
          let score = 0;
          const cLower = cand.toLowerCase();
          
          // Boost known preferred words
          if (PREFERRED_PRODUCT_WORDS.some(w => cLower.includes(w))) score += 10;
          
          // Boost mostly uppercase (like typical receipt lines)
          if (cand === cand.toUpperCase()) score += 2;
          
          return { text: cand, score };
       });

       scoredCandidates.sort((a, b) => b.score - a.score);
       resultObj.product_name = scoredCandidates[0].text;
       console.log('[extractReceiptData] Selected Product Line:', resultObj.product_name);
    } else {
       console.log('[extractReceiptData] No Product Line Selected');
    }

    // --- DISCOUNT KEYWORDS & RED LABEL DETECTION ---
    const detectedDiscountKeywords = DISCOUNT_KEYWORDS.filter(kw => lowercaseText.includes(kw));
    if (detectedDiscountKeywords.length > 0) {
      resultObj.red_label = true;
      resultObj.ai_detected_keywords.push(...detectedDiscountKeywords);
    }
    console.log('[extractReceiptData] Detected Discount Keywords:', detectedDiscountKeywords);

    // PERCENTAGE DETECTION
    const percentMatch = rawText.match(/(\d{1,2})%/);
    if (percentMatch) {
      resultObj.discount_percent = parseInt(percentMatch[1], 10);
      if (resultObj.discount_percent >= 50) {
         resultObj.red_label = true;
      }
    }

    // --- PRICE DETECTION (Both IDR thousands and EUR/Global decimals) ---
    // Matches formats like 14,80 or 1.200 or 15.000,00 or 4,95
    const priceRegex = /(?:rp|eur|€)?\s*\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2,3})?\b/gi;
    const priceMatches = rawText.match(priceRegex);
    let parsedPrices: number[] = [];

    if (priceMatches && priceMatches.length > 0) {
      parsedPrices = priceMatches.map(p => {
        let cleanStr = p.replace(/rp|eur|€/gi, '').trim();
        
        // Handling German/EU decimals: '14,80' -> '14.80'
        // If there's exactly one comma and it's near the end, treat as decimal
        if ((cleanStr.match(/,/g) || []).length === 1 && /,\d{1,2}$/.test(cleanStr)) {
            cleanStr = cleanStr.replace(',', '.');
        }
        // Remove ALL remaining commas (usually thousands separator in US/UK, or if replaced above it's clean)
        cleanStr = cleanStr.replace(/,/g, '');
        
        // Handle IDR where period is a thousand separator "12.000"
        if ((cleanStr.match(/\./g) || []).length >= 1 && /\.\d{3}$/.test(cleanStr)) {
            // Check if it's likely an IDR thousands separator (no cents)
            cleanStr = cleanStr.replace(/\./g, '');
        }

        const parsed = parseFloat(cleanStr);
        return parsed;
      }).filter(n => !isNaN(n) && n > 0.5); // Filter out tiny non-prices or zeros

      parsedPrices.sort((a, b) => b - a);
      if (parsedPrices.length >= 2) {
         resultObj.original_price = parsedPrices[0];
         resultObj.discount_price = parsedPrices[1];
      } else if (parsedPrices.length === 1) {
         resultObj.original_price = parsedPrices[0];
      }
    }
    console.log('[extractReceiptData] Parsed Prices:', parsedPrices);

    // --- EXPIRY DATE DETECTION ---
    const detectedExpiryKeywords = EXPIRY_KEYWORDS.filter(kw => lowercaseText.includes(kw));
    if (detectedExpiryKeywords.length > 0) {
       resultObj.ai_detected_keywords.push(...detectedExpiryKeywords);
    }
    console.log('[extractReceiptData] Detected Expiry Keywords:', detectedExpiryKeywords);

    const dateRegex = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}|\d{2}\.\d{2}\.\d{4})\b/;
    const dateMatch = rawText.match(dateRegex);
    if (dateMatch) {
      resultObj.expiry_date = dateMatch[1];
    }

    // --- REWARD LOGIC ---
    if (resultObj.red_label) {
       if (resultObj.discount_percent && resultObj.discount_percent >= 50) {
          resultObj.suggested_ticket_reward = 3;
       } else {
          resultObj.suggested_ticket_reward = 2;
       }
    } else {
       resultObj.suggested_ticket_reward = 1;
    }

    // --- CONFIDENCE ADJUSTMENT ---
    let finalConfidence = confidence; 
    
    if (rawText.length < 50) finalConfidence -= 0.3;
    if (!resultObj.store_name) finalConfidence -= 0.15;
    if (parsedPrices.length === 0) finalConfidence -= 0.2;
    if (!resultObj.expiry_date && detectedExpiryKeywords.length === 0) finalConfidence -= 0.1;
    if (parsedPrices.length > 4) finalConfidence -= 0.1;

    // Confidence boost for a healthy product name extraction
    if (resultObj.product_name) {
       const len = resultObj.product_name.length;
       const hasLetters = /[a-zA-Z]/.test(resultObj.product_name);
       const totalDigits = (resultObj.product_name.match(/\d/g) || []).length;
       
       if (hasLetters && len >= 5 && len <= 40 && totalDigits < 5) {
          finalConfidence += 0.1; // healthy product name boost
       }
    }
    
    // Bounds Check
    finalConfidence = Math.max(0, Math.min(1, finalConfidence));
    resultObj.confidence = finalConfidence;

    console.log('[extractReceiptData] Final Confidence Score:', finalConfidence);
    console.log('[extractReceiptData] OCR parsed result:', resultObj);
    
    return resultObj;

  } catch (error) {
    console.error('[extractReceiptData] Error running OCR:', error);
    throw error;
  }
}
