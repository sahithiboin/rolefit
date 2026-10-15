import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Builder from './pages/Builder';
import Results from './pages/Results';
import Tracker from './pages/Tracker';
import About from './pages/About';
import Contact from './pages/Contact';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './components/AuthContext';
import InAppBrowserWarning from './components/InAppBrowserWarning';

function App() {
    return (
        <AuthProvider>
            <InAppBrowserWarning />
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/builder" element={<Builder />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/tracker" element={<Tracker />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
