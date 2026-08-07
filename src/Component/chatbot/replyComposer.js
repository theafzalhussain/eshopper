import { OCCASION_MAP } from './constants'
import { nextMissingSlot } from './intentEngine'
import { buildAlternatives, savingsOf, AUDIENCE_LABELS } from './catalogIntel'
import { isHindiLike } from './languageUtils'

/* ══════════════════════════════════════════════════════════
   Deterministic-but-varied picker so the bot never repeats
   the same opener twice in a row.
══════════════════════════════════════════════════════════ */
let rotation = 0
const pick = (arr) => {
  if (!arr || !arr.length) return ''
  rotation = (rotation + 1) % 997
  return arr[rotation % arr.length]
}

const rs = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const firstName = (name) => {
  const clean = String(name || '').trim()
  if (!clean || clean.toLowerCase() === 'guest' || clean.toLowerCase() === 'user') return ''
  return clean.split(/\s+/)[0]
}

/* Devanagari variants for shoppers who type in Hindi script */
const DEV = {
  greetHead: (n) => `नमस्ते ${n || 'जी'}! मैं Aria हूँ — आपकी personal style consultant.`,
  greetAsk: 'बताइए, किस occasion के लिए देख रहे हैं और budget कितना रखें?',
  shortlist: 'आपके लिए मैंने ये options चुने हैं',
  advice: 'मेरी सलाह',
  nothing: 'इस exact combination में अभी कुछ नहीं मिला।',
  flex: 'Budget या colour थोड़ा flexible कर दें तो मैं तुरंत बेहतर options निकाल देती हूँ।'
}

const audLabel = (aud) => AUDIENCE_LABELS[aud] || aud

const occasionLabel = (slots) => {
  const key = slots?.occasions?.[0]
  return key ? (OCCASION_MAP[key]?.label || key) : ''
}

const needLine = (slots, language) => {
  const hi = isHindiLike(language)
  const bits = []
  if (slots?.audience) bits.push(hi ? `${audLabel(slots.audience)} section se` : `${audLabel(slots.audience)}`)
  if (slots?.categories?.length) bits.push(slots.categories[0])
  const occ = occasionLabel(slots)
  if (occ) bits.push(hi ? `${occ} ke liye` : `for ${occ}`)
  if (slots?.colors?.length) bits.push(slots.colors[0])
  if (slots?.sizes?.length) bits.push(hi ? `size ${slots.sizes[0]}` : `size ${slots.sizes[0]}`)
  if (slots?.budget?.max) bits.push(hi ? `${rs(slots.budget.max)} ke andar` : `under ${rs(slots.budget.max)}`)
  return bits.join(' ')
}

