// K-Means Spender Profiler Parameters (dumped from scikit-learn models)
const SCALER_MEAN = [11176.0105, 16749.091666666667, 3623.8845, 2781.5008333333335, 1537.8975, 1098.2556666666667, 3906.255833333333, 5315.1195];
const SCALER_SCALE = [6785.019313314916, 9938.240036273888, 2193.637298679923, 1770.574198200301, 2080.5836906968557, 1535.1491168508317, 2523.8327817790623, 5328.308970635344];

const CENTROIDS = [
  [-0.7674196360069321, -0.7824916252090045, -0.7718333527850582, -0.7384836766554088, -0.35288750269531843, -0.35036233248188015, -0.7283432310807599, -0.45301145833394885],
  [0.2688777065228, 0.2713472854287572, 0.2663252901533364, 0.2639928140011767, 0.1129028086139365, 0.12198559111177468, 0.2584934021822232, 0.15519395006628695],
  [1.9142631133779102, 1.9593486190894724, 1.9361932849539571, 1.8280884864563036, 0.9088544056744773, 0.8759991038197547, 1.8079801910348394, 1.1393925126702613]
];

const CLUSTER_LABELS = {
  0: "Saver",
  1: "Balanced",
  2: "High Spender"
};

// TF-IDF Categorizer Parameters (from lightweight_classifier.py)
const KEYWORD_RULES = {
  "food_and_drink": [
    "zomato", "swiggy", "starbucks", "restaurant", "cafe", "coffee", "lunch", "dinner", "grocery", "groceries",
    "supermarket", "food", "tea", "burger", "pizza", "mcdonalds", "kfc", "coke", "bar", "pub", "brewery", "eats",
    "bakery", "sweet", "snack", "dining", "swiggyinstamart", "blinkit", "zepto", "milk", "vegetables", "fruits",
    "instamart", "bigbasket", "bbdaily", "dominos", "burger king", "pizzahut", "dunkin", "subway", "baskin robbins"
  ],
  "rent": [
    "rent", "landlord", "flat", "apartment", "pg", "hostel", "lease", "accommodation", "maintenance", "flat rent"
  ],
  "utilities": [
    "bill", "electricity", "water", "gas", "wifi", "internet", "broadband", "recharge", "phone bill", "jio", 
    "airtel", "postpaid", "prepaid", "dth", "cable", "power", "electricity bill", "water bill", "broadband bill",
    "act fibernet", "tata play", "dish tv", "insurance", "lic", "policybazaar"
  ],
  "entertainment": [
    "netflix", "spotify", "prime video", "movie", "cinema", "theatre", "hotstar", "game", "gaming", "steam",
    "concert", "clubbing", "party", "show", "ticket", "bookmyshow", "pvr", "inox", "playstation", "xbox", "nintendo"
  ],
  "travel": [
    "uber", "ola", "rapido", "cab", "taxi", "flight", "indigo", "airasia", "irctc", "train", "ticket", "travel",
    "holiday", "hotel", "makemytrip", "mmt", "fuel", "petrol", "diesel", "metro", "bus", "zoomcar", "goibibo",
    "shell", "hpcl", "bpcl", "iocl", "easemytrip", "yatra", "abhibus", "redbus", "fastag"
  ],
  "health_and_fitness": [
    "gym", "workout", "hospital", "doctor", "medicine", "pharmacy", "medical", "dentist", "health", "insurance",
    "supplement", "proteins", "apollo", "netmeds", "1mg", "clinics", "consultation"
  ],
  "shopping": [
    "amazon", "flipkart", "myntra", "zara", "clothing", "shoes", "mall", "electronics", "gadget", "iphone", 
    "laptop", "clothes", "fashion", "shopping", "store", "superstore", "h&m", "uniqlo", "pantaloons", "ajio",
    "meesho", "nykaa", "lenskart", "decathlon", "croma", "reliance digital", "jiomart"
  ]
};

