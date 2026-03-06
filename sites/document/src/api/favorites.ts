import { requestJson } from './client'

let favoritesApiDisabled = false

function normalizeFavoritePaths(value: unknown): string[] {
  const items = Array.isArray(value) ? value : []
  const unique = new Set<string>()

  for (const item of items) {
    const text = String(item ?? '').trim()
    if (!text || !text.startsWith('/')) {
      continue
    }

    unique.add(text)
    if (unique.size >= 500) {
      break
    }
  }

  return Array.from(unique)
}

export async function fetchUserFavoritePaths(userId: string): Promise<string[]> {
  if (favoritesApiDisabled) {
    throw new Error('Favorites API disabled for this session.')
  }

  const encodedUserId = encodeURIComponent(userId)

  try {
    const data = await requestJson<{ favorites?: unknown }>(`/api/users/${encodedUserId}/favorites`, {
      method: 'GET',
      authMode: 'microsoft',
    })

    return normalizeFavoritePaths(data.favorites)
  } catch (error) {
    const message = String(error ?? '')
    if (message.includes('401') || message.includes('403') || message.toLowerCase().includes('unauthorized')) {
      favoritesApiDisabled = true
    }
    throw error
  }
}

export async function saveUserFavoritePaths(userId: string, favorites: string[]): Promise<string[]> {
  if (favoritesApiDisabled) {
    throw new Error('Favorites API disabled for this session.')
  }

  const encodedUserId = encodeURIComponent(userId)

  try {
    const data = await requestJson<{ favorites?: unknown }>(`/api/users/${encodedUserId}/favorites`, {
      method: 'PUT',
      authMode: 'microsoft',
      body: JSON.stringify({ favorites }),
    })

    return normalizeFavoritePaths(data.favorites)
  } catch (error) {
    const message = String(error ?? '')
    if (message.includes('401') || message.includes('403') || message.toLowerCase().includes('unauthorized')) {
      favoritesApiDisabled = true
    }
    throw error
  }
}
