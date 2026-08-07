import { extractSlots, classifyIntent, analyzeMessage, INTENTS, parseBudget } from '../Component/chatbot/intentEngine'
import { normalizeIntentText, detectLanguage, detectLanguagePreferenceRequest, isHindiLike } from '../Component/chatbot/languageUtils'
import { searchProducts } from '../Component/chatbot/productSearch'
import { buildCatalogIntel, interpretStock, audiencesOf, audienceMatches } from '../Component/chatbot/catalogIntel'
import { normalizeProduct } from '../Component/chatbot/productUtils'
import { composeProductReply, composeGreeting, composeIdentity, buildFollowUpChips } from '../Component/chatbot/replyComposer'
import { buildPersonalizedContext } from '../Component/chatbot/promptBuilder'
import { getSiteKnowledge } from '../Component/chatbot/siteKnowledge'
import {
  loadTranscript, saveTranscript, clearTranscript,
  hasUserTurn, lastFollowUps, TRANSCRIPT_TTL_MS, MAX_SAVED_MESSAGES
} from '../Component/chatbot/chatTranscript'
import { TRANSCRIPT_KEY } from '../Component/chatbot/constants'

const RAW = [
  { _id: 'a1', name: 'Men Navy Blue Slim Fit Formal Shirt', maincategory: 'Men', subcategory: 'Shirts', brand: 'Arrow', color: 'navy blue', size: ['M', 'L', 'XL'], baseprice: 2499, finalprice: 1499, stock: '12', description: 'cotton formal office shirt slim fit', rating: 4.6, reviews: 42, newArrival: false, isSale: true, createdAt: '2025-06-01' },
  { _id: 'a2', name: 'Women Black Sequin Party Bodycon Dress', maincategory: 'Women', subcategory: 'Dresses', brand: 'Vero Moda', color: 'black', size: ['S', 'M'], baseprice: 4999, finalprice: 2499, stock: '3', description: 'satin sequin party evening bodycon dress', rating: 4.4, reviews: 18, newArrival: true, isSale: true, createdAt: '2026-07-20' },
  { _id: 'a3', name: 'Men Cotton Casual White Tshirt', maincategory: 'Men', subcategory: 'Tshirts', brand: 'HRX', color: 'white', size: ['M', 'L'], baseprice: 999, finalprice: 599, stock: '40', description: 'cotton casual printed regular fit tshirt', rating: 4.2, reviews: 90, createdAt: '2025-01-10' },
  { _id: 'a4', name: 'Women Red Banarasi Silk Saree', maincategory: 'Women', subcategory: 'Sarees', brand: 'Mysore Silk', color: 'red', size: 'Free Size', baseprice: 8999, finalprice: 6299, stock: 'Out of Stock', description: 'wedding festive banarasi silk zari saree', rating: 4.8, reviews: 65, createdAt: '2025-03-05' },
  { _id: 'a5', name: 'Kids Boys Blue Denim Jeans', maincategory: 'Kids', subcategory: 'Jeans', brand: 'Gini & Jony', color: 'blue', size: ['24', '26'], baseprice: 1299, finalprice: 899, stock: '8', description: 'boys denim casual jeans', rating: 4.1, reviews: 12, createdAt: '2025-05-15' },
  { _id: 'a6', name: 'Men Black Leather Formal Shoes', maincategory: 'Men', subcategory: 'Footwear', brand: 'Hush Puppies', color: 'black', size: ['8', '9', '10'], baseprice: 3999, finalprice: 2799, stock: '5', description: 'leather formal office shoes', rating: 4.5, reviews: 30, createdAt: '2025-04-02' }
]

const PRODUCTS = RAW.map(normalizeProduct)

describe('typo normalisation no longer destroys product words', () => {
  test('"shoes" stays "shoes" (used to become "show")', () => {
    expect(normalizeIntentText('show me shoes')).toContain('shoes')
  })
  test('common shopping typos are repaired', () => {
    expect(normalizeIntentText('jeens chahiye')).toContain('jeans')
    expect(normalizeIntentText('lehnga dikhado')).toContain('lehenga')
  })
  test('percent survives normalisation', () => {
    expect(normalizeIntentText('40% off products')).toContain('percent')
  })
})

