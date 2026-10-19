import { useMemo } from 'react'
import { useStore } from '../../data/persist'
import { favoritesStore, SAMPLE_PHOTOS, usePhotos, type Photo } from '../../data/photos'

export type AlbumId = 'camera-roll' | 'samples' | 'favorites' | 'all'

export const ALBUM_NAMES: Record<AlbumId, string> = {
  'camera-roll': 'camera roll',
  samples: 'sample pictures',
  favorites: 'favorites',
  all: 'all photos',
}

export const isAlbumId = (value: string | undefined): value is AlbumId => !!value && value in ALBUM_NAMES

// Photos in an album, in the order its grid shows them (newest first, or
// most recently favourited first).
export function useAlbum(album: AlbumId): Photo[] {
  const { cameraRoll } = usePhotos()
  const favorites = useStore(favoritesStore)
  return useMemo(() => {
    switch (album) {
      case 'camera-roll':
        return cameraRoll
      case 'samples':
        return SAMPLE_PHOTOS
      case 'favorites': {
        const byId = new Map([...cameraRoll, ...SAMPLE_PHOTOS].map((p) => [p.id, p]))
        return favorites.flatMap((id) => {
          const photo = byId.get(id)
          return photo ? [photo] : []
        })
      }
      case 'all':
        return [...cameraRoll, ...SAMPLE_PHOTOS].sort((a, b) => b.taken - a.taken)
    }
  }, [album, cameraRoll, favorites])
}

export const photoCount = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`

export const formatTakenDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export const formatTakenTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export const monthLabel = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase()
