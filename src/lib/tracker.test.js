import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Load the real tracker with only its Firebase transport mocked.
async function setup() {
    let onNext, onError, selectedQuery;
    let unsubscribed = false;
    let snapshot = { docs: [] };
    const transport = {
        collection: (_db, path) => path,
        where: (field, op, value) => ({ field, op, value }),
        query: (path, filter) => ({ path, filter }),
        getDocs: async q => { selectedQuery = q; return snapshot; },
        onSnapshot: (q, next, error) => {
            selectedQuery = q;
            onNext = next;
            onError = error;
            next(snapshot);
            return () => { unsubscribed = true; };
        },
        addDoc() {}, updateDoc() {}, deleteDoc() {}, doc() {}, serverTimestamp() {},
    };
    const context = vm.createContext({ console });
    const source = await readFile(new URL('./tracker.js', import.meta.url), 'utf8');
    const module = new vm.SourceTextModule(source, { context });
    await module.link(specifier => {
        const exports = specifier === './firebase' ? { db: {} } : transport;
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    return {
        tracker: module.namespace.tracker,
        setSnapshot: value => { snapshot = value; },
        emit: value => onNext(value),
        fail: error => onError(error),
        get query() { return selectedQuery; },
        get unsubscribed() { return unsubscribed; },
    };
}

const jobDoc = (id, updatedAt) => ({
    id,
    data: options => {
        assert.equal(options.serverTimestamps, 'estimate');
        return {
            userId: 'UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2', title: 'Engineer', company: 'Example', status: 'Saved',
            source: 'JobScout', appliedDate: null,
            matchAnalysis: { overall_fit_score: 9.5 },
            package: { resume: 'Resume', cover_letter: 'Letter', linkedin_message: 'Hi' },
            createdAt: updatedAt, updatedAt,
        };
    },
});

test('live snapshot delivers externally ingested jobs and deletions without refresh', async () => {
    const env = await setup();
    const updates = [];
    const unsubscribe = env.tracker.subscribeJobs('UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2', jobs => updates.push(jobs), assert.fail);
    assert.equal(updates[0].length, 0);
    assert.deepEqual(env.query, {
        path: 'jobs', filter: { field: 'userId', op: '==', value: 'UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2' },
    });
    env.emit({ docs: [jobDoc('scout-job', { toDate: () => new Date('2026-09-11T12:00:00Z') })] });
    assert.equal(updates[1][0].status, 'Saved');
    assert.equal(updates[1][0].source, 'JobScout');
    assert.equal(updates[1][0].updatedAt, '2026-09-11T12:00:00.000Z');
    assert.equal(updates[1][0].matchAnalysis.overall_fit_score, 9.5);
    assert.equal(updates[1][0].package.linkedin_message, 'Hi');
    env.emit({ docs: [] });
    assert.equal(updates[2].length, 0);
    unsubscribe();
    assert.equal(env.unsubscribed, true);
});

test('one-time and live reads normalize and sort timestamps identically', async () => {
    const env = await setup();
    env.setSnapshot({ docs: [
        jobDoc('missing', null),
        jobDoc('old', '2026-09-10T12:00:00.000Z'),
        jobDoc('new', { toDate: () => new Date('2026-09-11T12:00:00Z') }),
    ] });
    const jobs = await env.tracker.getJobs('UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2');
    assert.equal(jobs.map(job => job.id).join(','), 'new,old,missing');
    env.tracker.subscribeJobs('UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2', live => assert.deepEqual(live, jobs), assert.fail);
});

test('listener reports errors and rejects missing user IDs', async () => {
    const env = await setup();
    const failure = new Error('permission-denied');
    let observed;
    env.tracker.subscribeJobs('UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2', () => {}, error => { observed = error; });
    env.fail(failure);
    assert.equal(observed, failure);
    assert.throws(() => env.tracker.subscribeJobs('', () => {}, () => {}), /User ID/);
});
