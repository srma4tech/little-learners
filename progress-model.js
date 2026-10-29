(function (root) {
  'use strict';

  const number = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const generation = kid => Math.floor(number(kid && kid.resetGeneration));
  const sum = counters => Object.values(counters || {}).reduce((total, value) => total + number(value), 0);
  const id = () => {
    try {
      if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    } catch (_) {}
    return 'reset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  };

  function normalizeKid(kid, deviceId = 'device-local') {
    const source = kid && typeof kid === 'object' ? kid : {};
    const counters = {};
    if (source.starCounters && typeof source.starCounters === 'object' && !Array.isArray(source.starCounters)) {
      for (const [key, value] of Object.entries(source.starCounters)) counters[key] = number(value);
    }
    const resetGeneration = generation(source);
    const legacyStars = number(source.stars);
    if (resetGeneration === 0) {
      if (sum(counters) === 0 && legacyStars > 0) counters[deviceId] = legacyStars;
      else if (legacyStars > sum(counters)) counters[deviceId] = number(counters[deviceId]) + legacyStars - sum(counters);
    }
    const result = { ...source, resetGeneration, starCounters: counters, stars: sum(counters) };
    if (typeof result.name !== 'string' || !result.name.trim()) result.name = 'Me';
    return result;
  }

  function mergeStage(local, remote) {
    if (local.stageId && remote.stageId) {
      const localAt = number(local.stageUpdatedAt);
      const remoteAt = number(remote.stageUpdatedAt);
      if (remoteAt > localAt) return { stageId: remote.stageId, stageUpdatedAt: remoteAt };
      return { stageId: local.stageId, stageUpdatedAt: localAt || remoteAt || 0 };
    }
    if (local.stageId) return { stageId: local.stageId, stageUpdatedAt: number(local.stageUpdatedAt) };
    if (remote.stageId) return { stageId: remote.stageId, stageUpdatedAt: number(remote.stageUpdatedAt) };
    return {};
  }

  function mergeKid(localKid, remoteKid, deviceId = 'device-local') {
    const local = localKid ? normalizeKid(localKid, deviceId) : null;
    const remote = remoteKid ? normalizeKid(remoteKid, deviceId) : null;
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;

    // A matching remote reset ID acknowledges this device's pending reset.
    if (local.pendingResetId && remote.resetId === local.pendingResetId) {
      const counters = { ...remote.starCounters };
      for (const [key, value] of Object.entries(local.starCounters)) counters[key] = Math.max(number(counters[key]), number(value));
      const acknowledged = {
        ...remote,
        name: remote.name && remote.name !== 'Me' ? remote.name : local.name,
        resetGeneration: remote.resetGeneration,
        starCounters: counters,
        stars: sum(counters)
      };
      delete acknowledged.pendingResetId;
      return acknowledged;
    }

    // An unacknowledged local reset is an intent, not ordinary progress to merge.
    if (local.pendingResetId) {
      return {
        ...local,
        name: remote.name && remote.name !== 'Me' ? remote.name : local.name
      };
    }

    if (local.resetGeneration > remote.resetGeneration) return local;
    if (remote.resetGeneration > local.resetGeneration) return remote;

    const counters = { ...remote.starCounters };
    for (const [key, value] of Object.entries(local.starCounters)) counters[key] = Math.max(number(counters[key]), number(value));
    const merged = {
      ...remote,
      name: remote.name && remote.name !== 'Me' ? remote.name : local.name,
      resetGeneration: remote.resetGeneration,
      resetId: remote.resetId || local.resetId || null,
      starCounters: counters,
      stars: sum(counters)
    };
    if (local.pendingResetId) merged.pendingResetId = local.pendingResetId;
    return merged;
  }

  function mergeKids(localKids, remoteKids, deviceId = 'device-local') {
    const local = localKids && typeof localKids === 'object' ? localKids : {};
    const remote = remoteKids && typeof remoteKids === 'object' ? remoteKids : {};
    const merged = {};
    for (const childId of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const kid = mergeKid(local[childId], remote[childId], deviceId);
      if (kid) merged[childId] = kid;
    }
    return merged;
  }

  function resetKid(kid) {
    const normalized = normalizeKid(kid);
    return {
      ...normalized,
      stars: 0,
      starCounters: {},
      resetGeneration: normalized.resetGeneration + 1,
      pendingResetId: id(),
      progressResetAt: Date.now()
    };
  }

  // Called only inside a Firestore transaction. A pending reset is applied against
  // the latest cloud generation, so concurrent/stale profile writes cannot undo it.
  function mergeProfile(incomingProfile, remoteProfile, deviceId = 'device-local') {
    const incoming = incomingProfile && typeof incomingProfile === 'object' ? incomingProfile : {};
    const remote = remoteProfile && typeof remoteProfile === 'object' ? remoteProfile : {};
    const incomingKids = incoming.kids && typeof incoming.kids === 'object' ? incoming.kids : {};
    const remoteKids = remote.kids && typeof remote.kids === 'object' ? remote.kids : {};
    const kids = {};
    for (const childId of new Set([...Object.keys(incomingKids), ...Object.keys(remoteKids)])) {
      const localKid = incomingKids[childId];
      const cloudKid = remoteKids[childId];
      if (localKid && localKid.pendingResetId && localKid.pendingResetId !== (cloudKid && cloudKid.resetId)) {
        const local = normalizeKid(localKid, deviceId);
        const counters = { ...local.starCounters };
        const applied = {
          ...local,
          resetGeneration: Math.max(local.resetGeneration, generation(cloudKid)) + 1,
          resetId: local.pendingResetId,
          starCounters: counters,
          stars: sum(counters)
        };
        delete applied.pendingResetId;
        kids[childId] = applied;
      } else {
        const merged = mergeKid(localKid, cloudKid, deviceId);
        if (merged) kids[childId] = merged;
      }
    }
    return {
      ...remote,
      ...incoming,
      kids,
      settings: incoming.settings && typeof incoming.settings === 'object' ? incoming.settings : (remote.settings || { lang: 'both', sound: 1 }),
      schemaVersion: 2,
      createdAt: typeof remote.createdAt === 'number' ? remote.createdAt : (typeof incoming.createdAt === 'number' ? incoming.createdAt : Date.now()),
      updatedAt: Date.now()
    };
  }

  root.LLProgress = { normalizeKid, mergeKid, mergeKids, resetKid, mergeProfile };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LLProgress;
})(typeof window !== 'undefined' ? window : globalThis);
