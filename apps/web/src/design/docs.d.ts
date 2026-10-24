declare module 'virtual:design-docs' {
  export type DocChunk = { html: string } | { demo: string }

  export interface DocPage {
    // /design for the README, /design/<name> for NN-<name>.md
    route: string
    file: string
    number: number | null
    title: string
    headings: { id: string; text: string }[]
    chunks: DocChunk[]
  }

  export const pages: DocPage[]
}
