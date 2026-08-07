/* ══════════════════════════════════════════════════════════
   REAL CATALOGUE REGRESSION TESTS
   Fixture captured live from the eshoper database so the
   chatbot is verified against the actual, messy category
   names in production — not idealised sample data.

   Real maincategories: Mens, Womens, Ladies, Girls, KIds
   Note the data quirks this locks down:
     - "Ladies" is a separate section that still means women
     - "KIds" has inconsistent casing
     - some Girls products are named "Women ..."
     - one KIds product sits under a "Sneakers" subcategory
       but is actually a shirt
══════════════════════════════════════════════════════════ */
import { extractSlots, analyzeMessage, INTENTS } from '../Component/chatbot/intentEngine'
import { searchProducts } from '../Component/chatbot/productSearch'
import { buildCatalogIntel, audiencesOf, audienceMatches, interpretStock } from '../Component/chatbot/catalogIntel'
import { normalizeProduct } from '../Component/chatbot/productUtils'
import { composeProductReply } from '../Component/chatbot/replyComposer'
import { buildPersonalizedContext } from '../Component/chatbot/promptBuilder'

const RAW_LIVE = [
  { _id: 'p01', name: 'Titan Automatic Analog Watch', maincategory: 'Mens', subcategory: 'Watch', brand: 'Titan', baseprice: 4999, finalprice: 2000, discount: 60, stock: 'In Stock' },
  { _id: 'p02', name: 'Boys Slim Fit Checkered Spread Collar Casual Shirt', maincategory: 'KIds', subcategory: 'Sneakers', brand: 'Zara', baseprice: 3000, finalprice: 1260, discount: 58, stock: 'In Stock' },
  { _id: 'p03', name: 'Campus Men Og-30 Sneakers', maincategory: 'Mens', subcategory: 'Sneakers', brand: 'Adidas', baseprice: 2000, finalprice: 1800, discount: 10, stock: 'In Stock' },
  { _id: 'p04', name: "Men's Casual Long sleeve shirt", maincategory: 'Mens', subcategory: 'Shirts', brand: 'H&M', baseprice: 3000, finalprice: 2370, discount: 21, stock: 'In Stock' },
  { _id: 'p05', name: "Women's Flared Fit High Rise Solid Wide-Leg jeans", maincategory: 'Womens', subcategory: 'Jeans', brand: 'H&M', baseprice: 3000, finalprice: 1800, discount: 40, stock: 'In Stock' },
  { _id: 'p06', name: ' Women Polyester Modern Fit', maincategory: 'Girls', subcategory: 'Shirts', brand: 'Zara', baseprice: 2500, finalprice: 2350, discount: 6, stock: 'In Stock' },
  { _id: 'p07', name: 'Women Striped Shirt Korean Style Full Sleeve', maincategory: 'Womens', subcategory: 'Shirts', brand: 'H&M', baseprice: 1500, finalprice: 1395, discount: 7, stock: 'In Stock' },
  { _id: 'p08', name: 'Solid/Plain Daily Wear Georgette Saree (Maroon)', maincategory: 'Womens', subcategory: 'Saree', brand: 'Zara', baseprice: 3000, finalprice: 2790, discount: 7, stock: 'In Stock' },
  { _id: 'p09', name: 'Women Printed Round Neck Cotton Blend White T-Shirt', maincategory: 'Girls', subcategory: 'T-Shirt', brand: 'H&M', baseprice: 2555, finalprice: 2121, discount: 17, stock: 'In Stock' },
  { _id: 'p10', name: 'Women Wide Leg High Rise Black Jeans', maincategory: 'Womens', subcategory: 'Kurti', brand: 'Zara', baseprice: 2500, finalprice: 2175, discount: 13, stock: 'In Stock' },
  { _id: 'p11', name: 'Women Floral Print Viscose Rayon A-line Kurta (Pink)', maincategory: 'Womens', subcategory: 'Kurti', brand: 'Zara', baseprice: 3500, finalprice: 1610, discount: 54, stock: 'In Stock' },
  { _id: 'p12', name: 'Men Embroidered Viscose Rayon Straight Black Kurta', maincategory: 'Mens', subcategory: 'Kurta', brand: 'Armani', baseprice: 5000, finalprice: 2000, discount: 60, stock: 'In Stock' },
  { _id: 'p13', name: 'Regular Sleeves Floral Print Black Top', maincategory: 'Womens', subcategory: 'Tops', brand: 'Zara', baseprice: 2000, finalprice: 1060, discount: 47, stock: 'In Stock' },
  { _id: 'p14', name: 'Girls Midi/Knee Length Casual Dress', maincategory: 'Girls', subcategory: 'Dressess', brand: 'Armani', baseprice: 1500, finalprice: 975, discount: 35, stock: 'In Stock' },
  { _id: 'p15', name: 'Women Fit and Flare Multicolor Midi/Calf Length Dress', maincategory: 'Womens', subcategory: 'Dressess', brand: 'H&M', baseprice: 5000, finalprice: 2000, discount: 60, stock: 'In Stock' },
  { _id: 'p16', name: 'Women Straight Fit High Rise Light Blue Jeans', maincategory: 'Womens', subcategory: 'Jeans', brand: 'Armani', baseprice: 2000, finalprice: 1000, discount: 50, stock: 'In Stock' },
  { _id: 'p17', name: 'Men Loose Fit Mid Rise Light Blue Jeans', maincategory: 'Mens', subcategory: 'Jeans', brand: 'Armani', baseprice: 2500, finalprice: 1750, discount: 30, stock: 'In Stock' },
  { _id: 'p18', name: 'Men Loose Fit Mid Rise Dark Grey Jeans', maincategory: 'Mens', subcategory: 'Jeans', brand: 'Flying Machine', baseprice: 2000, finalprice: 1400, discount: 30, stock: 'In Stock' },
  { _id: 'p19', name: 'METRONAUT Men Regular Fit Checkered Casual Shirt', maincategory: 'Mens', subcategory: 'Shirt', brand: 'Allen Solly', baseprice: 3000, finalprice: 1200, discount: 60, stock: 'In Stock' },
  { _id: 'p20', name: 'Women Fit and Flare Brown Midi/Calf Length Dress', maincategory: 'Ladies', subcategory: 'Dresses', brand: 'Armani', baseprice: 5999, finalprice: 2100, discount: 65, stock: 'In Stock' },
  { _id: 'p21', name: 'Mens Regular fit Premium Black jacket', maincategory: 'Mens', subcategory: 'Jacket', brand: 'Flying Machine', baseprice: 2500, finalprice: 2000, discount: 20, stock: 'In Stock' }
]

