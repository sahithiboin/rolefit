import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ inline, className = '', style: styleProp = {} }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const inlineStyle = inline ? { position: 'static', top: 'auto', right: 'auto', boxShadow: 'none', border: '1px solid var(--border-light)' } : {};

  return (
    <button
      onClick={toggleTheme}
      className={`btn-theme-toggle ${className}`}
      style={{ ...inlineStyle, ...styleProp }}
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

export default ThemeToggle;