describe('slot extraction', () => {
  test('reads audience, category, occasion, colour, size and budget together', () => {
    const s = extractSlots('show me black party dress for women under 3000 size M')
    expect(s.audience).toBe('women')
    expect(s.categories).toContain('dress')
    expect(s.occasions).toContain('party')
    expect(s.colors).toContain('black')
    expect(s.sizes).toContain('M')
    expect(s.budget).toEqual({ min: 0, max: 3000 })
  })

  test('budget phrasings', () => {
    expect(parseBudget('under 999')).toEqual({ min: 0, max: 999 })
    expect(parseBudget('between 1000 and 2000')).toEqual({ min: 1000, max: 2000 })
    expect(parseBudget('above 5000')).toEqual({ min: 5000, max: null })
    expect(parseBudget('around 2000').max).toBe(2500)
    expect(parseBudget('budget 3k').max).toBe(3750)
  })

  test('"40 percent off" is a discount filter, not size 40', () => {
    const s = extractSlots('show 40% off products')
    expect(s.discountMin).toBe(40)
    expect(s.sizes).not.toContain('40')
  })

  test('hindi query is understood', () => {
    const s = extractSlots('shaadi ke liye kurta chahiye 3000 tak')
    expect(s.categories).toContain('kurta')
    expect(s.occasions).toContain('wedding')
    expect(s.budget.max).toBe(3000)
  })
})

describe('intent classification', () => {
  const cases = [
    ['hello', INTENTS.GREETING],
    ['how are you', INTENTS.SMALLTALK],
    ['who are you and what can you do', INTENTS.BOT_IDENTITY],
    ['show me party wear for women', INTENTS.PRODUCT_SEARCH],
    ['what is the return policy', INTENTS.POLICY],
    ['how do I track my order', INTENTS.ORDER_HELP],
    ['which size should I pick', INTENTS.SIZE_HELP],
    ['what all do you sell', INTENTS.CATALOG_OVERVIEW],
    ['any coupon code available', INTENTS.DEALS],
    ['my item arrived damaged', INTENTS.COMPLAINT],
    ['thanks a lot', INTENTS.THANKS],
    ['bye', INTENTS.GOODBYE]
  ]
  test.each(cases)('%s -> %s', (text, expected) => {
    const slots = extractSlots(text)
    expect(classifyIntent({ text, slots, lastProducts: [] })).toBe(expected)
  })

  test('compare needs previous products', () => {
    const text = 'compare these two, which is better'
    expect(classifyIntent({ text, slots: extractSlots(text), lastProducts: PRODUCTS })).toBe(INTENTS.COMPARE)
  })
})

describe('slot memory across turns', () => {
  test('"under 2000" after "party dress for women" keeps the earlier slots', () => {
    const first = analyzeMessage({ text: 'party dress for women', memory: {}, lastProducts: [] })
    const second = analyzeMessage({ text: 'under 2000', memory: first.slots, lastProducts: [] })
    expect(second.slots.audience).toBe('women')
    expect(second.slots.occasions).toContain('party')
    expect(second.slots.budget.max).toBe(2000)
  })
})