const timeGreeting = (language) => {
  const h = new Date().getHours()
  if (isHindiLike(language)) {
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ══════════════════════════════════════════════════════════
   PRODUCT REPLY
══════════════════════════════════════════════════════════ */
const OPENERS_EN = [
  'Okay, here is what I would personally shortlist for you',
  'I went through the whole catalogue and these stood out',
  'Got it — based on what you described, these are my top picks',
  'These feel right for what you are after',
  'I have narrowed the collection down to these for you'
]

const OPENERS_HI = [
  'Theek hai, aapke liye maine ye options shortlist kiye hain',
  'Poora catalogue dekh kar ye sabse sahi lage',
  'Samajh gayi — aapki requirement ke hisaab se ye best picks hain',
  'Ye options aapke liye ekdum theek baithenge',
  'Maine collection chhaan kar aapke liye ye nikale hain'
]

const productHighlight = (p, language) => {
  const hi = isHindiLike(language)
  const price = rs(p.price)
  const mrp = Number(p.basePrice) > Number(p.price) ? rs(p.basePrice) : ''
  const disc = Number(p.discount) > 0 ? `${p.discount}% off` : ''
  const save = savingsOf(p) > 0 ? (hi ? `${rs(savingsOf(p))} bachat` : `saves ${rs(savingsOf(p))}`) : ''
  const rating = Number(p.rating) > 0 ? `⭐ ${p.rating}${Number(p.reviews) > 0 ? `/${p.reviews} reviews` : ''}` : ''
  const money = mrp ? `${price} (${mrp}${disc ? `, ${disc}` : ''})` : price

  const facts = [money, save, rating, p.stockLabel && p.stockLabel !== 'In stock' ? p.stockLabel : '']
    .filter(Boolean).join(' · ')

  const why = p.matchReason ? ` — ${p.matchReason}` : ''
  return `• ${p.name} — ${facts}${why}`
}

const followUpQuestion = (slots, language) => {
  const missing = nextMissingSlot(slots)
  const q = {
    audience: {
      en: 'Quick one — is this for you, or are you shopping for someone else?',
      hi: 'Ek chhoti baat — ye aapke liye hai ya kisi aur ke liye?'
    },
    occasion: {
      en: 'What is the occasion? That helps me get the styling exactly right.',
      hi: 'Occasion kya hai? Usse main styling exactly sahi kar paungi.'
    },
    budget: {
      en: 'What budget feels comfortable? I will keep everything inside it.',
      hi: 'Budget kitna comfortable hai? Main usi range me options rakhungi.'
    },
    size: {
      en: 'Which size do you usually wear? I will only show what is actually in stock for you.',
      hi: 'Aap usually konsa size pehente hain? Main sirf wahi dikhaungi jo stock me ho.'
    },
    color: {
      en: 'Any colour you lean towards, or should I show the full spread?',
      hi: 'Koi colour pasand hai, ya poori range dikha dun?'
    }
  }
  const key = isHindiLike(language) ? 'hi' : 'en'
  if (missing && q[missing]) return q[missing][key]

  return isHindiLike(language)
    ? 'Inme se koi pasand aaye to bata dijiye — main uske jaise aur options ya matching pieces dikha dungi.'
    : 'Tell me which one you like and I will pull up similar options or pieces that pair with it.'
}

export const composeProductReply = ({
  language = 'en',
  userName = '',
  slots = {},
  result = {},
  intel = null
}) => {
  const isHi = isHindiLike(language)
  const isDev = language === 'hi'
  const products = result.products || []
  const name = firstName(userName)

  if (products.length === 0) {
    /* Honest, specific dead-end message — never show the wrong section */
    if (result.audienceEmpty && slots.audience) {
      const label = audLabel(slots.audience)
      const counts = intel?.audienceCounts || {}
      const other = Object.entries({ men: counts.men, women: counts.women, kids: counts.kids })
        .filter(([k, v]) => k !== slots.audience && v > 0)
        .map(([k, v]) => `${audLabel(k)} (${v})`)
        .join(', ')
      if (isDev) {
        return `${name ? `${name}, ` : ''}अभी ${label} section में इस तरह का कुछ available नहीं है — और मैं आपको जान-बूझकर दूसरे section का सामान नहीं दिखाऊँगी।${other ? `\nजो sections भरे हुए हैं: ${other}.` : ''}\nकोई और category या budget बताइए, मैं फिर से ढूँढती हूँ।`
      }
      return isHi
        ? `${name ? `${name}, ` : ''}filhaal ${label} section me aisa kuch available nahi hai — aur main jaan-boojh kar aapko dusre section ka saamaan nahi dikhaungi.${other ? `\nJo sections bhare hue hain: ${other}.` : ''}\nKoi aur category ya budget bata dijiye, main dobara dhoondh deti hoon.`
        : `${name ? `${name}, ` : ''}there is nothing in the ${label} section matching that right now — and I will not pad the list with items from another section.${other ? `\nWell-stocked sections: ${other}.` : ''}\nGive me another category or budget and I will look again.`
    }

    const alts = buildAlternatives({ intel, slots })
    const altLine = alts.length
      ? (isHi ? `\nKuch nazdeeki options: ${alts.join(' | ')}.` : `\nClose alternatives: ${alts.join(' | ')}.`)
      : ''
    if (isDev) return `${name ? `${name}, ` : ''}${DEV.nothing}${altLine}\n${DEV.flex}`
    return isHi
      ? `${name ? `${name}, ` : ''}is exact combination me filhaal kuch nahi mila.${altLine}\nAap budget ya colour thoda flexible kar dein to main turant behtar options nikal deti hoon.`
      : `${name ? `${name}, ` : ''}I could not find anything for that exact combination right now.${altLine}\nIf you can flex the budget or colour a little, I will find you something strong immediately.`
  }

  const opener = isDev ? DEV.shortlist : pick(isHi ? OPENERS_HI : OPENERS_EN)
  const need = needLine(slots, language)
  const head = need
    ? `${opener}${name ? `, ${name}` : ''} — ${need}.`
    : `${opener}${name ? `, ${name}` : ''}.`

  const relaxNote = (result.relaxedOn || []).length
    ? (isHi
      ? `Bilkul exact match kam tha, isliye maine ${result.relaxedOn.slice(0, 2).join(' aur ')} par thodi flexibility li hai.`
      : `Exact matches were thin, so I loosened ${result.relaxedOn.slice(0, 2).join(' and ')} slightly to give you real choices.`)
    : ''

  const lines = products.slice(0, 4).map((p) => productHighlight(p, language))

  const cheapest = [...products].filter((p) => Number(p.price) > 0).sort((a, b) => a.price - b.price)[0]
  const bestDeal = [...products].sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0))[0]
  const bestRated = [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0]

  const verdictBits = []
  if (bestRated && Number(bestRated.rating) >= 4.3) {
    verdictBits.push(`${isHi ? 'Sabse safe choice' : 'Safest bet'}: ${bestRated.name} (${bestRated.rating}/5)`)
  }
  if (bestDeal && Number(bestDeal.discount) >= 15 && bestDeal.name !== bestRated?.name) {
    verdictBits.push(`${isHi ? 'Best value' : 'Best value'}: ${bestDeal.name} (${bestDeal.discount}% off)`)
  }
  if (cheapest && cheapest.name !== bestDeal?.name && cheapest.name !== bestRated?.name) {
    verdictBits.push(`${isHi ? 'Budget pick' : 'Budget pick'}: ${cheapest.name} (${rs(cheapest.price)})`)
  }

  const verdict = verdictBits.length
    ? `${isDev ? DEV.advice : (isHi ? 'Meri salah' : 'My take')}: ${verdictBits.join(' · ')}.`
    : ''

  return [head, relaxNote, lines.join('\n'), verdict, followUpQuestion(slots, language)]
    .filter(Boolean)
    .join('\n\n')
}

