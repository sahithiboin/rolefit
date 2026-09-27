import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import Carousel from '../components/Carousel';
import { useAuth } from '../components/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, ArrowRight, Sparkles, ClipboardCheck, UserCircle, Rocket, Cpu, FileCheck, Layers, LayoutDashboard, LogOut } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Home() {
    const navigate = useNavigate();
    const { currentUser, loginWithGoogle, logout } = useAuth();

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', transition: 'all 0.3s ease' }}>
            <ThemeToggle />
            {/* Hero Section */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(60px, 15vh, 120px) 20px 60px', textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '100px',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        color: 'var(--primary)',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '24px'
                    }}>
                        <Sparkles size={16} /> Now powered by Gemini AI
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(40px, 8vw, 72px)',
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                        marginBottom: '24px',
                        color: 'var(--text-primary)'
                    }}>
                        Land your dream role <br />
                        <span style={{ color: 'var(--primary)' }}>in 90 seconds.</span>
                    </h1>

                    <p style={{
                        fontSize: 'clamp(18px, 4vw, 22px)',
                        color: 'var(--text-secondary)',
                        maxWidth: '700px',
                        margin: '0 auto 40px',
                        lineHeight: 1.6
                    }}>
                        RoleFit analyzes any job description and creates a complete application package—tailored resumes, cover letters, and outreach messages.
                    </p>

                    {!currentUser ? (
                        <Button
                            variant="primary"
                            onClick={loginWithGoogle}
                            style={{ padding: '0 40px', height: '60px', fontSize: '18px', gap: '12px' }}
                        >
                            <LogIn size={20} /> Get Started with Google
                        </Button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                Welcome back, {currentUser.displayName.split(' ')[0]}!
                            </p>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/builder')}
                                style={{ padding: '0 40px', height: '56px', fontSize: '16px', gap: '8px' }}
                            >
                                Build Your Profile <ArrowRight size={18} />
                            </Button>
                            <button
                                onClick={logout}
                                style={{ 
                                    background: 'none', border: 'none', color: 'var(--text-tertiary)', 
                                    fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    marginTop: '8px'
                                }}
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Carousel Section */}
            <div style={{ marginBottom: '80px' }}>
                <Carousel />
            </div>

            {/* How It Works Section */}
            <div style={{ maxWidth: '1000px', margin: '0 auto 120px', padding: '0 20px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '60px' }}>How it works</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
                    {[
                        { icon: <ClipboardCheck size={32} />, title: "1. Paste the Job", desc: "Copy the full job description. Our AI analyzes the hidden keywords and requirements." },
                        { icon: <UserCircle size={32} />, title: "2. Build Your Profile", desc: "List your wins. We tailor your experience to match what the company is actually looking for." },
                        { icon: <Rocket size={32} />, title: "3. Get the Package", desc: "Download a custom resume, cover letter, and outreach docs ready for submission." }
                    ].map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            style={{ textAlign: 'center' }}
                        >
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '20px',
                                background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                {step.icon}
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>{step.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Features Section */}
            <div style={{ background: 'var(--surface)', padding: '100px 20px', borderY: '1px solid var(--border-light)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Built for the modern applicant</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>We don't just format documents. We architect your application.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                        {[
                            { icon: <Cpu size={24} />, title: "AI-Powered Matching", desc: "Deep analysis of job requirements vs your unique experience." },
                            { icon: <FileCheck size={24} />, title: "ATS-Friendly", desc: "Clean templates designed to sail through automated tracking systems." },
                            { icon: <Layers size={24} />, title: "Total Package", desc: "Tailored resumes, cover letters, and professional outreach messages." },
                            { icon: <Sparkles size={24} />, title: "High-End Polish", desc: "Professional formatting in both PDF and DOCX formats." }
                        ].map((feat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="card"
                                style={{ padding: '32px' }}
                            >
                                <div style={{ color: 'var(--primary)', marginBottom: '16px' }}>{feat.icon}</div>
                                <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{feat.title}</h4>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feat.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', fontSize: '14px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <Link to="/about" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>About Us</Link>
                    <Link to="/contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Us</Link>
                </div>
                <div>© 2026 RoleFit AI. Built for high-performers.</div>
            </footer>
        </div>
    );
}