describe('catalog intelligence', () => {
  const intel = buildCatalogIntel(PRODUCTS)

  test('aggregates counts, price range, discounts and stock', () => {
    expect(intel.totalProducts).toBe(6)
    expect(intel.priceRange.min).toBe(599)
    expect(intel.priceRange.max).toBe(6299)
    expect(intel.stock.outOfStockCount).toBe(1)
    expect(intel.discountStats.max).toBeGreaterThan(0)
  })

  test('builds a category tree with subcategories', () => {
    const men = intel.categories.find((c) => c.name === 'Men')
    expect(men.count).toBe(3)
    expect(men.subcategories.map((s) => s.name)).toEqual(expect.arrayContaining(['Shirts', 'Tshirts', 'Footwear']))
  })

  test('knows brands', () => {
    expect(intel.brands.map((b) => b.name)).toEqual(expect.arrayContaining(['Arrow', 'HRX', 'Vero Moda']))
  })

  test('stock strings are interpreted', () => {
    expect(interpretStock('Out of Stock').inStock).toBe(false)
    expect(interpretStock('3')).toEqual({ inStock: true, qty: 3, label: 'Only 3 left', low: true })
    expect(interpretStock('40').label).toBe('In stock')
  })
})

describe('product search', () => {
  test('respects audience + category + budget', () => {
    const slots = extractSlots('men formal shirt under 2000')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products[0].name).toBe('Men Navy Blue Slim Fit Formal Shirt')
    expect(r.products.every((p) => p.price <= 2000)).toBe(true)
  })

  test('maps occasion to the right pieces', () => {
    const slots = extractSlots('something for a wedding')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products.length).toBeGreaterThan(0)
    expect(r.products.map((p) => p.name).join(' ')).toMatch(/Saree|Kurta|Silk|Dress|Shirt/)
  })

  test('never returns empty — relaxes filters instead', () => {
    const slots = extractSlots('purple velvet gown for women under 200')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products.length).toBeGreaterThan(0)
    expect(r.relaxedOn.length).toBeGreaterThan(0)
    expect(['partial', 'relaxed']).toContain(r.matchQuality)
  })

  test('out of stock items are pushed down', () => {
    const slots = extractSlots('women saree')
    const r = searchProducts({ slots, products: PRODUCTS })
    const saree = r.products.find((p) => p.name.includes('Saree'))
    if (saree) expect(saree.inStock).toBe(false)
  })

  test('every pick explains itself', () => {
    const slots = extractSlots('black party dress for women')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products[0].matchReason).toBeTruthy()
  })

  test('cheapest sort works', () => {
    const slots = extractSlots('show me the cheapest products')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products[0].price).toBe(599)
  })
})

describe('reply composition', () => {
  const intel = buildCatalogIntel(PRODUCTS)
  test('english product reply quotes real numbers and asks one question', () => {
    const slots = extractSlots('men formal shirt under 2000')
    const result = searchProducts({ slots, products: PRODUCTS })
    const text = composeProductReply({ language: 'en', userName: 'Rahul', slots, result, intel })
    expect(text).toMatch(/₹1,499/)
    expect(text).toMatch(/Rahul/)
    expect(text.split('?').length - 1).toBeLessThanOrEqual(1)
  })

  test('hindi reply stays hindi', () => {
    const slots = extractSlots('shaadi ke liye saree chahiye')
    const result = searchProducts({ slots, products: PRODUCTS })
    const text = composeProductReply({ language: 'hi', userName: 'Rahul', slots, result, intel })
    expect(text).toMatch(/aapke|Aapke|maine|options/i)
  })

  test('follow-up chips are contextual', () => {
    const slots = extractSlots('men formal shirt under 2000')
    const result = searchProducts({ slots, products: PRODUCTS })
    const chips = buildFollowUpChips({ slots, result, intel, language: 'en' })
    expect(chips.length).toBeGreaterThan(2)
    chips.forEach((c) => { expect(c.prompt).toBeTruthy() })
  })
})

