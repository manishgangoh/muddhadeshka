// Keyword-based auto-categorization for Hindi/English news titles.
// Used because several feeds (NDTV Hindi, TV9, News18) are general and mis-tag everything.

const RULES = {
  khel: ["क्रिकेट", "क्रिकेटर", "आईपीएल", "ipl", "टीम इंडिया", "वर्ल्ड कप", "wtc", "टेस्ट मैच", "वनडे", "टी20", "मैच", "खिलाड़ी", "बल्लेबाज", "गेंदबाज", "विकेट", "पारी", "फाइनल", "टूर्नामेंट", "फुटबॉल", "हॉकी", "बैडमिंटन", "कुश्ती", "ओलंपिक", "मेडल", "कोहली", "रोहित", "धोनी", "बीसीसीआई", "cricket", "sports", "player", "world cup", "football"],
  manoranjan: ["फिल्म", "फिल्मों", "बॉलीवुड", "हॉलीवुड", "अभिनेता", "अभिनेत्री", "एक्टर", "एक्ट्रेस", "रिलीज", "बॉक्स ऑफिस", "गाना", "सॉन्ग", "ट्रेलर", "टीज़र", "वेब सीरीज", "सिनेमा", "शाहरुख", "सलमान", "आमिर", "दीपिका", "आलिया", "कैटरीना", "हीरोइन", "डायरेक्टर", "शूटिंग", "एक्ट्रेस", "movie", "film", "bollywood", "actor", "actress", "trailer", "box office", "song"],
  tech: ["मोबाइल", "स्मार्टफोन", "ऐप", "गैजेट", "5g", "लैपटॉप", "फोन", "फोल्ड", "कैमरा", "सॉफ्टवेयर", "गूगल", "एप्पल", "सैमसंग", "व्हाट्सएप", "मोटोरोला", "चिप", "smartphone", "gadget", "laptop", "motorola", "iphone", "android", "app", "tech"],
  business: ["शेयर", "बाजार", "बाज़ार", "सेंसेक्स", "निफ्टी", "रुपया", "रुपये", "कंपनी", "बिजनेस", "बिज़नेस", "पेट्रोल", "डीजल", "सोना", "चांदी", "निवेश", "बैंक", "ipo", "जीडीपी", "अर्थव्यवस्था", "कारोबार", "मुनाफा", "कीमत", "दाम", "ईएमआई", "टैक्स", "जीएसटी", "stock", "market", "sensex", "nifty", "business", "economy", "price"],
  swasthya: ["स्वास्थ्य", "सेहत", "बीमारी", "डाइट", "फिटनेस", "वजन", "प्रोटीन", "विटामिन", "डॉक्टर", "हेल्थ", "स्नैक्स", "कैल्शियम", "इम्यूनिटी", "इलाज", "दवा", "कैंसर", "शुगर", "हार्ट", "health", "diet", "fitness", "disease"],
  vigyan: ["अंतरिक्ष", "नासा", "nasa", "इसरो", "isro", "ग्रह", "उपग्रह", "रॉकेट", "खगोल", "वैज्ञानिक", "ब्रह्मांड", "space", "science", "satellite"],
  rajniti: ["मोदी", "राहुल गांधी", "बीजेपी", "भाजपा", "कांग्रेस", "चुनाव", "सरकार", "संसद", "मंत्री", "विधानसभा", "लोकसभा", "राज्यसभा", "सांसद", "विधायक", "पार्टी", "सीएम", "मुख्यमंत्री", "प्रधानमंत्री", "राजनीति", "अमित शाह", "केजरीवाल", "ममता", "योगी", "गठबंधन", "रैली", "बीजेपी", "election", "government", "parliament", "minister", "bjp", "congress", "modi"],
};

export function categorize(title = "", summary = "") {
  const text = `${title} ${summary}`.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [slug, words] of Object.entries(RULES)) {
    let score = 0;
    for (const w of words) if (text.includes(w)) score++;
    if (score > bestScore) { bestScore = score; best = slug; }
  }
  return bestScore > 0 ? best : null;
}
