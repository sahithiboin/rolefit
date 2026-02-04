import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, transformProfileForBackend } from '../lib/api';
import { ArrowLeft, Sparkles, Edit3, RotateCcw, Send, Download, GraduationCap, ExternalLink, Lightbulb } from 'lucide-react';
import { downloadResumePDF, downloadCoverLetterPDF } from '../lib/pdfGenerator';
import { downloadResumeDOCX, downloadCoverLetterDOCX } from '../lib/docxGenerator';
import ThemeToggle from '../components/ThemeToggle';

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

    const [localResults, setLocalResults] = useState(location.state?.results || null);
    const [isRefining, setIsRefining] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [isRefineLoading, setIsRefineLoading] = useState(false);
    const [isDownloadingResume, setIsDownloadingResume] = useState(false);
    const [isDownloadingCover, setIsDownloadingCover] = useState(false);
    const [isDownloadingResumeDocx, setIsDownloadingResumeDocx] = useState(false);
    const [isDownloadingCoverDocx, setIsDownloadingCoverDocx] = useState(false);

    const { matchAnalysis, jobData, formData, verdict, recommendations, resumeProTip } = location.state || {};

    useEffect(() => {
        if (!location.state) {
            navigate('/builder');
        }
    }, [navigate, location.state]);

    const handleRefine = async () => {
        if (!refinePrompt.trim()) return;

        setIsRefineLoading(true);
        try {
            const userProfile = transformProfileForBackend(formData);
            const response = await api.refinePackage({
                user_profile: userProfile,
                job_data: jobData,
                match_analysis: matchAnalysis,
                original_results: localResults,
                refinement_prompt: refinePrompt
            });

            setLocalResults(prev => ({
                ...prev,
                ...response
            }));
            setIsRefining(false);
            setRefinePrompt('');
        } catch (error) {
            console.error("Refinement failed:", error);
            alert("Sorry, we couldn't refine your results. Please try again.");
        } finally {
            setIsRefineLoading(false);
        }
    };

    const handleDownloadResume = async () => {
        setIsDownloadingResume(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
            downloadResumePDF(localResults?.resume || '', jobData?.job_title || '');
        } catch (error) {
            console.error("Resume download failed:", error);
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
        } catch (error) {
            console.error("Cover letter download failed:", error);
            alert("Sorry, we couldn't download the cover letter. Please try again.");
        } finally {
            setIsDownloadingCover(false);
        }
    };

    const handleDownloadResumeDocx = async () => {
        setIsDownloadingResumeDocx(true);
        try {
            await downloadResumeDOCX(localResults?.resume || '', jobData?.job_title || '');
        } catch (error) {
            console.error("Resume DOCX download failed:", error);
            alert("Sorry, we couldn't download the resume as DOCX. Please try again.");
        } finally {
            setIsDownloadingResumeDocx(false);
        }
    };

    const handleDownloadCoverLetterDocx = async () => {
        setIsDownloadingCoverDocx(true);
        try {
            await downloadCoverLetterDOCX(localResults?.cover_letter || '', jobData?.job_title || '');
        } catch (error) {
            console.error("Cover letter DOCX download failed:", error);
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
            {!isRefining && <ThemeToggle />}

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/builder', { state: { formData } })} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '20px' }}>Application Package</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tailored for {jobData?.job_title || 'Target Role'}</div>
                    </div>
                </div>
                <div className="results-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Button
                        variant="secondary"
                        style={{ height: '44px', borderRadius: '12px', fontSize: '14px' }}
                        onClick={() => navigate('/', { state: { formData } })}
                    >
                        <RotateCcw size={16} style={{ marginRight: '8px' }} /> New Job
                    </Button>
                    <Button
                        variant="secondary"
                        style={{ height: '44px', borderRadius: '12px', fontSize: '14px' }}
                        onClick={() => navigate('/builder', { state: { formData } })}
                    >
                        <Edit3 size={16} style={{ marginRight: '8px' }} /> Edit Profile
                    </Button>
                    <Button
                        variant="primary"
                        style={{ height: '44px', borderRadius: '12px', fontSize: '14px', gap: '8px' }}
                        onClick={() => setIsRefining(true)}
                    >
                        <Sparkles size={16} /> Refine with AI
                    </Button>
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
                            onClick={() => setActiveTab(tab.id)}
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

                {/* Refinement Modal */}
                {isRefining && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, backdropFilter: 'blur(8px)'
                    }}>
                        <Card style={{ width: '90%', maxWidth: '550px', padding: '40px', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Sparkles size={20} />
                                </div>
                                <h3 style={{ fontSize: '24px', fontWeight: 800 }}>Refine with AI</h3>
                            </div>
                            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
                                Describe how you'd like to adjust the results. For example: "Make it more professional" or "Highlight my React skills more".
                            </p>

                            <textarea
                                value={refinePrompt}
                                onChange={(e) => setRefinePrompt(e.target.value)}
                                placeholder="Type your adjustment instructions..."
                                style={{
                                    width: '100%', height: '140px', padding: '20px', borderRadius: '16px',
                                    border: '2px solid var(--border-light)', fontSize: '15px', resize: 'none',
                                    background: 'var(--background)', color: 'var(--text-primary)',
                                    marginBottom: '32px', outline: 'none', transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                            />

                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                                <Button variant="ghost" onClick={() => setIsRefining(false)} disabled={isRefineLoading}>Cancel</Button>
                                <Button
                                    variant="primary"
                                    onClick={handleRefine}
                                    disabled={isRefineLoading || !refinePrompt.trim()}
                                    style={{ padding: '0 32px' }}
                                >
                                    {isRefineLoading ? 'Generating...' : <><Send size={18} style={{ marginRight: '10px' }} /> Update Package</>}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

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

            </div>
        </div>
    );
}