/* ══════════════════════════════════════════════════════════
   CHAT SAVE / RESTORE / MANAGE
══════════════════════════════════════════════════════════ */
describe('chat is saved and restored', () => {
  beforeEach(() => { clearTranscript() })

  const convo = () => [
    { id: 1, sender: 'bot', text: 'Hi, I am Aria.', timestamp: new Date('2026-08-07T10:00:00Z'), products: [] },
    { id: 2, sender: 'user', text: 'show me mens shirts', timestamp: new Date('2026-08-07T10:01:00Z'), products: [] },
    {
      id: 3,
      sender: 'bot',
      text: 'Here are my picks.',
      timestamp: new Date('2026-08-07T10:01:05Z'),
      products: PRODUCTS.slice(0, 2),
      followUps: [{ label: '⚖️ Compare these', prompt: 'compare them' }]
    }
  ]

  test('round trips messages, products and follow-up chips', () => {
    saveTranscript(convo(), PRODUCTS.slice(0, 2))
    const back = loadTranscript()

    expect(back.messages).toHaveLength(3)
    expect(back.messages[1].sender).toBe('user')
    expect(back.messages[1].text).toBe('show me mens shirts')
    expect(back.messages[2].products[0].name).toBe(PRODUCTS[0].name)
    expect(back.messages[2].products[0].price).toBe(PRODUCTS[0].price)
    expect(back.messages[2].followUps[0].prompt).toBe('compare them')
    expect(back.lastProducts).toHaveLength(2)
  })

  test('timestamps come back as real Date objects', () => {
    saveTranscript(convo(), [])
    const back = loadTranscript()
    back.messages.forEach((m) => {
      expect(m.timestamp instanceof Date).toBe(true)
      expect(Number.isNaN(m.timestamp.getTime())).toBe(false)
    })
  })

  test('mid-stream typing placeholders are never saved', () => {
    saveTranscript([
      ...convo(),
      { id: 4, sender: 'bot', text: 'partial…', timestamp: new Date(), products: [], typing: true }
    ], [])
    expect(loadTranscript().messages).toHaveLength(3)
  })

  test('history is capped so localStorage cannot blow up', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      id: i, sender: i % 2 ? 'user' : 'bot', text: `message ${i}`, timestamp: new Date(), products: []
    }))
    saveTranscript(many, [])
    const back = loadTranscript()
    expect(back.messages).toHaveLength(MAX_SAVED_MESSAGES)
    expect(back.messages[back.messages.length - 1].text).toBe('message 119')
  })

  test('only 4 product cards are kept per message', () => {
    const eight = [...PRODUCTS, ...PRODUCTS]
    saveTranscript([{ id: 1, sender: 'bot', text: 'picks', timestamp: new Date(), products: eight }], eight)
    expect(loadTranscript().messages[0].products.length).toBeLessThanOrEqual(4)
  })

  test('expired transcripts are dropped, not restored', () => {
    saveTranscript(convo(), [])
    const stored = JSON.parse(localStorage.getItem(TRANSCRIPT_KEY))
    stored.savedAt = Date.now() - TRANSCRIPT_TTL_MS - 1000
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(stored))

    expect(loadTranscript()).toBeNull()
    expect(localStorage.getItem(TRANSCRIPT_KEY)).toBeNull()
  })

  test('corrupt storage does not crash and self-heals', () => {
    localStorage.setItem(TRANSCRIPT_KEY, '{not json at all')
    expect(loadTranscript()).toBeNull()
    expect(localStorage.getItem(TRANSCRIPT_KEY)).toBeNull()
  })

  test('garbage message shapes are filtered out', () => {
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify({
      savedAt: Date.now(),
      messages: [
        { sender: 'bot', text: 'good one', timestamp: new Date().toISOString() },
        { sender: 'alien', text: 'nope' },
        { sender: 'user' },
        { sender: 'user', text: '   ' },
        null
      ]
    }))
    const back = loadTranscript()
    expect(back.messages).toHaveLength(1)
    expect(back.messages[0].text).toBe('good one')
  })

  test('clearing removes everything', () => {
    saveTranscript(convo(), [])
    clearTranscript()
    expect(loadTranscript()).toBeNull()
  })

  test('saving an empty conversation clears storage instead of writing junk', () => {
    saveTranscript(convo(), [])
    saveTranscript([], [])
    expect(loadTranscript()).toBeNull()
  })

  test('UI restore helpers work off the transcript', () => {
    saveTranscript(convo(), [])
    const back = loadTranscript()
    expect(hasUserTurn(back)).toBe(true)
    expect(lastFollowUps(back)[0].label).toBe('⚖️ Compare these')

    saveTranscript([convo()[0]], [])
    const greetingOnly = loadTranscript()
    expect(hasUserTurn(greetingOnly)).toBe(false)
    expect(lastFollowUps(greetingOnly)).toBeNull()
  })

  test('nothing saved means a fresh start', () => {
    expect(loadTranscript()).toBeNull()
    expect(hasUserTurn(null)).toBe(false)
    expect(lastFollowUps(null)).toBeNull()
  })
})