/* ══════════════════════════════════════════════════════════
   PRODUCT DETAIL
══════════════════════════════════════════════════════════ */
export const composeProductDetail = ({ language = 'en', product }) => {
  if (!product) return ''
  const isHi = isHindiLike(language)
  const sizes = Array.isArray(product.size) ? product.size.join(', ') : product.size

  const rows = [
    Number(product.price) > 0
      ? `Price: ${rs(product.price)}${Number(product.basePrice) > Number(product.price) ? ` (MRP ${rs(product.basePrice)}, ${product.discount}% off, ${isHi ? 'bachat' : 'you save'} ${rs(savingsOf(product))})` : ''}`
      : '',
    product.brand ? `Brand: ${product.brand}` : '',
    [product.maincategory, product.subcategory].filter(Boolean).length
      ? `Section: ${[product.maincategory, product.subcategory].filter(Boolean).join(' › ')}`
      : '',
    product.color ? `Colour: ${product.color}` : '',
    product.fabric ? `Fabric: ${product.fabric}` : '',
    sizes ? `Sizes: ${sizes}` : '',
    Number(product.rating) > 0 ? `Rating: ${product.rating}/5${Number(product.reviews) > 0 ? ` (${product.reviews} reviews)` : ''}` : '',
    product.stockLabel ? `${isHi ? 'Stock' : 'Availability'}: ${product.stockLabel}` : ''
  ].filter(Boolean)

  const advice = []
  if (Number(product.discount) >= 25) advice.push(isHi ? 'Discount kaafi accha chal raha hai, is price par value strong hai.' : 'The discount here is genuinely good, so the value at this price is strong.')
  if (/cotton|linen/i.test(product.fabric || '')) advice.push(isHi ? 'Fabric breathable hai, din bhar comfortable rahega.' : 'The fabric is breathable, so it stays comfortable all day.')
  if (/silk|satin|velvet|georgette/i.test(product.fabric || '')) advice.push(isHi ? 'Ye fabric evening aur festive events me premium lagta hai.' : 'This fabric photographs beautifully for evening and festive events.')
  if (Number(product.rating) >= 4.5) advice.push(isHi ? 'Rating high hai, matlab buyers ko fit aur quality pasand aayi hai.' : 'The rating is high, which usually means the fit and quality hold up.')
  if (product.inStock === false) advice.push(isHi ? 'Filhaal stock out hai — main iske jaise alternatives dikha sakti hoon.' : 'It is out of stock right now — I can show close alternatives.')

  const head = isHi ? `${product.name} ki poori detail:` : `Here is the full picture on ${product.name}:`
  const tail = isHi
    ? 'Size guidance, similar options, ya isse match karta outfit chahiye to bata dijiye.'
    : 'Want size guidance, similar options, or pieces that pair with it?'

  return [head, rows.join('\n'), advice.slice(0, 2).join(' '), tail].filter(Boolean).join('\n\n')
}

