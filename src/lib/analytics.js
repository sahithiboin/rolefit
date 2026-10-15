/**
 * Analytics utility for RoleFit
 * Wraps Google Analytics 4 (gtag) and Microsoft Clarity
 */

const GA_MEASUREMENT_ID = 'G-2R5RCXLXN6';

export const analytics = {
    /**
     * Initialize analytics (mostly for debugging/logging in dev)
     */
    init() {
        if (import.meta.env.DEV) {
            console.log('[Analytics] Initialized with ID:', GA_MEASUREMENT_ID);
        }
    },

    /**
     * Associate a unique user ID with the session
     * @param {string} userId - Firebase UID
     */
    setUserId(userId) {
        if (!userId) return;

        // GA4 User ID
        if (window.gtag) {
            window.gtag('config', GA_MEASUREMENT_ID, {
                'user_id': userId
            });
        }

        // Microsoft Clarity User ID
        if (window.clarity) {
            window.clarity('identify', userId);
        }

        if (import.meta.env.DEV) {
            console.log('[Analytics] User ID set:', userId);
        }
    },

    /**
     * Track a custom event
     * @param {string} eventName - Name of the event
     * @param {Object} params - Additional qualitative/quantitative data
     */
    trackEvent(eventName, params = {}) {
        // GA4 Event
        if (window.gtag) {
            window.gtag('event', eventName, params);
        }

        // Microsoft Clarity Custom Event
        if (window.clarity) {
            // Clarity uses 'set' for custom properties or we can just hope it picks up gtag hits
            // but we can explicitly set properties if needed
            Object.entries(params).forEach(([key, value]) => {
                window.clarity('set', key, String(value));
            });
            window.clarity('event', eventName);
        }

        if (import.meta.env.DEV) {
            console.log(`[Analytics] Event: ${eventName}`, params);
        }
    },

    /**
     * Track errors for quality monitoring
     * @param {string} message - Error description
     * @param {Object} fatal - Whether it's a fatal crash
     */
    trackError(message, fatal = false) {
        if (window.gtag) {
            window.gtag('event', 'exception', {
                'description': message,
                'fatal': fatal
            });
        }
        
        if (import.meta.env.DEV) {
            console.error(`[Analytics] Error tracked: ${message}`);
        }
    },

    // Timer utility for Time to Value (TTV)
    timers: {},
    startTimer(timerName) {
        this.timers[timerName] = performance.now();
    },
    getDuration(timerName) {
        if (!this.timers[timerName]) return null;
        const duration = (performance.now() - this.timers[timerName]) / 1000;
        delete this.timers[timerName];
        return Math.round(duration);
    }
};
