# Chatbot Live Prompt Test Matrix

Use this matrix while running the app to verify language routing, luxury-professional tone, and typo tolerance.

## How to Run

1. Open chatbot in the app.
2. Enter each prompt exactly as shown.
3. Confirm language, tone, and behavior match the Expected Outcome.

## Test Cases

| # | Input Prompt | Expected Language | Expected Outcome |
|---|---|---|---|
| 1 | hello, suggest party wear under 2500 | English | Professional concierge tone, product shortlist request acknowledged, asks one useful follow-up if needed. |
| 2 | hloo sugst pparty wear undr 2500 | English | Understands misspellings, still treats as product request, returns/refines options. |
| 3 | how r u | English | Warm, official, short human response; asks how it can assist next. |
| 4 | hwo are yuo | English | Correctly interpreted as how-are-you; polished human reply. |
| 5 | mujhe office wear dikhao budget 1800 | Hindi | Natural Hindi reply, human and respectful, offers/refines relevant products. |
| 6 | muje ofice wear dikhaoo budjet 1800 | Hindi | Misspelled Hinglish still understood; Hindi response and relevant shortlist flow. |
| 7 | return polciy kya hai | Hindi | Interprets return-policy intent despite typo; Hindi policy response. |
| 8 | refnd sttaus pls | English | Interprets refund intent despite typo; professional support guidance in English. |
| 9 | Reply in English please | English | Sets English preference and continues in professional English. |
|10 | Hindi me baat karo | Hindi | Sets Hindi preference and continues in natural Hindi. |
|11 | show mens black shirt size m | English | Correctly identifies men + color + size filters; concise curated response. |
|12 | sho me mnz blak shrt siz m | English | Misspelled product query still parsed; similar output intent as case #11. |

## Acceptance Criteria

- English input => professional English output.
- Hindi input => natural Hindi output.
- Tone remains official, human, concise, and user-friendly.
- Misspelled common words still map to the intended task.
- Product/filter requests still work with typo-heavy prompts.
