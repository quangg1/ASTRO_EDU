export type AgentMotion = {
  group: string
  index?: number
}

/** Default rotation when no keyword matches — one motion per user turn. */
const ROTATION: AgentMotion[] = [
  { group: 'FlickRight', index: 0 },
  { group: 'FlickLeft', index: 0 },
  { group: 'Flick3', index: 0 },
  { group: 'FlickDown', index: 0 },
  { group: 'Tap', index: 3 },
  { group: 'FlickLeft', index: 1 },
]

/** FlickUp order in nito.model3.json: 07_bye, 01_happy, 16_menace */
const FLICK_UP = {
  bye: 0,
  happy: 1,
  menace: 2,
} as const

function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase().trim()
}

/**
 * Pick a Live2D motion for a user message.
 * Keyword match wins; otherwise rotate through ROTATION by turn index.
 */
export function pickAgentMotion(text: string, turnIndex: number): AgentMotion {
  const t = normalize(text)

  if (/\b(cảm ơn|cám ơn|thank you|thanks|tuyệt|hay quá|good job|nice|yêu)\b/u.test(t)) {
    return { group: 'FlickUp', index: FLICK_UP.happy }
  }
  if (/\b(bye|goodbye|tạm biệt|hẹn gặp|see you)\b/u.test(t)) {
    return { group: 'FlickUp', index: FLICK_UP.bye }
  }
  if (/\b(không hiểu|sai rồi|wrong|tệ|dở|ghét|wtf|chán|giận|angry)\b/u.test(t)) {
    return { group: 'FlickUp', index: FLICK_UP.menace }
  }
  if (/\?|tại sao|vì sao|là gì|how |why |what |giải thích|explain/.test(t)) {
    return { group: 'FlickRight', index: 0 }
  }
  if (/!{2,}/.test(t)) {
    return { group: 'Shake', index: 0 }
  }
  if (/\b(chào|hello|hi |xin chào|hey)\b/u.test(t)) {
    return { group: 'FlickUp', index: FLICK_UP.happy }
  }
  if (/\b(buồn|sad|khóc|cry)\b/u.test(t)) {
    return { group: 'Tap', index: 2 }
  }

  return ROTATION[Math.abs(turnIndex) % ROTATION.length]
}

/** AI đang suy nghĩ — 09_yawn */
export const AGENT_THINKING_MOTION: AgentMotion = { group: 'Flick3', index: 1 }

/** AI vừa trả lời — 15_joy */
export const AGENT_REPLY_MOTION: AgentMotion = { group: 'Tap', index: 3 }
