import { persistentStore } from './persist'

export type ContactGroup = 'family' | 'work'

export interface Contact {
  id: string
  first: string
  last: string
  mobile?: string
  work?: string
  email?: string
  company?: string
  // ISO date, yyyy-mm-dd.
  birthday?: string
  favorite?: boolean
  // Shown under "together" in People.
  group?: ContactGroup
}

// Numbers use the 555-01xx range, which is reserved for fiction.
const SEED: [string, string, string?][] = [
  ['Anna', 'Lindqvist', 'Contoso'],
  ['Ben', 'Okafor'],
  ['Chloe', 'Martin', 'Fabrikam'],
  ['Dev', 'Patel'],
  ['Elena', 'Rossi'],
  ['Felix', 'Wagner', 'Northwind'],
  ['Grace', 'Kim'],
  ['Hiro', 'Tanaka'],
  ['Isla', 'Murphy'],
  ['Jonas', 'Berg'],
  ['Kemi', 'Adeyemi', 'Contoso'],
  ['Liam', 'Walsh'],
  ['Maya', 'Cohen'],
  ['Noah', 'Silva'],
  ['Olivia', 'Chen', 'Fabrikam'],
  ['Pablo', 'Ruiz'],
]

const FAMILY = new Set(['Ben', 'Isla', 'Liam'])
const BIRTHDAYS: Record<string, string> = { Anna: '1990-04-12', Dev: '1987-11-03', Maya: '1993-07-28' }

export const contactsStore = persistentStore<Contact[]>('contacts', () =>
  SEED.map(
    ([first, last, company], i): Contact => ({
      id: `c${i + 1}`,
      first,
      last,
      company,
      mobile: `(425) 555-01${String(i + 10).padStart(2, '0')}`,
      work: company ? `(425) 555-01${String(i + 50).padStart(2, '0')}` : undefined,
      email: `${first}.${last}@example.com`.toLowerCase(),
      birthday: BIRTHDAYS[first],
      favorite: i < 3,
      group: company ? 'work' : FAMILY.has(first) ? 'family' : undefined,
    }),
  ),
)

export const displayName = (c: Pick<Contact, 'first' | 'last'>) => `${c.first} ${c.last}`.trim()

export const initials = (c: Pick<Contact, 'first' | 'last'>) =>
  ((c.first[0] ?? '') + (c.last[0] ?? '')).toUpperCase() || '#'

// Digits only, for matching numbers typed in different formats.
export const digits = (number: string) => number.replace(/\D/g, '')

export function contactForNumber(contacts: Contact[], number: string): Contact | undefined {
  const d = digits(number)
  if (!d) return undefined
  return contacts.find((c) => [c.mobile, c.work].some((n) => n && digits(n) === d))
}
