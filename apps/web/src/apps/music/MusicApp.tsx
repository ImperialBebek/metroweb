import { AppBar, GLYPHS, ListItem, PageStack, Panorama, Paragraph, Pivot, SettingsPage, useNavigation } from 'metroweb'
import {
  ALBUM_BY_ID,
  ALBUMS,
  ARTIST_BY_ID,
  ARTISTS,
  albumsBy,
  byName,
  formatDuration,
  songCount,
  TRACKS,
  tracksBy,
  tracksOn,
  type Album,
  type Track,
} from '../../data/music'
import { addToQueue, currentTrack, playTracks, usePlayer } from '../../data/player'
import type { AppProps } from '../types'
import { NowPlaying } from './NowPlaying'
import { AlbumArt, AlbumRow, ArtistRow, Empty, LetterGroups, SongRow, Tap } from './rows'
import './music.css'

const sortedArtists = [...ARTISTS].sort((a, b) => byName(a.name, b.name))
const sortedAlbums = [...ALBUMS].sort((a, b) => byName(a.title, b.title))
const sortedSongs = [...TRACKS].sort((a, b) => byName(a.title, b.title))
const newestAlbums = [...ALBUMS].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo)

const EMPTY_PAGES: Record<string, string> = {
  videos: "It's lonely in here. Connect to your computer to add videos.",
  podcasts: "You haven't subscribed to any podcasts yet.",
  radio: 'FM radio uses a wired headset as its antenna. Plug one in to listen.',
}

// Plays `tracks` from `index` and opens now playing.
function usePlay() {
  const { navigate } = useNavigation()
  return (tracks: Track[], index = 0, shuffle?: boolean) => {
    playTracks(tracks, index, shuffle)
    navigate('now-playing')
  }
}

function SongList({ tracks }: { tracks: Track[] }) {
  const play = usePlay()
  return (
    <div className="music-list">
      <Tap className="music-shuffle-all" onTap={() => play(tracks, 0, true)}>
        shuffle all
      </Tap>
      {tracks.map((track, i) => (
        <SongRow key={track.id} track={track} onTap={() => play(tracks, i)} />
      ))}
    </div>
  )
}

function HistoryTile({ album, current }: { album: Album; current: boolean }) {
  const { navigate } = useNavigation()
  return (
    <Tap
      className="music-history-tile"
      label={current ? `now playing, ${album.title}` : album.title}
      onTap={() => navigate(current ? 'now-playing' : `album:${album.id}`)}
    >
      <AlbumArt album={album} className="music-history-art" />
      {current && (
        <span className="music-history-label">
          <svg viewBox="0 0 48 48" aria-hidden>
            {GLYPHS.play}
          </svg>
          now playing
        </span>
      )}
    </Tap>
  )
}

function Hub() {
  const { navigate } = useNavigation()
  const state = usePlayer()
  const track = currentTrack(state)
  const history = state.history.flatMap((id) => ALBUM_BY_ID.get(id) ?? [])
  const featured = ARTIST_BY_ID.get(track?.artist ?? history[0]?.artist ?? 'grieg')
  return (
    <Panorama
      title="music+videos"
      background={featured?.image}
      sections={[
        {
          key: 'collection',
          header: 'collection',
          content: (
            <div className="music-collection">
              {['music', 'videos', 'podcasts', 'radio'].map((name) => (
                <ListItem key={name} title={name} onTap={() => navigate(name)} />
              ))}
            </div>
          ),
        },
        {
          key: 'history',
          header: 'history',
          content: history.length ? (
            <div className="music-history">
              {history.map((album) => (
                <HistoryTile key={album.id} album={album} current={album.id === track?.album} />
              ))}
            </div>
          ) : (
            <Empty>Music you play shows up here.</Empty>
          ),
        },
        {
          key: 'new',
          header: 'new',
          content: (
            <div className="music-list">
              {newestAlbums.map((album) => (
                <AlbumRow key={album.id} album={album} onTap={() => navigate(`album:${album.id}`)} />
              ))}
            </div>
          ),
        },
        {
          key: 'apps',
          header: 'apps',
          content: <Empty>Apps that play music and videos show up here.</Empty>,
        },
      ]}
    />
  )
}