const LIVE = RAW_LIVE.map(normalizeProduct)
const intel = buildCatalogIntel(LIVE)

const BRANDS = ['Titan', 'Zara', 'Adidas', 'H&M', 'Armani', 'Flying Machine', 'Allen Solly']

const sectionOf = (p) => p.maincategory
const MEN_SECTIONS = ['Mens']
const WOMEN_SECTIONS = ['Womens', 'Ladies']
const KIDS_SECTIONS = ['Girls', 'KIds']

describe('live catalogue: audience sections are classified correctly', () => {
  test('every real maincategory maps to the right shopper', () => {
    const expected = {
      Mens: 'men',
      Womens: 'women',
      Ladies: 'women',
      Girls: 'girls',
      KIds: 'kids'
    }
    Object.entries(expected).forEach(([main, want]) => {
      const aud = audiencesOf({ maincategory: main, subcategory: '', name: '', details: '' })
      expect(Array.from(aud)).toContain(want)
    })
  })

  test('"Ladies" counts as women, never as men', () => {
    const aud = audiencesOf({ maincategory: 'Ladies', subcategory: 'Dresses' })
    expect(audienceMatches(aud, 'women')).toBe(true)
    expect(audienceMatches(aud, 'men')).toBe(false)
  })

  test('a Girls product named "Women ..." stays in kids, not women', () => {
    const p = LIVE.find((x) => x.id === 'p09')
    const aud = audiencesOf(p)
    expect(aud.has('girls')).toBe(true)
    expect(aud.has('women')).toBe(false)
    expect(audienceMatches(aud, 'women')).toBe(false)
    expect(audienceMatches(aud, 'kids')).toBe(true)
  })

  test('section counts match the database', () => {
    expect(intel.totalProducts).toBe(21)
    expect(intel.audienceCounts.men).toBe(8)
    expect(intel.audienceCounts.women).toBe(9)   // Womens 8 + Ladies 1
    expect(intel.audienceCounts.kids).toBe(4)    // Girls 3 + KIds 1
    expect(intel.audienceCounts.girls).toBe(3)
  })

  test('live price range and discounts are read correctly', () => {
    expect(intel.priceRange.min).toBe(975)
    expect(intel.priceRange.max).toBe(2790)
    expect(intel.discountStats.max).toBe(65)
    expect(intel.stock.outOfStockCount).toBe(0)
  })
})

