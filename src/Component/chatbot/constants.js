export const BOT_AVATAR = '/assets/images/chatbot-avatar.png'
export const POSITION_STORAGE_KEY = 'chatbot_position_v2'
export const SLOT_MEMORY_KEY = 'chatbot_slot_memory_v1'

/* Below this width the chat window takes over the whole screen.
   Keep this in sync with the fullscreen media query in chatbotStyles.js. */
export const MOBILE_FULLSCREEN_QUERY = '(max-width: 767px)'
export const TRANSCRIPT_KEY = 'chatbot_transcript_v1'

/* ══════════════════════════════════════════════════════════
   PRODUCT / CATEGORY VOCABULARY
   Canonical type -> every phrase a real shopper might type.
   Used for intent, search scoring and typo protection.
══════════════════════════════════════════════════════════ */
export const CATEGORY_SYNONYMS = {
  shirt: ['shirt', 'shirts', 'formal shirt', 'casual shirt', 'kameez'],
  tshirt: ['tshirt', 't-shirt', 't shirt', 'tees', 'tee', 'tshirts', 't-shirts', 'polo', 'polo tshirt'],
  kurta: ['kurta', 'kurtas', 'pathani', 'kurta pyjama', 'kurta set'],
  kurti: ['kurti', 'kurtis', 'kurthi', 'tunic'],
  saree: ['saree', 'sarees', 'sari', 'saris'],
  lehenga: ['lehenga', 'lehanga', 'lehengas', 'ghagra', 'chaniya choli'],
  suit: ['salwar', 'salwar suit', 'churidar', 'anarkali', 'suit set', 'punjabi suit'],
  dress: ['dress', 'dresses', 'frock', 'gown', 'gowns', 'maxi', 'midi', 'bodycon', 'one piece', 'onepiece'],
  top: ['top', 'tops', 'crop top', 'blouse', 'tank top', 'peplum'],
  blazer: ['blazer', 'blazers', 'tuxedo', 'suit jacket', 'waistcoat'],
  coat: ['coat', 'coats', 'overcoat', 'trench coat', 'long coat'],
  jacket: ['jacket', 'jackets', 'bomber', 'denim jacket', 'windcheater', 'puffer'],
  hoodie: ['hoodie', 'hoodies', 'sweatshirt', 'sweatshirts', 'pullover'],
  sweater: ['sweater', 'sweaters', 'cardigan', 'jumper', 'woolen'],
  jeans: ['jeans', 'jean', 'denim', 'denims'],
  trouser: ['trouser', 'trousers', 'pant', 'pants', 'chinos', 'formal pant', 'formal trouser', 'slacks'],
  shorts: ['shorts', 'short', 'bermuda'],
  joggers: ['joggers', 'jogger', 'track pant', 'trackpants', 'track pants', 'lower', 'sweatpants'],
  palazzo: ['palazzo', 'palazzos', 'plazo', 'culottes'],
  legging: ['legging', 'leggings', 'jeggings', 'tights'],
  skirt: ['skirt', 'skirts'],
  ethnic: ['ethnic', 'ethnic wear', 'traditional', 'indian wear', 'sherwani', 'dupatta', 'shrug'],
  shoes: ['shoes', 'shoe', 'footwear', 'sneaker', 'sneakers', 'loafer', 'loafers', 'boots', 'boot', 'sandal', 'sandals', 'heels', 'heel', 'flats', 'slippers', 'flipflops', 'chappal'],
  bag: ['bag', 'bags', 'handbag', 'handbags', 'backpack', 'backpacks', 'sling bag', 'tote', 'clutch', 'purse'],
  accessory: ['accessory', 'accessories', 'wallet', 'belt', 'belts', 'watch', 'watches', 'sunglasses', 'goggles', 'cap', 'caps', 'hat', 'scarf', 'stole', 'socks', 'tie', 'jewellery', 'jewelry', 'earring', 'earrings', 'necklace', 'bracelet', 'ring'],
  nightwear: ['nightwear', 'nightsuit', 'night suit', 'pyjama', 'pajama', 'loungewear', 'sleepwear'],
  innerwear: ['innerwear', 'inner wear', 'vest', 'briefs', 'boxers', 'bra', 'lingerie'],
  activewear: ['activewear', 'active wear', 'gym wear', 'gymwear', 'sportswear', 'yoga pant', 'tracksuit'],
  swimwear: ['swimwear', 'swimsuit', 'swim trunk', 'bikini'],
  coord: ['co ord', 'co-ord', 'coord set', 'coord', 'twin set', 'matching set']
}

