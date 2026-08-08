import React from 'react'
import { render, screen, act } from '@testing-library/react'
import ChatBot from '../Component/ChatBot'

jest.mock('axios', () => {
  const ok = () => Promise.resolve({ data: [] })
  const api = { get: jest.fn(ok), post: jest.fn(ok) }
  return { __esModule: true, default: { ...api, create: jest.fn(() => api) } }
})

/* jsdom lacks these */
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

const setViewport = (width) => {
  window.innerWidth = width
  window.matchMedia = jest.fn().mockImplementation((query) => {
    const max = Number(/max-width:\s*(\d+)/.exec(query)?.[1] || 0)
    return {
      matches: max ? width <= max : false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }
  })
}

const openChat = async () => {
  const launcher = screen.getByLabelText('Open style consultant')
  await act(async () => { launcher.click() })
  return screen.getByRole('dialog')
}

afterEach(() => {
  document.body.style.overflow = ''
  localStorage.clear()
})

describe('chat window sizing', () => {
  test('phone width (390px) opens the chat full screen and locks page scroll', async () => {
    setViewport(390)
    render(<ChatBot />)
    const card = await openChat()
    expect(card).toBeTruthy()
    expect(card.className).toContain('fullscreen')
    expect(document.body.style.overflow).toBe('hidden')
  })

  test('small window (700px) also goes full screen — the old cut-off was 500px', async () => {
    setViewport(700)
    render(<ChatBot />)
    const card = await openChat()
    expect(card.className).toContain('fullscreen')
  })

  test('desktop (1280px) keeps the floating card and does not lock scroll', async () => {
    setViewport(1280)
    render(<ChatBot />)
    const card = await openChat()
    expect(card.className).not.toContain('fullscreen')
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('fullscreen stylesheet', () => {
  // eslint-disable-next-line global-require
  const { CHATBOT_STYLES } = require('../Component/chatbot/chatbotStyles')

  test('the 767px block makes the card full-bleed without viewport units', () => {
    const block = CHATBOT_STYLES.split('@media (max-width: 767px)')[1]
    expect(block).toBeTruthy()
    expect(block).toMatch(/inset:\s*0\s*!important/)
    // html { zoom: 0.8 } shrinks vw/dvh, so the card must stretch via insets
    expect(block).toMatch(/width:\s*auto\s*!important/)
    expect(block).toMatch(/height:\s*auto\s*!important/)
    expect(block).toMatch(/max-height:\s*none\s*!important/)
    expect(block).toMatch(/border-radius:\s*0\s*!important/)
    const cardRules = block.split('.chat-header')[0]
    expect(cardRules).not.toMatch(/100vw|100dvh/)
  })
})
