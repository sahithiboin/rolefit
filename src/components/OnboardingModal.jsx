import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Briefcase, FileText, Sparkles, CheckCircle, ChevronRight, X } from 'lucide-react';

const STEPS = [
    {
        id: 'welcome',
        icon: <Sparkles size={48} className="text-primary" />,
        title: "Welcome to RoleFit!",
        description: "Let's build a comprehensive profile to land you that dream job. RoleFit uses AI to tailor your application for every specific role.",
    },
    {
        id: 'parser',
        icon: <FileText size={48} className="text-primary" />,
        title: "AI Resume Parser",
        description: "Don't waste time typing! Simply drag and drop your resume PDF to auto-populate your entire profile in seconds.",
        note: "Once parsed, you can review and touch up the details manually."
    },
    {
        id: 'details',
        icon: <Briefcase size={48} className="text-primary" />,
        title: "Refine Your Experience",
        description: "The more context you provide, the better our AI can sell you. Use our structured builder to polish the results and add specific achievements.",
    },
    {
        id: 'ready',
        icon: <CheckCircle size={48} style={{ color: '#00D084' }} />,
        title: "You're All Set!",
        description: "Once your profile is ready, you can generate unlimited tailored application packages for any job description.",
        buttonText: "Let's Build!"
    }
];

export default function OnboardingModal({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

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
            backdropFilter: 'blur(5px)'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                    background: 'var(--surface)',
                    width: '100%',
                    maxWidth: '500px',
                    borderRadius: '24px',
                    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden',
                    position: 'relative'
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
                    <X size={24} />
                </button>

                {/* Content */}
                <div style={{ padding: '40px 32px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '300px' }}
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'rgba(var(--primary-rgb), 0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '24px',
                                color: 'var(--primary)'
                            }}>
                                {STEPS[currentStep].icon}
                            </div>

                            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
                                {STEPS[currentStep].title}
                            </h2>

                            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                {STEPS[currentStep].description}
                            </p>

                            {STEPS[currentStep].description2 && (
                                <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    {STEPS[currentStep].description2}
                                </p>
                            )}

                            {STEPS[currentStep].note && (
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--background)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    marginTop: '8px',
                                    fontWeight: 500
                                }}>
                                    💡 {STEPS[currentStep].note}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer / Navigation */}
                <div style={{
                    padding: '20px 32px',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface)'
                }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: idx === currentStep ? 'var(--primary)' : 'var(--border-light)',
                                    transition: 'background 0.3s ease'
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {currentStep > 0 && (
                            <Button variant="secondary" onClick={handleBack} style={{ height: '40px', padding: '0 16px' }}>
                                Back
                            </Button>
                        )}
                        <Button variant="primary" onClick={handleNext} style={{ height: '40px', padding: '0 24px', gap: '8px' }}>
                            {STEPS[currentStep].buttonText || (currentStep === STEPS.length - 1 ? 'Finish' : 'Next')}
                            {currentStep < STEPS.length - 1 && <ChevronRight size={16} />}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
