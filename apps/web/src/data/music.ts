// Public-domain recordings from Wikimedia Commons (see public/music/CREDITS.md).
// The composer is the "artist", as the phone files classical tags.
export interface Artist {
  id: string
  name: string
  image: string
}

export interface Album {
  id: string
  title: string
  artist: string
  performer: string
  art: string
  // When the album was "added to the collection", for the hub's new section.
  addedDaysAgo: number
}

export interface Track {
  id: string
  title: string
  album: string
  artist: string
  number: number
  performer: string
  duration: number // seconds
  src: string
}

const art = (name: string) => `/music/art/${name}.jpg`

export const ARTISTS: Artist[] = [
  { id: 'grieg', name: 'Edvard Grieg', image: art('artist-grieg') },
  { id: 'chopin', name: 'Frédéric Chopin', image: art('artist-chopin') },
  { id: 'bach', name: 'Johann Sebastian Bach', image: art('artist-bach') },
  { id: 'haydn', name: 'Joseph Haydn', image: art('artist-haydn') },
  { id: 'dvorak', name: 'Antonín Dvořák', image: art('artist-dvorak') },
]

export const ALBUMS: Album[] = [
  {
    id: 'peer-gynt',
    title: 'Peer Gynt Suite No. 1',
    artist: 'grieg',
    performer: 'Musopen Symphony',
    art: art('album-peer-gynt'),
    addedDaysAgo: 2,
  },
  {
    id: 'set-chopin-free',
    title: 'Set Chopin Free',
    artist: 'chopin',
    performer: 'Various performers',
    art: art('album-set-chopin-free'),
    addedDaysAgo: 5,
  },
  {
    id: 'goldberg',
    title: 'Goldberg Variations',
    artist: 'bach',
    performer: 'Shelley Katz',
    art: art('album-goldberg'),
    addedDaysAgo: 9,
  },
  {
    id: 'the-lark',
    title: 'String Quartet "The Lark"',
    artist: 'haydn',
    performer: 'Musopen String Quartet',
    art: art('album-the-lark'),
    addedDaysAgo: 14,
  },
  {
    id: 'american',
    title: 'String Quartet "American"',
    artist: 'dvorak',
    performer: 'Musopen String Quartet',
    art: art('album-american'),
    addedDaysAgo: 21,
  },
]

type Row = [id: string, title: string, seconds: number, performer?: string]

const ROWS: Record<string, Row[]> = {
  'peer-gynt': [
    ['grieg-morning-mood', 'Morning Mood', 229],
    ['grieg-death-of-aase', 'The Death of Åse', 274],
    ['grieg-anitras-dance', "Anitra's Dance", 240],
    ['grieg-mountain-king', 'In the Hall of the Mountain King', 154],
  ],
  'set-chopin-free': [
    ['chopin-nocturne-op9-2', 'Nocturne in E-flat major, Op. 9 No. 2', 271, 'Frank Levy'],
    ['chopin-minute-waltz', 'Waltz in D-flat major, Op. 64 No. 1 "Minute"', 107, 'Olga Gurevich'],
    ['chopin-waltz-op64-2', 'Waltz in C-sharp minor, Op. 64 No. 2', 230, 'Olga Gurevich'],
    ['chopin-revolutionary', 'Étude in C minor, Op. 10 No. 12 "Revolutionary"', 165, 'Edward Neeman'],
    ['chopin-butterfly', 'Étude in G-flat major, Op. 25 No. 9 "Butterfly"', 69, 'Edward Neeman'],
  ],
  goldberg: [
    ['bach-goldberg-aria', 'Aria', 292],
    ['bach-goldberg-var1', 'Variation 1', 114],
    ['bach-goldberg-var2', 'Variation 2', 88],
    ['bach-goldberg-var4', 'Variation 4', 54],
  ],
  'the-lark': [
    ['haydn-lark-menuet', 'III. Menuet: Allegretto', 227],
    ['haydn-lark-finale', 'IV. Finale: Vivace', 91],
  ],
  american: [
    ['dvorak-american-molto-vivace', 'III. Molto vivace', 250],
    ['dvorak-american-finale', 'IV. Finale: Vivace ma non troppo', 352],
  ],
}

export const TRACKS: Track[] = ALBUMS.flatMap((album) =>
  ROWS[album.id].map(([id, title, duration, performer], i) => ({
    id,
    title,
    album: album.id,
    artist: album.artist,
    number: i + 1,
    performer: performer ?? album.performer,
    duration,
    src: `/music/${id}.m4a`,
  })),
)

export const ARTIST_BY_ID = new Map(ARTISTS.map((a) => [a.id, a]))
export const ALBUM_BY_ID = new Map(ALBUMS.map((a) => [a.id, a]))
export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]))

const sortKey = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const byName = (a: string, b: string) => sortKey(a).localeCompare(sortKey(b))

// The letter tile a name is filed under in the jump list.
export const groupLetter = (name: string) => {
  const c = sortKey(name).charAt(0)
  return c >= 'a' && c <= 'z' ? c : '#'
}

export const albumsBy = (artist: string) => ALBUMS.filter((a) => a.artist === artist)
export const tracksOn = (album: string) => TRACKS.filter((t) => t.album === album)
export const tracksBy = (artist: string) => TRACKS.filter((t) => t.artist === artist)

export const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const songCount = (n: number) => `${n} ${n === 1 ? 'song' : 'songs'}`
