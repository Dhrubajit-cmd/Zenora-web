import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

KEYWORD_RULES = {
    "food_and_drink": [
        "zomato", "swiggy", "starbucks", "restaurant", "cafe", "coffee", "lunch", "dinner", "grocery", "groceries",
        "supermarket", "food", "tea", "burger", "pizza", "mcdonalds", "kfc", "coke", "bar", "pub", "brewery", "eats",
        "bakery", "sweet", "snack", "dining", "swiggyinstamart", "blinkit", "zepto", "milk", "vegetables", "fruits"
    ],
    "rent": [
        "rent", "landlord", "flat", "apartment", "pg", "hostel", "lease", "accommodation", "maintenance", "flat rent"
    ],
    "utilities": [
        "bill", "electricity", "water", "gas", "wifi", "internet", "broadband", "recharge", "phone bill", "jio", 
        "airtel", "postpaid", "prepaid", "dth", "cable", "power", "electricity bill", "water bill", "broadband bill",
        "act fibernet", "tata play", "dish tv"
    ],
    "entertainment": [
        "netflix", "spotify", "prime video", "movie", "cinema", "theatre", "hotstar", "game", "gaming", "steam",
        "concert", "clubbing", "party", "show", "ticket", "bookmyshow", "pvr", "inox", "playstation", "xbox", "nintendo"
    ],
    "travel": [
        "uber", "ola", "rapido", "cab", "taxi", "flight", "indigo", "airasia", "irctc", "train", "ticket", "travel",
        "holiday", "hotel", "makemytrip", "mmt", "fuel", "petrol", "diesel", "metro", "bus", "zoomcar", "goibibo"
    ],
    "health_and_fitness": [
        "gym", "workout", "hospital", "doctor", "medicine", "pharmacy", "medical", "dentist", "health", "insurance",
        "supplement", "proteins", "apollo", "netmeds", "1mg", "clinics", "consultation"
    ],
    "shopping": [
        "amazon", "flipkart", "myntra", "zara", "clothing", "shoes", "mall", "electronics", "gadget", "iphone", 
        "laptop", "clothes", "fashion", "shopping", "store", "superstore", "h&m", "uniqlo", "pantaloons", "ajio"
    ]
}

CORPUS = [
    # food_and_drink
    ("starbucks coffee", "food_and_drink"),
    ("zomato food delivery", "food_and_drink"),
    ("swiggy lunch order", "food_and_drink"),
    ("groceries at local supermarket", "food_and_drink"),
    ("grocery store bill", "food_and_drink"),
    ("blinkit order for snacks", "food_and_drink"),
    ("zepto grocery delivery", "food_and_drink"),
    ("dinner at fine dining restaurant", "food_and_drink"),
    ("mcdonalds burgers and fries", "food_and_drink"),
    ("pizza hut order", "food_and_drink"),
    ("kfc chicken bucket", "food_and_drink"),
    ("coffee and sandwich at cafe", "food_and_drink"),
    ("purchase of milk and vegetables", "food_and_drink"),
    ("bar and pub drinks", "food_and_drink"),
    ("sweet shop snacks", "food_and_drink"),
    
    # rent
    ("monthly house rent payment", "rent"),
    ("apartment rent for the month", "rent"),
    ("flat rent paid to landlord", "rent"),
    ("paying guest pg accommodation fee", "rent"),
    ("hostel room rent", "rent"),
    ("maintenance charge for society flat", "rent"),
    
    # utilities
    ("electricity bill payment", "utilities"),
    ("broadband internet bill for wifi", "utilities"),
    ("jio mobile network recharge", "utilities"),
    ("airtel postpaid phone bill", "utilities"),
    ("water bill payment to corporation", "utilities"),
    ("indane gas cylinder refill bill", "utilities"),
    ("dth tata play recharge", "utilities"),
    ("mobile recharge Vi prepaid", "utilities"),
    ("act fibernet internet bill", "utilities"),
    
    # entertainment
    ("netflix monthly premium subscription", "entertainment"),
    ("spotify music subscription", "entertainment"),
    ("amazon prime video subscription", "entertainment"),
    ("movie tickets at pvr cinema", "entertainment"),
    ("steam game store purchase", "entertainment"),
    ("concert show entry tickets", "entertainment"),
    ("night club entry and party", "entertainment"),
    ("bookmyshow ticket booking", "entertainment"),
    ("disney hotstar subscription", "entertainment"),
    ("playstation network purchase", "entertainment"),
    
    # travel
    ("uber cab ride to office", "travel"),
    ("ola cab trip booking", "travel"),
    ("rapido bike taxi fare", "travel"),
    ("irctc train ticket booking", "travel"),
    ("indigo flight ticket to delhi", "travel"),
    ("petrol pump fuel filling", "travel"),
    ("diesel refueling at petrol station", "travel"),
    ("metro smart card recharge", "travel"),
    ("hotel stay booking at resort", "travel"),
    ("bus ticket booking on redbus", "travel"),
    ("cab ride fare", "travel"),
    
    # health_and_fitness
    ("gym monthly membership fee", "health_and_fitness"),
    ("cult fit pass workout session", "health_and_fitness"),
    ("doctor consultation charge at hospital", "health_and_fitness"),
    ("medicines purchase at pharmacy store", "health_and_fitness"),
    ("apollo pharmacy medicine bill", "health_and_fitness"),
    ("dental checkup and clinic fees", "health_and_fitness"),
    ("health insurance monthly premium", "health_and_fitness"),
    ("medical diagnostic lab tests", "health_and_fitness"),
    ("netmeds online medicine order", "health_and_fitness"),
    
    # shopping
    ("amazon shopping order package", "shopping"),
    ("flipkart electronics purchase", "shopping"),
    ("myntra fashion clothes shopping", "shopping"),
    ("zara brand clothing purchase", "shopping"),
    ("new shoes at nike store", "shopping"),
    ("clothes and fashion shopping at mall", "shopping"),
    ("electronics laptop purchase", "shopping"),
    ("uniqlo winter jacket purchase", "shopping"),
    ("h&m fashion store apparel", "shopping"),
    ("iphone phone case purchase", "shopping")
]

class LightweightClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.corpus_texts = [item[0] for item in CORPUS]
        self.corpus_labels = [item[1] for item in CORPUS]
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus_texts)
        
    def classify(self, text: str) -> str:
        text_lower = text.lower().strip()
        
        # 1. Check exact or substring keyword rules first
        for category, keywords in KEYWORD_RULES.items():
            for kw in keywords:
                if kw in text_lower:
                    return category
                    
        # 2. Fallback to TF-IDF Cosine Similarity
        query_vector = self.vectorizer.transform([text_lower])
        similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
        max_idx = np.argmax(similarities)
        
        # If the highest similarity is above a threshold, use it. Otherwise default to "other".
        if similarities[max_idx] > 0.1:
            return self.corpus_labels[max_idx]
            
        return "other"
