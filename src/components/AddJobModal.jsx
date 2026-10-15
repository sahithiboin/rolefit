import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Building, Globe, Calendar, FileText, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input, Textarea } from './Input';

export default function AddJobModal({ isOpen, onClose, onAdd }) {
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        url: '',
        status: 'Saved',
        appliedDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.company) {
            alert("Job Title and Company are required!");
            return;
        }

        setIsSubmitting(true);
        try {
            await onAdd(formData);
            setFormData({ title: '', company: '', url: '', status: 'Saved', appliedDate: new Date().toISOString().split('T')[0], notes: '' });
            onClose();
        } catch (error) {
            console.error("Error adding job:", error);
            alert(`Failed to add job: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-parse company name from URL if possible
    const handleUrlBlur = () => {
        if (formData.url && !formData.company) {
            try {
                const url = new URL(formData.url);
                let hostname = url.hostname.replace('www.', '');
                const parts = hostname.split('.');
                if (parts.length >= 2) {
                    const company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                    setFormData(prev => ({ ...prev, company }));
                }
            } catch (e) {
                // Invalid URL, ignore
            }
        }
    };

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    style={{
                        background: 'var(--surface)',
                        width: '100%', maxWidth: '500px',
                        borderRadius: '24px', padding: '32px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        position: 'relative',
                        border: '1px solid var(--border-light)'
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <Briefcase size={24} />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Add New Job</h2>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Job URL (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <Globe size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <Input
                                    placeholder="https://linkedin.com/jobs/..."
                                    style={{ paddingLeft: '40px' }}
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    onBlur={handleUrlBlur}
                                />
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>We'll try to auto-fill company from the link.</p>
                        </div>

                        <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Company *</label>
                                <div style={{ position: 'relative' }}>
                                    <Building size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <Input
                                        placeholder="Company Name"
                                        style={{ paddingLeft: '40px' }}
                                        required
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Job Title *</label>
                                <Input
                                    placeholder="Full Stack Engineer"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Status</label>
                                <select
                                    style={{
                                        width: '100%', height: '56px', borderRadius: '14px', border: '2px solid var(--border-light)',
                                        padding: '0 16px', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, outline: 'none'
                                    }}
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Saved">Saved</option>
                                    <option value="Applied">Applied</option>
                                    <option value="Interviewing">Interviewing</option>
                                    <option value="Offer">Offer</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>Applied Date</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <Input
                                        type="date"
                                        style={{ paddingLeft: '40px' }}
                                        value={formData.appliedDate}
                                        onChange={e => setFormData({ ...formData, appliedDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Notes</label>
                            <Textarea
                                placeholder="Any specific details or personal thoughts..."
                                style={{ minHeight: '100px' }}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <Button
                            variant="primary"
                            type="submit"
                            style={{ width: '100%', height: '56px', marginTop: '12px' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Save Job to Tracker'}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
