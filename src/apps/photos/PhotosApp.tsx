import { ListItem, SettingsPage } from '../../components/controls'
import { Panorama } from '../../components/Panorama'
import { useTilt } from '../../components/useTilt'
import { SAMPLE_PHOTOS, usePhotos, type Photo } from '../../data/photos'
import { PageStack, useNavigation } from '../../navigation'
import type { AppProps } from '../types'
import { ALBUM_NAMES, formatTakenDate, isAlbumId, monthLabel, photoCount, useAlbum, type AlbumId } from './albums'
import { PhotoViewer } from './PhotoViewer'
import './photos.css'

function Thumb({ photo, className, onOpen }: { photo: Photo; className: string; onOpen: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className={className}
      data-feather
      aria-label={`Photo, ${formatTakenDate(photo.taken)}`}
      onClick={(e) => {
        if (e.detail === 0) onOpen()
      }}
    >
      <img src={photo.src} alt="" draggable={false} loading="lazy" decoding="async" />
    </button>
  )
}

function PhotoGrid({
  photos,
  album,
  variant = 'album',
}: {
  photos: Photo[]
  album: AlbumId
  variant?: 'album' | 'small' | 'large'
}) {
  const { navigate } = useNavigation()
  return (
    <div className="photos-grid" data-variant={variant}>
      {photos.map((photo) => (
        <Thumb
          key={photo.id}
          photo={photo}
          className="photos-thumb"
          onOpen={() => navigate(`view:${album}:${photo.id}`)}
        />
      ))}
    </div>
  )
}

const Empty = ({ children }: { children: string }) => (
  <p className="photos-empty" data-feather>
    {children}
  </p>
)

function Hub() {
  const { navigate } = useNavigation()
  const { cameraRoll } = usePhotos()
  const favorites = useAlbum('favorites')
  const albumCount = favorites.length ? 3 : 2
  const background = favorites[0]?.src ?? SAMPLE_PHOTOS[0].src
  return (
    <Panorama
      title="photos"
      background={background}
      sections={[
        {
          key: 'collection',
          header: 'collection',
          content: (
            <div className="photos-collection">
              <ListItem title="camera roll" subtitle={photoCount(cameraRoll.length)} onTap={() => navigate('album:camera-roll')} />
              <ListItem title="albums" subtitle={`${albumCount} albums`} onTap={() => navigate('albums')} />
              <ListItem title="date" onTap={() => navigate('date')} />
            </div>
          ),
        },
        {
          key: 'favorites',
          header: 'favorites',
          content: favorites.length ? (
            <PhotoGrid photos={favorites} album="favorites" variant="small" />
          ) : (
            <Empty>Photos you mark as favorites show up here. Open a photo, tap it, and tap the star.</Empty>
          ),
        },
        {
          key: 'new',
          header: "what's new",
          content: cameraRoll.length ? (
            <PhotoGrid photos={cameraRoll.slice(0, 8)} album="camera-roll" variant="large" />
          ) : (
            <Empty>New photos you take with the camera show up here.</Empty>
          ),
        },
      ]}
    />
  )
}

function AlbumPage({ album }: { album: AlbumId }) {
  const photos = useAlbum(album)
  const { ready } = usePhotos()
  return (
    <div className="photos-album">
      <div className="photos-album-title" data-feather>
        {ALBUM_NAMES[album]}
      </div>
      <div className="photos-album-scroll">
        {photos.length ? (
          <PhotoGrid photos={photos} album={album} />
        ) : (
          ready && (
            <Empty>
              {album === 'camera-roll'
                ? "There aren't any photos here yet. Photos you take with the camera are saved to the camera roll."
                : 'There are no photos in this album.'}
            </Empty>
          )
        )}
      </div>
    </div>
  )
}

function AlbumTile({ album, cover, count }: { album: AlbumId; cover?: Photo; count: number }) {
  const { navigate } = useNavigation()
  const open = () => navigate(`album:${album}`)
  const { ref, handlers } = useTilt<HTMLButtonElement>(open)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="photos-album-tile"
      data-feather
      onClick={(e) => {
        if (e.detail === 0) open()
      }}
    >
      <span className="photos-album-cover">{cover && <img src={cover.src} alt="" draggable={false} />}</span>
      <span className="photos-album-name">{ALBUM_NAMES[album]}</span>
      <span className="photos-album-count">{count}</span>
    </button>
  )
}

function AlbumsPage() {
  const { cameraRoll } = usePhotos()
  const favorites = useAlbum('favorites')
  return (
    <SettingsPage app="photos" title="albums">
      <div className="photos-album-tiles">
        <AlbumTile album="camera-roll" cover={cameraRoll[0]} count={cameraRoll.length} />
        <AlbumTile album="samples" cover={SAMPLE_PHOTOS[0]} count={SAMPLE_PHOTOS.length} />
        {favorites.length > 0 && <AlbumTile album="favorites" cover={favorites[0]} count={favorites.length} />}
      </div>
    </SettingsPage>
  )
}

function DatePage() {
  const photos = useAlbum('all')
  const groups: { label: string; photos: Photo[] }[] = []
  for (const photo of photos) {
    const label = monthLabel(photo.taken)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.photos.push(photo)
    else groups.push({ label, photos: [photo] })
  }
  return (
    <SettingsPage app="photos" title="date">
      {groups.map((group) => (
        <div key={group.label} className="photos-month">
          <div className="photos-month-label" data-feather>
            {group.label}
            <span className="photos-month-count">{group.photos.length}</span>
          </div>
          <PhotoGrid photos={group.photos} album="all" />
        </div>
      ))}
    </SettingsPage>
  )
}

export function PhotosApp({ onExit, handle }: AppProps) {
  const render = (route: string) => {
    const [kind, album, id] = route.split(':')
    if (kind === 'album' && isAlbumId(album)) return <AlbumPage album={album} />
    if (kind === 'view' && isAlbumId(album) && id) return <PhotoViewer album={album} initialId={id} />
    if (route === 'albums') return <AlbumsPage />
    if (route === 'date') return <DatePage />
    return <Hub />
  }
  return <PageStack enter transition="feather" initialRoute="hub" render={render} onExit={onExit} handle={handle} />
}
