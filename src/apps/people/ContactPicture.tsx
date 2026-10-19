import { initials, type Contact } from '../../data/contacts'
import { PhIcon } from '../../icons/PhIcon'
import { shadeOf } from './util'
import './people.css'

function PersonSilhouette() {
  return <PhIcon name="user" />
}

// Contacts have no photos, so their picture is a shaded accent square with
// initials, like the cells of the People tile.
export function ContactPicture({ contact, size = 62 }: { contact?: Contact; size?: number | 'fill' }) {
  const px = size === 'fill' ? undefined : size
  const named = contact && (contact.first || contact.last)
  return (
    <span
      className="people-pic"
      data-shade={contact ? shadeOf(contact.id) : 3}
      data-fill={size === 'fill' || undefined}
      style={px ? { width: px, height: px, fontSize: Math.round(px * 0.4) } : undefined}
      aria-hidden
    >
      {named ? initials(contact) : <PersonSilhouette />}
    </span>
  )
}