/* ══════════════════════════════════════════════════════════
   GREETING — always warm, never a sales pitch.
   Deliberately quotes NO catalogue stats, discounts or offers.
   Those are only ever shared when the customer asks for them.
══════════════════════════════════════════════════════════ */
export const composeGreeting = ({ language = 'en', userName = '' }) => {
  const isHi = isHindiLike(language)
  const isDev = language === 'hi'
  const name = firstName(userName)
  const tod = timeGreeting(language)

  if (isDev) {
    return [`${tod} ${name || 'जी'}! 🌸 ${DEV.greetHead(name)}`, DEV.greetAsk].filter(Boolean).join(' ')
  }

  const greet = isHi
    ? pick([
      `${tod} ${name || 'ji'}! 🌸 Main Aria hoon, aapki personal style consultant.`,
      `${tod} ${name || 'ji'}! Khushi hui aapse baat karke — main Aria, aapki style consultant.`,
      `Namaste ${name || 'ji'}! 😊 Main Aria hoon. Aaram se bataiye, kya dhoondh rahe hain.`
    ])
    : pick([
      `${tod}${name ? ` ${name}` : ''}! 🌸 I am Aria, your personal style consultant at Eshopper.`,
      `${tod}${name ? ` ${name}` : ''}! Lovely to have you here — I am Aria, and finding the right piece is literally my job.`,
      `Hi${name ? ` ${name}` : ''}! 😊 Aria here. Let us find you something you will actually love wearing.`
    ])

  const ask = isHi
    ? 'Bataiye — kis occasion ke liye chahiye, aur budget kya rakhein? 😊'
    : 'Tell me what you are looking for — the occasion, or roughly the budget — and I will curate from there. 😊'

  return [greet, ask].filter(Boolean).join(' ')
}

export const composeSmalltalk = ({ language = 'en', userName = '' }) => {
  const isHi = isHindiLike(language)
  const name = firstName(userName)
  if (language === 'hi') {
    return `मैं बिलकुल बढ़िया हूँ, पूछने के लिए शुक्रिया! 😊 आप बताइए ${name || 'जी'} — आज क्या ढूँढ रहे हैं?`
  }
  return isHi
    ? pick([
      `Main bilkul badhiya hoon, poochhne ke liye shukriya! 😊 Aap bataiye ${name || 'ji'} — aaj kya dhoondh rahe hain?`,
      `Ekdum mast hoon, thank you! Aapka din kaisa ja raha hai? Aur kis cheez ki talaash hai?`
    ])
    : pick([
      `I am doing great, thanks for asking! 😊 How about you${name ? `, ${name}` : ''} — what are we shopping for today?`,
      `All good on my side, thank you! What can I help you find?`
    ])
}

export const composeThanks = ({ language = 'en' }) => {
  if (language === 'hi') return 'खुशी हुई मदद करके! 😊 कुछ और चाहिए तो बेझिझक पूछ लीजिए।'
  return isHindiLike(language)
    ? pick(['Khushi hui madad karke! 😊 Kuch aur chahiye to bejhijhak poochh lijiye.', 'Bilkul, isi ke liye hoon. Aur kuch dekhna ho to batayein.'])
    : pick(['Happy to help! 😊 Anything else you want me to look at?', 'My pleasure. Ping me any time you want a second opinion on a piece.'])
}