describe('live catalogue: gendered searches never leak', () => {
  const gendered = [
    ['show me products for men', MEN_SECTIONS],
    ['mens jeans', MEN_SECTIONS],
    ['mens shirt under 2000', MEN_SECTIONS],
    ['kuch mens ke liye dikhao', MEN_SECTIONS],
    ['show me womens collection', WOMEN_SECTIONS],
    ['ladies dress', WOMEN_SECTIONS],
    ['women jeans under 2000', WOMEN_SECTIONS],
    ['womens saree for wedding', WOMEN_SECTIONS],
    ['kids clothes', KIDS_SECTIONS],
    ['girls dress', KIDS_SECTIONS]
  ]

  test.each(gendered)('"%s" returns only its own section', (query, allowed) => {
    const slots = extractSlots(query, BRANDS)
    const r = searchProducts({ slots, products: LIVE })
    expect(r.products.length).toBeGreaterThan(0)
    r.products.forEach((p) => {
      expect(allowed).toContain(sectionOf(p))
    })
  })

  test('men request never surfaces a Womens, Ladies, Girls or KIds item', () => {
    const slots = extractSlots('show me all mens products', BRANDS)
    const r = searchProducts({ slots, products: LIVE, limit: 8 })
    const sections = r.products.map(sectionOf)
    expect(sections).not.toContain('Womens')
    expect(sections).not.toContain('Ladies')
    expect(sections).not.toContain('Girls')
    expect(sections).not.toContain('KIds')
  })

  test('women request never surfaces a Mens or kids item', () => {
    const slots = extractSlots('show me all womens products', BRANDS)
    const r = searchProducts({ slots, products: LIVE, limit: 8 })
    const sections = r.products.map(sectionOf)
    expect(sections).not.toContain('Mens')
    expect(sections).not.toContain('Girls')
    expect(sections).not.toContain('KIds')
  })

  test('impossible men request stays inside the men section', () => {
    const slots = extractSlots('mens purple velvet saree under 100', BRANDS)
    const r = searchProducts({ slots, products: LIVE })
    r.products.forEach((p) => { expect(sectionOf(p)).toBe('Mens') })
  })
})