describe('site knowledge', () => {
  test('matches topics and returns text', () => {
    expect(getSiteKnowledge({ text: 'what is your return policy', language: 'en' }).topic).toBe('return-policy')
    expect(getSiteKnowledge({ text: 'how can I pay', language: 'en' }).topic).toBe('payment')
    expect(getSiteKnowledge({ text: 'track my order', language: 'en' }).topic).toBe('tracking')
    expect(getSiteKnowledge({ text: 'random gibberish xyz', language: 'en' })).toBeNull()
  })

  test('hinglish gets the roman-hindi variant', () => {
    const hi = getSiteKnowledge({ text: 'return policy', language: 'hinglish' })
    const en = getSiteKnowledge({ text: 'return policy', language: 'en' })
    expect(hi.text).not.toBe(en.text)
    expect(hi.text).toMatch(/din|karein/i)
  })
})

/* ══════════════════════════════════════════════════════════
   THE BIG ONE: gender sections must never leak
══════════════════════════════════════════════════════════ */
describe('audience isolation (mens must never show womens)', () => {
  const intel = buildCatalogIntel(PRODUCTS)

  test('"women" no longer matches as "men" (the substring bug)', () => {
    const womenDress = PRODUCTS.find((p) => p.name.includes('Bodycon'))
    const aud = audiencesOf(womenDress)
    expect(aud.has('women')).toBe(true)
    expect(aud.has('men')).toBe(false)
    expect(audienceMatches(aud, 'men')).toBe(false)
  })

  test('men request returns only men items', () => {
    const slots = extractSlots('show me products for men')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products.length).toBeGreaterThan(0)
    r.products.forEach((p) => {
      expect(`${p.maincategory} ${p.name}`).toMatch(/Men/)
      expect(`${p.maincategory} ${p.name}`).not.toMatch(/Women|Kids|Girls|Boys/)
    })
  })

  test('women request returns only women items', () => {
    const slots = extractSlots('show me womens collection')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products.length).toBeGreaterThan(0)
    r.products.forEach((p) => {
      expect(p.maincategory).toBe('Women')
    })
  })

  test('kids request returns only kids items', () => {
    const slots = extractSlots('kids ke liye kuch dikhao')
    const r = searchProducts({ slots, products: PRODUCTS })
    expect(r.products.length).toBeGreaterThan(0)
    r.products.forEach((p) => { expect(p.maincategory).toBe('Kids') })
  })

  test('audience survives even when every other filter is relaxed', () => {
    const slots = extractSlots('men purple velvet lehenga under 100')
    const r = searchProducts({ slots, products: PRODUCTS })
    r.products.forEach((p) => {
      expect(p.maincategory).toBe('Men')
    })
  })

  test('empty gendered section returns nothing rather than the wrong section', () => {
    const onlyWomen = PRODUCTS.filter((p) => p.maincategory === 'Women')
    const slots = extractSlots('show me mens shirts')
    const r = searchProducts({ slots, products: onlyWomen })
    expect(r.products).toHaveLength(0)
    expect(r.audienceEmpty).toBe(true)
  })

  test('the empty-section reply is honest and never offers the wrong section', () => {
    const onlyWomen = PRODUCTS.filter((p) => p.maincategory === 'Women')
    const slots = extractSlots('show me mens shirts')
    const r = searchProducts({ slots, products: onlyWomen })
    const text = composeProductReply({ language: 'en', userName: 'Rahul', slots, result: r, intel })
    expect(text).toMatch(/men's section/i)
    expect(text).toMatch(/not pad|nothing/i)
  })

  test('audience rule reaches the AI prompt', () => {
    const slots = extractSlots('show me mens formal shirts')
    const r = searchProducts({ slots, products: PRODUCTS })
    const prompt = buildPersonalizedContext({
      userQuery: 'show me mens formal shirts',
      language: 'en',
      intent: INTENTS.PRODUCT_SEARCH,
      slots,
      matchedProducts: r.products,
      searchResult: r,
      catalogIntel: intel
    })
    expect(prompt).toContain('STRICT SECTION RULE')
    expect(prompt).toContain("men's section")
    expect(prompt).toContain('Never mention or suggest a product from another section')
    expect(prompt).toContain('By shopper: men')
  })

  test('catalog intel counts each section separately', () => {
    expect(intel.audienceCounts.men).toBe(3)
    expect(intel.audienceCounts.women).toBe(2)
    expect(intel.audienceCounts.kids).toBe(1)
  })

  test('handles every real-world category spelling', () => {
    const cases = [
      ['Mens', '', 'men'],
      ["Men's Wear", '', 'men'],
      ['MEN', 'Shirts', 'men'],
      ['Womens', '', 'women'],
      ["Women's Clothing", '', 'women'],
      ['WOMEN', 'Sarees', 'women'],
      ['Ladies Wear', '', 'women'],
      ['Kids', 'Boys', 'boys'],
      ['Kids Wear', 'Girls', 'girls'],
      ['Children', '', 'kids']
    ]
    cases.forEach(([main, sub, expected]) => {
      const aud = audiencesOf({ maincategory: main, subcategory: sub, name: '', details: '' })
      expect(Array.from(aud)).toContain(expected)
    })
  })

  test('womens spellings are never treated as mens', () => {
    ;['Womens', "Women's Wear", 'WOMEN', 'Ladies Wear', 'Female Apparel'].forEach((main) => {
      const aud = audiencesOf({ maincategory: main, name: '', details: '' })
      expect(aud.has('men')).toBe(false)
      expect(audienceMatches(aud, 'men')).toBe(false)
      expect(audienceMatches(aud, 'women')).toBe(true)
    })
  })

  test('gender-neutral sections are shown to everyone', () => {
    const acc = audiencesOf({ maincategory: 'Accessories', subcategory: 'Watches', name: 'Leather Strap Watch' })
    expect(acc.size).toBe(0)
    expect(audienceMatches(acc, 'men', { allowNeutral: true })).toBe(true)
    expect(audienceMatches(acc, 'women', { allowNeutral: true })).toBe(true)
    /* but never counted as an explicit match when explicit items exist */
    expect(audienceMatches(acc, 'men')).toBe(false)
  })
})