export const composeGoodbye = ({ language = 'en', userName = '' }) => {
  const name = firstName(userName)
  if (language === 'hi') return `धन्यवाद ${name || 'जी'}! शॉपिंग का मज़ा लीजिए, मैं यहीं हूँ जब भी ज़रूरत हो. 🌸`
  return isHindiLike(language)
    ? `Dhanyavaad ${name || 'ji'}! Shopping ka maza lijiye, main yahin hoon jab bhi zarurat ho. 🌸`
    : `Take care${name ? `, ${name}` : ''}! Enjoy the shopping — I am right here whenever you need a hand. 🌸`
}

export const composeIdentity = ({ language = 'en' }) => {
  const isHi = isHindiLike(language)

  if (language === 'hi') {
    return `मैं Aria हूँ, Eshopper की personal style consultant. मैं ये कर सकती हूँ:\n• Occasion, budget, size, colour, fabric या brand से products ढूँढना\n• दो options compare करके बताना कौन better है\n• पूरा outfit बनाना — top, bottom, footwear, accessories\n• किसी भी product की price, fabric, size और availability बताना\n• Return, delivery, payment और order tracking में help करना\nबस अपनी requirement लिख दीजिए. 😊`
  }

  return isHi
    ? `Main Aria hoon, Eshopper ki personal style consultant. Main ye kar sakti hoon:\n• Occasion, budget, size, colour, fabric ya brand ke hisaab se products dhoondhna\n• Do options compare karke batana konsa better hai\n• Poora outfit banana — top, bottom, footwear, accessories\n• Kisi bhi product ki price, fabric, size aur availability batana\n• Return, delivery, payment aur order tracking me help karna\nBas apni requirement likh dijiye. 😊`
    : `I am Aria, your personal style consultant at Eshopper. Here is what I can do:\n• Find products by occasion, budget, size, colour, fabric or brand\n• Compare two options and tell you which is the better buy\n• Build a complete outfit — top, bottom, footwear, accessories\n• Tell you the price, fabric, sizes and availability of any piece\n• Help with returns, delivery, payment and order tracking\nJust tell me what you need. 😊`
}

export const composeCatalogOverview = ({ language = 'en', intel = null }) => {
  const isHi = isHindiLike(language)
  if (!intel?.totalProducts) {
    return isHi
      ? 'Catalog load ho raha hai. Ek pal me poori list bata deti hoon.'
      : 'The catalogue is still loading. Give me a moment and I will lay out everything we carry.'
  }

  const cats = intel.categories.slice(0, 6).map((c) => {
    const subs = c.subcategories.slice(0, 4).map((s) => s.name).join(', ')
    return `• ${c.name} — ${c.count} items (${rs(c.minPrice)}–${rs(c.maxPrice)})${subs ? `\n   ${subs}` : ''}`
  }).join('\n')

  const bands = intel.priceBands.map((b) => `${b.label.replace('Rs.', '₹')}: ${b.count}`).join(' · ')
  const ac = intel.audienceCounts || {}
  const audLine = `Men ${ac.men || 0} · Women ${ac.women || 0} · Kids ${ac.kids || 0}`

  return isHi
    ? `Abhi Eshopper par ${intel.totalProducts} products live hain (${audLine}).\n\n${cats}\n\nPrice buckets — ${bands}\nDiscount: ${intel.discountStats.count} items par, average ${intel.discountStats.avg}% (max ${intel.discountStats.max}%).\n\nKisi bhi section ka naam ya apna budget bata dijiye, main wahin se best nikal deti hoon.`
    : `We currently have ${intel.totalProducts} products live (${audLine}).\n\n${cats}\n\nPrice buckets — ${bands}\nDiscounts: ${intel.discountStats.count} items on offer, averaging ${intel.discountStats.avg}% (max ${intel.discountStats.max}%).\n\nName a section or give me a budget and I will pull the best of it.`
}

