/**
 * Parse @mentions from text and return array of mention objects.
 * Supports @username, @email, @display-name formats.
 */

import React from 'react'

export interface Mention {
  text: string // The full @mention text including @
  username: string // The username/email/name part
  start: number // Start index in original text
  end: number // End index in original text
}

export function parseMentions(text: string): Mention[] {
  // Match @username, @email, or @display-name (with spaces/hyphens)
  const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)/g
  const mentions: Mention[] = []
  let match
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      text: match[0],
      username: match[1],
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  
  return mentions
}

/**
 * Highlight @mentions in text by wrapping them in spans.
 */
export function highlightMentions(text: string): React.ReactNode[] {
  const mentions = parseMentions(text)
  if (mentions.length === 0) return [text]
  
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  
  mentions.forEach((mention, i) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      nodes.push(text.slice(lastIndex, mention.start))
    }
    // Add highlighted mention
    nodes.push(
      <span key={`mention-${i}`} className="font-medium text-blue-600 dark:text-blue-400">
        {mention.text}
      </span>
    )
    lastIndex = mention.end
  })
  
  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  
  return nodes
}

/**
 * Extract mention suggestions from text as user types.
 * Returns potential matches based on partial username/email.
 */
export function getMentionSuggestions(
  text: string,
  cursorPosition: number,
  members: { id: string; email: string; display_name: string | null }[]
): { id: string; email: string; display_name: string | null; matchText: string }[] {
  // Find @ symbol before cursor
  const beforeCursor = text.slice(0, cursorPosition)
  const lastAtIndex = beforeCursor.lastIndexOf('@')
  
  if (lastAtIndex === -1) return []
  
  // Get text after @
  const afterAt = beforeCursor.slice(lastAtIndex + 1)
  // Check if there's a space or newline after @ (mention ended)
  if (afterAt.includes(' ') || afterAt.includes('\n')) return []
  
  const query = afterAt.toLowerCase()
  if (query.length === 0) {
    return members.slice(0, 10).map((m) => ({
      ...m,
      matchText: m.display_name || m.email.split('@')[0],
    }))
  }
  
  // Match by email, display name, or username part
  return members
    .filter((m) => {
      const email = m.email.toLowerCase()
      const displayName = m.display_name?.toLowerCase().replace(/\s+/g, '') || ''
      const username = email.split('@')[0]
      return email.includes(query) || displayName.includes(query) || username.includes(query)
    })
    .slice(0, 10)
    .map((m) => ({
      ...m,
      matchText: m.display_name || m.email.split('@')[0],
    }))
}