/* ══════════════════════════════════════════════════════════
   LANGUAGE: hindi / hinglish / english
══════════════════════════════════════════════════════════ */
describe('three-language support', () => {
  const intel = buildCatalogIntel(PRODUCTS)

  test('devanagari -> hi, roman hindi -> hinglish, english -> en', () => {
    expect(detectLanguage('मुझे शादी के लिए कुर्ता चाहिए')).toBe('hi')
    expect(detectLanguage('mujhe shaadi ke liye kurta chahiye')).toBe('hinglish')
    expect(detectLanguage('I need a kurta for a wedding')).toBe('en')
    expect(isHindiLike('hi')).toBe(true)
    expect(isHindiLike('hinglish')).toBe(true)
    expect(isHindiLike('en')).toBe(false)
  })

  test('explicit language requests are honoured', () => {
    expect(detectLanguagePreferenceRequest('please reply in hindi')).toBe('hinglish')
    expect(detectLanguagePreferenceRequest('हिंदी में बात करो')).toBe('hi')
    expect(detectLanguagePreferenceRequest('speak english please')).toBe('en')
    expect(detectLanguagePreferenceRequest('show me shirts')).toBeNull()
  })

  test('devanagari replies use devanagari script', () => {
    const greet = composeGreeting({ language: 'hi', userName: 'Rahul' })
    expect(greet).toMatch(/[\u0900-\u097F]/)
    const slots = extractSlots('shirt')
    const r = searchProducts({ slots, products: PRODUCTS })
    const reply = composeProductReply({ language: 'hi', userName: 'Rahul', slots, result: r, intel })
    expect(reply).toMatch(/[\u0900-\u097F]/)
  })

  test('hinglish replies stay in roman script', () => {
    const greet = composeGreeting({ language: 'hinglish', userName: 'Rahul' })
    expect(greet).not.toMatch(/[\u0900-\u097F]/)
    expect(greet).toMatch(/Aria/)
  })

  test('prompt carries the right language instruction per mode', () => {
    const mk = (language) => buildPersonalizedContext({
      userQuery: 'hi', language, intent: INTENTS.GREETING, catalogIntel: intel
    })
    expect(mk('hi')).toMatch(/Devanagari script/)
    expect(mk('hinglish')).toMatch(/Roman script/)
    expect(mk('hinglish')).toMatch(/Do NOT use Devanagari/)
    expect(mk('en')).toMatch(/friendly English/)
  })
})

