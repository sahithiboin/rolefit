import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, Cpu, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
    const navigate = useNavigate();

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: 'clamp(60px, 15vh, 120px) 20px', transition: 'all 0.3s ease' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer', marginBottom: '40px' }}>
                    <ArrowLeft size={18} /> Back
                </button>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                        borderRadius: '100px', background: 'rgba(var(--primary-rgb), 0.1)',
                        color: 'var(--primary)', fontSize: '14px', fontWeight: 600, marginBottom: '24px'
                    }}>
                        <Sparkles size={16} /> Our Mission
                    </div>
                    
                    <h1 style={{ fontSize: 'clamp(40px, 6vw, 56px)', fontWeight: 800, marginBottom: '24px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                        Redefining the Job Hunt
                    </h1>

                    <p style={{ fontSize: 'clamp(18px, 4vw, 22px)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '60px' }}>
                        RoleFit was built to stop the endless frustration of black-hole job applications. We bridge the gap between your real value and what applicant tracking systems demand.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', textAlign: 'left' }}>
                        <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                            <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><Users size={32} /></div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>By Performers, For Performers</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                We know what it takes to build a career. We're here to help you architect an application that genuinely reflects your hard-earned experience.
                            </p>
                        </div>
                        <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                            <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><Cpu size={32} /></div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>AI-Driven Insights</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Using the latest Gemini Large Language Models, our software highlights key constraints, responsibilities, and unwritten rules embedded in every Job Description.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
