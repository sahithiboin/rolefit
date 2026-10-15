import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Textarea } from '../components/Input';
import Carousel from '../components/Carousel';
import { useAuth } from '../components/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, ArrowRight, Sparkles, ClipboardCheck, UserCircle, Rocket, Cpu, FileCheck, Layers } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Home() {
    const navigate = useNavigate();
    const { currentUser, loginWithGoogle } = useAuth();
    const [jobDescription, setJobDescription] = useState('');

    const handleNext = () => {
        localStorage.setItem('rolefit_job_description', jobDescription);
        navigate('/builder');
    };

    const wordCount = jobDescription.length;
    const isEnabled = wordCount > 200;

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
                                variant="secondary"
                                onClick={() => document.getElementById('input-section').scrollIntoView({ behavior: 'smooth' })}
                                style={{ padding: '0 40px', height: '56px', fontSize: '16px' }}
                            >
                                Start New Application
                            </Button>
                        </div>
                    )}
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                        <a
                            href="https://www.producthunt.com/products/rolefit?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-rolefit"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ maxWidth: '100%' }}
                        >
                            <img
                                alt="RoleFit - Tailor every job application without starting from scratch | Product Hunt"
                                width="250"
                                height="54"
                                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1279777&amp;theme=light&amp;t=1792048941608"
                                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                            />
                        </a>
                    </div>
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


            {/* Input Section */}
            <div id="input-section" style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(40px, 10vw, 80px) 20px' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="card mobile-full"
                    style={{ padding: 'clamp(24px, 5vw, 48px)', border: '2px solid var(--primary)', background: 'var(--surface)' }}
                >
                    <h2 style={{ fontSize: 'clamp(24px, 5vw, 32px)', marginBottom: '12px', textAlign: 'center' }}>Analyze Your Dream Job</h2>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px' }}>Paste the job description below to start your transformation.</p>

                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '12px'
                        }}>
                            Paste Job Description
                        </label>
                        <Textarea
                            placeholder="Paste the complete job posting here..."
                            style={{ minHeight: '300px' }}
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: '16px',
                            right: '16px',
                            fontSize: '12px',
                            color: 'var(--text-tertiary)'
                        }}>
                            {wordCount} characters
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        disabled={!isEnabled}
                        onClick={handleNext}
                        style={{ width: '100%', height: '60px', fontSize: '18px', gap: '12px' }}
                    >
                        Create Application Package <ArrowRight size={20} />
                    </Button>

                    {!isEnabled && (
                        <div style={{
                            textAlign: 'center',
                            marginTop: '20px',
                            padding: '12px',
                            background: 'rgba(var(--primary-rgb), 0.05)',
                            borderRadius: '12px',
                            border: '1px solid rgba(var(--primary-rgb), 0.1)'
                        }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                                ✨ Paste at least 200 characters to begin analysis.
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                The more context you provide, the better the AI results.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                © 2026 RoleFit AI. Built for high-performers.
            </footer>
        </div>
    );
}