const CORPUS = [
  ["starbucks coffee", "food_and_drink"],
  ["zomato food delivery", "food_and_drink"],
  ["swiggy lunch order", "food_and_drink"],
  ["groceries at local supermarket", "food_and_drink"],
  ["grocery store bill", "food_and_drink"],
  ["blinkit order for snacks", "food_and_drink"],
  ["zepto grocery delivery", "food_and_drink"],
  ["dinner at fine dining restaurant", "food_and_drink"],
  ["mcdonalds burgers and fries", "food_and_drink"],
  ["pizza hut order", "food_and_drink"],
  ["kfc chicken bucket", "food_and_drink"],
  ["coffee and sandwich at cafe", "food_and_drink"],
  ["purchase of milk and vegetables", "food_and_drink"],
  ["bar and pub drinks", "food_and_drink"],
  ["sweet shop snacks", "food_and_drink"],
  
  ["monthly house rent payment", "rent"],
  ["apartment rent for the month", "rent"],
  ["flat rent paid to landlord", "rent"],
  ["paying guest pg accommodation fee", "rent"],
  ["hostel room rent", "rent"],
  ["maintenance charge for society flat", "rent"],
  
  ["electricity bill payment", "utilities"],
  ["broadband internet bill for wifi", "utilities"],
  ["jio mobile network recharge", "utilities"],
  ["airtel postpaid phone bill", "utilities"],
  ["water bill payment to corporation", "utilities"],
  ["indane gas cylinder refill bill", "utilities"],
  ["dth tata play recharge", "utilities"],
  ["mobile recharge Vi prepaid", "utilities"],
  ["act fibernet internet bill", "utilities"],
  
  ["netflix monthly premium subscription", "entertainment"],
  ["spotify music subscription", "entertainment"],
  ["amazon prime video subscription", "entertainment"],
  ["movie tickets at pvr cinema", "entertainment"],
  ["steam game store purchase", "entertainment"],
  ["concert show entry tickets", "entertainment"],
  ["night club entry and party", "entertainment"],
  ["bookmyshow ticket booking", "entertainment"],
  ["disney hotstar subscription", "entertainment"],
  ["playstation network purchase", "entertainment"],
  
  ["uber cab ride to office", "travel"],
  ["ola cab trip booking", "travel"],
  ["rapido bike taxi fare", "travel"],
  ["irctc train ticket booking", "travel"],
  ["indigo flight ticket to delhi", "travel"],
  ["petrol pump fuel filling", "travel"],
  ["diesel refueling at petrol station", "travel"],
  ["metro smart card recharge", "travel"],
  ["hotel stay booking at resort", "travel"],
  ["bus ticket booking on redbus", "travel"],
  ["cab ride fare", "travel"],
  
  ["gym monthly membership fee", "health_and_fitness"],
  ["cult fit pass workout session", "health_and_fitness"],
  ["doctor consultation charge at hospital", "health_and_fitness"],
  ["medicines purchase at pharmacy store", "health_and_fitness"],
  ["apollo pharmacy medicine bill", "health_and_fitness"],
  ["dental checkup and clinic fees", "health_and_fitness"],
  ["health insurance monthly premium", "health_and_fitness"],
  ["medical diagnostic lab tests", "health_and_fitness"],
  ["netmeds online medicine order", "health_and_fitness"],
  
  ["amazon shopping order package", "shopping"],
  ["flipkart electronics purchase", "shopping"],
  ["myntra fashion clothes shopping", "shopping"],
  ["zara brand clothing purchase", "shopping"],
  ["new shoes at nike store", "shopping"],
  ["clothes and fashion shopping at mall", "shopping"],
  ["electronics laptop purchase", "shopping"],
  ["uniqlo winter jacket purchase", "shopping"],
  ["h&m fashion store apparel", "shopping"],
  ["iphone phone case purchase", "shopping"]
];

const STOPWORDS = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'with', 'from', 'by', 'is', 'are', 'was', 'were', 'it', 'this', 'that']);

// Tokenizer splits text into lowercase words, ignoring punctuation and stopwords
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

// -------------------------------------------------------------
// Precompile TF-IDF structures on module load for 0ms execution
// -------------------------------------------------------------
const corpusDocs = CORPUS.map(item => tokenize(item[0]));
const corpusLabels = CORPUS.map(item => item[1]);
const N = corpusDocs.length;

// Count document frequencies (DF)
const dfMap = {};
corpusDocs.forEach(tokens => {
  const uniqueTokens = new Set(tokens);
  uniqueTokens.forEach(token => {
    dfMap[token] = (dfMap[token] || 0) + 1;
  });
});

