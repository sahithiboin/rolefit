import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, Mail, Linkedin, User } from 'lucide-react';

const features = [
    {
        title: "Tailored Resumes",
        description: "ATS-optimized resumes crafted to match each job perfectly.",
        icon: <FileText className="text-primary" />,
    },
    {
        title: "90-Second Setup",
        description: "From job posting URL to complete application package in under two minutes.",
        icon: <Clock className="text-primary" />,
    },
    {
        title: "Smart Cover Letters",
        description: "Compelling narratives that authentically connect your experience.",
        icon: <Mail className="text-primary" />,
    },
    {
        title: "LinkedIn Outreach",
        description: "Personalized messages to connect with hiring managers.",
        icon: <Linkedin className="text-primary" />,
    },
    {
        title: "AI Fit Analysis",
        description: "Get a detailed percentage match for every job description.",
        icon: <User className="text-primary" />,
    }
];

const Carousel = () => {
    return (
        <div className="carousel-container" style={{ overflow: 'hidden', padding: '40px 0' }}>
            <style>{`
                @media (max-width: 768px) {
                    .carousel-track {
                        flex-direction: column !important;
                        align-items: center !important;
                        width: 100% !important;
                        transform: none !important;
                        animation: none !important;
                        gap: 32px !important;
                    }
                    .carousel-card {
                        width: 90% !important;
                        max-width: 400px !important;
                    }
                    .carousel-card.duplicate {
                        display: none !important;
                    }
                }
            `}</style>
            <motion.div
                className="carousel-track"
                animate={{
                    x: [0, -1720], // 5 cards * (320px + 24px gap) = 1720
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                }}
                style={{ display: 'flex', gap: '24px', width: 'max-content' }}
            >
                {[...features, ...features].map((feature, index) => (
                    <motion.div
                        key={index}
                        className={`card carousel-card ${index >= features.length ? 'duplicate' : ''}`}
                        style={{
                            width: '320px',
                            flexShrink: 0,
                            borderRadius: '24px',
                            overflow: 'hidden',
                            background: 'var(--surface)',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            cursor: 'default'
                        }}
                    >
                        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '16px',
                                    background: 'transparent',
                                    border: '2px solid var(--primary-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)'
                                }}
                            >
                                {React.cloneElement(feature.icon, { size: 32, className: "" })}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>{feature.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default Carousel;