describe('live catalogue: real product queries return sensible results', () => {
  test('budget filter respects real prices', () => {
    const slots = extractSlots('mens jeans under 1500', BRANDS)
    const r = searchProducts({ slots, products: LIVE })
    expect(r.products.length).toBeGreaterThan(0)
    r.products.forEach((p) => {
      expect(sectionOf(p)).toBe('Mens')
      expect(p.price).toBeLessThanOrEqual(1500)
    })
    expect(r.products.map((p) => p.name)).toContain('Men Loose Fit Mid Rise Dark Grey Jeans')
  })

  test('brand filter works with real brand names', () => {
    const slots = extractSlots('show me Armani products', BRANDS)
    const r = searchProducts({ slots, products: LIVE, limit: 8 })
    expect(r.products.length).toBeGreaterThan(0)
    r.products.forEach((p) => { expect(p.brand).toBe('Armani') })
  })

  test('biggest discount surfaces the real 65% item', () => {
    const slots = extractSlots('show me the biggest discounts', BRANDS)
    const r = searchProducts({ slots, products: LIVE, limit: 3 })
    expect(r.products[0].discount).toBe(65)
    expect(r.products[0].name).toBe('Women Fit and Flare Brown Midi/Calf Length Dress')
  })

  test('cheapest surfaces the real ₹975 item', () => {
    const slots = extractSlots('cheapest products', BRANDS)
    const r = searchProducts({ slots, products: LIVE, limit: 3 })
    expect(r.products[0].price).toBe(975)
  })

  test('saree search finds the one real saree', () => {
    const slots = extractSlots('saree dikhao', BRANDS)
    const r = searchProducts({ slots, products: LIVE, limit: 4 })
    expect(r.products.map((p) => p.name)).toContain('Solid/Plain Daily Wear Georgette Saree (Maroon)')
  })

  test('MRP vs selling price discount is computed from real numbers', () => {
    const watch = LIVE.find((p) => p.id === 'p01')
    expect(watch.basePrice).toBe(4999)
    expect(watch.price).toBe(2000)
    expect(watch.discount).toBe(60)
  })

  test('"In Stock" string is understood as available', () => {
    LIVE.forEach((p) => {
      const info = interpretStock(p.stock)
      expect(info.inStock).toBe(true)
      expect(info.label).toBe('In stock')
    })
  })

  test('searching a mens product by its own name finds it in stock', () => {
    const men = LIVE.filter((p) => p.maincategory === 'Mens')
    men.forEach((p) => {
      const r = searchProducts({ slots: extractSlots(p.name, BRANDS), products: LIVE })
      expect(r.products.length).toBeGreaterThan(0)
      expect(r.products[0].inStock).toBe(true)
      expect(r.products[0].maincategory).toBe('Mens')
    })
  })

  /* Data-quality guard: three products are named "Women ..." / "Boys ..."
     but filed under Girls / KIds. The admin's section always wins, so a
     women's search must NOT return them. This documents that on purpose. */
  test('mis-filed products follow their admin section, not their name', () => {
    const misfiled = LIVE.filter((p) => ['p06', 'p09'].includes(p.id))
    misfiled.forEach((p) => {
      expect(p.maincategory).toBe('Girls')
      expect(p.name.toLowerCase()).toContain('women')

      const r = searchProducts({ slots: extractSlots('womens products', BRANDS), products: LIVE, limit: 8 })
      expect(r.products.map((x) => x.id)).not.toContain(p.id)

      const kidsResult = searchProducts({ slots: extractSlots('girls products', BRANDS), products: LIVE, limit: 8 })
      expect(kidsResult.products.every((x) => KIDS_SECTIONS.includes(x.maincategory))).toBe(true)
    })
  })
})

describe('live catalogue: replies and prompts use real data', () => {
  test('english reply quotes a real price and stays in the men section', () => {
    const analysis = analyzeMessage({ text: 'mens jeans under 2000', memory: {}, brandList: BRANDS, lastProducts: [] })
    expect(analysis.intent).toBe(INTENTS.PRODUCT_SEARCH)
    const r = searchProducts({ slots: analysis.slots, products: LIVE })
    const text = composeProductReply({ language: 'en', userName: 'Rahul', slots: analysis.slots, result: r, intel })

    expect(text).toMatch(/₹1,(400|750)/)
    expect(text).not.toMatch(/Saree|Kurti|Girls/)
  })

  test('prompt carries the real section rule and real catalogue numbers', () => {
    const slots = extractSlots('mens jeans under 2000', BRANDS)
    const r = searchProducts({ slots, products: LIVE })
    const prompt = buildPersonalizedContext({
      userQuery: 'mens jeans under 2000',
      language: 'en',
      intent: INTENTS.PRODUCT_SEARCH,
      slots,
      matchedProducts: r.products,
      searchResult: r,
      catalogIntel: intel,
      adminCatalog: {
        maincategories: ['Ladies', 'Boys', 'Womens', 'Girls', 'Mens', 'KIds'],
        subcategories: ['Watch', 'Sneakers', 'Shirts', 'Jeans', 'Saree'],
        brands: BRANDS
      }
    })

    expect(prompt).toContain('STRICT SECTION RULE')
    expect(prompt).toContain("men's section")
    expect(prompt).toContain('Total products: 21')
    expect(prompt).toContain('By shopper: men 8 | women 9 | kids 4')
    expect(prompt).toContain('Sections the admin has created: Ladies, Boys, Womens, Girls, Mens, KIds')
    expect(prompt).toContain('DO NOT VOLUNTEER STORE STATISTICS')
    /* the shortlist must not contain any womens or kids product */
    const shortlist = prompt.split('SHORTLIST FOR THIS TURN')[1].split('---')[0]
    expect(shortlist).not.toMatch(/cat=Womens|cat=Ladies|cat=Girls|cat=KIds/)
  })
})
