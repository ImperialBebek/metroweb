import { AppBar, ListItem, Paragraph, Pivot, useNavigation } from 'metroweb'
import { dueLabel, type Todo } from '../todos'

export function Home({ todos }: { todos: Todo[] }) {
  const { navigate } = useNavigation()

  const list = (items: Todo[], empty: string) =>
    items.length === 0 ? (
      <Paragraph subtle>{empty}</Paragraph>
    ) : (
      <div className="list">
        {items.map((todo) => (
          <ListItem key={todo.id} title={todo.subject} subtitle={dueLabel(todo)} onTap={() => navigate(`todo:${todo.id}`)} />
        ))}
      </div>
    )

  return (
    <div className="app-page">
      <div className="app-page-body">
        <Pivot
          title="to-do"
          items={[
            { key: 'active', header: 'active', content: list(todos.filter((t) => !t.done), 'No to-dos. Tap new to add one.') },
            { key: 'completed', header: 'completed', content: list(todos.filter((t) => t.done), 'No completed to-dos') },
          ]}
        />
      </div>
      <AppBar
        buttons={[{ icon: 'add', label: 'new', onTap: () => navigate('todo:new') }]}
        menu={[{ label: 'settings', onTap: () => navigate('settings') }]}
      />
    </div>
  )
}
