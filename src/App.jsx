import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Builder from './pages/Builder';
import Results from './pages/Results';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './components/AuthContext';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/builder" element={<Builder />} />
                    <Route path="/results" element={<Results />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