export const composeDeals = ({ language = 'en', intel = null, coupons = [] }) => {
  const isHi = isHindiLike(language)
  if (!intel?.bestDeals?.length) {
    return isHi ? 'Filhaal live deals load ho rahe hain, ek pal dijiye.' : 'Live deals are still loading, one moment.'
  }
  const lines = intel.bestDeals.slice(0, 5).map((p) => `• ${p.name} — ${p.discount}% off, ${isHi ? 'ab' : 'now'} ${rs(p.price)}${Number(p.basePrice) > Number(p.price) ? ` (MRP ${rs(p.basePrice)})` : ''}`)
  const codes = coupons.map((c) => c.code).filter(Boolean).slice(0, 4)
  const couponLine = codes.length ? `\nActive coupons: ${codes.join(', ')}` : ''

  return isHi
    ? `Abhi ke sabse bade discounts:\n${lines.join('\n')}\nAverage discount ${intel.discountStats.avg}%, maximum ${intel.discountStats.max}%.${couponLine}\n\nKisi ek category ka best deal chahiye to naam bata dijiye.`
    : `Here are the biggest live discounts right now:\n${lines.join('\n')}\nAverage discount is ${intel.discountStats.avg}%, the highest is ${intel.discountStats.max}%.${couponLine}\n\nWant the best deal inside a specific category? Just name it.`
}

export const composeComplaint = ({ language = 'en', userName = '' }) => {
  const name = firstName(userName)
  const isHi = isHindiLike(language)
  return isHi
    ? `${name ? `${name}, ` : ''}sunkar bura laga — ye theek karwana zaroori hai.\n• Order related ho to My Orders se return/replacement raise kar dein (7 din ke andar)\n• Damaged ya galat item ho to photo ke sath support@eshopperr.me par mail karein, priority pe handle hota hai\n• Turant baat karni ho to +91 8447859784 par 10 AM–8 PM call kar lein\nMujhe order ID ya problem detail bata dijiye, main agla step exactly bata deti hoon.`
    : `${name ? `${name}, ` : ''}I am sorry that happened — let us get it sorted.\n• If it is order related, raise a return or replacement from My Orders (within 7 days)\n• For a damaged or wrong item, email support@eshopperr.me with photos; those are handled on priority\n• To speak to someone now, call +91 8447859784 between 10 AM and 8 PM\nShare the order ID or what went wrong and I will tell you the exact next step.`
}

export const composeSizeHelp = ({ language = 'en', intel = null, slots = {} }) => {
  const isHi = isHindiLike(language)
  const available = intel?.sizes?.length ? intel.sizes.slice(0, 10).map((s) => s.name).join(', ') : 'XS–XXL'
  const cat = slots?.categories?.[0] || ''
  return isHi
    ? `Size ka sabse aasan tareeqa: apne favourite kapde ko flat rakh kar chest/waist inches me naap lein, phir product page ke size chart se match karein.\n• Stock me available sizes: ${available}\n• Shirt/kurta me chest measurement decide karta hai, jeans/trouser me waist\n• Oversized ya layering chahiye to ek size upar lein${cat ? `\n• ${cat} me generally true-to-size chalta hai` : ''}\nApna usual size ya chest/waist inches bata dijiye, main sirf wahi products dikhaungi jinme wo size stock me hai.`
    : `Easiest way to get size right: lay your best-fitting garment flat, measure chest/waist in inches, then match it against the size chart on the product page.\n• Sizes currently in stock: ${available}\n• For shirts and kurtas the chest measurement decides it; for jeans and trousers it is the waist\n• Going for an oversized or layered look? Take one size up${cat ? `\n• ${cat} generally runs true to size` : ''}\nTell me your usual size or your chest/waist in inches and I will only show pieces that actually have it in stock.`
}

export const composeOutfitIntro = ({ language = 'en', slots = {} }) => {
  const occ = occasionLabel(slots)
  return isHindiLike(language)
    ? `Chaliye poora look banate hain${occ ? ` ${occ} ke liye` : ''} — ek main piece, ek bottom, footwear aur ek accessory. Neeche ke pieces aapas me match karte hain:`
    : `Let us build the full look${occ ? ` for ${occ}` : ''} — one hero piece, a bottom, footwear and one accessory. These pieces work together:`
}

export const composeCompareIntro = ({ language = 'en' }) => (isHindiLike(language)
  ? 'Chaliye inhe side by side dekhte hain — price, value, rating aur kis situation me konsa better rahega:'
  : 'Let us put these side by side — price, value, rating, and which one wins in what situation:')

