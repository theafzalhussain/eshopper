# Chatbot QA Checklist (Pass/Fail)

Use this checklist for manual validation in development or staging.

## Environment

- Build: Current branch
- Date:
- Tester:
- Device/Browser:
- API base URL:

## Validation Rules

- English input must return professional English output.
- Hindi/Hinglish input must return natural Hindi output.
- Tone must remain official, human, concise, and user-friendly.
- Common spelling mistakes should still map to the correct user intent.
- Product requests should show relevant shortlist behavior.

## Test Execution Table

| ID | Prompt | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|
| T01 | hello, suggest party wear under 2500 | English, premium-professional response; asks/refines as needed |  |  |
| T02 | hloo sugst pparty wear undr 2500 | Interprets typo query correctly; product intent still works |  |  |
| T03 | how r u | Short, warm, human English response |  |  |
| T04 | hwo are yuo | Still interpreted as how-are-you; polished English reply |  |  |
| T05 | mujhe office wear dikhao budget 1800 | Hindi response; relevant product guidance |  |  |
| T06 | muje ofice wear dikhaoo budjet 1800 | Hindi typo query understood; similar intent result to T05 |  |  |
| T07 | return polciy kya hai | Hindi support response with return policy details |  |  |
| T08 | refnd sttaus pls | English support response; refund intent understood |  |  |
| T09 | Reply in English please | Preference switches to English |  |  |
| T10 | Hindi me baat karo | Preference switches to Hindi |  |  |
| T11 | show mens black shirt size m | Filters understood: audience + color + size |  |  |
| T12 | sho me mnz blak shrt siz m | Misspelled product filters still interpreted correctly |  |  |

## Regression Checks

| ID | Check | Pass/Fail | Notes |
|---|---|---|---|
| R01 | Chat widget opens/closes correctly on desktop and mobile |  |  |
| R02 | No console runtime errors during chat flow |  |  |
| R03 | Cached repeat prompts feel faster than first request |  |  |
| R04 | Product cards remain visible and relevant after typo queries |  |  |
| R05 | Fallback replies remain professional (no robotic/slang output) |  |  |

## Sign-off

- Total Passed:
- Total Failed:
- Blocking Issues:
- Ready for Production: Yes/No
