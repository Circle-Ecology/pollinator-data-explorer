import './App.css'
import EmbedPage from './components/EmbedPage'

function App() {
  if (window.location.pathname.startsWith('/embed')) {
    return <EmbedPage />
  }

  return (
    <>
      <h1>Pollinator Data Explorer</h1>
      <p>React app scaffolded and ready to build on.</p>
    </>
  )
}

export default App