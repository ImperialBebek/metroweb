import { useState } from 'react'
import { AppBar, DatePicker, MessageBox, SettingsPage, TextBox, ToggleSwitch, useNavigation } from 'metroweb'
import { inDays, type Todo } from '../todos'

export function TodoEditor({
  id,
  initial,
  onSave,
  onDelete,
}: {
  // 'new', or the id of the to-do to edit.
  id: string
  initial?: Todo
  onSave: (todo: Todo) => void
  onDelete: (id: string) => void
}) {
  const { back } = useNavigation()
  const isNew = id === 'new'
  // The page edits a copy, so it keeps showing it while it turns away after a delete.
  const [draft, setDraft] = useState<Todo>(() => initial ?? { id: String(Date.now()), subject: '', due: inDays(1), done: false })
  const [confirming, setConfirming] = useState(false)
  const update = (patch: Partial<Todo>) => setDraft((d) => ({ ...d, ...patch }))

  const save = () => {
    onSave({ ...draft, subject: draft.subject.trim() })
    back()
  }

  return (
    <div className="app-page">
      <div className="app-page-body">
        <SettingsPage app="to-do" title={isNew ? 'new to-do' : 'edit to-do'}>
          <TextBox header="Subject" value={draft.subject} blurOnEnter onChange={(subject) => update({ subject })} />
          <ToggleSwitch
            header="Due date"
            checked={draft.due !== undefined}
            onChange={(on) => update({ due: on ? inDays(1) : undefined })}
          />
          {draft.due && <DatePicker value={draft.due} onChange={(due) => update({ due })} />}
          {!isNew && <ToggleSwitch header="Completed" checked={draft.done} onChange={(done) => update({ done })} />}
        </SettingsPage>
      </div>
      <AppBar
        buttons={[
          { icon: 'save', label: 'save', onTap: save, disabled: draft.subject.trim() === '' },
          isNew
            ? { icon: 'close', label: 'cancel', onTap: back }
            : { icon: 'delete', label: 'delete', onTap: () => setConfirming(true) },
        ]}
      />
      {confirming && (
        <MessageBox
          caption="Delete to-do"
          message="This to-do will be deleted."
          buttons={[
            {
              label: 'delete',
              onTap: () => {
                onDelete(draft.id)
                back()
              },
            },
            { label: 'cancel' },
          ]}
          onDismissed={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