function MusicCollection() {
  const { navigate } = useNavigation()
  return (
    <div className="app-page">
      <Pivot
        title="music"
        items={[
          {
            key: 'artists',
            header: 'artists',
            content: (
              <LetterGroups
                items={sortedArtists}
                name={(a) => a.name}
                render={(a) => <ArtistRow key={a.id} artist={a} onTap={() => navigate(`artist:${a.id}`)} />}
              />
            ),
          },
          {
            key: 'albums',
            header: 'albums',
            content: (
              <div className="music-list">
                {sortedAlbums.map((album) => (
                  <AlbumRow key={album.id} album={album} onTap={() => navigate(`album:${album.id}`)} />
                ))}
              </div>
            ),
          },
          { key: 'songs', header: 'songs', content: <SongList tracks={sortedSongs} /> },
          {
            key: 'playlists',
            header: 'playlists',
            content: <Empty>You don't have any playlists. Make one on your computer and sync it to your phone.</Empty>,
          },
          {
            key: 'genres',
            header: 'genres',
            content: (
              <div className="music-collection">
                <ListItem title="classical" subtitle={songCount(TRACKS.length)} onTap={() => navigate('genre:classical')} />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

function ArtistPage({ id }: { id: string }) {
  const { navigate } = useNavigation()
  const play = usePlay()
  const artist = ARTIST_BY_ID.get(id)
  if (!artist) return null
  const albums = albumsBy(id)
  const songs = tracksBy(id)
  return (
    <div className="app-page">
      <Pivot
        title={artist.name}
        items={[
          {
            key: 'albums',
            header: 'albums',
            content: (
              <div className="music-list">
                {albums.map((album) => (
                  <AlbumRow key={album.id} album={album} onTap={() => navigate(`album:${album.id}`)} />
                ))}
              </div>
            ),
          },
          { key: 'songs', header: 'songs', content: <SongList tracks={songs} /> },
        ]}
      />
      <AppBar
        buttons={[
          { icon: 'play', label: 'play', onTap: () => play(songs, 0, false) },
          { icon: 'shuffle', label: 'shuffle', onTap: () => play(songs, 0, true) },
        ]}
        menu={[{ label: 'add to now playing', onTap: () => addToQueue(songs) }]}
      />
    </div>
  )
}

function AlbumPage({ id }: { id: string }) {
  const play = usePlay()
  const playing = currentTrack(usePlayer())?.id
  const album = ALBUM_BY_ID.get(id)
  if (!album) return null
  const tracks = tracksOn(id)
  const minutes = Math.round(tracks.reduce((sum, t) => sum + t.duration, 0) / 60)
  return (
    <div className="app-page">
      <div className="music-page-title" data-feather>
        {ARTIST_BY_ID.get(album.artist)?.name}
      </div>
      <div className="music-album-head">
        <span data-feather>
          <AlbumArt album={album} className="music-album-art" />
        </span>
        <div className="music-album-text">
          <div className="music-album-name" data-feather data-continuum-target>
            {album.title}
          </div>
          <div className="music-album-meta" data-feather>
            {album.performer}
          </div>
          <div className="music-album-meta" data-feather>
            {songCount(tracks.length)}, {minutes} min
          </div>
        </div>
      </div>
      <div className="music-scroll">
        {tracks.map((track, i) => (
          <Tap key={track.id} className="music-track" current={track.id === playing} onTap={() => play(tracks, i)}>
            <span className="music-track-num">{track.number}</span>
            <span className="music-track-title">{track.title}</span>
            <span className="music-track-time">{formatDuration(track.duration)}</span>
          </Tap>
        ))}
      </div>
      <AppBar
        buttons={[
          { icon: 'play', label: 'play', onTap: () => play(tracks, 0, false) },
          { icon: 'shuffle', label: 'shuffle', onTap: () => play(tracks, 0, true) },
        ]}
        menu={[{ label: 'add to now playing', onTap: () => addToQueue(tracks) }]}
      />
    </div>
  )
}

function GenrePage() {
  return (
    <SettingsPage app="music" title="classical">
      <SongList tracks={sortedSongs} />
    </SettingsPage>
  )
}

function EmptyPage({ name }: { name: string }) {
  return (
    <SettingsPage app="music+videos" title={name}>
      <Paragraph subtle>{EMPTY_PAGES[name]}</Paragraph>
    </SettingsPage>
  )
}

export function MusicApp({ onExit, handle }: AppProps) {
  const render = (route: string) => {
    const [kind, id] = route.split(':')
    if (route === 'now-playing') return <NowPlaying />
    if (route === 'music') return <MusicCollection />
    if (kind === 'artist') return <ArtistPage id={id} />
    if (kind === 'album') return <AlbumPage id={id} />
    if (kind === 'genre') return <GenrePage />
    if (route in EMPTY_PAGES) return <EmptyPage name={route} />
    return <Hub />
  }
  return <PageStack enter transition="feather" initialRoute="hub" render={render} onExit={onExit} handle={handle} />
}
