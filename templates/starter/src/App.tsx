import { useState } from 'react'
import { DEFAULT_ACCENT, PhoneFrame, type Background } from 'metroweb'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { TodoEditor } from './pages/TodoEditor'
import { SAMPLE_TODOS, type Todo } from './todos'

export function App() {
  const [todos, setTodos] = useState(SAMPLE_TODOS)
  const [background, setBackground] = useState<Background>('dark')
  const [accent, setAccent] = useState(DEFAULT_ACCENT)

  const save = (todo: Todo) =>
    setTodos((list) => (list.some((t) => t.id === todo.id) ? list.map((t) => (t.id === todo.id ? todo : t)) : [...list, todo]))
  const remove = (id: string) => setTodos((list) => list.filter((t) => t.id !== id))

  // Routes: 'home', 'settings', 'todo:new' and 'todo:<id>'. Every page in the
  // stack is rendered from here, so each one sees the current state.
  const render = (route: string) => {
    if (route === 'settings') {
      return <Settings background={background} accent={accent} onBackground={setBackground} onAccent={setAccent} />
    }
    if (route.startsWith('todo:')) {
      const id = route.slice('todo:'.length)
      return <TodoEditor id={id} initial={todos.find((t) => t.id === id)} onSave={save} onDelete={remove} />
    }
    return <Home todos={todos} />
  }

  return <PhoneFrame initialRoute="home" render={render} background={background} accent={accent} />
}
