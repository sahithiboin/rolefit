import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Plus, Search, Trash2,
    ExternalLink, Calendar, MapPin, ArrowLeft,
    Loader2, MoreHorizontal, CheckCircle2,
    Clock, Send, UserCheck, Trophy, XCircle
} from 'lucide-react';
import { tracker } from '../lib/tracker';
import { useAuth } from '../components/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import AddJobModal from '../components/AddJobModal';
import ThemeToggle from '../components/ThemeToggle';
import { analytics } from '../lib/analytics';

const COLUMNS = [
    { id: 'Saved', label: 'Saved', icon: <Clock size={16} />, color: '#9CA3AF' },
    { id: 'Applied', label: 'Applied', icon: <Send size={16} />, color: '#96B6C5' },
    { id: 'Interviewing', label: 'Interviewing', icon: <UserCheck size={16} />, color: '#FFB020' },
    { id: 'Offer', label: 'Offer', icon: <Trophy size={16} />, color: '#00D084' },
    { id: 'Rejected', label: 'Rejected', icon: <XCircle size={16} />, color: '#FF3B30' },
];

export default function Tracker() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleting, setIsDeleting] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [syncError, setSyncError] = useState('');
    const [syncAttempt, setSyncAttempt] = useState(0);
    const userId = currentUser?.uid;

    useEffect(() => {
        setJobs([]);
        setLoading(true);
        setSyncError('');
        if (!userId) {
            navigate('/');
            return;
        }

        let active = true;
        const unsubscribe = tracker.subscribeJobs(userId,
            data => {
                if (!active) return;
                setJobs(data);
                setSyncError('');
                setLoading(false);
            },
            error => {
                if (!active) return;
                console.error("Error syncing jobs:", error);
                setSyncError('Unable to sync your jobs. Please try again.');
                setLoading(false);
            }
        );
        return () => {
            active = false;
            unsubscribe();
        };
    }, [userId, navigate, syncAttempt]);

    const handleStatusUpdate = async (jobId, newStatus) => {
        try {
            await tracker.updateJob(jobId, { status: newStatus });
            analytics.trackEvent('tracker_status_change', {
                job_id: jobId,
                new_status: newStatus
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleAddJob = async (jobData) => {
        try {
            await tracker.addJob(currentUser.uid, jobData, jobData.status);
            analytics.trackEvent('tracker_add_job', {
                status: jobData.status,
                source: jobData.source || 'Manual'
            });
        } catch (error) {
            console.error("Error adding job:", error);
            throw error; // Re-throw to be handled by modal's try-catch
        }
    };

    const handleDeleteJob = async (jobId) => {
        setIsDeleting(jobId);
        try {
            await tracker.deleteJob(jobId);
            analytics.trackEvent('tracker_delete_job');
        } catch (error) {
            console.error("Error deleting job:", error);
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredJobs = jobs.filter(job =>
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '40px 20px' }}>

            <header style={{ maxWidth: '1400px', margin: '0 auto 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                    <button
                        onClick={() => navigate('/builder')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        <ArrowLeft size={16} /> Back to Builder
                    </button>
                    <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LayoutDashboard size={32} style={{ color: 'var(--primary)' }} />
                        Job Tracker
                    </h1>
                    <details style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <summary>Signed in as {currentUser?.email || currentUser?.displayName || 'RoleFit user'}</summary>
                        <div style={{ marginTop: '4px', overflowWrap: 'anywhere' }}>User ID: {userId}</div>
                    </details>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                height: '48px',
                                padding: '0 16px 0 42px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-light)',
                                background: 'var(--surface)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                width: '240px'
                            }}
                        />
                    </div>
                    <Button variant="primary" style={{ gap: '8px', height: '48px' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Add Job
                    </Button>
                    <Button variant="secondary" onClick={() => setSyncAttempt(attempt => attempt + 1)}>
                        Refresh
                    </Button>
                    <ThemeToggle inline={true} />
                </div>
            </header>

            {syncError && (
                <div role="alert" style={{ maxWidth: '1400px', margin: '0 auto 24px', color: 'var(--text-primary)' }}>
                    {syncError}{' '}
                    <Button onClick={() => setSyncAttempt(attempt => attempt + 1)}>Retry</Button>
                </div>
            )}

            <AddJobModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddJob}
            />

            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                alignItems: 'start'
            }}>
                {COLUMNS.map(column => (
                    <div key={column.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 8px',
                            marginBottom: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: `${column.color}20`,
                                    color: column.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {column.icon}
                                </span>
                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{column.label}</h3>
                                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                    {filteredJobs.filter(j => j.status === column.id).length}
                                </span>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(var(--primary-rgb), 0.03)',
                            borderRadius: '20px',
                            padding: '12px',
                            minHeight: '200px',
                            border: '1px dashed var(--border-light)'
                        }}>
                            <AnimatePresence mode="popLayout">
                                {filteredJobs
                                    .filter(job => job.status === column.id)
                                    .map(job => (
                                        <motion.div
                                            key={job.id}
                                            layout
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                            style={{ marginBottom: '12px' }}
                                        >
                                            <Card style={{
                                                padding: '16px',
                                                cursor: 'pointer',
                                                border: '1px solid var(--border-light)',
                                                background: 'var(--surface)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        color: 'var(--primary)',
                                                        background: 'rgba(var(--primary-rgb), 0.1)',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        {job.source || 'Manual'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {job.package && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate('/results', {
                                                                        state: {
                                                                            results: job.package,
                                                                            matchAnalysis: job.matchAnalysis,
                                                                            jobData: { job_title: job.title, company: job.company },
                                                                            verdict: job.matchAnalysis?.verdict, // If stored
                                                                            fromTracker: true
                                                                        }
                                                                    });
                                                                }}
                                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '12px', gap: '4px' }}
                                                                title="View Results"
                                                            >
                                                                <ExternalLink size={14} /> View
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                                            title="Delete"
                                                        >
                                                            {isDeleting === job.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>{job.title}</h4>
                                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '12px' }}>{job.company}</p>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {job.location && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            <MapPin size={12} /> {job.location}
                                                        </div>
                                                    )}
                                                    {job.appliedDate && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            <Calendar size={12} /> Applied: {new Date(job.appliedDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <select
                                                        value={job.status}
                                                        onChange={(e) => handleStatusUpdate(job.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            padding: '4px'
                                                        }}
                                                    >
                                                        {COLUMNS.map(col => (
                                                            <option key={col.id} value={col.id}>{col.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                            </AnimatePresence>
                            {filteredJobs.filter(j => j.status === column.id).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                    No jobs here
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
