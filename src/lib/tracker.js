import { db } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';

const JOBS_COLLECTION = 'jobs';

const userJobsQuery = (userId) => {
    if (!userId) throw new Error("User ID is required to fetch jobs.");
    return query(collection(db, JOBS_COLLECTION), where('userId', '==', userId));
};

// Both one-time reads and live updates expose the same ISO timestamp format.
const jobsFromSnapshot = (snapshot) => snapshot.docs.map(doc => {
    const data = doc.data({ serverTimestamps: 'estimate' });
    return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    };
}).sort((a, b) =>
    (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
);

/**
 * Sanitizes an object for Firestore by removing undefined values.
 * Firestore throws errors if any field is undefined.
 * This version preserves special objects like Firestore FieldValues (sentinels).
 */
const sanitizeForFirestore = (data) => {
    // Basic types
    if (data === null || typeof data !== 'object') return data;

    // Dates are fine
    if (data instanceof Date) return data;

    // Arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeForFirestore(item));
    }

    // Special Firestore objects (sentinels) usually have a specific structure or constructor
    // We check if it's a plain object. If it's NOT a plain object (like serverTimestamp), we return as is.
    const isPlainObject = (obj) => {
        return Object.prototype.toString.call(obj) === '[object Object]' &&
            (obj.constructor === Object || obj.constructor === undefined);
    };

    if (!isPlainObject(data)) return data;

    // Plain objects: recurse and remove undefined
    const cleaned = {};
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== undefined) {
            cleaned[key] = sanitizeForFirestore(value);
        }
    });
    return cleaned;
};

export const tracker = {
    /**
     * Adds a new job to the tracker.
     * @param {string} userId - The current user's UID.
     * @param {Object} jobData - Structured job data (title, company, etc.).
     * @param {string} status - Initial status (default: 'Saved').
     */
    async addJob(userId, jobData, status = 'Saved') {
        if (!userId) throw new Error("User ID is required to add a job.");

        const jobEntry = {
            userId,
            title: jobData.job_title || jobData.title || 'Unknown Position',
            company: jobData.company || 'Unknown Company',
            location: jobData.location || '',
            status, // 'Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'
            url: jobData.url || '',
            notes: jobData.notes || '',
            appliedDate: jobData.appliedDate || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Store raw data if it came from automatic generation
            source: jobData.source || (jobData.job_title ? 'Generated' : 'Manual'),
            // Optionally store the analysis if relevant
            matchAnalysis: jobData.matchAnalysis || null,
            // Store the tailored results (resume, cover letter, etc.)
            package: jobData.package || null
        };

        const sanitizedEntry = sanitizeForFirestore(jobEntry);
        console.log("Firestore Path:", collection(db, JOBS_COLLECTION).path);
        console.log("Saving sanitized job entry:", sanitizedEntry);

        try {
            const docRef = await addDoc(collection(db, JOBS_COLLECTION), sanitizedEntry);
            console.log("Firestore Success: Document created with ID", docRef.id);

            return {
                id: docRef.id,
                ...sanitizedEntry,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error("Firestore Error in addJob:", error);
            // Create a more descriptive error for the UI
            const detailedError = new Error(`Firestore Error: ${error.message || 'Unknown error'} (${error.code || 'no-code'})`);
            detailedError.originalError = error;
            throw detailedError;
        }
    },

    /**
     * Fetches all jobs for a specific user.
     * @param {string} userId - The current user's UID.
     */
    async getJobs(userId) {
        return jobsFromSnapshot(await getDocs(userJobsQuery(userId)));
    },

    /** Subscribe to this user's jobs, including the initial snapshot. Returns unsubscribe. */
    subscribeJobs(userId, onJobs, onError) {
        return onSnapshot(userJobsQuery(userId), snapshot => {
            onJobs(jobsFromSnapshot(snapshot));
        }, onError);
    },

    /**
     * Updates a job's status or other fields.
     * @param {string} jobId - The ID of the job document.
     * @param {Object} updates - The fields to update.
     */
    async updateJob(jobId, updates) {
        if (!jobId) throw new Error("Job ID is required to update a job.");

        const jobRef = doc(db, JOBS_COLLECTION, jobId);
        const sanitizedUpdates = sanitizeForFirestore(updates);
        await updateDoc(jobRef, {
            ...sanitizedUpdates,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Deletes a job from the tracker.
     * @param {string} jobId - The ID of the job document.
     */
    async deleteJob(jobId) {
        if (!jobId) throw new Error("Job ID is required to delete a job.");

        const jobRef = doc(db, JOBS_COLLECTION, jobId);
        await deleteDoc(jobRef);
    }
};
