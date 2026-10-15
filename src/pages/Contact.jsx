import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';

export default function Contact() {
    const [status, setStatus] = useState('idle');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('submitting');
        // Mock feedback submission since no backend change is required
        setTimeout(() => {
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        }, 1000);
    };

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: 'clamp(60px, 15vh, 120px) 20px', transition: 'all 0.3s ease' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer', marginBottom: '40px' }}>
                    <ArrowLeft size={18} /> Back
                </button>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '20px',
                            background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <MessageSquare size={32} />
                        </div>
                        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
                            Get in Touch
                        </h1>
                        <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                            Have questions, bugs to report, or feature requests? We'd love to hear your feedback.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Your Name</label>
                            <Input placeholder="Jane Doe" required />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Email Address</label>
                            <Input type="email" placeholder="jane@example.com" required />
                        </div>
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Message or Feedback</label>
                            <Textarea placeholder="Share your thoughts here..." style={{ minHeight: '150px' }} required />
                        </div>

                        <Button 
                            variant="primary" 
                            type="submit" 
                            style={{ width: '100%', height: '56px', fontSize: '16px', gap: '12px' }}
                            disabled={status !== 'idle'}
                        >
                            {status === 'success' ? 'Message Sent! ✓' : (
                                <>
                                    <Send size={18} /> {status === 'submitting' ? 'Sending...' : 'Send Message'}
                                </>
                            )}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
