import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, transformProfileForBackend } from '../lib/api';
import { ArrowLeft, Sparkles, Edit3, RotateCcw, Send, Download, GraduationCap, ExternalLink, Lightbulb, LayoutDashboard, LogOut } from 'lucide-react';
import { downloadResumePDF, downloadCoverLetterPDF } from '../lib/pdfGenerator';
import { downloadCoverLetterDOCX, downloadResumeDOCX } from '../lib/docxGenerator';
import { tracker } from '../lib/tracker';
import { useAuth } from '../components/AuthContext';
import AutoTrackModal from '../components/AutoTrackModal';
import ThemeToggle from '../components/ThemeToggle';
import { analytics } from '../lib/analytics';

const TABS = [
    { id: 'fit', label: 'Fit Analysis' },
    { id: 'resume', label: 'Resume' },
    { id: 'cover', label: 'Cover Letter' },
    { id: 'linkedin', label: 'LinkedIn Message' },
    { id: 'skillup', label: 'Skill Up' },
];

export default function Results() {
    const [activeTab, setActiveTab] = useState('fit');
    const location = useLocation();
    const navigate = useNavigate();

    const { matchAnalysis: initialMatchAnalysis, jobData, formData, verdict, recommendations, resumeProTip, shouldPromptTracking } = location.state || {};

    const [localResults, setLocalResults] = useState(location.state?.results || null);
    const [localMatchAnalysis, setLocalMatchAnalysis] = useState(initialMatchAnalysis || null);
    const matchAnalysis = localMatchAnalysis; // Alias back for all references

    // Chat Copilot State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        { id: Date.now(), role: 'assistant', message: "Hey bestie! ✨ I'm your AI Copilot. What are we tweaking today?", snapshot_results: location.state?.results || null, snapshot_analysis: initialMatchAnalysis || null }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Interview Prep WTP State
    const [isWtpOpen, setIsWtpOpen] = useState(false);

    const [isDownloadingResume, setIsDownloadingResume] = useState(false);
    const [isDownloadingCover, setIsDownloadingCover] = useState(false);
    const [isDownloadingResumeDocx, setIsDownloadingResumeDocx] = useState(false);
    const [isDownloadingCoverDocx, setIsDownloadingCoverDocx] = useState(false);
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [hasTracked, setHasTracked] = useState(false);

    const { currentUser, logout } = useAuth();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (!location.state) {
            navigate('/builder');
            return;
        }

        if (shouldPromptTracking && !hasTracked) {
            setShowTrackModal(true);
        }

        // Track view on load
        if (localResults) {
            const ttv = analytics.getDuration('generation_to_results');
            analytics.trackEvent('artifact_viewed', {
                fit_score: matchAnalysis?.overall_fit_score,
                verdict: verdict?.label,
                ttv_seconds: ttv || undefined
            });
        }
    }, [navigate, location.state, shouldPromptTracking, hasTracked]);

    // Track tab switches (Generation Depth)
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        analytics.trackEvent('tab_viewed', { tab_id: tabId });
    };

    const handleConfirmTrack = async () => {
        console.log("handleConfirmTrack called", { currentUser: !!currentUser, jobData: !!jobData, localResults: !!localResults });

        if (!currentUser || !jobData) {
            console.warn("Tracking aborted: Missing user or job data", { currentUser, jobData });
            return;
        }

        try {
            console.log("Sending to tracker.addJob...", {
                userId: currentUser.uid,
                job_title: jobData.job_title,
                company: jobData.company
            });

            await tracker.addJob(currentUser.uid, {
                ...jobData,
                matchAnalysis: matchAnalysis || null,
                source: 'Generated',
                package: localResults || null
            });
            setHasTracked(true);
            setShowTrackModal(false);
            alert("Job successfully added to your tracker! 🚀");
        } catch (error) {
            console.error("Failed to track job:", error);
            alert(`Failed to add to tracker: ${error.message}`);
        }
    };

    const handleRefine = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        
        const newUserMsg = { id: Date.now(), role: 'user', message: userMessage };
        setChatHistory(prev => [...prev, newUserMsg]);
        setIsChatLoading(true);

        try {
            const userProfile = transformProfileForBackend(formData);
            const response = await api.refinePackage({
                user_profile: userProfile,
                job_data: jobData,
                match_analysis: localMatchAnalysis,
                original_results: localResults,
                chat_history: chatHistory.map(m => ({ role: m.role, message: m.message })),
                refinement_prompt: userMessage
            });

            // Update document view
            const newResults = {
                resume: response.resume || localResults.resume,
                cover_letter: response.cover_letter || localResults.cover_letter,
                linkedin_message: response.linkedin_message || localResults.linkedin_message
            };
            setLocalResults(newResults);
            
            let newAnalysis = localMatchAnalysis;
            if (response.match_analysis) {
                newAnalysis = response.match_analysis;
                setLocalMatchAnalysis(response.match_analysis);
            }

            // Add Assistant message with snapshot
            setChatHistory(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                message: response.agent_message || "Done! 🚀 Let me know if you need any other tweaks.",
                snapshot_results: newResults,
                snapshot_analysis: newAnalysis
            }]);

            analytics.trackEvent('ai_refine_success', { prompt_length: userMessage.length });
        } catch (error) {
            console.error("Refinement failed:", error);
            analytics.trackError(`Refinement failed: ${error.message}`);
            setChatHistory(prev => [...prev, { id: Date.now(), role: 'assistant', message: `Oops! 💀 Something went wrong: ${error.message}` }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleRestoreSnapshot = (msg) => {
        if (msg.snapshot_results) {
            setLocalResults(msg.snapshot_results);
            if (msg.snapshot_analysis) setLocalMatchAnalysis(msg.snapshot_analysis);
            
            setChatHistory(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                message: "Got you! Reverted to that version. ⏪",
                snapshot_results: msg.snapshot_results,
                snapshot_analysis: msg.snapshot_analysis
            }]);
        }
    };

    const handleWtpClick = (tier, price) => {
        analytics.trackEvent('interview_prep_wtp_click', { tier, price });
        alert("Thanks for your interest! We're building this feature right now and you'll be the first to know when it drops. 🚀");
        setIsWtpOpen(false);
    };

    const handleDownloadResume = async () => {
        setIsDownloadingResume(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
            downloadResumePDF(localResults?.resume || '', jobData?.job_title || '');
            analytics.trackEvent('artifact_download', { type: 'resume', format: 'pdf' });
        } catch (error) {
            console.error("Resume download failed:", error);
            analytics.trackError(`Resume download failed: ${error.message}`);
            alert("Sorry, we couldn't download the resume. Please try again.");
        } finally {
            setIsDownloadingResume(false);
        }
    };

    const handleDownloadCoverLetter = async () => {
        setIsDownloadingCover(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
            downloadCoverLetterPDF(localResults?.cover_letter || '', jobData?.job_title || '');
            analytics.trackEvent('artifact_download', { type: 'cover_letter', format: 'pdf' });
        } catch (error) {
            console.error("Cover letter download failed:", error);
            analytics.trackError(`Cover letter download failed: ${error.message}`);
            alert("Sorry, we couldn't download the cover letter. Please try again.");
        } finally {
            setIsDownloadingCover(false);
        }
    };

    const handleDownloadResumeDocx = async () => {
        setIsDownloadingResumeDocx(true);
        try {
            await downloadResumeDOCX(localResults?.resume || '', jobData?.job_title || '');
            analytics.trackEvent('artifact_download', { type: 'resume', format: 'docx' });
        } catch (error) {
            console.error("Resume DOCX download failed:", error);
            analytics.trackError(`Resume DOCX download failed: ${error.message}`);
            alert("Sorry, we couldn't download the resume as DOCX. Please try again.");
        } finally {
            setIsDownloadingResumeDocx(false);
        }
    };

    const handleDownloadCoverLetterDocx = async () => {
        setIsDownloadingCoverDocx(true);
        try {
            await downloadCoverLetterDOCX(localResults?.cover_letter || '', jobData?.job_title || '');
            analytics.trackEvent('artifact_download', { type: 'cover_letter', format: 'docx' });
        } catch (error) {
            console.error("Cover letter DOCX download failed:", error);
            analytics.trackError(`Cover letter DOCX download failed: ${error.message}`);
            alert("Sorry, we couldn't download the cover letter as DOCX. Please try again.");
        } finally {
            setIsDownloadingCoverDocx(false);
        }
    };

    if (!localResults) {
        return <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-primary)' }}>No results found.</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', transition: 'all 0.3s ease', color: 'var(--text-primary)' }}>
            {!isChatOpen && <ThemeToggle className="mobile-only" />}

            {/* Header */}
            <div style={{
                height: 'var(--header-height, 90px)', background: 'var(--surface)', borderBottom: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--header-padding, 0 100px 0 40px)',
                position: 'sticky', top: 0, zIndex: 100
            }} className="results-header-container">
                <style>{`
                    @media (max-width: 768px) {
                        :root {
                            --header-height: auto;
                            --header-padding: 16px;
                        }
                        .results-header-container { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
                        .results-header-actions { display: flex !important; width: 100%; justify-content: flex-start; overflow-x: auto; padding-bottom: 8px; gap: 8px !important; }
                        .results-header-actions .btn { white-space: nowrap !important; flex-shrink: 0 !important; }
                        .score-container { flex-direction: column !important; gap: 30px !important; text-align: center !important; }
                        .paper-container { padding: 40px 20px !important; font-size: 14px !important; }
                        .tab-container { padding: 0 20px !important; overflow-x: auto !important; }
                        .tab-list { gap: 20px !important; }
                    }
                `}</style>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => navigate('/builder', { state: { formData } })} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '20px' }}>Application Package</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tailored for {jobData?.job_title || 'Target Role'}</div>
                        </div>
                    </div>
                    {currentUser && (
                        <button onClick={logout} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', padding: '8px', display: 'none', alignItems: 'center', gap: '4px', cursor: 'pointer' }} className="mobile-only">
                            <LogOut size={16} /> Sign Out
                        </button>
                    )}
                </div>
                <div className="results-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        title="Tracker"
                        onClick={() => navigate('/tracker')}
                        style={{ height: '36px', padding: '0 12px', borderRadius: '10px', background: 'var(--background)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                    >
                        <LayoutDashboard size={15} /> Tracker
                    </button>
                    <button
                        title="New Job"
                        onClick={() => navigate('/', { state: { formData } })}
                        style={{ height: '36px', padding: '0 12px', borderRadius: '10px', background: 'var(--background)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                    >
                        <RotateCcw size={14} /> New Job
                    </button>
                    <button
                        title="Edit Profile"
                        onClick={() => navigate('/builder', { state: { formData } })}
                        style={{ height: '36px', padding: '0 12px', borderRadius: '10px', background: 'var(--background)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                    >
                        <Edit3 size={14} /> Edit Profile
                    </button>
                    <Button
                        variant="secondary"
                        style={{ height: '36px', borderRadius: '10px', fontSize: '13px', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap', padding: '0 14px' }}
                        onClick={() => setIsWtpOpen(true)}
                    >
                        🎤 Interview Prep
                    </Button>
                    <Button
                        variant={isChatOpen ? "secondary" : "primary"}
                        style={{ height: '36px', borderRadius: '10px', fontSize: '13px', gap: '6px', border: isChatOpen ? '2px solid var(--primary)' : 'none', padding: '0 14px', whiteSpace: 'nowrap' }}
                        onClick={() => setIsChatOpen(!isChatOpen)}
                    >
                        <Sparkles size={15} /> {isChatOpen ? 'Close AI' : 'Refine with AI'}
                    </Button>
                    <ThemeToggle inline={true} className="desktop-only" style={{ background: 'none', border: 'none', boxShadow: 'none', width: '34px', height: '34px' }} />
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-container no-scrollbar" style={{
                background: 'var(--surface)', padding: '0 40px', borderBottom: '1px solid var(--border-light)'
            }}>
                <div className="tab-list" style={{ display: 'flex', gap: '40px' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            style={{
                                padding: '20px 0',
                                borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-tertiary)',
                                fontWeight: 700,
                                fontSize: '15px',
                                background: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Container */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <div> {/* Start of main content */}

                {activeTab === 'fit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

                        {/* Hero Score Card */}
                        {verdict && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.05) 100%)',
                                border: '1px solid rgba(var(--primary-rgb), 0.2)',
                                borderRadius: '20px',
                                padding: '32px',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px -10px rgba(var(--primary-rgb), 0.15)',
                                animation: 'fadeIn 0.5s ease-out'
                            }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>
                                    AI Verdict
                                </div>
                                <h2 style={{ fontSize: '42px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.1 }}>
                                    {verdict.label}
                                </h2>
                                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                                    {verdict.message}
                                </p>
                            </div>
                        )}

                        <Card style={{ padding: 'clamp(24px, 5vw, 60px)', borderRadius: '24px' }}>
                            <div className="score-container" style={{ display: 'flex', gap: '60px', alignItems: 'center' }}>
                                {/* Score Circle */}
                                <div style={{ position: 'relative', minWidth: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                    <svg width="180" height="180" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border-light)" strokeWidth="10" />
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--primary)" strokeWidth="10"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * (matchAnalysis?.overall_fit_score || 0) / 10)}
                                            strokeLinecap="round"
                                            transform="rotate(-90 80 80)"
                                        />
                                    </svg>
                                    <div style={{ position: 'absolute', textAlign: 'center' }}>
                                        <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                            {matchAnalysis?.overall_fit_score || '?'}
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px' }}>Fit Score</div>
                                    </div>
                                </div>

                                {/* Text content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '100px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <Sparkles size={14} /> AI Analysis Complete
                                    </div>
                                    <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '20px' }}>
                                        {matchAnalysis?.summary_title || `Fit analysis for ${jobData?.job_title}`}
                                    </h1>
                                    <p style={{ fontSize: 'clamp(15px, 4vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                                        {matchAnalysis?.summary_text || "Our engine has analyzed your profile against the role's requirements."}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* 3-Column Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                            {/* Strengths */}
                            <Card style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0, 208, 132, 0.1)', color: '#00D084', marginBottom: '24px' }}>
                                    ✓
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Key Strengths</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {matchAnalysis?.strengths?.map((s, i) => (
                                        <div key={i}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>{s.description || s}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.evidence}</div>
                                        </div>
                                    )) || <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No strengths identified.</div>}
                                </div>
                            </Card>

                            {/* Gaps */}
                            <Card style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 176, 32, 0.1)', color: '#FFB020', marginBottom: '24px' }}>
                                    !
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Gap Analysis</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {matchAnalysis?.gaps?.map((g, i) => (
                                        <div key={i}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>{g.description || g}</div>
                                            <div style={{ fontSize: '12px', color: '#FFB020', fontStyle: 'italic', fontWeight: 600 }}>{g.severity}</div>
                                        </div>
                                    )) || <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No critical gaps.</div>}
                                </div>
                            </Card>

                            {/* Differentiators */}
                            <Card style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', marginBottom: '24px' }}>
                                    ★
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Differentiators</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {matchAnalysis?.differentiators?.map((d, i) => (
                                        <div key={i}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>{d.description || d}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d.evidence}</div>
                                        </div>
                                    )) || <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No differentiators.</div>}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {(activeTab === 'resume' || activeTab === 'cover') && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                        {/* Resume Pro Tip Card - Featured */}
                        {activeTab === 'resume' && resumeProTip && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.05) 100%)',
                                border: '1px solid rgba(var(--primary-rgb), 0.2)',
                                borderRadius: '20px',
                                padding: '32px',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px -10px rgba(var(--primary-rgb), 0.15)',
                                animation: 'fadeIn 0.5s ease-out',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>
                                    AI Resume Pro Tip
                                </div>
                                <h2 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.1 }}>
                                    💡 The Receipts?
                                </h2>
                                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                                    {resumeProTip}
                                </p>
                            </div>
                        )}

                        <div style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <Button
                                variant="secondary"
                                onClick={activeTab === 'resume' ? handleDownloadResumeDocx : handleDownloadCoverLetterDocx}
                                disabled={activeTab === 'resume' ? isDownloadingResumeDocx : isDownloadingCoverDocx}
                                style={{
                                    height: '44px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    gap: '8px',
                                    paddingLeft: '20px',
                                    paddingRight: '20px'
                                }}
                            >
                                <Download size={16} />
                                {activeTab === 'resume'
                                    ? (isDownloadingResumeDocx ? 'Generating...' : 'Download DOCX')
                                    : (isDownloadingCoverDocx ? 'Generating...' : 'Download DOCX')
                                }
                            </Button>
                            <Button
                                variant="primary"
                                onClick={activeTab === 'resume' ? handleDownloadResume : handleDownloadCoverLetter}
                                disabled={activeTab === 'resume' ? isDownloadingResume : isDownloadingCover}
                                style={{
                                    height: '44px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    gap: '8px',
                                    paddingLeft: '20px',
                                    paddingRight: '20px'
                                }}
                            >
                                <Download size={16} />
                                {activeTab === 'resume'
                                    ? (isDownloadingResume ? 'Generating PDF...' : 'Download PDF')
                                    : (isDownloadingCover ? 'Generating PDF...' : 'Download PDF')
                                }
                            </Button>
                        </div>

                        {/* Document Container */}
                        <div className="paper-container" style={{
                            width: '100%',
                            maxWidth: '850px',
                            minHeight: '1100px',
                            padding: 'clamp(30px, 8vw, 60px) clamp(20px, 10vw, 80px)',
                            background: '#FFFFFF',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                            color: '#1A2E35',
                            lineHeight: '1.6',
                            borderRadius: '4px'
                        }}>
                            <style>{`
                                .paper-container h1 {
                                    text-align: center !important;
                                }
                                .paper-container h1 + p,
                                .paper-container h1 + p + p {
                                    text-align: center !important;
                                }
                                .paper-container p {
                                    text-align: justify;
                                }
                                .paper-container li {
                                    text-align: justify;
                                }
                            `}</style>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {activeTab === 'resume' ? localResults?.resume : localResults?.cover_letter}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {activeTab === 'linkedin' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <Card style={{ padding: 'clamp(24px, 5vw, 48px)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                                <div style={{ width: '40px', height: '40px', background: '#0077b5', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>in</div>
                                <h3 style={{ fontSize: '22px', fontWeight: 800 }}>LinkedIn Outreach</h3>
                            </div>
                            <div style={{ background: 'rgba(var(--primary-rgb), 0.03)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {localResults?.linkedin_message || "Message content missing"}
                                </ReactMarkdown>
                                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                                    <Button variant="ghost" style={{ fontSize: '13px' }} onClick={() => { navigator.clipboard.writeText(localResults?.linkedin_message); alert("Copied to clipboard!"); }}>
                                        Copy Message
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'skillup' && (
                    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
                        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                            <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Level Up Your Game 🚀</h2>
                            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                                We found some gaps. No sweat though—here's how you can fill them and become the ultimate candidate.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '24px' }}>
                            {recommendations?.map((rec, i) => (
                                <Card key={i} style={{ padding: '32px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                                        <div style={{ flex: 1, minWidth: '300px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                                                    <GraduationCap size={20} />
                                                </div>
                                                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{rec.title}</h3>
                                            </div>
                                            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0' }}>
                                                {rec.reason}
                                            </p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            style={{ gap: '8px', padding: '12px 24px', borderRadius: '12px' }}
                                            onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.youtube_query)}`, '_blank')}
                                        >
                                            Watch Overview <ExternalLink size={16} />
                                        </Button>
                                    </div>
                                </Card>
                            )) || (
                                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                                        <Sparkles size={48} style={{ marginBottom: '24px', opacity: 0.5 }} />
                                        <p>Your profile is already looking pretty cracked! No major skill gaps found for this one.</p>
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                </div> {/* End of main content col */}
                
                {/* Chat Copilot Popup */}
                <div style={{
                    position: 'fixed',
                    bottom: '16px',
                    right: '16px',
                    width: 'clamp(280px, 100vw - 32px, 380px)',
                    height: '600px',
                    maxHeight: 'calc(100vh - 100px)',
                    background: 'var(--surface)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: isChatOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                    opacity: isChatOpen ? 1 : 0,
                    pointerEvents: isChatOpen ? 'auto' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
                        <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Sparkles size={16} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, flex: 1 }}>GenZ Copilot</h3>
                        <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                    
                    <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                        {chatHistory.map((msg) => (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    background: msg.role === 'user' ? 'var(--primary)' : 'rgba(var(--primary-rgb), 0.1)',
                                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                                    maxWidth: '90%',
                                    fontSize: '14px',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word'
                                }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
                                </div>
                                {msg.role === 'assistant' && msg.snapshot_results && (
                                    <button 
                                        onClick={() => handleRestoreSnapshot(msg)}
                                        style={{
                                            marginTop: '6px', fontSize: '12px', background: 'none', border: 'none', 
                                            color: 'var(--text-tertiary)', cursor: 'pointer', fontWeight: 600, padding: 0
                                        }}>
                                        ⮌ Restore version
                                    </button>
                                )}
                            </div>
                        ))}
                        {isChatLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '16px', maxWidth: '80px' }}>
                                <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></div>
                                <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></div>
                                <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></div>
                                <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', position: 'sticky', bottom: 0, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--background)', padding: '8px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                placeholder="Make it slay..."
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '14px', padding: '0 8px', color: 'var(--text-primary)', width: '100%' }}
                                disabled={isChatLoading}
                            />
                            <Button variant="primary" style={{ padding: '8px', height: 'auto', borderRadius: '10px' }} onClick={handleRefine} disabled={isChatLoading || !chatInput.trim()}>
                                <Send size={16} />
                            </Button>
                        </div>
                    </div>
                </div>

                <AutoTrackModal
                    isOpen={showTrackModal}
                    onClose={() => setShowTrackModal(false)}
                    onConfirm={handleConfirmTrack}
                    jobTitle={jobData?.job_title}
                    company={jobData?.company}
                />

                {/* Feedback Section */}
                <div style={{
                    marginTop: '80px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    background: 'var(--surface)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        color: 'var(--primary)',
                        marginBottom: '24px'
                    }}>
                        <Send size={28} />
                    </div>
                    <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Help us improve RoleFit</h3>
                    <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>
                        We're in beta! Your feedback on timing, accuracy, and value helps us build a better tool for everyone.
                    </p>
                    <Button
                        variant="primary"
                        style={{ padding: '20px 40px', fontSize: '16px', borderRadius: '14px' }}
                        onClick={() => window.open('https://forms.gle/6V5d9vEh9BtLfAqq5', '_blank')}
                    >
                        Share Quick Feedback
                    </Button>
                </div>

                {/* WTP Smoke Test Modal */}
                {isWtpOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, backdropFilter: 'blur(8px)'
                    }}>
                        <Card style={{ width: '90%', maxWidth: '600px', padding: '40px', borderRadius: '24px', position: 'relative' }}>
                            <button 
                                onClick={() => setIsWtpOpen(false)}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                            >
                                ✕
                            </button>
                            
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', marginBottom: '16px' }}>
                                    <Sparkles size={28} />
                                </div>
                                <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Ace Your Next Interview 🎙️</h3>
                                <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                                    We're building an AI Interview Copilot to run hyper-realistic mock interviews tailored to your exact Resume and Target Role. Pick a pre-order plan below to get early access!
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginBottom: '16px' }}>
                                <div 
                                    style={{ display: 'flex', flexDirection: 'column', border: '2px solid var(--border-light)', borderRadius: '16px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--surface)' }}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                                    onClick={() => handleWtpClick('pay_per_role', '$7')}
                                >
                                    <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Pay-Per-Role</h4>
                                    <p style={{ flex: 1, fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>1 Complete Interview Masterclass</p>
                                    <div style={{ fontSize: '32px', fontWeight: 900, marginBottom: '4px' }}>$7</div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '24px', fontWeight: 600 }}>(₹99 IN)</div>
                                    <Button variant="primary" style={{ width: '100%', borderRadius: '10px', pointerEvents: 'none', padding: '10px' }}>I want this!</Button>
                                </div>
                                
                                <div 
                                    style={{ display: 'flex', flexDirection: 'column', border: '2px solid var(--primary)', borderRadius: '16px', padding: '24px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'rgba(var(--primary-rgb), 0.05)' }}
                                    onClick={() => handleWtpClick('unlimited_sprint', '$9')}
                                >
                                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>🔥 Most Popular</div>
                                    <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Weekly Sprint</h4>
                                    <p style={{ flex: 1, fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Unlimited prep for 7 Days</p>
                                    <div style={{ fontSize: '32px', fontWeight: 900, marginBottom: '4px', color: 'var(--primary)' }}>$9</div>
                                    <div style={{ fontSize: '14px', color: 'var(--primary)', marginBottom: '24px', fontWeight: 600, opacity: 0.8 }}>(₹299 IN)</div>
                                    <Button variant="primary" style={{ width: '100%', borderRadius: '10px', pointerEvents: 'none', padding: '10px' }}>I want this!</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