// Calculate IDF for each term: ln((1 + N) / (1 + DF)) + 1
const idfMap = {};
const vocab = Object.keys(dfMap);
vocab.forEach(token => {
  idfMap[token] = Math.log((1 + N) / (1 + dfMap[token])) + 1;
});

// Generate normalized TF-IDF vectors for all corpus documents
const corpusVectors = corpusDocs.map(tokens => {
  const tf = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });

  const vector = {};
  let sumSquare = 0;
  vocab.forEach(token => {
    if (tf[token]) {
      const val = tf[token] * idfMap[token];
      vector[token] = val;
      sumSquare += val * val;
    }
  });

  const length = Math.sqrt(sumSquare);
  if (length > 0) {
    vocab.forEach(token => {
      if (vector[token]) {
        vector[token] /= length;
      }
    });
  }
  return vector;
});

// -------------------------------------------------------------
// Exported Functions
// -------------------------------------------------------------

/**
 * Predicts the user's spending behavior profile based on monthly category expenditures.
 * Uses client-side K-Means clustering matching scikit-learn output.
 * @param {Object} data - Monthly expenditures mapping category keys to values
 * @returns {Object} Predicted cluster ID and spender behavior label
 */
export function predictSpenderType(data) {
  const x = [
    data.food_and_drink || 0,
    data.rent || 0,
    data.utilities || 0,
    data.entertainment || 0,
    data.travel || 0,
    data.health_and_fitness || 0,
    data.shopping || 0,
    data.other || 0
  ];

  // Scale data using the StandardScaler parameters
  const scaledX = x.map((val, idx) => (val - SCALER_MEAN[idx]) / SCALER_SCALE[idx]);

  // Find nearest cluster centroid
  let minDistance = Infinity;
  let predictedCluster = 0;

  CENTROIDS.forEach((centroid, clusterIdx) => {
    let distanceSum = 0;
    for (let i = 0; i < centroid.length; i++) {
      distanceSum += Math.pow(scaledX[i] - centroid[i], 2);
    }
    const distance = Math.sqrt(distanceSum);
    if (distance < minDistance) {
      minDistance = distance;
      predictedCluster = clusterIdx;
    }
  });

  return {
    cluster: predictedCluster,
    spender_type: CLUSTER_LABELS[predictedCluster] || "Unknown"
  };
}

/**
 * Classifies a raw merchant/transaction string into an expense category.
 * Uses substring rules first, falling back to TF-IDF Cosine Similarity.
 * @param {string} text - Raw transaction details (e.g. "Swiggy order")
 * @returns {string} Assigned expense category key
 */
export function classifyExpense(text) {
  if (!text) return "other";
  const textLower = text.toLowerCase().trim();

  // 1. Keyword-based matching
  for (const [category, keywords] of Object.entries(KEYWORD_RULES)) {
    for (const kw of keywords) {
      if (textLower.includes(kw)) {
        return category;
      }
    }
  }

  // 2. Fallback to TF-IDF Cosine Similarity
  const queryTokens = tokenize(text);
  if (queryTokens.length === 0) {
    return "other";
  }

  const queryTF = {};
  queryTokens.forEach(token => {
    queryTF[token] = (queryTF[token] || 0) + 1;
  });

  const queryVector = {};
  let sumSquare = 0;
  vocab.forEach(token => {
    if (queryTF[token]) {
      const val = queryTF[token] * idfMap[token];
      queryVector[token] = val;
      sumSquare += val * val;
    }
  });

  const queryLength = Math.sqrt(sumSquare);
  if (queryLength > 0) {
    vocab.forEach(token => {
      if (queryVector[token]) {
        queryVector[token] /= queryLength;
      }
    });
  } else {
    return "other";
  }

  let maxSimilarity = -1;
  let bestLabelIdx = -1;

  corpusVectors.forEach((corpVec, docIdx) => {
    let dotProduct = 0;
    for (const token of queryTokens) {
      if (corpVec[token] && queryVector[token]) {
        dotProduct += corpVec[token] * queryVector[token];
      }
    }
    if (dotProduct > maxSimilarity) {
      maxSimilarity = dotProduct;
      bestLabelIdx = docIdx;
    }
  });

  if (maxSimilarity > 0.1 && bestLabelIdx !== -1) {
    return corpusLabels[bestLabelIdx];
  }

  return "other";
}
