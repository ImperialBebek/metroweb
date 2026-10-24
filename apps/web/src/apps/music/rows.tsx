import type { ReactNode } from 'react'
import { useTilt } from 'metroweb'
import { ARTIST_BY_ID, groupLetter, type Album, type Artist, type Track } from '../../data/music'
import { currentTrack, usePlayer } from '../../data/player'

// A tilting button that feathers with the page.
export function Tap({
  className,
  label,
  onTap,
  children,
  current,
}: {
  className: string
  label?: string
  onTap: () => void
  children: ReactNode
  current?: boolean
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className={className}
      data-feather
      data-current={current || undefined}
      aria-label={label}
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      {children}
    </button>
  )
}

export const Empty = ({ children }: { children: string }) => (
  <p className="music-empty" data-feather>
    {children}
  </p>
)

export const AlbumArt = ({ album, className = 'music-art' }: { album: Album; className?: string }) => (
  <img className={className} src={album.art} alt="" draggable={false} loading="lazy" decoding="async" />
)

export function ArtistRow({ artist, onTap }: { artist: Artist; onTap: () => void }) {
  return (
    <Tap className="music-row" onTap={onTap}>
      <span className="music-row-text">
        <span className="music-row-title" data-continuum>
          {artist.name}
        </span>
      </span>
    </Tap>
  )
}

export function AlbumRow({ album, onTap }: { album: Album; onTap: () => void }) {
  return (
    <Tap className="music-row" onTap={onTap}>
      <AlbumArt album={album} />
      <span className="music-row-text">
        <span className="music-row-title music-row-title-small" data-continuum>
          {album.title}
        </span>
        <span className="music-row-sub">{ARTIST_BY_ID.get(album.artist)?.name}</span>
      </span>
    </Tap>
  )
}

export function SongRow({ track, onTap }: { track: Track; onTap: () => void }) {
  const playing = currentTrack(usePlayer())?.id === track.id
  return (
    <Tap className="music-row" onTap={onTap} current={playing}>
      <span className="music-row-text">
        <span className="music-row-title">{track.title}</span>
        <span className="music-row-sub">{ARTIST_BY_ID.get(track.artist)?.name}</span>
      </span>
    </Tap>
  )
}

// A long list split under accent letter tiles, as in the phone's jump lists.
export function LetterGroups<T>({
  items,
  name,
  render,
}: {
  items: T[]
  name: (item: T) => string
  render: (item: T) => ReactNode
}) {
  const groups: { letter: string; items: T[] }[] = []
  for (const item of items) {
    const letter = groupLetter(name(item))
    const last = groups[groups.length - 1]
    if (last?.letter === letter) last.items.push(item)
    else groups.push({ letter, items: [item] })
  }
  return (
    <div className="music-list">
      {groups.map((group) => (
        <div key={group.letter}>
          <div className="music-letter" data-feather aria-hidden>
            {group.letter}
          </div>
          {group.items.map(render)}
        </div>
      ))}
    </div>
  )
}
