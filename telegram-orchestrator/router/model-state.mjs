import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { EVAL_CASES } from "./eval-cases.mjs";

const ROLE_KEYS = ["chat", "router", "search", "memory"];
const STAGE_KEYS = ["classifier", "brief_draft", "discover_draft", "critic"];
const SHADOW_TARGET_REQUESTS = 100;
const SHADOW_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function computePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeTargetKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  if (normalized === "brief") return "brief_draft";
  if (normalized === "discover") return "discover_draft";
  return normalized;
}

function normalizeTargets(rawTargets, fallbackTargets = ROLE_KEYS) {
  const tokens = Array.isArray(rawTargets)
    ? rawTargets
        .flatMap((value) => String(value || "").split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  if (tokens.length === 0) {
    return [...fallbackTargets];
  }

  const resolved = [];

  for (const token of tokens) {
    const normalized = normalizeTargetKey(token);
    if (normalized === "all") {
      resolved.push(...ROLE_KEYS);
      continue;
    }
    if (ROLE_KEYS.includes(normalized) || STAGE_KEYS.includes(normalized)) {
      resolved.push(normalized);
      continue;
    }
    throw new Error(
      `Unknown activation target: ${token}. Valid targets: ${[...ROLE_KEYS, ...STAGE_KEYS, "all"].join(", ")}`,
    );
  }

  return unique(resolved);
}

function denormalizeTargetKey(value) {
  if (value === "brief_draft") return "brief-draft";
  if (value === "discover_draft") return "discover-draft";
  return value;
}

function summarizeRequestMetrics(rows) {
  if (!rows.length) {
    return {
      request_count: 0,
      latency_p50: 0,
      latency_p95: 0,
      remote_delegate_rate: 0,
      search_rate: 0,
      memory_store_rate: 0,
    };
  }

  const latencies = rows.map((row) => Number(row.latency_ms || 0)).filter((value) => value >= 0);
  const remoteCount = rows.filter((row) => row.route !== "local").length;
  const searchCount = rows.filter((row) => Number(row.need_search) === 1).length;
  const memoryCount = rows.filter((row) => Number(row.memory_should_store) === 1).length;

  return {
    request_count: rows.length,
    latency_p50: computePercentile(latencies, 50),
    latency_p95: computePercentile(latencies, 95),
    remote_delegate_rate: remoteCount / rows.length,
    search_rate: searchCount / rows.length,
    memory_store_rate: memoryCount / rows.length,
  };
}

export function createModelState({ rootDir, defaultModelName }) {
  const stateDir = path.join(rootDir, "state");
  fs.mkdirSync(stateDir, { recursive: true });
  const dbPath = path.join(stateDir, "orchestrator.sqlite");
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL UNIQUE,
      role_capabilities TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_eval_at TEXT,
      last_eval_passed INTEGER NOT NULL DEFAULT 0,
      last_eval_summary TEXT,
      notes TEXT,
      active_for_chat INTEGER NOT NULL DEFAULT 0,
      active_for_router INTEGER NOT NULL DEFAULT 0,
      active_for_search INTEGER NOT NULL DEFAULT 0,
      active_for_memory INTEGER NOT NULL DEFAULT 0,
      shadow_started_at TEXT,
      shadow_request_target INTEGER NOT NULL DEFAULT 100,
      shadow_request_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS runtime_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eval_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL,
      run_kind TEXT NOT NULL,
      baseline_model_id INTEGER,
      metrics_json TEXT NOT NULL,
      passed INTEGER NOT NULL,
      summary TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      FOREIGN KEY(model_id) REFERENCES models(id),
      FOREIGN KEY(baseline_model_id) REFERENCES models(id)
    );

    CREATE TABLE IF NOT EXISTS eval_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      input_text TEXT NOT NULL,
      expected_json TEXT NOT NULL,
      style_constraints TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shadow_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL,
      input_text TEXT NOT NULL,
      active_route TEXT NOT NULL,
      candidate_route TEXT NOT NULL,
      active_need_search INTEGER NOT NULL,
      candidate_need_search INTEGER NOT NULL,
      active_response_length INTEGER NOT NULL,
      candidate_response_length INTEGER NOT NULL,
      active_latency_ms INTEGER NOT NULL,
      candidate_latency_ms INTEGER NOT NULL,
      active_memory_store INTEGER NOT NULL,
      candidate_memory_store INTEGER NOT NULL,
      source_consistent INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(model_id) REFERENCES models(id)
    );

    CREATE TABLE IF NOT EXISTS request_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL,
      route TEXT NOT NULL,
      need_search INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      memory_should_store INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(model_id) REFERENCES models(id)
    );

    CREATE TABLE IF NOT EXISTS rollbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_model_id INTEGER,
      to_model_id INTEGER,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(from_model_id) REFERENCES models(id),
      FOREIGN KEY(to_model_id) REFERENCES models(id)
    );
  `);

  const insertEvalCase = db.prepare(`
    INSERT INTO eval_cases (name, kind, input_text, expected_json, style_constraints, active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(name) DO UPDATE SET
      kind = excluded.kind,
      input_text = excluded.input_text,
      expected_json = excluded.expected_json,
      style_constraints = excluded.style_constraints,
      active = 1
  `);

  for (const evalCase of EVAL_CASES) {
    insertEvalCase.run(
      evalCase.name,
      evalCase.kind,
      evalCase.input_text,
      JSON.stringify(evalCase.expected_json || {}),
      JSON.stringify(evalCase.style_constraints || {}),
    );
  }

  function getRuntimeValue(key, fallback = null) {
    const row = db.prepare(`SELECT value FROM runtime_state WHERE key = ?`).get(key);
    return row ? row.value : fallback;
  }

  function setRuntimeValue(key, value) {
    db.prepare(`
      INSERT INTO runtime_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, String(value), nowIso());
  }

  function getModelByName(modelName) {
    return db.prepare(`SELECT * FROM models WHERE model_name = ?`).get(modelName) || null;
  }

  function getModelById(modelId) {
    return db.prepare(`SELECT * FROM models WHERE id = ?`).get(modelId) || null;
  }

  function ensureModel(modelName, provider = "ollama", notes = "") {
    if (!modelName) {
      throw new Error("Model name is required");
    }

    let existing = getModelByName(modelName);
    if (existing) return existing;

    db.prepare(`
      INSERT INTO models (
        provider,
        model_name,
        role_capabilities,
        status,
        created_at,
        notes
      ) VALUES (?, ?, ?, 'registered', ?, ?)
    `).run(
      provider,
      modelName,
      JSON.stringify(["chat", "router", "search", "memory"]),
      nowIso(),
      notes,
    );

    return getModelByName(modelName);
  }

  function clearAllActiveFlags() {
    db.exec(`
      UPDATE models
      SET active_for_chat = 0,
          active_for_router = 0,
          active_for_search = 0,
          active_for_memory = 0
    `);
  }

  function clearRoleModel(role) {
    setRuntimeValue(`active_${role}_model_id`, "");
    db.prepare(`UPDATE models SET active_for_${role} = 0`).run();
  }

  function setRoleModel(role, modelId) {
    clearRoleModel(role);
    setRuntimeValue(`active_${role}_model_id`, modelId);
    db.prepare(`UPDATE models SET active_for_${role} = 1 WHERE id = ?`).run(modelId);
  }

  function getActiveRoleIds() {
    const result = {};
    for (const role of ROLE_KEYS) {
      const raw = getRuntimeValue(`active_${role}_model_id`);
      result[role] = raw ? Number(raw) : null;
    }
    return result;
  }

  function getActiveRoleModels() {
    const ids = getActiveRoleIds();
    const result = {};
    for (const role of ROLE_KEYS) {
      result[role] = ids[role] ? getModelById(ids[role]) : null;
    }
    return result;
  }

  function clearStageModel(stage) {
    setRuntimeValue(`active_stage_${stage}_model_id`, "");
  }

  function setStageModel(stage, modelId) {
    clearStageModel(stage);
    setRuntimeValue(`active_stage_${stage}_model_id`, modelId);
  }

  function getActiveStageIds() {
    const result = {};
    for (const stage of STAGE_KEYS) {
      const raw = getRuntimeValue(`active_stage_${stage}_model_id`);
      result[stage] = raw ? Number(raw) : null;
    }
    return result;
  }

  function getActiveStageModels() {
    const ids = getActiveStageIds();
    const result = {};
    for (const stage of STAGE_KEYS) {
      result[stage] = ids[stage] ? getModelById(ids[stage]) : null;
    }
    return result;
  }

  function captureActiveRoleSnapshot() {
    const ids = getActiveRoleIds();
    return {
      chat_model_id: ids.chat,
      router_model_id: ids.router,
      search_model_id: ids.search,
      memory_model_id: ids.memory,
      captured_at: nowIso(),
    };
  }

  function captureActiveStageSnapshot() {
    const ids = getActiveStageIds();
    return {
      classifier_model_id: ids.classifier,
      brief_draft_model_id: ids.brief_draft,
      discover_draft_model_id: ids.discover_draft,
      critic_model_id: ids.critic,
      captured_at: nowIso(),
    };
  }

  function captureActivationSnapshot() {
    return {
      role_model_ids: captureActiveRoleSnapshot(),
      stage_model_ids: captureActiveStageSnapshot(),
      captured_at: nowIso(),
    };
  }

  function applyRoleSnapshot(snapshot, roles = ROLE_KEYS) {
    if (!snapshot) return;
    for (const role of roles) {
      const key = `${role}_model_id`;
      if (snapshot[key]) {
        setRoleModel(role, snapshot[key]);
      } else {
        clearRoleModel(role);
      }
    }
  }

  function applyStageSnapshot(snapshot, stages = STAGE_KEYS) {
    if (!snapshot) return;
    for (const stage of stages) {
      const key = `${stage}_model_id`;
      if (snapshot[key]) {
        setStageModel(stage, snapshot[key]);
      } else {
        clearStageModel(stage);
      }
    }
  }

  function bootstrapDefaultActiveModel() {
    const activeIds = getActiveRoleIds();
    if (activeIds.chat && activeIds.router && activeIds.search && activeIds.memory) return;

    const defaultModel = ensureModel(defaultModelName);
    clearAllActiveFlags();
    for (const role of ROLE_KEYS) {
      setRoleModel(role, defaultModel.id);
    }
    db.prepare(`UPDATE models SET status = 'active' WHERE id = ?`).run(defaultModel.id);
    setRuntimeValue("stable_snapshot_json", JSON.stringify(captureActiveRoleSnapshot()));
  }

  function updateModelStatus(modelName, status, extra = {}) {
    const model = ensureModel(modelName);
    const fields = ["status = ?"];
    const values = [status];

    if (Object.hasOwn(extra, "last_eval_at")) {
      fields.push("last_eval_at = ?");
      values.push(extra.last_eval_at);
    }
    if (Object.hasOwn(extra, "last_eval_passed")) {
      fields.push("last_eval_passed = ?");
      values.push(extra.last_eval_passed ? 1 : 0);
    }
    if (Object.hasOwn(extra, "last_eval_summary")) {
      fields.push("last_eval_summary = ?");
      values.push(extra.last_eval_summary);
    }
    if (Object.hasOwn(extra, "notes")) {
      fields.push("notes = ?");
      values.push(extra.notes);
    }
    if (Object.hasOwn(extra, "shadow_started_at")) {
      fields.push("shadow_started_at = ?");
      values.push(extra.shadow_started_at);
    }
    if (Object.hasOwn(extra, "shadow_request_count")) {
      fields.push("shadow_request_count = ?");
      values.push(extra.shadow_request_count);
    }
    if (Object.hasOwn(extra, "shadow_request_target")) {
      fields.push("shadow_request_target = ?");
      values.push(extra.shadow_request_target);
    }

    values.push(model.id);
    db.prepare(`UPDATE models SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return getModelById(model.id);
  }

  function listModels() {
    return db
      .prepare(`
        SELECT *
        FROM models
        ORDER BY
          active_for_chat DESC,
          active_for_router DESC,
          active_for_search DESC,
          active_for_memory DESC,
          created_at ASC
      `)
      .all();
  }

  function getEvalCases(kind = null) {
    if (!kind) {
      return db.prepare(`SELECT * FROM eval_cases WHERE active = 1 ORDER BY id ASC`).all();
    }
    return db.prepare(`SELECT * FROM eval_cases WHERE active = 1 AND kind = ? ORDER BY id ASC`).all(kind);
  }

  function saveEvalRun({ modelName, baselineModelName, metrics, passed, summary, startedAt, finishedAt }) {
    const model = ensureModel(modelName);
    const baseline = baselineModelName ? ensureModel(baselineModelName) : null;
    db.prepare(`
      INSERT INTO eval_runs (
        model_id,
        run_kind,
        baseline_model_id,
        metrics_json,
        passed,
        summary,
        started_at,
        finished_at
      ) VALUES (?, 'full', ?, ?, ?, ?, ?, ?)
    `).run(
      model.id,
      baseline?.id ?? null,
      JSON.stringify(metrics),
      passed ? 1 : 0,
      summary,
      startedAt,
      finishedAt,
    );

    updateModelStatus(modelName, "eval_pending", {
      last_eval_at: finishedAt,
      last_eval_passed: passed,
      last_eval_summary: summary,
    });

    return getLatestEvalRun(modelName);
  }

  function getLatestEvalRun(modelName = null) {
    if (modelName) {
      const model = getModelByName(modelName);
      if (!model) return null;
      return (
        db
          .prepare(`
            SELECT er.*, m.model_name
            FROM eval_runs er
            JOIN models m ON m.id = er.model_id
            WHERE er.model_id = ?
            ORDER BY er.finished_at DESC
            LIMIT 1
          `)
          .get(model.id) || null
      );
    }

    return (
      db
        .prepare(`
          SELECT er.*, m.model_name
          FROM eval_runs er
          JOIN models m ON m.id = er.model_id
          ORDER BY er.finished_at DESC
          LIMIT 1
        `)
        .get() || null
    );
  }

  function startShadow(modelName) {
    const model = ensureModel(modelName);
    if (Number(model.last_eval_passed) !== 1) {
      throw new Error("Model must pass /model-eval before shadow mode");
    }

    updateModelStatus(modelName, "shadow", {
      shadow_started_at: nowIso(),
      shadow_request_count: 0,
      shadow_request_target: SHADOW_TARGET_REQUESTS,
    });
    setRuntimeValue("shadow_model_id", model.id);
    return getModelById(model.id);
  }

  function getShadowModel() {
    const raw = getRuntimeValue("shadow_model_id");
    return raw ? getModelById(Number(raw)) : null;
  }

  function clearShadowModel() {
    const shadowModel = getShadowModel();
    if (shadowModel) {
      updateModelStatus(shadowModel.model_name, "registered", {
        shadow_started_at: null,
        shadow_request_count: 0,
      });
    }
    setRuntimeValue("shadow_model_id", "");
  }

  function recordShadowObservation(modelName, observation) {
    const model = ensureModel(modelName);
    db.prepare(`
      INSERT INTO shadow_observations (
        model_id,
        input_text,
        active_route,
        candidate_route,
        active_need_search,
        candidate_need_search,
        active_response_length,
        candidate_response_length,
        active_latency_ms,
        candidate_latency_ms,
        active_memory_store,
        candidate_memory_store,
        source_consistent,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      model.id,
      observation.input_text,
      observation.active_route,
      observation.candidate_route,
      observation.active_need_search ? 1 : 0,
      observation.candidate_need_search ? 1 : 0,
      observation.active_response_length ?? 0,
      observation.candidate_response_length ?? 0,
      observation.active_latency_ms ?? 0,
      observation.candidate_latency_ms ?? 0,
      observation.active_memory_store ? 1 : 0,
      observation.candidate_memory_store ? 1 : 0,
      observation.source_consistent ? 1 : 0,
      nowIso(),
    );
    db.prepare(`
      UPDATE models
      SET shadow_request_count = shadow_request_count + 1
      WHERE id = ?
    `).run(model.id);
    return getModelById(model.id);
  }

  function getShadowSummary(modelName) {
    const model = ensureModel(modelName);
    const rows = db
      .prepare(`
        SELECT *
        FROM shadow_observations
        WHERE model_id = ?
        ORDER BY created_at DESC
      `)
      .all(model.id);

    if (rows.length === 0) {
      return {
        observation_count: 0,
        route_diff_rate: 0,
        search_over_trigger_rate: 0,
        remote_delegate_delta: 0,
        response_length_ratio: 1,
        memory_false_positive_delta: 0,
        source_consistency_rate: 1,
      };
    }

    const routeDiffCount = rows.filter((row) => row.active_route !== row.candidate_route).length;
    const searchOverTriggerCount = rows.filter(
      (row) => Number(row.active_need_search) === 0 && Number(row.candidate_need_search) === 1,
    ).length;
    const activeRemoteCount = rows.filter((row) => row.active_route !== "local").length;
    const candidateRemoteCount = rows.filter((row) => row.candidate_route !== "local").length;
    const activeLengths = rows.map((row) => Number(row.active_response_length || 0));
    const candidateLengths = rows.map((row) => Number(row.candidate_response_length || 0));
    const activeMemory = rows.filter((row) => Number(row.active_memory_store) === 1).length;
    const candidateMemory = rows.filter((row) => Number(row.candidate_memory_store) === 1).length;
    const sourceConsistentCount = rows.filter((row) => Number(row.source_consistent) === 1).length;

    const activeAvgLength = activeLengths.reduce((sum, value) => sum + value, 0) / rows.length || 0;
    const candidateAvgLength = candidateLengths.reduce((sum, value) => sum + value, 0) / rows.length || 0;

    return {
      observation_count: rows.length,
      route_diff_rate: routeDiffCount / rows.length,
      search_over_trigger_rate: searchOverTriggerCount / rows.length,
      remote_delegate_delta: candidateRemoteCount / rows.length - activeRemoteCount / rows.length,
      response_length_ratio:
        activeAvgLength > 0 ? candidateAvgLength / activeAvgLength : candidateAvgLength > 0 ? 2 : 1,
      memory_false_positive_delta:
        candidateMemory / rows.length - activeMemory / rows.length,
      source_consistency_rate: sourceConsistentCount / rows.length,
    };
  }

  function finalizeShadowIfReady(modelName) {
    const model = ensureModel(modelName);
    const startedAt = model.shadow_started_at ? new Date(model.shadow_started_at).getTime() : 0;
    const summary = getShadowSummary(modelName);
    const ageMs = startedAt ? Date.now() - startedAt : 0;
    const ready =
      summary.observation_count >= (model.shadow_request_target || SHADOW_TARGET_REQUESTS) ||
      ageMs >= SHADOW_MAX_AGE_MS;

    if (!ready) {
      return {
        ready: false,
        promoted: false,
        summary,
      };
    }

    const passes =
      summary.search_over_trigger_rate <= 0.15 &&
      summary.remote_delegate_delta <= 0.15 &&
      summary.response_length_ratio <= 1.5 &&
      summary.memory_false_positive_delta <= 0.1 &&
      summary.source_consistency_rate >= 0.8;

    updateModelStatus(modelName, passes ? "candidate" : "registered", {
      shadow_started_at: null,
      shadow_request_count: 0,
      notes: passes
        ? "Shadow promotion gate passed"
        : "Shadow gate failed: search/remote/length/memory/source drift too high",
    });
    setRuntimeValue("shadow_model_id", "");

    return {
      ready: true,
      promoted: passes,
      summary,
    };
  }

  function getRecentRequestMetrics(modelId, limit = 100, sinceIso = null) {
    if (sinceIso) {
      return db
        .prepare(`
          SELECT *
          FROM request_metrics
          WHERE model_id = ? AND created_at >= ?
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .all(modelId, sinceIso, limit);
    }

    return db
      .prepare(`
        SELECT *
        FROM request_metrics
        WHERE model_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(modelId, limit);
  }

  function recordRequestMetric({ modelName, route, needSearch, latencyMs, memoryShouldStore }) {
    const model = ensureModel(modelName);
    db.prepare(`
      INSERT INTO request_metrics (
        model_id,
        route,
        need_search,
        latency_ms,
        memory_should_store,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      model.id,
      route,
      needSearch ? 1 : 0,
      Math.max(0, Math.round(latencyMs || 0)),
      memoryShouldStore ? 1 : 0,
      nowIso(),
    );
  }

  function activateModel(modelName, rawTargets = ROLE_KEYS) {
    const model = ensureModel(modelName);
    if (model.status !== "candidate" && model.status !== "active") {
      throw new Error("Model must reach candidate status before activation");
    }

    const targets = normalizeTargets(rawTargets, ROLE_KEYS);
    const roleTargets = targets.filter((target) => ROLE_KEYS.includes(target));
    const stageTargets = targets.filter((target) => STAGE_KEYS.includes(target));
    const previousSnapshot = captureActivationSnapshot();
    const primaryRole = roleTargets.includes("chat") ? "chat" : roleTargets[0] || null;
    const previousPrimaryModel = primaryRole
      ? getModelById(previousSnapshot.role_model_ids[`${primaryRole}_model_id`])
      : null;
    const baselineMetrics = previousPrimaryModel
      ? summarizeRequestMetrics(getRecentRequestMetrics(previousPrimaryModel.id, 100))
      : null;

    for (const role of roleTargets) {
      setRoleModel(role, model.id);
    }
    for (const stage of stageTargets) {
      setStageModel(stage, model.id);
    }

    db.prepare(`
      UPDATE models
      SET status = CASE WHEN id = ? THEN 'active' ELSE status END
      WHERE id = ?
    `).run(model.id, model.id);

    setRuntimeValue("stable_snapshot_json", JSON.stringify(previousSnapshot.role_model_ids));
    setRuntimeValue("stable_activation_snapshot_json", JSON.stringify(previousSnapshot));
    setRuntimeValue("last_activation_targets_json", JSON.stringify(targets));
    if (roleTargets.length > 0) {
      setRuntimeValue(
        "activation_monitor_json",
        JSON.stringify({
          target_model_id: model.id,
          started_at: nowIso(),
          baseline_metrics: baselineMetrics,
          targets: roleTargets,
        }),
      );
    } else {
      setRuntimeValue("activation_monitor_json", "");
    }

    return {
      model: getModelById(model.id),
      previousSnapshot,
      baselineMetrics,
      targets: targets.map(denormalizeTargetKey),
    };
  }

  function rollbackModel(reason = "manual rollback", rawTargets = null) {
    const fallbackTargets = parseJson(getRuntimeValue("last_activation_targets_json"), ROLE_KEYS);
    const targets = normalizeTargets(rawTargets, fallbackTargets);
    const roleTargets = targets.filter((target) => ROLE_KEYS.includes(target));
    const stageTargets = targets.filter((target) => STAGE_KEYS.includes(target));
    const activeRoleSnapshot = captureActiveRoleSnapshot();
    const activeStageSnapshot = captureActiveStageSnapshot();
    const stableActivationSnapshot = parseJson(getRuntimeValue("stable_activation_snapshot_json"), null);
    const stableRoleSnapshot = stableActivationSnapshot?.role_model_ids ||
      parseJson(getRuntimeValue("stable_snapshot_json"), null);
    const stableStageSnapshot = stableActivationSnapshot?.stage_model_ids || {};

    if (roleTargets.length > 0 && !stableRoleSnapshot) {
      throw new Error("No stable role snapshot is available for rollback");
    }

    applyRoleSnapshot(stableRoleSnapshot, roleTargets);
    applyStageSnapshot(stableStageSnapshot, stageTargets);

    const beforeIds = unique([
      ...roleTargets.map((role) => activeRoleSnapshot[`${role}_model_id`]).filter(Boolean),
      ...stageTargets.map((stage) => activeStageSnapshot[`${stage}_model_id`]).filter(Boolean),
    ]);
    const afterIds = unique([
      ...roleTargets.map((role) => stableRoleSnapshot?.[`${role}_model_id`]).filter(Boolean),
      ...stageTargets.map((stage) => stableStageSnapshot?.[`${stage}_model_id`]).filter(Boolean),
    ]);
    const activeModel = beforeIds[0] ? getModelById(beforeIds[0]) : null;
    const restoredModel = afterIds[0] ? getModelById(afterIds[0]) : null;

    if (activeModel) {
      updateModelStatus(activeModel.model_name, "rolled_back", {
        notes: reason,
      });
    }
    if (restoredModel) {
      updateModelStatus(restoredModel.model_name, "active");
    }

    db.prepare(`
      INSERT INTO rollbacks (from_model_id, to_model_id, reason, created_at)
      VALUES (?, ?, ?, ?)
    `).run(activeModel?.id ?? null, restoredModel?.id ?? null, reason, nowIso());

    setRuntimeValue("activation_monitor_json", "");
    setRuntimeValue("last_rollback_reason", reason);
    setRuntimeValue("last_rollback_at", nowIso());

    return {
      from: activeModel,
      to: restoredModel,
      reason,
      targets: targets.map(denormalizeTargetKey),
    };
  }

  function maybeRollbackActiveModel() {
    const monitor = parseJson(getRuntimeValue("activation_monitor_json"), null);
    if (!monitor?.target_model_id || !monitor?.started_at) {
      return {
        rolledBack: false,
      };
    }

    const rows = getRecentRequestMetrics(monitor.target_model_id, 100, monitor.started_at);
    if (rows.length < 5) {
      return {
        rolledBack: false,
        reason: "not enough samples",
      };
    }

    const current = summarizeRequestMetrics(rows);
    const baseline = monitor.baseline_metrics || null;
    if (!baseline || baseline.request_count === 0) {
      return {
        rolledBack: false,
        reason: "no baseline metrics",
      };
    }

    let reason = null;
    if (baseline.latency_p95 > 0 && current.latency_p95 > baseline.latency_p95 * 1.5) {
      reason = `auto rollback: p95 latency rose from ${baseline.latency_p95}ms to ${current.latency_p95}ms`;
    } else if (current.remote_delegate_rate > baseline.remote_delegate_rate + 0.15) {
      reason = `auto rollback: remote delegation rate rose from ${(baseline.remote_delegate_rate * 100).toFixed(1)}% to ${(current.remote_delegate_rate * 100).toFixed(1)}%`;
    } else if (current.search_rate > baseline.search_rate + 0.2) {
      reason = `auto rollback: search rate rose from ${(baseline.search_rate * 100).toFixed(1)}% to ${(current.search_rate * 100).toFixed(1)}%`;
    } else if (current.memory_store_rate > baseline.memory_store_rate + 0.2) {
      reason = `auto rollback: memory write rate rose from ${(baseline.memory_store_rate * 100).toFixed(1)}% to ${(current.memory_store_rate * 100).toFixed(1)}%`;
    }

    if (!reason) {
      return {
        rolledBack: false,
        current,
        baseline,
      };
    }

    const rollback = rollbackModel(reason);
    return {
      rolledBack: true,
      rollback,
      current,
      baseline,
    };
  }

  function getRecentRollback() {
    return (
      db
        .prepare(`
          SELECT r.*, from_model.model_name AS from_model_name, to_model.model_name AS to_model_name
          FROM rollbacks r
          LEFT JOIN models from_model ON from_model.id = r.from_model_id
          LEFT JOIN models to_model ON to_model.id = r.to_model_id
          ORDER BY r.created_at DESC
          LIMIT 1
        `)
        .get() || null
    );
  }

  function getStatusSummary() {
    const active = getActiveRoleModels();
    const stages = getActiveStageModels();
    const shadow = getShadowModel();
    const latestEval = getLatestEvalRun();
    const recentRollback = getRecentRollback();
    return {
      active,
      stages,
      shadow,
      latestEval,
      recentRollback,
    };
  }

  bootstrapDefaultActiveModel();

  return {
    dbPath,
    ensureModel,
    listModels,
    getEvalCases,
    getLatestEvalRun,
    getStatusSummary,
    getActiveRoleModels,
    getActiveStageModels,
    getShadowModel,
    updateModelStatus,
    saveEvalRun,
    startShadow,
    clearShadowModel,
    recordShadowObservation,
    finalizeShadowIfReady,
    recordRequestMetric,
    activateModel,
    rollbackModel,
    maybeRollbackActiveModel,
    getRecentRollback,
  };
}
