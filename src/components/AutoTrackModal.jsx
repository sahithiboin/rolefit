import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Briefcase, Sparkles, CheckCircle, X, LayoutDashboard } from 'lucide-react';

export default function AutoTrackModal({ isOpen, onClose, onConfirm, jobTitle, company }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: 'var(--surface)',
                    width: '100%',
                    maxWidth: '450px',
                    borderRadius: '28px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(var(--primary-rgb), 0.1)'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div style={{ padding: '40px 32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                            color: 'var(--primary)',
                            position: 'relative'
                        }}>
                            <LayoutDashboard size={36} />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring' }}
                                style={{
                                    position: 'absolute',
                                    bottom: '-4px',
                                    right: '-4px',
                                    background: '#00D084',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    border: '3px solid var(--surface)'
                                }}
                            >
                                <Sparkles size={12} fill="currentColor" />
                            </motion.div>
                        </div>

                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            Track this job?
                        </h2>

                        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            We can automatically add <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{jobTitle}</span> at <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{company}</span> to your tracking board so you never lose sight of it.
                        </p>

                        <div style={{
                            background: 'rgba(var(--primary-rgb), 0.03)',
                            borderRadius: '16px',
                            padding: '16px',
                            width: '100%',
                            marginBottom: '32px',
                            border: '1px dashed rgba(var(--primary-rgb), 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'left'
                        }}>
                            <CheckCircle size={20} style={{ color: '#00D084', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Includes tailored resume & cover letter context.
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                style={{ flex: 1, height: '52px', fontWeight: 700 }}
                            >
                                Not now
                            </Button>
                            <Button
                                variant="primary"
                                onClick={onConfirm}
                                style={{ flex: 2, height: '52px', fontWeight: 700, gap: '8px' }}
                            >
                                <LayoutDashboard size={18} /> Add to Tracker
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