export const PRODUCT_TYPE_KEYWORDS = Array.from(
  new Set(Object.values(CATEGORY_SYNONYMS).flat())
).sort((a, b) => b.length - a.length)

/* Reverse lookup: phrase -> canonical type */
export const CATEGORY_LOOKUP = Object.entries(CATEGORY_SYNONYMS).reduce((acc, [canonical, phrases]) => {
  phrases.forEach((phrase) => { acc[phrase] = canonical })
  return acc
}, {})

/* ══════════════════════════════════════════════════════════
   OCCASIONS — what the shopper is dressing for.
   Each occasion maps to search hints + suitable canonical types.
══════════════════════════════════════════════════════════ */
export const OCCASION_MAP = {
  party: {
    words: ['party', 'partywear', 'party wear', 'night out', 'nightout', 'club', 'clubbing', 'birthday', 'celebration', 'cocktail', 'new year', 'dj'],
    types: ['dress', 'blazer', 'shirt', 'top', 'saree', 'lehenga', 'coord'],
    hints: ['party', 'evening', 'sequin', 'shimmer', 'satin', 'bodycon', 'slim fit'],
    label: 'party & evening'
  },
  wedding: {
    words: ['wedding', 'shaadi', 'shadi', 'marriage', 'sangeet', 'mehendi', 'mehndi', 'reception', 'baraat', 'engagement', 'haldi'],
    types: ['lehenga', 'saree', 'suit', 'kurta', 'blazer', 'ethnic'],
    hints: ['ethnic', 'silk', 'embroidered', 'zari', 'banarasi', 'sherwani', 'heavy'],
    label: 'wedding & functions'
  },
  festive: {
    words: ['festive', 'festival', 'diwali', 'holi', 'eid', 'raksha bandhan', 'rakhi', 'navratri', 'durga puja', 'pooja', 'puja', 'karwa chauth', 'onam', 'pongal'],
    types: ['kurta', 'kurti', 'saree', 'suit', 'ethnic', 'lehenga'],
    hints: ['ethnic', 'traditional', 'silk', 'cotton silk', 'printed'],
    label: 'festive'
  },
  office: {
    words: ['office', 'work', 'workwear', 'work wear', 'formal', 'formals', 'business', 'interview', 'meeting', 'corporate', 'presentation', 'client', 'job'],
    types: ['shirt', 'trouser', 'blazer', 'kurti', 'dress'],
    hints: ['formal', 'solid', 'slim fit', 'cotton', 'shirt', 'trouser', 'professional'],
    label: 'office & formal'
  },
  casual: {
    words: ['casual', 'daily', 'everyday', 'regular', 'chill', 'weekend', 'outing', 'hangout', 'street', 'streetwear'],
    types: ['tshirt', 'jeans', 'shirt', 'top', 'shorts', 'hoodie'],
    hints: ['casual', 'cotton', 'relaxed', 'regular fit', 'printed'],
    label: 'casual everyday'
  },
  college: {
    words: ['college', 'campus', 'school', 'university', 'student', 'class', 'fresher'],
    types: ['tshirt', 'jeans', 'shirt', 'hoodie', 'kurti', 'shoes'],
    hints: ['casual', 'cotton', 'comfortable', 'printed'],
    label: 'college'
  },
  date: {
    words: ['date', 'date night', 'dinner date', 'first date', 'romantic', 'anniversary', 'valentine'],
    types: ['dress', 'shirt', 'top', 'blazer'],
    hints: ['slim fit', 'elegant', 'solid', 'satin'],
    label: 'date night'
  },
  travel: {
    words: ['travel', 'trip', 'vacation', 'holiday', 'beach', 'goa', 'trek', 'hiking', 'airport'],
    types: ['tshirt', 'shorts', 'joggers', 'shoes', 'dress'],
    hints: ['cotton', 'linen', 'breathable', 'comfortable', 'relaxed'],
    label: 'travel & vacation'
  },
  gym: {
    words: ['gym', 'workout', 'running', 'sports', 'yoga', 'fitness', 'training', 'jogging'],
    types: ['activewear', 'joggers', 'tshirt', 'shoes', 'legging'],
    hints: ['dry fit', 'polyester', 'stretch', 'sports', 'active'],
    label: 'gym & sports'
  },
  gift: {
    words: ['gift', 'gifting', 'present', 'surprise', 'birthday gift', 'anniversary gift', 'return gift'],
    types: ['accessory', 'tshirt', 'shirt', 'bag', 'kurti', 'coord'],
    hints: ['premium', 'gift', 'combo', 'giftable'],
    label: 'gifting'
  },
  summer: {
    words: ['summer', 'garmi', 'hot weather', 'heat'],
    types: ['tshirt', 'shorts', 'dress', 'kurti', 'top'],
    hints: ['cotton', 'linen', 'breathable', 'light'],
    label: 'summer'
  },
  winter: {
    words: ['winter', 'cold', 'sardi', 'thand', 'woolen', 'woollen'],
    types: ['sweater', 'jacket', 'hoodie', 'coat', 'blazer'],
    hints: ['wool', 'fleece', 'warm', 'thermal', 'quilted'],
    label: 'winter'
  },
  monsoon: {
    words: ['monsoon', 'rain', 'rainy', 'barish'],
    types: ['jacket', 'shoes', 'tshirt'],
    hints: ['water resistant', 'quick dry', 'polyester'],
    label: 'monsoon'
  }
}

