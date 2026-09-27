import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input, Textarea } from '../components/Input';
import { api, transformProfileForBackend } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { LogOut, User, Cloud, CloudOff, Loader2, HelpCircle, CheckCircle, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import OnboardingModal from '../components/OnboardingModal';
import ThemeToggle from '../components/ThemeToggle';
import { tracker } from '../lib/tracker';
import { analytics } from '../lib/analytics';

const SECTIONS = [
    { id: 'linkedin', label: 'Basic Info' },
    { id: 'experience', label: 'Work Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills & Tools' },
    { id: 'projects', label: 'Projects' },
    { id: 'certs', label: 'Certifications' },
    { id: 'awards', label: 'Awards' },
    { id: 'languages', label: 'Languages' },
    { id: 'additional', label: 'Additional Details' },
];

const LOADING_JOKES = [
    "Recruiter rejected me because I didn't verify my email. True story.",
    "Applying for jobs is a full-time job. But we're speeding it up.",
    "Did you know? The average recruiter looks at a resume for only 7 seconds.",
    "Optimizing your keywords so you beat the robots...",
    "Fact: 75% of resumes are never read by a human. We're fixing that.",
    "Polishing your cover letter to perfection...",
    "Adding a sprinkle of professional charm...",
    "Convincing the AI that you are the chosen one...",
    "Converting coffee into a job offer...",
    "Making sure your resume passes the 6-second scan..."
];


export default function Builder() {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [activeSection, setActiveSection] = useState('linkedin');

    const [formData, setFormData] = useState({
        linkedin: { fullName: currentUser?.displayName || '', email: currentUser?.email || '', url: '' },
        experience: [],
        education: [],
        skills: '',
        projects: [],
        certifications: [],
        awards: [],
        languages: [],
        additional: ''
    });


    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
    const [loadedUid, setLoadedUid] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);
    const [tempJobDescription, setTempJobDescription] = useState('');


    // Load data from Firestore or LocalStorage on mount
    useEffect(() => {
        // Check for onboarding status
        const hasSeenOnboarding = localStorage.getItem('rolefit_onboarding_seen');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }

        const loadInitialData = async () => {
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
                    if (userDoc.exists()) {
                        setFormData(userDoc.data().profile);
                        return;
                    }
                } catch (error) {
                    console.error("Error loading from Firestore:", error);
                }
            }

            // Fallback to localStorage if no cloud data or not logged in
            const saved = localStorage.getItem('rolefit_profile_data');
            if (saved) {
                setFormData(JSON.parse(saved));
            }
        };

        loadInitialData().finally(() => {
            setLoadedUid(currentUser?.uid || 'anonymous');
        });

        // Add fadeIn animation style
        if (!document.getElementById('fade-style')) {
            const style = document.createElement('style');
            style.id = 'fade-style';
            style.innerHTML = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }, [currentUser]);

    // Save data to LocalStorage and Firestore (debounced)
    useEffect(() => {
        if (!loadedUid || (currentUser && loadedUid !== currentUser.uid)) return;
        
        localStorage.setItem('rolefit_profile_data', JSON.stringify(formData));

        if (currentUser) {
            setSaveStatus('saving');
            const timeoutId = setTimeout(async () => {
                try {
                    await setDoc(doc(db, 'profiles', currentUser.uid), {
                        profile: formData,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (error) {
                    console.error("Error saving to Firestore:", error);
                    setSaveStatus('error');
                }
            }, 1000); // 1s debounce

            return () => clearTimeout(timeoutId);
        }
    }, [formData, currentUser]);

    // Track manual edits (Structural Accuracy)
    const handleFieldChange = (section, field, value) => {
        if (hasParsedResume) {
            analytics.trackEvent('manual_edit_after_parse', { section, field });
        }
        
        if (section === 'linkedin' || section === 'skills' || section === 'additional') {
            setFormData(prev => ({
                ...prev,
                [section]: section === 'linkedin' ? { ...prev.linkedin, [field]: value } : value
            }));
        } else {
            // For array sections, this would be handled in their respective child components
            // but for tracking purposes, we add the logic here or in sub-handlers
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [hasParsedResume, setHasParsedResume] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showParsingNotice, setShowParsingNotice] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [currentJokeIndex, setCurrentJokeIndex] = useState(0);

    // Dynamic Loading Animation & Jokes
    useEffect(() => {
        let progressInterval;
        let jokeInterval;

        if (isGenerating) {
            setLoadingProgress(0); // Reset
            setCurrentJokeIndex(0);

            // Progress Bar Logic: Fast at start, slows down
            progressInterval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 98) return 98; // Cap at 98% until done

                    // Simple logic: bigger jumps when low, smaller jumps when high
                    const remaining = 100 - prev;
                    const jump = Math.max(0.2, Math.random() * (remaining / 10));
                    return Math.min(98, prev + jump);
                });
            }, 200);

            // Joke Rotation Logic
            jokeInterval = setInterval(() => {
                setCurrentJokeIndex(prev => (prev + 1) % LOADING_JOKES.length);
            }, 3500);
        }

        return () => {
            clearInterval(progressInterval);
            clearInterval(jokeInterval);
        };
    }, [isGenerating]);

    // Scroll to section when activeSection changes
    useEffect(() => {
        const el = document.getElementById(activeSection);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeSection]);

    const fileInputRef = React.useRef(null);
    const [uploadedFile, setUploadedFile] = useState(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFile(file.name);
            setIsParsing(true);
            try {
                console.log("Starting server-side resume parsing...");
                const parsedProfile = await api.parseResumeFile(file);
                console.log("API response received:", parsedProfile);

                // Merge/Replace with parsed data
                setFormData(prev => ({
                    ...prev,
                    ...parsedProfile,
                    // Preserve original name/email if parsed results are empty
                    linkedin: {
                        fullName: parsedProfile.linkedin?.fullName || prev.linkedin.fullName,
                        email: parsedProfile.linkedin?.email || prev.linkedin.email,
                        url: parsedProfile.linkedin?.url || prev.linkedin.url,
                    },
                    // Convert skills array to comma-separated string for local form
                    skills: Array.isArray(parsedProfile.skills) ? parsedProfile.skills.join(', ') : (parsedProfile.skills || '')
                }));

                setShowParsingNotice(true);
                setHasParsedResume(true);
                analytics.trackEvent('resume_parsed', { filename: file.name });
            } catch (error) {
                console.error("Parsing failed:", error);
                analytics.trackError(`Resume parsing failed: ${error.message}`);
                const errorMessage = error.message || "Unknown error";
                alert(`Sorry, we couldn't parse this resume automatically.\n\nDetails: ${errorMessage}\n\nPlease try another file or enter details manually.`);
            } finally {
                setIsParsing(false);
            }
        }
    };

    const calculateProgress = () => {
        let completed = 0;
        const total = SECTIONS.length;

        if (formData.linkedin?.fullName) completed++;
        if (formData.experience.length > 0) completed++;
        if (formData.education.length > 0) completed++;
        if (formData.skills.length > 0) completed++;
        if (formData.projects.length > 0) completed++;
        if (formData.certifications.length > 0) completed++;
        if (formData.awards.length > 0 && formData.awards[0] !== '') completed++;
        if (formData.languages.length > 0 && formData.languages[0] !== '') completed++;
        if (formData.additional.length > 0) completed++;

        return { completed, total, percent: Math.round((completed / total) * 100) };
    };

    const progress = calculateProgress();

    const handleGenerateClick = () => {
        if (progress.percent < 20) {
            if (!window.confirm("Your profile looks a bit empty. We recommend adding more details for better results. Proceed anyway?")) {
                return;
            }
        }
        const existingJd = localStorage.getItem('rolefit_job_description') || '';
        setTempJobDescription(existingJd);
        setShowJobModal(true);
    };

    const handleConfirmGenerate = async () => {
        if (!tempJobDescription || tempJobDescription.length < 200) {
            alert("Please paste a valid job description (at least 200 characters).");
            return;
        }
        localStorage.setItem('rolefit_job_description', tempJobDescription);
        setShowJobModal(false);
        setIsGenerating(true);
        try {
            const jobDescription = tempJobDescription;

            // Start TTV Timer
            analytics.startTimer('generation_to_results');

            const backendProfile = transformProfileForBackend(formData);
            analytics.trackEvent('generation_started', {
                has_experience: formData.experience.length > 0,
                has_projects: formData.projects.length > 0,
                completion_percent: progress.percent
            });
            const data = await api.completeApplication(backendProfile, jobDescription);

            // Transition: No longer silent tracking. 
            // We pass a flag to Results.jsx to trigger the confirmation modal.
            const shouldPromptTracking = !!currentUser && !!data.job_data;

            navigate('/results', {
                state: {
                    results: data.results,
                    matchAnalysis: data.match_analysis,
                    jobData: data.job_data,
                    verdict: data.verdict,
                    recommendations: data.recommendations,
                    resumeProTip: data.resume_pro_tip,
                    formData: formData,
                    shouldPromptTracking
                }
            });

        } catch (error) {
            console.error(error);
            let message = error.message;
            if (message.includes('429') || message.includes('Quota') || message.includes('ResourceExhausted')) {
                message = "✨ Demo Usage Limit Reached (429) ✨\n\nThe free AI model is busy. Please wait 30-60 seconds and try again.";
            } else {
                message = `Error: ${message}`;
            }
            alert(message);
            setIsGenerating(false);
        }
    };

    const handleCloseOnboarding = () => {
        setShowOnboarding(false);
        localStorage.setItem('rolefit_onboarding_seen', 'true');
    };

    return (
        <div className="mobile-stack" style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', color: 'var(--text-primary)', transition: 'all 0.3s ease' }}>
            <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />

            {/* Mobile Top Header (hidden on desktop) */}
            <div className="mobile-only" style={{ width: '100%', zIndex: 30, background: 'var(--surface)', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>R</div>
                        <span style={{ fontWeight: 700, fontSize: '16px' }}>RoleFit</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                            onClick={() => setShowOnboarding(true)}
                            title="Watch Tour Again"
                            style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <HelpCircle size={18} />
                        </button>
                        <ThemeToggle inline={true} style={{ background: 'none', border: 'none', boxShadow: 'none', width: '34px', height: '34px' }} />
                        {currentUser && (
                            <button onClick={logout} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', padding: '8px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <LogOut size={14} /> Sign Out
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Job Description Modal */}
            <AnimatePresence>
                {showJobModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: 'var(--surface)', width: '100%', maxWidth: '600px',
                                borderRadius: '24px', padding: '32px',
                                boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Ready to Apply?</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Paste the job description below and our AI will tailor your profile specifically for this role.
                            </p>
                            
                            <Textarea
                                placeholder="Paste the complete job posting here (min 200 characters)..."
                                style={{ minHeight: '250px', marginBottom: '8px' }}
                                value={tempJobDescription}
                                onChange={(e) => setTempJobDescription(e.target.value)}
                            />
                            <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                                {tempJobDescription.length} characters
                            </div>

                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                                <Button variant="ghost" onClick={() => setShowJobModal(false)}>Cancel</Button>
                                <Button 
                                    variant="primary" 
                                    onClick={handleConfirmGenerate}
                                    disabled={tempJobDescription.length < 200}
                                    style={{ height: 'auto', minHeight: '44px', padding: '10px 16px', whiteSpace: 'normal', textAlign: 'center', lineHeight: '1.2' }}
                                >
                                    Analyze & Generate Package
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Parsing Success Modal */}
            <AnimatePresence>
                {showParsingNotice && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: 'var(--surface)', width: '100%', maxWidth: '400px',
                                borderRadius: '24px', padding: '40px 32px', textAlign: 'center',
                                boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <div style={{
                                width: '64px', height: '64px', background: 'rgba(0, 208, 132, 0.1)',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px', color: '#00D084'
                            }}>
                                <CheckCircle size={32} />
                            </div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Resume Parsed!</h2>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                                We've auto-populated your profile. Please review the details in each section and add any missing information.
                            </p>
                            <Button variant="primary" onClick={() => setShowParsingNotice(false)} style={{ width: '100%' }}>
                                Let's Review
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating UI Elements (Desktop only - hidden on mobile) */}
            {!(showOnboarding || isGenerating) && (
                <div className="desktop-only">
                    <ThemeToggle />
                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="btn-help-floating"
                        title="Watch Tour Again"
                    >
                        <HelpCircle size={22} />
                    </button>
                </div>
            )}

            {/* Processing Modal Overlay */}
            {isGenerating && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ textAlign: 'center', maxWidth: '500px', padding: '0 20px' }}>
                        <div style={{ width: '64px', height: '64px', background: 'var(--primary)', borderRadius: '16px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', fontWeight: 700 }}>R</div>
                        <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>Building package...</h2>

                        {/* Dynamic Joke/Fact */}
                        <div style={{ height: '48px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p key={currentJokeIndex} style={{
                                color: 'var(--text-secondary)',
                                fontSize: '15px',
                                animation: 'fadeIn 0.5s ease-in'
                            }}>
                                {LOADING_JOKES[currentJokeIndex]}
                            </p>
                        </div>

                        <div style={{ width: '300px', height: '8px', background: 'var(--border-light)', margin: '0 auto', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.round(loadingProgress)}%`,
                                height: '100%',
                                background: 'var(--primary)',
                                transition: 'width 0.2s linear'
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px', margin: '16px auto 0', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>
                            <span>AI GENERATING...</span>
                            <span>{Math.round(loadingProgress)}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar / Top Nav */}
            <div className="no-scrollbar" style={{
                width: 'var(--sidebar-width, 280px)',
                height: 'var(--sidebar-height, 100vh)',
                position: 'sticky',
                top: 0,
                borderRight: '1px solid var(--border-light)',
                borderBottom: 'var(--sidebar-border-bottom, none)',
                padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 20px)',
                backgroundColor: 'var(--surface)',
                display: 'flex',
                flexDirection: 'var(--sidebar-direction, column)',
                zIndex: 20,
                overflowX: 'auto',
                overflowY: 'auto'
            }}>
                <style>{`
                    @media (max-width: 768px) {
                        :root {
                            --sidebar-width: 100%;
                            --sidebar-height: auto;
                            --sidebar-direction: row;
                            --sidebar-border-bottom: 1px solid var(--border-light);
                        }
                        .main-content { padding: 40px 20px 180px !important; }
                        .bottom-bar { padding-left: 20px !important; height: auto !important; padding-top: 20px !important; padding-bottom: 20px !important; flex-direction: column !important; gap: 20px !important; }
                        .sidebar-nav { flex-direction: row !important; padding-right: 120px !important; }
                        .sidebar-header { display: none !important; }
                        .sidebar-user { display: none !important; }
                    }
                `}</style>
                <div className="sidebar-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>R</div>
                    <span style={{ fontWeight: 700, fontSize: '18px' }}>RoleFit</span>
                </div>

                {currentUser && (
                    <div className="sidebar-user" style={{ marginBottom: '32px', padding: '16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {currentUser.photoURL ? (
                                <img src={currentUser.photoURL} alt="profile" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                            ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} /></div>
                            )}
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.displayName}</div>
                                <button onClick={logout} style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <LogOut size={10} /> Logout
                                </button>
                            </div>
                        </div>

                        {/* Cloud Sync Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {saveStatus === 'saving' && <Loader2 size={10} className="animate-spin" style={{ color: 'var(--primary)' }} />}
                            {saveStatus === 'saved' && <Cloud size={10} style={{ color: '#00D084' }} />}
                            {saveStatus === 'idle' && <Cloud size={10} style={{ color: 'var(--text-tertiary)' }} />}
                            {saveStatus === 'error' && <CloudOff size={10} style={{ color: 'var(--error)' }} />}
                            <span style={{ color: saveStatus === 'saving' ? 'var(--primary)' : saveStatus === 'saved' ? '#00D084' : 'var(--text-tertiary)' }}>
                                {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Cloud Synced' : 'Cloud Save Active'}
                            </span>
                        </div>
                    </div>
                )}

                <nav className="sidebar-nav no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <a
                        href="/tracker"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            textAlign: 'left',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(var(--primary-rgb), 0.05)',
                            color: 'var(--primary)',
                            transition: 'all 0.2s',
                            fontWeight: 700,
                            fontSize: '14px',
                            marginBottom: '16px',
                            border: '1px solid rgba(var(--primary-rgb), 0.1)',
                            textDecoration: 'none'
                        }}
                    >
                        <LayoutDashboard size={18} />
                        Job Tracker
                    </a>

                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '8px 0 16px', opacity: 0.5 }} />

                    {SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            style={{
                                textAlign: 'left',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: activeSection === section.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                color: activeSection === section.id ? 'var(--primary)' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                fontWeight: activeSection === section.id ? 600 : 500,
                                fontSize: '14px'
                            }}
                        >
                            {section.label}
                            {activeSection === section.id && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="main-content" style={{ flex: 1, padding: '60px 80px 140px', maxWidth: '1000px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>

                    <section id="linkedin">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Personal Info</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>This information will be used for your application header.</p>
                        <Card style={{
                            border: isDragging ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                            background: isDragging ? 'rgba(var(--primary-rgb), 0.02)' : 'var(--surface)',
                            transition: 'all 0.3s ease'
                        }}>
                                {(!hasParsedResume && progress.percent < 25) ? (
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleFileChange({ target: { files: [file] } });
                                        }}
                                        style={{
                                            marginBottom: '32px',
                                            textAlign: 'center',
                                            padding: '40px 30px',
                                            border: '2px dashed var(--border-light)',
                                            borderRadius: '16px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={handleUploadClick}
                                    >
                                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf" onChange={handleFileChange} />
        
                                        {isParsing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                                                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Auto-Parsing Resume...</div>
                                                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>This usually takes 10-15 seconds.</p>
                                            </div>
                                        ) : !uploadedFile ? (
                                            <>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                                    <Cloud size={24} />
                                                </div>
                                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Drop your resume here</h3>
                                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>to auto-populate your profile</p>
                                                <Button variant="secondary">Browse Files</Button>
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '18px' }}>✓ Resume Attached</div>
                                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{uploadedFile}</div>
                                                <Button variant="ghost" style={{ fontSize: '12px', marginTop: '8px' }} onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}>Change File</Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '32px', textAlign: 'center', padding: '24px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '16px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>✨ Profile Populated</div>
                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Your profile has existing data. You can edit fields manually or overwrite everything below.</p>
                                        <Button variant="secondary" onClick={() => {
                                            if (window.confirm("Uploading a new resume will overwrite your existing profile fields. Are you sure you want to proceed?")) {
                                                handleUploadClick();
                                            }
                                        }}>
                                            Re-upload Resume (Overwrites Data)
                                        </Button>
                                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf" onChange={handleFileChange} />
                                    </div>
                                )}

                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Full Name *</label>
                                    <Input
                                        value={formData.linkedin?.fullName || ''}
                                        onChange={e => handleFieldChange('linkedin', 'fullName', e.target.value)}
                                        placeholder="e.g. Sahithi Boinpalli"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Email</label>
                                    <Input
                                        value={formData.linkedin?.email || ''}
                                        onChange={e => handleFieldChange('linkedin', 'email', e.target.value)}
                                        placeholder="e.g. sahithiboin@gmail.com"
                                    />
                                </div>
                            </div>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Phone Number (Optional)</label>
                                    <Input
                                        value={formData.linkedin?.phone || ''}
                                        onChange={e => handleFieldChange('linkedin', 'phone', e.target.value)}
                                        placeholder="e.g. +1 234 567 8900"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Portfolio / Website (Optional)</label>
                                    <Input
                                        value={formData.linkedin?.portfolio || ''}
                                        onChange={e => handleFieldChange('linkedin', 'portfolio', e.target.value)}
                                        placeholder="e.g. portfolio.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>LinkedIn URL</label>
                                <Input
                                    value={formData.linkedin?.url || ''}
                                    onChange={e => handleFieldChange('linkedin', 'url', e.target.value)}
                                    placeholder="e.g. linkedin.com/in/sahithiboin"
                                />
                            </div>
                        </Card>
                    </section>


                    <section id="experience">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Work Experience</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>List your professional journey.</p>

                        {formData.experience.map((exp, index) => (
                            <Card key={index} style={{ marginBottom: '24px' }}>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                    <Input value={exp.company} placeholder="Company" onChange={(e) => {
                                        const newExp = [...formData.experience];
                                        newExp[index].company = e.target.value;
                                        setFormData({ ...formData, experience: newExp });
                                    }} />
                                    <Input value={exp.role} placeholder="Role" onChange={(e) => {
                                        const newExp = [...formData.experience];
                                        newExp[index].role = e.target.value;
                                        setFormData({ ...formData, experience: newExp });
                                    }} />
                                </div>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                    <Input value={exp.dates} placeholder="e.g., March 2023 - Present" onChange={(e) => {
                                        const newExp = [...formData.experience];
                                        newExp[index].dates = e.target.value;
                                        setFormData({ ...formData, experience: newExp });
                                    }} />
                                    <Input value={exp.location} placeholder="Location" onChange={(e) => {
                                        const newExp = [...formData.experience];
                                        newExp[index].location = e.target.value;
                                        setFormData({ ...formData, experience: newExp });
                                    }} />
                                </div>
                                <Textarea value={exp.description} placeholder="Describe your impact and achievements..." style={{ minHeight: '120px' }} onChange={(e) => {
                                    const newExp = [...formData.experience];
                                    newExp[index].description = e.target.value;
                                    setFormData({ ...formData, experience: newExp });
                                }} />
                                <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                    <button onClick={() => setFormData({ ...formData, experience: formData.experience.filter((_, i) => i !== index) })} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '13px', cursor: 'pointer' }}>Remove</button>
                                </div>
                            </Card>
                        ))}

                        <Button variant="secondary" onClick={() => setFormData({ ...formData, experience: [...formData.experience, { company: '', role: '', dates: '', location: '', description: '' }] })}>+ Add Position</Button>
                    </section>

                    <section id="education">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Education</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Academic background.</p>
                        {formData.education.map((edu, index) => (
                            <Card key={index} style={{ marginBottom: '24px' }}>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                                    <Input value={edu.school} placeholder="University Name" onChange={(e) => {
                                        const newEdu = [...formData.education];
                                        newEdu[index].school = e.target.value;
                                        setFormData({ ...formData, education: newEdu });
                                    }} />
                                    <Input value={edu.degree} placeholder="Degree" onChange={(e) => {
                                        const newEdu = [...formData.education];
                                        newEdu[index].degree = e.target.value;
                                        setFormData({ ...formData, education: newEdu });
                                    }} />
                                </div>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <Input value={edu.dates} placeholder="Graduation Year" onChange={(e) => {
                                        const newEdu = [...formData.education];
                                        newEdu[index].dates = e.target.value;
                                        setFormData({ ...formData, education: newEdu });
                                    }} />
                                    <Input value={edu.field} placeholder="Major" onChange={(e) => {
                                        const newEdu = [...formData.education];
                                        newEdu[index].field = e.target.value;
                                        setFormData({ ...formData, education: newEdu });
                                    }} />
                                </div>
                            </Card>
                        ))}
                        <Button variant="secondary" onClick={() => setFormData({ ...formData, education: [...formData.education, { school: '', degree: '', dates: '', field: '' }] })}>+ Add Education</Button>
                    </section>

                    <section id="skills">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Skills & Tools</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>List your hard and soft skills.</p>
                        <Card>
                            <Input
                                value={formData.skills}
                                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                placeholder="e.g., React, Python, Product Strategy, Figma..."
                            />
                            <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Tip: List skills separated by commas for better AI analysis.
                            </div>
                        </Card>
                    </section>

                    <section id="projects">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Projects</h2>
                        {formData.projects.map((proj, index) => (
                            <Card key={index} style={{ marginBottom: '24px' }}>
                                <Input value={proj.name} placeholder="Project Name" style={{ marginBottom: '16px' }} onChange={(e) => {
                                    const newProj = [...formData.projects];
                                    newProj[index].name = e.target.value;
                                    setFormData({ ...formData, projects: newProj });
                                }} />
                                <Textarea value={proj.description} placeholder="What did you build and what was the impact?" style={{ minHeight: '100px' }} onChange={(e) => {
                                    const newProj = [...formData.projects];
                                    newProj[index].description = e.target.value;
                                    setFormData({ ...formData, projects: newProj });
                                }} />
                            </Card>
                        ))}
                        <Button variant="secondary" onClick={() => setFormData({ ...formData, projects: [...formData.projects, { name: '', description: '' }] })}>+ Add Project</Button>
                    </section>

                    <section id="certs">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Certifications</h2>
                        {formData.certifications.map((cert, index) => (
                            <Card key={index} style={{ marginBottom: '24px' }}>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <Input value={cert.name} placeholder="Name" onChange={(e) => {
                                        const newCert = [...formData.certifications];
                                        newCert[index].name = e.target.value;
                                        setFormData({ ...formData, certifications: newCert });
                                    }} />
                                    <Input value={cert.issuer} placeholder="Issuer" onChange={(e) => {
                                        const newCert = [...formData.certifications];
                                        newCert[index].issuer = e.target.value;
                                        setFormData({ ...formData, certifications: newCert });
                                    }} />
                                </div>
                            </Card>
                        ))}
                        <Button variant="secondary" onClick={() => setFormData({ ...formData, certifications: [...formData.certifications, { name: '', issuer: '' }] })}>+ Add Certification</Button>
                    </section>

                    <section id="awards">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Awards</h2>
                        <Card>
                            <Textarea placeholder="List honors or awards..." value={formData.awards.join('\n')} onChange={(e) => setFormData({ ...formData, awards: e.target.value.split('\n') })} />
                        </Card>
                    </section>

                    <section id="languages">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Languages</h2>
                        <Card>
                            <Input placeholder="English, French, etc." value={formData.languages.join(', ')} onChange={(e) => setFormData({ ...formData, languages: e.target.value.split(', ') })} />
                        </Card>
                    </section>

                    <section id="additional">
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Additional Details</h2>
                        <Card>
                            <Textarea
                                value={formData.additional}
                                onChange={(e) => setFormData({ ...formData, additional: e.target.value })}
                                placeholder="Anything else the AI should know?"
                                style={{ minHeight: '150px' }}
                            />
                        </Card>
                    </section>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bottom-bar" style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: '100px', background: 'var(--surface)', borderTop: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px',
                zIndex: 100,
                paddingLeft: 'var(--bar-padding-left, 340px)'
            }}>
                <style>{`
                    @media (max-width: 768px) {
                        .bottom-bar { --bar-padding-left: 20px; }
                        .bottom-bar .btn { width: 100% !important; }
                    }
                `}</style>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>Profile Completion</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>{progress.percent}% Ready</div>
                        <div style={{ width: '150px', height: '6px', borderRadius: '3px', background: 'var(--border-light)', overflow: 'hidden' }}>
                            <div style={{ width: `${progress.percent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }} />
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleGenerateClick}
                    variant="primary"
                    style={{
                        width: '240px',
                        height: '56px',
                        fontSize: '16px',
                        background: progress.percent > 50 ? 'var(--primary-dark)' : 'var(--primary)',
                        transition: 'all 0.4s ease'
                    }}
                >
                    Generate Application →
                </Button>
            </div>
        </div >
    );
}
