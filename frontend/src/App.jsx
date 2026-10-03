import { Routes, Route } from 'react-router-dom'
import Shell from './components/Shell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LiveCoach from './pages/LiveCoach.jsx'
import PoseAnalyzer from './pages/PoseAnalyzer.jsx'
import VideoAnalysis from './pages/VideoAnalysis.jsx'
import PoseLibrary from './pages/PoseLibrary.jsx'
import Progress from './pages/Progress.jsx'
import Sessions, { SessionDetail } from './pages/Sessions.jsx'
import ModelInsights from './pages/ModelInsights.jsx'
import Settings from './pages/Settings.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import { useSettings } from './lib/settings.js'
import { useEffect } from 'react'
import { loadClassifier } from './lib/analysis.js'
import Placeholder from './pages/Placeholder.jsx'

// Add each new page here as it is built (phases 3-5).
const later = []
export default function App() {
  useSettings()
  useEffect(() => { loadClassifier() }, [])
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="welcome" element={<Landing />} />
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveCoach />} />
        <Route path="analyzer" element={<PoseAnalyzer />} />
        <Route path="video" element={<VideoAnalysis />} />
        <Route path="library" element={<PoseLibrary />} />
        <Route path="library/:id" element={<PoseLibrary />} />
        <Route path="progress" element={<Progress />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="model" element={<ModelInsights />} />
        <Route path="settings" element={<Settings />} />
        {later.map(p => <Route key={p} path={p} element={<Placeholder name={p} />} />)}
      </Route>
    </Routes>
  )
}
