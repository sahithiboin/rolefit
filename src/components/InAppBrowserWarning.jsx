import React, { useState, useEffect } from 'react';

const InAppBrowserWarning = () => {
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Common strings found in popular in-app browsers
        const rules = [
            'LinkedIn',
            'Instagram',
            'FBAV', // Facebook App
            'FBAN', // Facebook App
            'Twitter', // Twitter App
            'Line',
            'Snapchat',
            'WeChat',
            'Pinterest',
            'TikTok',
        ];
        
        const isMatch = rules.some(rule => new RegExp(rule, 'i').test(userAgent));
        
        if (isMatch) {
            setIsInAppBrowser(true);
        }
    }, []);

    if (!isInAppBrowser) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                background: '#fff',
                padding: '32px',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ margin: '0 0 16px 0', color: '#ff4d4f' }}>Action Required</h2>
                <p style={{ margin: '0 0 24px 0', lineHeight: '1.6', color: '#666' }}>
                    You are viewing this through an app's internal browser (like LinkedIn). <br/><br/>
                    Google Sign-In <b>will not work</b> here due to Google's security policies.
                </p>
                
                <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <strong>How to fix this:</strong><br/><br/>
                    Tap the menu icon (⋮ or ...) in the top or bottom corner of your screen, then select:<br/><br/>
                    <strong style={{ color: '#000' }}>"Open in Browser"</strong><br/>
                    or<br/>
                    <strong style={{ color: '#000' }}>"Open in Safari/Chrome"</strong>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '24px' }}>
                    <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>Alternatively, copy the link and paste it into your favorite browser:</p>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied! Now open Chrome or Safari and paste it.");
                        }}
                        style={{
                            background: '#000',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            width: '100%'
                        }}
                    >
                        Copy Link
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InAppBrowserWarning;