/* ══════════════════════════════════════════════════════════
   A warm greeting is always produced
══════════════════════════════════════════════════════════ */
describe('greeting is always warm and useful', () => {
  const intel = buildCatalogIntel(PRODUCTS)

  test('english greeting is warm, names itself and asks one question', () => {
    const g = composeGreeting({ language: 'en', userName: 'Rahul' })
    expect(g).toMatch(/Rahul/)
    expect(g).toMatch(/Aria/)
    expect(g.split('?').length - 1).toBeLessThanOrEqual(1)
    expect(g.length).toBeGreaterThan(80)
  })

  test('greeting leaks NO store statistics, discounts or offers', () => {
    for (let i = 0; i < 8; i += 1) {
      const g = composeGreeting({ language: 'en', userName: 'Rahul' })
      expect(g).not.toMatch(/\d+\s*(products|pieces|items|sections)/i)
      expect(g).not.toMatch(/%/)
      expect(g).not.toMatch(/off\b/i)
      expect(g).not.toMatch(/discount|offer|sale|coupon|deal/i)
      expect(g).not.toMatch(/₹/)
    }
  })

  test('identity answer lists capabilities without store statistics', () => {
    const id = composeIdentity({ language: 'en' })
    expect(id).toMatch(/Aria/)
    expect(id).not.toMatch(/\d+\s*products/i)
    expect(id).not.toMatch(/discount|coupon/i)
  })

  test('greeting works with no name', () => {
    const g = composeGreeting({ language: 'en', userName: 'Guest' })
    expect(g).not.toMatch(/Guest/)
    expect(g.trim().length).toBeGreaterThan(40)
  })

  test('greeting brief tells the model not to pitch stats or offers', () => {
    const prompt = buildPersonalizedContext({
      userQuery: 'hello', language: 'en', intent: INTENTS.GREETING, catalogIntel: intel
    })
    expect(prompt).toMatch(/Greet the customer warmly/)
    expect(prompt).toMatch(/Do NOT mention product counts, price ranges, discounts, offers or coupons/)
    expect(prompt).toMatch(/DO NOT VOLUNTEER STORE STATISTICS/)
    expect(prompt).toMatch(/Never reply with an empty/)
  })
})

