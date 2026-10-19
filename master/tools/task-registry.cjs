const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const master = path.resolve(__dirname, '..');
const root = path.join(master, 'agent-tasks');
const date = '2026-10-16';
const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'];
const fields = [
  'id', 'name', 'status', 'priority', 'estimatedHours', 'value',
  'recommendedModel', 'modelRationale', 'dependencies', 'deliverables',
  'acceptanceCriteria', 'tags', 'module', 'modulePath', 'phase',
  'userClarifications', 'modelAssignment', 'executionPlan', 'executionResult',
  'jevRecommendation', 'completedDate', 'artifacts', 'verification'
];
const phaseNames = { 1: 'MVP', 2: 'Advanced Features', 3: 'Enterprise', 4: 'AI Workspace MVP' };
const phases = Object.keys(phaseNames).map(Number);
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(file));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file) || read(file) !== content) fs.writeFileSync(file, content);
};
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const canonicalFile = task => `${task.module}/phase${task.phase}-tasks.json`;
const link = task => `[${task.id}](agent-tasks/${canonicalFile(task)})`;

function parseSource(text) {
  const headings = [...text.matchAll(/^### \[(P[123]-S\d+-\d+|EXEC-[\d-]+)\] (.+)$/gm)];
  return headings.map((match, index) => {
    const end = headings[index + 1]?.index ?? text.length;
    const section = text.slice(match.index, end).split(/^## [3456]\. /m)[0];
    const id = match[1];
    const name = match[2].replace(/^[^\p{L}\p{N}]+/u, '').trim();
    const checks = [...section.matchAll(/^- \[([ x])\] (.+)$/gm)]
      .map(item => ({ completed: item[1] === 'x', text: item[2] }));
    const details = section.match(/\*\*Priority\*\*: (.+?) \| \*\*Duration\*\*: (\d+) days? \| \*\*Dependencies\*\*: (.+)/);
    return {
      id, name, checks, details: details ? {
        priority: details[1].replace(/^[^\p{L}]+/u, '').toUpperCase(),
        days: Number(details[2]), dependencyText: details[3].trim()
      } : null,
      completed: match[2].includes('\u{1f7e2}'),
      phase: id.startsWith('EXEC') ? 1 : Number(id[1]),
      sprint: id.startsWith('EXEC') ? null : Number(id.match(/-S(\d+)-/)[1]),
      line: text.slice(0, match.index).split('\n').length,
      text: section.trim()
    };
  });
}

function domain(source) {
  if (source.id.startsWith('EXEC')) return 'quality-delivery';
  if (source.phase === 1) {
    return {
      1: 'platform', 2: 'platform', 3: 'viewer-editor', 4: 'viewer-editor',
      5: 'annotations', 6: 'processing-export', 7: 'forms-signatures',
      8: source.id.endsWith('001') ? 'viewer-editor' :
        source.id.endsWith('002') ? 'security-compliance' : 'processing-export',
      9: 'viewer-editor', 10: 'browser-extension', 11: 'quality-delivery',
      12: 'quality-delivery'
    }[source.sprint];
  }
  return {
    'P2-S13-001': 'processing-export', 'P2-S13-002': 'processing-export',
    'P2-S14-001': 'forms-signatures', 'P2-S14-002': 'annotations',
    'P2-S15-001': 'processing-export', 'P2-S15-002': 'security-compliance',
    'P2-S16-001': 'security-compliance', 'P2-S16-002': 'security-compliance',
    'P2-S17-001': 'annotations', 'P2-S18-001': 'quality-delivery',
    'P3-S19-001': 'forms-signatures', 'P3-S20-001': 'processing-export',
    'P3-S21-001': 'platform', 'P3-S22-001': 'processing-export',
    'P3-S23-001': 'security-compliance', 'P3-S24-001': 'quality-delivery'
  }[source.id];
}

function importRegistry() {
  assert(!fs.existsSync(root), 'Registry already exists; import never overwrites live records.');
  const documents = Object.fromEntries(
    fs.readdirSync(master).filter(name => name.endsWith('.md')).sort()
      .map(name => {
        let content = read(path.join(master, name));
        if (name === 'TASKS.md') content = content.slice(content.indexOf('**Project**'));
        return [name, { sha256: hash(content), content }];
      })
  );
  const sources = parseSource(documents['TASKS.md'].content);
  assert.equal(sources.length, 56, 'Expected 55 product tasks and one historical execution record.');
  const records = sources.map((source, index) => {
    const module = domain(source);
    assert(module, `No domain mapping for ${source.id}`);
    const dependencies = [...(source.details?.dependencyText.matchAll(/\[(P\d-S\d+-\d+)\]/g) ?? [])]
      .map(match => match[1]);
    const priority = source.details?.priority ?? null;
    return {
      id: source.id, name: source.name, status: source.completed ? 'COMPLETED' : 'PENDING',
      priority, estimatedHours: source.details ? source.details.days * 8 : null,
      value: null, recommendedModel: [],
      modelRationale: 'Unassigned. Select an approved available model for actual execution; no historical model is known.',
      dependencies, deliverables: source.checks.map(check => check.text),
      acceptanceCriteria: source.checks.map(check => check.text),
      tags: [`phase-${source.phase}`, ...(source.sprint ? [`sprint-${source.sprint}`] : ['historical-execution'])],
      module, modulePath: '../../../pdf-viewer-editor/', phase: source.phase,
      userClarifications: [], modelAssignment: null,
      executionPlan: { order: index + 1, batch: source.sprint ?? 0, band: `phase-${source.phase}`, scriptable: false, estimatedCostUsd: null },
      executionResult: source.completed ? {
        model: null, provider: null, confidenceScore: null,
        executionNotes: 'Imported historical completion claim; implementation was not re-executed during migration.',
        executedAt: null
      } : null,
      jevRecommendation: null, completedDate: source.id.startsWith('EXEC') ? '2026-06-16' : null,
      artifacts: source.id.startsWith('EXEC') ? ['specs/pdf-viewer-editor/traceability.md'] : [],
      verification: source.completed ? {
        status: 'not_reverified', commands: [],
        summary: 'Source documentation reports completion. No passing result is asserted by this migration.'
      } : null,
      sprint: source.sprint,
      planningRequired: !source.details && !source.id.startsWith('EXEC'),
      source: {
        file: 'TASKS.md', line: source.line, snapshot: '../source-snapshot.json',
        originalText: source.text, checklist: source.checks,
        declaredDependencyText: source.details?.dependencyText ?? null,
        declaredDependencies: [...dependencies],
        reportedStatus: source.completed ? 'COMPLETED' : 'PENDING',
        durationDays: source.details?.days ?? null,
        estimateBasis: source.details ? 'Original duration in days multiplied by 8 planning hours/day; not measured effort.' : 'Not estimated in source.',
        normalizedDependencies: []
      }
    };
  });
  const addGate = (task, ids, reason) => {
    for (const id of ids) {
      if (!task.dependencies.includes(id)) {
        task.dependencies.push(id);
        task.source.normalizedDependencies.push({ taskId: id, reason });
      }
    }
  };
  for (const task of records) {
    if (task.id === 'P1-S11-001') {
      addGate(task, records.filter(item => item.phase === 1 && item.sprint <= 10 && item.sprint !== null)
        .map(item => item.id), 'Resolve source narrative gate: Core feature completion.');
    }
    if (task.phase === 2) addGate(task, ['P1-S12-003'], 'Source execution rule: MVP acceptance sign-off before Phase 2.');
    if (task.phase === 3) addGate(task, ['P2-S18-001'], 'Normalized release gate: stable v1.0 before enterprise implementation.');
    if (task.id.startsWith('EXEC')) {
      addGate(task, records.filter(item => item.source.reportedStatus === 'COMPLETED' && !item.id.startsWith('EXEC'))
        .map(item => item.id), 'Historical QA scope explicitly lists the ten completed product tasks.');
    }
  }
  writeJson(path.join(root, 'source-snapshot.json'), {
    importedOn: date, sourceFolder: 'master', documents,
    reconciliation: [
      'TASKS.md task headings are authoritative; 55 product tasks plus one execution record.',
      'Older graph labels reuse IDs with different meanings and include orphan IDs; they are retained as historical text only.',
      'ROADMAP.md checklists are scope summaries, not separate task identities; retain them as planning context, not completion evidence.',
      'STATUS_REPORT.md and SPRINT_1-2_COMPLETION.md are historical reports, not live task registries.',
      'Framework comparison and setup checklists are guidance, not additional product task identities.',
      'The historical traceability artifact currently exists but is empty; do not infer QA passed from its presence.'
    ]
  });
  writeJson(path.join(root, 'task-schema.json'), {
    schemaVersion: '1.0.0', reference: 'model-master/agent-tasks + tools/agent-task-template.json',
    statuses, requiredFields: fields,
    compatibilityNotes: [
      'Original IDs and phases 1-3 are retained.',
      'Logical domain modulePath links point to the shared existing product.',
      'Unknown values remain null; imported completion uses explicit not_reverified verification.'
    ]
  });
  for (const module of [...new Set(records.map(task => task.module))].sort()) {
    for (const phase of [1, 2, 3]) {
      const tasks = records.filter(task => task.module === module && task.phase === phase);
      if (tasks.length) writeJson(path.join(root, module, `phase${phase}-tasks.json`), {
        phase: `phase${phase}`, name: `Phase ${phase} - ${phaseNames[phase]}`,
        module, metadata: { requirements: '../../REQUIREMENTS.md', design: '../../DESIGN.md' }, tasks
      });
    }
    write(path.join(root, module, 'README.md'),
      `# ${module}\n\nCanonical tasks live in this directory's phase JSON files.\n` +
      '\nStart execution only through [TASKS.md](../../TASKS.md).\n' +
      'See [requirements](../../REQUIREMENTS.md), [design](../../DESIGN.md), ' +
      'and [implementation](../../../pdf-viewer-editor).\n');
  }
  writeJson(path.join(root, 'registry-state.json'), {
    migration: { 'MIG-001': true, 'MIG-002': true, 'MIG-003': true, 'MIG-004': false, 'MIG-005': false },
    sequence: 11,
    history: [{ sequence: 'GSEQ-011', date: '2026-06-16', note: 'Inherited historical QA entry; not reverified.' }],
    lastDigest: null
  });
  sync('MIG-003 imported canonical records and preserved source evidence.');
}

function load() {
  const groups = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    for (const name of fs.readdirSync(path.join(root, entry.name)).filter(name => /^phase\d+-tasks\.json$/.test(name)).sort()) {
      const file = path.join(root, entry.name, name);
      groups.push({ file, data: json(file) });
    }
  }
  return {
    groups,
    tasks: groups.flatMap(group => group.data.tasks)
      .sort((a, b) => a.executionPlan.order - b.executionPlan.order || a.id.localeCompare(b.id))
  };
}

function validateCanonical(groups, tasks, snapshot) {
  const ids = new Map();
  const schema = json(path.join(root, 'task-schema.json'));
  for (const { file, data } of groups) {
    assert(Array.isArray(data.tasks) && data.tasks.length > 0, `Empty/invalid task file: ${file}`);
    for (const task of data.tasks) {
      for (const field of schema.requiredFields) assert(Object.hasOwn(task, field), `${task.id}: missing ${field}`);
      assert(!ids.has(task.id), `Duplicate task ${task.id}`);
      ids.set(task.id, task);
      assert(statuses.includes(task.status), `${task.id}: invalid status`);
      assert.equal(task.module, path.basename(path.dirname(file)), `${task.id}: wrong module`);
      assert.equal(`phase${task.phase}-tasks.json`, path.basename(file), `${task.id}: wrong phase file`);
      assert.equal(data.phase, `phase${task.phase}`, `${task.id}: wrong phase wrapper`);
      assert.equal(data.module, task.module, `${task.id}: wrong module wrapper`);
      assert(phases.includes(task.phase), `${task.id}: unsupported phase`);
      assert.equal(path.resolve(path.dirname(file), task.modulePath), path.resolve(master, '..', 'pdf-viewer-editor'));
      for (const field of ['dependencies', 'deliverables', 'acceptanceCriteria', 'tags', 'recommendedModel', 'artifacts', 'userClarifications']) {
        assert(Array.isArray(task[field]), `${task.id}: ${field} must be an array`);
      }
      assert(task.priority === null || ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(task.priority), `${task.id}: invalid priority`);
      assert(task.estimatedHours === null || (Number.isFinite(task.estimatedHours) && task.estimatedHours >= 0), `${task.id}: invalid estimate`);
      assert.equal(new Set(task.dependencies).size, task.dependencies.length, `${task.id}: duplicate dependency`);
      if (task.status === 'COMPLETED') {
        if (task.verification?.status === 'not_reverified') {
          assert.equal(task.source.reportedStatus, 'COMPLETED', `${task.id}: cannot inherit an unreported completion`);
        } else {
          assert.equal(task.verification?.status, 'passed', `${task.id}: completion needs passed verification`);
          assert(task.verification.commands?.length && task.verification.summary?.trim(), `${task.id}: completion needs validation details`);
          assert(task.executionResult?.model?.trim() && task.executionResult?.provider?.trim(), `${task.id}: completion needs actual model/provider`);
          assert(task.executionResult.executionNotes?.trim() && task.completedDate && task.artifacts.length, `${task.id}: incomplete execution evidence`);
          for (const artifact of task.artifacts) {
            const resolved = path.resolve(master, '..', artifact);
            const relative = path.relative(path.resolve(master, '..'), resolved);
            assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `${task.id}: artifact must be inside repository`);
            assert(fs.existsSync(resolved), `${task.id}: missing artifact ${artifact}`);
          }
        }
      }
    }
  }
  for (const task of tasks) {
    for (const id of task.dependencies) {
      assert(ids.has(id), `${task.id}: missing dependency ${id}`);
      assert(ids.get(id).phase <= task.phase, `${task.id}: later-phase dependency ${id}`);
      if (task.status === 'COMPLETED' && task.verification?.status === 'passed') {
        assert.equal(ids.get(id).status, 'COMPLETED', `${task.id}: incomplete prerequisite ${id}`);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    assert(!visiting.has(id), `Dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of ids.get(id).dependencies) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids.keys()) visit(id);
  for (const document of Object.values(snapshot.documents)) assert.equal(hash(document.content), document.sha256, 'Source snapshot hash mismatch');
  const sources = parseSource(snapshot.documents['TASKS.md'].content);
  for (const source of sources) {
    const task = ids.get(source.id);
    assert(task, `Missing source task ${source.id}`);
    assert.equal(task.name, source.name, `${source.id}: source name lost`);
    assert.equal(task.source.originalText, source.text, `${source.id}: source text lost`);
    assert.deepEqual(task.source.checklist, source.checks, `${source.id}: checklist lost`);
    assert.equal(task.source.reportedStatus, source.completed ? 'COMPLETED' : 'PENDING');
    assert.equal(task.source.durationDays, source.details?.days ?? null, `${source.id}: source duration lost`);
    assert.equal(task.source.declaredDependencyText, source.details?.dependencyText ?? null);
    const declared = [...(source.details?.dependencyText.matchAll(/\[(P\d-S\d+-\d+)\]/g) ?? [])].map(match => match[1]);
    assert.deepEqual(task.source.declaredDependencies, declared, `${source.id}: declared dependencies changed`);
    for (const dependency of declared) assert(task.dependencies.includes(dependency), `${source.id}: declared dependency lost`);
  }
  assert.equal(tasks.filter(task => task.source?.file === 'TASKS.md').length, sources.length, 'Unexpected imported task count');
}

function counts(tasks) {
  return Object.fromEntries(statuses.map(status => [status.toLowerCase(), tasks.filter(task => task.status === status).length]));
}

function summary(tasks) {
  const known = tasks.filter(task => task.estimatedHours !== null);
  return {
    totalTasks: tasks.length, statusSummary: counts(tasks),
    completedTasks: tasks.filter(task => task.status === 'COMPLETED').length,
    completionPercentage: tasks.length ? `${Math.floor(100 * tasks.filter(task => task.status === 'COMPLETED').length / tasks.length)}%` : '0%',
    totalEstimatedHours: known.reduce((sum, task) => sum + task.estimatedHours, 0),
    unestimatedTasks: tasks.length - known.length,
    inheritedUnverifiedCompletions: tasks.filter(task => task.status === 'COMPLETED' && task.verification?.status === 'not_reverified').length,
    taskIds: tasks.map(task => task.id)
  };
}

function taskMarkdown(tasks, state) {
  const product = tasks.filter(task => !task.id.startsWith('EXEC'));
  const lines = [
    '# PDF Viewer & Editor - Task Execution Entry Point', '',
    `Updated: ${date}. Canonical task objects: [agent-tasks](agent-tasks).`, '',
    'Read [requirements](REQUIREMENTS.md), then [design](DESIGN.md), then execute from this document only.',
    'Do not execute tasks from old reports, source snapshots, framework guides, or graph labels.', '',
    '## Registry Migration Execution Checklist', '',
    ...Object.entries({
      'MIG-001': 'Define migration requirements.',
      'MIG-002': 'Define registry design.',
      'MIG-003': 'Import all task definitions and historical execution evidence.',
      'MIG-004': 'Generate domain/phase indexes and completion graph.',
      'MIG-005': 'Validate source coverage, dependency graph, and generated outputs.'
    }).map(([id, title]) => `- [${state.migration[id] ? 'x' : ' '}] ${id}: ${title}`),
    '', '## Execution Rules', '',
    '- Statuses: PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED.',
    '- Retain original IDs. Canonical JSON is editable; tables, rollups, and graph are generated.',
    '- Resolve `planningRequired` tasks before starting: estimate, priority, deliverables, acceptance criteria, and any feature prerequisites.',
    '- Honor dependency links and the MVP/stable release gates; PENDING does not mean ready.',
    '- A source completion claim is not a new verification pass. Historical unknown dates/models remain null.',
    '- For fresh completion, record actual model/provider, notes, artifacts, completion date, passed verification commands/summary, and complete all prerequisites.',
    '- After each successful update run the sync and validate commands below. This updates this document and advances the graph sequence for a distinct task state.',
    '', '```powershell', 'node .\\master\\tools\\task-registry.cjs sync',
    'node .\\master\\tools\\task-registry.cjs validate', '```', '',
    '## Product Progress', '',
    '| Phase | Tasks | Completed (reported) | Pending | In progress | Blocked |',
    '|---|---:|---:|---:|---:|---:|',
    ...phases.map(phase => {
      const selected = product.filter(task => task.phase === phase);
      const totals = counts(selected);
      return `| ${phase}: ${phaseNames[phase]} | ${selected.length} | ${totals.completed} | ${totals.pending} | ${totals.in_progress} | ${totals.blocked} |`;
    }), '',
    `${product.length} product tasks; ${tasks.length - product.length} separate historical QA execution record.`,
    'Historical QA is not counted as product delivery. Estimates use 8 planning hours/day where the source specified days; backlog estimates remain unknown.', ''
  ];
  for (const phase of phases) {
    lines.push(`## Phase ${phase} - ${phaseNames[phase]}`, '',
      '| Task | Name | Domain | Status | Priority | Hours | Dependencies |',
      '|---|---|---|---|---|---:|---|');
    for (const task of product.filter(task => task.phase === phase)) {
      lines.push(`| ${link(task)} | ${task.name} | ${task.module} | ${task.status}${task.verification?.status === 'not_reverified' ? ' (inherited)' : ''} | ${task.priority ?? 'Unplanned'} | ${task.estimatedHours ?? 'Unknown'} | ${task.dependencies.join(', ') || 'None'} |`);
    }
    lines.push('');
  }
  lines.push('## Historical Execution Log', '');
  for (const task of tasks.filter(task => task.id.startsWith('EXEC'))) {
    lines.push(`- ${link(task)}: ${task.name}; ${task.status}; ${task.verification?.status ?? 'unverified'}.`);
  }
  lines.push('', '## Evidence and Navigation', '',
    '- [Registry guide](agent-tasks/README.md)',
    '- [Master index](agent-tasks/master_tasks_index.json)',
    '- [Completion graph and sequence history](CODE_COMPLETION_GRAPH.md)',
    '- [Original document snapshots and reconciliation notes](agent-tasks/source-snapshot.json)',
    '', 'Original task checklists and source prose are retained on each canonical record; no checklist item is discarded.', '');
  return lines.join('\n');
}

function graphMarkdown(tasks, state) {
  const lines = [
    '# Code Completion Graph - PDF Viewer & Editor', '',
    'Generated from canonical JSON using the local Node dependency-DAG tool.',
    'Start execution only through [TASKS.md](TASKS.md).', '',
    '## Sequence Index', '',
    ...state.history.map(item => `- \`${item.sequence}\` (${item.date}): ${item.note}`),
    '', '## Complete Dependency Graph', '', '```mermaid', 'graph TD'
  ];
  const node = id => id.replaceAll('-', '_');
  for (const task of tasks) {
    const label = `${task.id}: ${task.name}`.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    lines.push(`    ${node(task.id)}["${label}<br/>${task.status}${task.verification?.status === 'not_reverified' ? ' - inherited, not reverified' : ''}"]`);
    for (const dependency of task.dependencies) lines.push(`    ${node(dependency)} --> ${node(task.id)}`);
    if (task.status === 'COMPLETED') lines.push(`    style ${node(task.id)} fill:#c8e6c9`);
  }
  lines.push('```', '', '## Interpretation', '',
    '- Edges point from prerequisite to dependent task. All canonical tasks and edges are included.',
    '- Green means reported completed, not necessarily independently verified.',
    '- Historical GSEQ-011 is retained as a claim; the prior diagram contained conflicting IDs/names.',
    '- Narrative gates were normalized explicitly on task records; no phantom graph-only task IDs are executable.',
    '- Regenerate after successful updates; unchanged synchronization does not advance the sequence.', '');
  return lines.join('\n');
}

function outputs(groups, tasks, state) {
  const files = new Map();
  const add = (relative, value) => files.set(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
  const modules = [...new Set(tasks.map(task => task.module))].sort();
  const reference = task => ({
    taskId: task.id, module: task.module, phase: task.phase,
    canonicalFile: `./${canonicalFile(task)}`, modulePath: '../../pdf-viewer-editor/'
  });
  const phaseFiles = Object.fromEntries(phases.map(phase => [`phase${phase}`, `./phase${phase}-tasks.json`]));
  const phaseSummaries = phases.map(phase => ({
    phase: `phase${phase}`, name: phaseNames[phase], file: phaseFiles[`phase${phase}`],
    ...summary(tasks.filter(task => task.phase === phase))
  }));
  add('meta.json', {
    project: 'PDF Viewer & Editor', version: '1.0.0', lastUpdated: date,
    sourceOfTruth: 'Canonical domain phase JSON only; root phase files contain references.',
    requirements: '../REQUIREMENTS.md', design: '../DESIGN.md', executionEntryPoint: '../TASKS.md',
    progressTracking: summary(tasks), phases: phaseSummaries,
    productProgress: summary(tasks.filter(task => !task.id.startsWith('EXEC'))),
    modules: modules.map(module => ({ module, ...summary(tasks.filter(task => task.module === module)) }))
  });
  add('master_tasks_index.json', {
    version: '1.0', format: 'model-master/tasks-master-index+json',
    metadata: {
      title: 'Master Task Index - PDF Viewer & Editor', updatedOn: date,
      sourceOfTruth: 'Canonical domain phase JSON only.',
      synchronizationTool: '../tools/task-registry.cjs sync',
      validationTool: '../tools/task-registry.cjs validate',
      executionEntryPoint: '../TASKS.md'
    },
    activePhase: phases.find(phase => tasks.some(task => task.phase === phase && !['COMPLETED', 'CANCELLED'].includes(task.status))) ?? null,
    phaseFiles, moduleFolders: Object.fromEntries(modules.map(module => [module, `./${module}`])),
    phases: phaseSummaries, progressTracking: summary(tasks), tasks: tasks.map(reference)
  });
  for (const phase of phases) add(`phase${phase}-tasks.json`, {
    phase: `phase${phase}`, name: phaseNames[phase],
    metadata: { noTaskCopies: true, sourceOfTruth: 'Canonical domain phase JSON only.' },
    ...summary(tasks.filter(task => task.phase === phase)),
    tasks: tasks.filter(task => task.phase === phase).map(reference)
  });
  for (const module of modules) {
    const selected = tasks.filter(task => task.module === module);
    const phases = groups.filter(group => group.data.module === module)
      .map(group => ({ phase: group.data.phase, file: `./${path.basename(group.file)}`, ...summary(group.data.tasks) }));
    add(`${module}/meta.json`, {
      project: 'PDF Viewer & Editor', module, lastUpdated: date,
      requirements: '../../REQUIREMENTS.md', design: '../../DESIGN.md',
      progressTracking: summary(selected), phases
    });
    add(`${module}/master_tasks_index.json`, {
      version: '1.0', metadata: { module, executionEntryPoint: '../../TASKS.md' },
      phases, progressTracking: summary(selected),
      tasks: selected.map(task => ({ taskId: task.id, canonicalFile: `./phase${task.phase}-tasks.json` }))
    });
  }
  files.set(path.join(master, 'TASKS.md'), taskMarkdown(tasks, state));
  files.set(path.join(master, 'CODE_COMPLETION_GRAPH.md'), graphMarkdown(tasks, state));
  return files;
}

function sync(note = 'Canonical tasks synchronized; task entry point, indexes, and dependency graph refreshed.') {
  const { groups, tasks } = load();
  validateCanonical(groups, tasks, json(path.join(root, 'source-snapshot.json')));
  const state = json(path.join(root, 'registry-state.json'));
  const digest = hash(JSON.stringify({ tasks, migration: state.migration }));
  if (state.lastDigest !== digest) {
    state.sequence++;
    state.history.push({ sequence: `GSEQ-${String(state.sequence).padStart(3, '0')}`, date: new Date().toISOString().slice(0, 10), note });
    state.lastDigest = digest;
  }
  for (const [file, content] of outputs(groups, tasks, state)) write(file, content);
  writeJson(path.join(root, 'registry-state.json'), state);
  console.log(`Synchronized ${tasks.length} records; GSEQ-${String(state.sequence).padStart(3, '0')}.`);
}

function validate() {
  const { groups, tasks } = load();
  validateCanonical(groups, tasks, json(path.join(root, 'source-snapshot.json')));
  const state = json(path.join(root, 'registry-state.json'));
  assert.equal(state.lastDigest, hash(JSON.stringify({ tasks, migration: state.migration })), 'Unsynchronized task state');
  for (const [file, expected] of outputs(groups, tasks, state)) assert.equal(read(file), expected, `Stale generated output: ${file}`);
  const known = new Set(tasks.map(task => task.id));
  const phaseReferences = phases.flatMap(phase =>
    json(path.join(root, `phase${phase}-tasks.json`)).tasks);
  assert.equal(phaseReferences.length, tasks.length, 'Phase reference count mismatch');
  assert.equal(new Set(phaseReferences.map(reference => reference.taskId)).size, tasks.length, 'Repeated phase reference');
  for (const reference of phaseReferences) {
    assert(!Object.hasOwn(reference, 'id') && known.has(reference.taskId), 'Invalid reference-only index');
    assert(fs.existsSync(path.resolve(root, reference.canonicalFile)), 'Missing canonical reference target');
  }
  for (const module of new Set(tasks.map(task => task.module))) assert(fs.existsSync(path.join(root, module, 'README.md')), `Missing domain README: ${module}`);
  console.log(`Validated ${tasks.length} unique records, source coverage, dependencies/DAG, rollups, references, and generated Markdown.`);
}

function completeMigration() {
  validate();
  const file = path.join(root, 'registry-state.json');
  const state = json(file);
  assert(state.migration['MIG-003'], 'Import must complete first');
  if (!state.migration['MIG-004']) {
    state.migration['MIG-004'] = true;
    writeJson(file, state);
    sync('MIG-004 completed: generated domain/phase indexes and full completion graph.');
    validate();
  }
  const validated = json(file);
  validated.migration['MIG-005'] = true;
  writeJson(file, validated);
  sync('MIG-005 completed: migration coverage, dependency DAG, rollups, and generated output validated.');
  validate();
}

if (require.main === module) {
  try {
    const command = process.argv[2];
    assert(['import', 'sync', 'validate', 'complete-migration'].includes(command),
      'Usage: node .\\master\\tools\\task-registry.cjs import|sync|validate|complete-migration');
    ({ import: importRegistry, sync, validate, 'complete-migration': completeMigration })[command]();
  } catch (error) {
    console.error(`Task registry error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseSource, validateCanonical, summary, outputs };