export const OCCASION_KEYWORDS = Array.from(
  new Set(Object.values(OCCASION_MAP).flatMap((o) => o.words))
)

/* ══════════════════════════════════════════════════════════
   ATTRIBUTES
══════════════════════════════════════════════════════════ */
export const FABRIC_KEYWORDS = [
  'cotton', 'linen', 'silk', 'satin', 'georgette', 'chiffon', 'crepe', 'rayon', 'viscose',
  'denim', 'wool', 'woolen', 'fleece', 'polyester', 'nylon', 'lycra', 'spandex', 'velvet',
  'chanderi', 'banarasi', 'khadi', 'jute', 'organza', 'net', 'modal', 'tencel', 'leather', 'suede',
  'corduroy', 'jacquard', 'terry', 'blended', 'cotton blend', 'poly cotton'
]

export const FIT_KEYWORDS = [
  'slim fit', 'slim', 'regular fit', 'regular', 'loose', 'loose fit', 'relaxed fit', 'relaxed',
  'oversized', 'skinny', 'straight fit', 'straight', 'bootcut', 'tapered', 'baggy',
  'bodycon', 'a line', 'a-line', 'flared', 'fitted', 'comfort fit', 'boxy'
]

export const PATTERN_KEYWORDS = [
  'solid', 'plain', 'printed', 'print', 'striped', 'stripes', 'checked', 'check', 'checks',
  'floral', 'embroidered', 'embroidery', 'sequin', 'sequined', 'graphic', 'color block',
  'colourblock', 'polka', 'animal print', 'tie dye', 'ombre', 'textured'
]

export const COLOR_KEYWORDS = [
  'black', 'white', 'off white', 'ivory', 'blue', 'navy', 'navy blue', 'sky blue', 'royal blue',
  'red', 'green', 'olive', 'dark green', 'bottle green', 'pink', 'baby pink', 'hot pink',
  'brown', 'tan', 'gold', 'golden', 'silver', 'yellow', 'mustard', 'orange', 'peach',
  'purple', 'lavender', 'violet', 'maroon', 'burgundy', 'wine', 'beige', 'cream', 'khaki',
  'gray', 'grey', 'charcoal', 'teal', 'turquoise', 'mint', 'rust', 'coral', 'multicolor', 'multi color'
].sort((a, b) => b.length - a.length)

export const SIZE_KEYWORDS = [
  'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', '5xl', '6xl',
  'free size', 'onesize', 'one size',
  '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'
]

/* ══════════════════════════════════════════════════════════
   AUDIENCE
══════════════════════════════════════════════════════════ */
export const MEN_WORDS = ['men', 'mens', "men's", 'male', 'gents', 'gentleman', 'guy', 'guys', 'boyfriend', 'husband', 'papa', 'father', 'dad', 'bhai ke liye', 'ladko', 'ladke']
export const WOMEN_WORDS = ['women', 'womens', "women's", 'female', 'ladies', 'lady', 'girlfriend', 'wife', 'mom', 'mummy', 'mother', 'behen', 'ladki', 'ladkiyon', 'aurat']
export const KIDS_WORDS = ['kids', 'kid', 'children', 'child', 'toddler', 'toddlers', 'junior', 'juniors', 'baby', 'infant', 'bachcha', 'bachche']
export const BOYS_WORDS = ['boys', 'boy', 'boyswear', 'boys wear', 'son', 'beta']
export const GIRLS_WORDS = ['girls', 'girl', 'girlswear', 'girls wear', 'daughter', 'beti']