/* ══════════════════════════════════════════════════════════
   DYNAMIC FOLLOW-UP CHIPS
══════════════════════════════════════════════════════════ */
export const buildFollowUpChips = ({ slots = {}, result = {}, intel = null, language = 'en' }) => {
  const isHi = isHindiLike(language)
  const chips = []
  const push = (label, prompt) => {
    if (chips.length >= 6) return
    if (chips.some((c) => c.prompt === prompt)) return
    chips.push({ label, prompt })
  }

  const products = result.products || []
  const cat = slots.categories?.[0] || ''
  const occ = slots.occasions?.[0] || ''
  const aud = slots.audience || ''
  const audSuffix = aud ? ` for ${aud}` : ''

  if (products.length > 1) {
    push(isHi ? '⚖️ Compare karo' : '⚖️ Compare these', 'Compare the first two options you showed and tell me which is the better buy')
  }
  if (products.length) {
    push(isHi ? '👗 Poora outfit' : '👗 Complete the look', 'Build a complete outfit around the first option you showed')
    push(isHi ? '📋 Detail batao' : '📋 Full details', 'Give me full details of the first option you showed')
  }

  if (!slots.budget) {
    const band = intel?.priceBands?.find((b) => b.count > 0)
    if (band) {
      push(`💰 ${band.label.replace('Rs.', '₹')}`,
        `Show ${cat || 'options'}${audSuffix} ${band.max === Infinity ? `above ${band.min}` : `under ${band.max}`} rupees`)
    }
  } else if (slots.budget.max) {
    push(isHi ? '💵 Sasta option' : '💵 Cheaper options', `Show cheaper ${cat || 'options'}${audSuffix} than what you just showed`)
  }

  if (!slots.colors?.length && intel?.colors?.length) {
    const color = intel.colors[0].name
    push(`🎨 ${color}`, `Show ${color} ${cat || 'options'}${audSuffix}`)
  }

  if (!aud) {
    push(isHi ? '👔 Men' : '👔 Men', `Show ${cat || 'products'} for men`)
    push(isHi ? '👠 Women' : '👠 Women', `Show ${cat || 'products'} for women`)
  }

  if (!slots.wantsSale) push(isHi ? '🔥 Best discount' : '🔥 Biggest discount', `Show the biggest discounts on ${cat || 'products'}${audSuffix}`)
  if (!slots.wantsTopRated) push(isHi ? '⭐ Top rated' : '⭐ Top rated', `Show top rated ${cat || 'products'}${audSuffix}`)
  if (!slots.wantsNewArrival) push(isHi ? '✨ New arrivals' : '✨ New arrivals', `Show new arrivals${audSuffix}${cat ? ` in ${cat}` : ''}`)

  if (!occ) push(isHi ? '🎉 Party wear' : '🎉 Party wear', `Show party wear${audSuffix}`)
  if (!slots.sizes?.length) push(isHi ? '📏 Size guide' : '📏 Size guide', `Help me pick the right size for ${cat || 'this'}`)

  return chips.slice(0, 6)
}

export const DEFAULT_CHIPS = [
  { label: '👔 Men', prompt: 'Show me products for men' },
  { label: '👠 Women', prompt: 'Show me products for women' },
  { label: '🧸 Kids', prompt: 'Show me products for kids' },
  { label: '🎉 Party wear', prompt: 'Show party wear outfits' },
  { label: '💼 Office look', prompt: 'Show office and formal wear' },
  { label: '🧵 Ethnic wear', prompt: 'Show ethnic and traditional wear' },
  { label: '🌸 Casual daily', prompt: 'Show casual everyday outfits' },
  { label: '✨ New arrivals', prompt: 'Show the latest new arrivals' },
  { label: '🔥 Best deals', prompt: 'Show products with the biggest discounts' },
  { label: '💰 Under ₹999', prompt: 'Show products under 999 rupees' },
  { label: '💵 Under ₹1999', prompt: 'Show products under 1999 rupees' },
  { label: '🎁 Gifting', prompt: 'Help me pick a gift and show options' },
  { label: '📦 Track order', prompt: 'How do I track my order?' },
  { label: '↩️ Return policy', prompt: 'What is the return policy?' }
]
