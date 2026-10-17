const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseSource, validateCanonical, summary, outputs } = require('./task-registry.cjs');

const root = path.resolve(__dirname, '..', 'agent-tasks');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const snapshot = readJson(path.join(root, 'source-snapshot.json'));
function fixture() {
  const groups = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => fs.readdirSync(path.join(root, entry.name))
      .filter(file => /^phase\d+-tasks\.json$/.test(file))
      .map(file => {
        const absolute = path.join(root, entry.name, file);
        return { file: absolute, data: readJson(absolute) };
      }));
  return { groups, tasks: groups.flatMap(group => group.data.tasks) };
}

test('preserves all source definitions, checklists, and reported completion claims', () => {
  const sources = parseSource(snapshot.documents['TASKS.md'].content);
  assert.equal(sources.length, 56);
  assert.equal(sources.filter(source => source.id.startsWith('P1')).length, 39);
  assert.equal(sources.filter(source => source.id.startsWith('P2')).length, 10);
  assert.equal(sources.filter(source => source.id.startsWith('P3')).length, 6);
  assert.equal(sources.filter(source => source.completed).length, 11);
  assert.equal(sources.flatMap(source => source.checks).length, 115);
  const { groups, tasks } = fixture();
  validateCanonical(groups, tasks, snapshot);
});

test('unknown backlog estimates and historical verification stay explicit', () => {
  const { tasks } = fixture();
  for (const task of tasks.filter(task => task.phase > 1 && task.source.file === 'TASKS.md')) {
    assert.equal(task.estimatedHours, null);
    assert.equal(task.priority, null);
    assert.equal(task.planningRequired, true);
  }
  const inherited = tasks.filter(task => task.status === 'COMPLETED' && task.verification.status === 'not_reverified');
  for (const task of inherited) {
    assert.equal(task.verification.status, 'not_reverified');
    assert.equal(task.executionResult.model, null);
    assert.deepEqual(task.verification.commands, []);
  }
  const freshlyVerified = tasks.filter(task => task.status === 'COMPLETED' && task.verification.status === 'passed' && !task.id.startsWith('EXEC'));
  assert(freshlyVerified.length > 0);
  for (const task of freshlyVerified) {
    assert.equal(task.verification.status, 'passed');
    assert(task.verification.commands.length > 0);
    assert(task.executionResult.model && task.executionResult.provider);
  }
  assert.equal(tasks.filter(task => !task.id.startsWith('EXEC') && task.source.file === 'TASKS.md').length, 55);
  assert.equal(summary(tasks.filter(task => !task.id.startsWith('EXEC'))).totalTasks, 70);
});

test('traceability matrix references canonical tasks and unique QA cases', () => {
  const matrix = fs.readFileSync(path.resolve(__dirname, '..', '..', 'specs', 'pdf-viewer-editor', 'traceability.md'), 'utf8');
  const { tasks } = fixture();
  const known = new Set(tasks.map(task => task.id));
  const references = [...matrix.matchAll(/\bP[123]-S\d+-\d+\b/g)].map(match => match[0]);
  assert(references.length > 0);
  for (const id of references) assert(known.has(id), 'Unknown traceability task ' + id);
  const qaIds = [...matrix.matchAll(/QA-PDF-\d{3}/g)].map(match => match[0]);
  assert(qaIds.length > 0);
  assert.equal(new Set(qaIds).size, qaIds.length);
  assert.match(matrix, /Planned/);
  assert.match(matrix, /Existing/);
});

test('normalizes core-feature and release gates without losing declared dependencies', () => {
  const { tasks } = fixture();
  for (const task of tasks) {
    for (const id of task.source.declaredDependencies) assert(task.dependencies.includes(id));
    if (task.phase === 2) assert(task.dependencies.includes('P1-S12-003'));
    if (task.phase === 3) assert(task.dependencies.includes('P2-S18-001'));
  }
  const unit = tasks.find(task => task.id === 'P1-S11-001');
  assert(unit.dependencies.includes('P1-S10-003'));
  assert(!unit.dependencies.includes(unit.id));
});

test('rejects duplicate identities, missing fields, missing dependencies, and cycles', () => {
  for (const [mutate, message] of [
    [groups => groups[0].data.tasks.push(groups[0].data.tasks[0]), /Duplicate task/],
    [groups => delete groups[0].data.tasks[0].verification, /missing verification/],
    [groups => groups[0].data.tasks[0].dependencies.push('MISSING-001'), /missing dependency/],
    [groups => groups[0].data.tasks[0].dependencies.push(groups[0].data.tasks[0].id), /Dependency cycle/],
    [groups => { groups[0].data.tasks[0].module = 'wrong'; }, /wrong module/]
  ]) {
    const { groups } = fixture();
    mutate(groups);
    assert.throws(() => validateCanonical(groups, groups.flatMap(group => group.data.tasks), snapshot), message);
  }
});

test('rejects missing source tasks, checklist loss, hash changes, and later-phase dependencies', () => {
  const { groups, tasks } = fixture();
  const missing = groups.map(group => ({ ...group, data: { ...group.data, tasks: group.data.tasks.filter(task => task.id !== 'EXEC-2026-06-16-001') } }));
  assert.throws(() => validateCanonical(missing, missing.flatMap(group => group.data.tasks), snapshot), /Missing source task/);
  tasks[0].source.checklist = [];
  assert.throws(() => validateCanonical(groups, tasks, snapshot), /checklist lost/);
  const clean = fixture();
  clean.tasks.find(task => task.phase === 1).dependencies.push('P3-S24-001');
  assert.throws(() => validateCanonical(clean.groups, clean.tasks, snapshot), /later-phase dependency/);
  const altered = structuredClone(snapshot);
  altered.documents['TASKS.md'].content += 'changed';
  const original = fixture();
  assert.throws(() => validateCanonical(original.groups, original.tasks, altered), /hash mismatch/);
});

test('fresh completion cannot reuse the historical evidence exemption', () => {
  const { groups, tasks } = fixture();
  const pending = tasks.find(task => task.status === 'PENDING');
  pending.status = 'COMPLETED';
  pending.verification = { status: 'not_reverified' };
  assert.throws(() => validateCanonical(groups, tasks, snapshot), /cannot inherit/);
  pending.verification = { status: 'passed', commands: ['test'], summary: 'Passed' };
  assert.throws(() => validateCanonical(groups, tasks, snapshot), /actual model\/provider/);
});

test('phase indexes contain only references and graph contains every node and edge', () => {
  const { groups, tasks } = fixture();
  const state = readJson(path.join(root, 'registry-state.json'));
  const generated = outputs(groups, tasks, state);
  for (const phase of [1, 2, 3]) {
    const index = JSON.parse(generated.get(path.join(root, `phase${phase}-tasks.json`)));
    assert.equal(index.metadata.noTaskCopies, true);
    assert.equal(index.tasks.length, tasks.filter(task => task.phase === phase).length);
    for (const reference of index.tasks) {
      assert(!Object.hasOwn(reference, 'id'));
      assert(!Object.hasOwn(reference, 'acceptanceCriteria'));
      assert(tasks.some(task => task.id === reference.taskId));
    }
  }
  const graph = generated.get(path.resolve(root, '..', 'CODE_COMPLETION_GRAPH.md'));
  for (const task of tasks) {
    assert(graph.includes(`${task.id.replaceAll('-', '_')}["`));
    for (const dependency of task.dependencies) {
      assert(graph.includes(`${dependency.replaceAll('-', '_')} --> ${task.id.replaceAll('-', '_')}`));
    }
  }
});
