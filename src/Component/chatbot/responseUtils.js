import { composeProductReply, composeProductDetail } from './replyComposer'

/* Thin compatibility layer — the real, human-sounding copy now lives in
   replyComposer.js so it can use slots, match reasons and catalog stats. */

export const buildProductListReply = ({ language, userName, products = [], slots = {}, result = null, intel = null }) => composeProductReply({
  language,
  userName,
  slots,
  result: result || { products, matchQuality: 'exact', relaxedOn: [] },
  intel
})

export const buildProductDetailReply = ({ language, product, intel = null }) => composeProductDetail({ language, product, intel })