/* ══════════════════════════════════════════════════════════
   English is the default; Hindi only on demand
══════════════════════════════════════════════════════════ */
describe('english stays english', () => {
  const intel = buildCatalogIntel(PRODUCTS)

  const ENGLISH_MESSAGES = [
    'hi', 'hello', 'hey there', 'good morning',
    'show me shirts', 'do you have jeans for men',
    'what do you sell', 'I need a dress for a party',
    'can you help me pick a size', 'what is the return policy',
    'how do I track my order', 'thanks a lot', 'bye',
    'show me products under 2000', 'any top rated shoes',
    'compare these two for me', 'is this in stock'
  ]

  test.each(ENGLISH_MESSAGES)('"%s" is detected as english', (msg) => {
    expect(detectLanguage(msg)).toBe('en')
  })

  test('hindi and hinglish are still detected', () => {
    expect(detectLanguage('mujhe shirt dikhao')).toBe('hinglish')
    expect(detectLanguage('kitne ka hai ye')).toBe('hinglish')
    expect(detectLanguage('मुझे शर्ट दिखाओ')).toBe('hi')
  })

  test('english prompt forbids drifting into hindi', () => {
    const prompt = buildPersonalizedContext({
      userQuery: 'show me shirts', language: 'en', intent: INTENTS.PRODUCT_SEARCH, catalogIntel: intel
    })
    expect(prompt).toMatch(/English is the default/)
    expect(prompt).toMatch(/NEVER switch to Hindi/)
  })
})

/* ══════════════════════════════════════════════════════════
   Admin catalogue structure reaches the model
══════════════════════════════════════════════════════════ */
describe('admin catalogue structure', () => {
  const intel = buildCatalogIntel(PRODUCTS)
  const admin = {
    maincategories: ['Men', 'Women', 'Kids'],
    subcategories: ['Shirts', 'Tshirts', 'Dresses', 'Sarees', 'Jeans', 'Footwear'],
    brands: ['Arrow', 'HRX', 'Vero Moda', 'Mysore Silk']
  }

  test('official sections, subcategories and brands are injected', () => {
    const prompt = buildPersonalizedContext({
      userQuery: 'what do you sell',
      language: 'en',
      intent: INTENTS.CATALOG_OVERVIEW,
      catalogIntel: intel,
      adminCatalog: admin
    })
    expect(prompt).toContain('Sections the admin has created: Men, Women, Kids')
    expect(prompt).toContain('Subcategories: Shirts')
    expect(prompt).toContain('Brands stocked: Arrow')
  })
})

describe('AI grounding prompt', () => {
  const intel = buildCatalogIntel(PRODUCTS)

  test('carries catalog stats, the shortlist and hard anti-hallucination rules', () => {
    const slots = extractSlots('men formal shirt under 2000')
    const result = searchProducts({ slots, products: PRODUCTS })
    const prompt = buildPersonalizedContext({
      userQuery: 'men formal shirt under 2000',
      language: 'en',
      intent: INTENTS.PRODUCT_SEARCH,
      slots,
      matchedProducts: result.products,
      searchResult: result,
      catalogIntel: intel,
      currentUserName: 'Rahul',
      coupons: [{ code: 'SAVE20', type: 'percent', value: 20, minCartValue: 999 }]
    })

    expect(prompt).toContain('Aria')
    expect(prompt).toContain('LIVE CATALOG SNAPSHOT')
    expect(prompt).toContain('Total products: 6')
    expect(prompt).toContain('SHORTLIST FOR THIS TURN')
    expect(prompt).toContain('price=Rs.1499')
    expect(prompt).toContain('discount=40%')
    expect(prompt).toContain('stock=In stock')
    expect(prompt).toContain('NEVER invent')
    expect(prompt).toContain('Rahul')
    expect(prompt).toContain('Returns: 7 days')
    expect(prompt).toMatch(/SAVE20/)
  })

  test('policy questions carry the verified answer for rephrasing', () => {
    const knowledge = getSiteKnowledge({ text: 'return policy', language: 'en' })
    const prompt = buildPersonalizedContext({
      userQuery: 'return policy',
      language: 'en',
      intent: INTENTS.POLICY,
      knowledgeText: knowledge.text,
      catalogIntel: intel
    })
    expect(prompt).toContain('VERIFIED ANSWER FOR THIS TOPIC')
    expect(prompt).toContain('do not paste it verbatim')
  })
})