export const REFERENCE_WORDS = [
  'uska', 'uski', 'usme', 'ussi', 'iski', 'isme', 'wahi', 'woh wala', 'ye wala',
  'that one', 'this one', 'the same', 'same one', 'first one', 'second one', 'third one',
  'last one', 'above', 'you suggested', 'jo suggest', 'jo dikhaya', 'pehla', 'dusra', 'tisra'
]

/* ══════════════════════════════════════════════════════════
   LANGUAGE
══════════════════════════════════════════════════════════ */
export const HINDI_WORDS = [
  'hai', 'hain', 'kya', 'chahiye', 'chahie', 'dikhao', 'dikhana', 'dikha', 'batao', 'bata',
  'mujhe', 'mere', 'meri', 'mera', 'aap', 'aapka', 'aapki', 'hum', 'tum', 'aur', 'nahi', 'nahin',
  'kaise', 'kaisa', 'kaisi', 'kyun', 'kyu', 'acha', 'accha', 'thik', 'theek', 'bhai', 'behen',
  'karo', 'kardo', 'karna', 'sakta', 'sakte', 'sakti', 'chahta', 'chahti', 'chahte',
  'bolo', 'suno', 'hindi', 'kripya', 'dhanyavaad', 'shukriya', 'zaroor', 'madad', 'sahayata',
  'kitna', 'kitne', 'kitni', 'konsa', 'kaunsa', 'kaun', 'kahan', 'kab', 'lagega', 'milega',
  'sasta', 'saste', 'mehnga', 'accha lagega', 'pasand', 'lena', 'lunga', 'lena hai', 'dena'
]

export const HINGLISH_INDICATORS = [
  'chahiye', 'dikhao', 'batao', 'mujhe', 'kar sakte', 'baat kar', 'samjho', 'samajh',
  'kitne ka', 'kitna hoga', 'konsa lu', 'kya milega', 'bata do', 'de do', 'le lu',
  'accha rahega', 'sahi rahega', 'pasand aaya', 'yaar', 'bhaiya'
]

/* Words that must NEVER be auto-"corrected" by the fuzzy typo fixer.
   Earlier the corrector turned "shoes" into "show" and killed real searches. */
export const DOMAIN_VOCAB = new Set([
  ...PRODUCT_TYPE_KEYWORDS,
  ...COLOR_KEYWORDS,
  ...FABRIC_KEYWORDS,
  ...PATTERN_KEYWORDS,
  ...OCCASION_KEYWORDS,
  ...MEN_WORDS, ...WOMEN_WORDS, ...KIDS_WORDS, ...BOYS_WORDS, ...GIRLS_WORDS,
  ...SIZE_KEYWORDS,
  ...HINDI_WORDS,
  'size', 'sizes', 'fit', 'fitting', 'price', 'prices', 'budget', 'cheap', 'cheapest',
  'expensive', 'premium', 'luxury', 'discount', 'discounts', 'offer', 'offers', 'deal', 'deals',
  'sale', 'coupon', 'coupons', 'code', 'stock', 'available', 'availability', 'rating', 'ratings',
  'review', 'reviews', 'brand', 'brands', 'compare', 'comparison', 'better', 'best', 'top',
  'return', 'returns', 'refund', 'exchange', 'delivery', 'shipping', 'track', 'tracking',
  'order', 'orders', 'cancel', 'cart', 'wishlist', 'checkout', 'payment', 'cod', 'upi',
  'card', 'emi', 'invoice', 'warranty', 'contact', 'support', 'help', 'account', 'login',
  'under', 'below', 'above', 'between', 'around', 'upto', 'range', 'combo', 'outfit', 'look',
  'style', 'styling', 'wear', 'match', 'matching', 'pair', 'suggest', 'suggestion',
  'recommend', 'recommendation', 'new', 'latest', 'trending', 'popular', 'bestseller'
].map((w) => String(w).toLowerCase()))

/* Small vocab used for fuzzy repair of chat/greeting words only */
export const FUZZY_VOCAB = new Set([
  'hi', 'hello', 'hey', 'namaste', 'namaskar', 'salam', 'how', 'are', 'you', 'thanks', 'thank',
  'please', 'sorry', 'good', 'morning', 'evening', 'night', 'welcome', 'yes', 'no', 'okay',
  'show', 'need', 'want', 'looking', 'find', 'search', 'about', 'details', 'information',
  'english', 'hindi', 'reply', 'speak', 'talk', 'message', 'response', 'professional', 'friendly'
])
