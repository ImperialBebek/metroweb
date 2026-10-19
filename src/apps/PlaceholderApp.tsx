import type { Ref } from 'react'
import { Paragraph, SettingsPage } from '../components/controls'
import { PageStack, type StackHandle } from '../navigation'
import type { AppDef } from '../start/apps'

export function PlaceholderApp({ app, onExit, handle }: { app: AppDef; onExit: () => void; handle: Ref<StackHandle> }) {
  return (
    <PageStack
      enter
      initialRoute="main"
      onExit={onExit}
      handle={handle}
      render={() => (
        <SettingsPage app={app.title} title={app.title.toLowerCase()}>
          <Paragraph subtle>This app is a placeholder. Press Back or Start to return.</Paragraph>
        </SettingsPage>
      )}
    />
  )
}
