# Zanvex Graph Visualization

## Overview

Use [React Flow](https://reactflow.dev) to provide interactive graph-based visualization for:

1. **Schema Graph** - View/edit object types and their relations
2. **Traversal Graph** - Visualize permission check paths in real-time

Both views consume the same Zanvex endpoints as the standard UI - just rendered as nodes and edges instead of forms and lists.

---

## Shared Data Layer

The graph components use existing endpoints:

| Endpoint | Schema Graph | Traversal Graph |
|----------|--------------|-----------------|
| `listObjectTypes()` | Nodes = types | - |
| `getRelationsForType()` | Edges = relations | - |
| `listPermissionRules()` | Edge labels (permissions) | Rule lookup |
| `can()` | - | Traversal path |
| `listTuplesForObject()` | - | Instance edges |

No new backend endpoints required. The graph is a visualization layer only.

---

## Component 1: Schema Graph

### Purpose

Visual representation of the permission model schema. Shows all object types and how they relate to each other.

### Data Flow

```
listObjectTypes() → nodes (one per type)
                  → edges (one per relation)
```

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Schema Graph                                            [+ Add Type]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│    ┌────────────┐                                                           │
│    │    user    │◄───────────────────────────────┐                          │
│    │            │                                │                          │
│    └────────────┘                                │                          │
│          ▲                                       │                          │
│          │ admin_of                              │ booker                   │
│          │ member_of                             │                          │
│          │                                       │                          │
│    ┌─────┴──────┐         ┌────────────┐   ┌────┴───────┐                   │
│    │    org     │◄────────│  resource  │◄──│  booking   │                   │
│    │            │  owner  │            │   │            │                   │
│    └────────────┘         └────────────┘   └────────────┘                   │
│                                  ▲               │                          │
│                                  │    parent     │                          │
│                                  └───────────────┘                          │
│                                                                             │
│  Legend: [□ Object Type]  [──▶ Relation]                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Node Design

```tsx
// Custom node for object types
const ObjectTypeNode = ({ data }) => (
  <div className="object-type-node">
    <div className="node-header">{data.icon} {data.name}</div>
    <div className="node-body">
      <div className="relations-count">
        {data.relationsCount} relations
      </div>
      <div className="permissions-count">
        {data.permissionsCount} permissions
      </div>
    </div>
  </div>
);
```

### Edge Design

```tsx
// Custom edge with relation label
const RelationEdge = ({ data }) => (
  <EdgeLabelRenderer>
    <div className="relation-label">
      {data.relationName}
    </div>
  </EdgeLabelRenderer>
);
```

### Interactions

| Action | Result |
|--------|--------|
| Click node | Open ObjectTypeEditor modal |
| Click edge | Edit relation (rename, delete) |
| Drag from node | Create new relation |
| Double-click canvas | Add new object type |
| Delete key | Remove selected node/edge |

### Layout

Use `dagre` for automatic hierarchical layout:

```tsx
import dagre from 'dagre';

const getLayoutedElements = (nodes, edges) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'BT' }); // Bottom to top (users at bottom)

  nodes.forEach((node) => g.setNode(node.id, { width: 150, height: 60 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  // Apply positions to nodes
  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { x: g.node(node.id).x, y: g.node(node.id).y },
    })),
    edges,
  };
};
```

---

## Component 2: Traversal Graph

### Purpose

Visualize the path a permission check takes through the tuple graph. Shows exactly why access was granted or denied.

### Data Flow

```
can(subject, action, object) → { allowed, reason, path }
                                           │
                                           ▼
                              Render path as animated graph
```

### Visual Design - Allowed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Permission Check: can(user:daniel, cancel, booking:session)                │
│  Result: ✓ ALLOWED via parent->edit                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │
│    │ ○ SUBJECT   │       │             │       │             │              │
│    │             │       │             │       │             │              │
│    │ user:daniel │══════▶│  org:acme   │══════▶│  resource:  │              │
│    │             │       │             │       │   studio    │              │
│    │   ✓ START   │admin  │  ✓ hop 1    │owner  │  ✓ hop 2    │              │
│    └─────────────┘ _of   └─────────────┘       └──────┬──────┘              │
│                                                       │                     │
│                                                       │ parent              │
│                                                       ▼                     │
│                                                ┌─────────────┐              │
│                                                │ ◉ TARGET    │              │
│                                                │             │              │
│                                                │  booking:   │              │
│                                                │   session   │              │
│                                                │             │              │
│                                                │  ✓ ALLOWED  │              │
│                                                └─────────────┘              │
│                                                                             │
│  Rule matched: booking.cancel = parent->edit | booker                       │
│  Path: daniel ─[admin_of]→ acme ─[owner]→ studio ─[parent]→ session         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visual Design - Denied

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Permission Check: can(user:eve, cancel, booking:session)                   │
│  Result: ✗ DENIED - No matching rule granted access                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────┐                             ┌─────────────┐              │
│    │ ○ SUBJECT   │                             │ ◉ TARGET    │              │
│    │             │         ╳ no path           │             │              │
│    │  user:eve   │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▶│  booking:   │              │
│    │             │                             │   session   │              │
│    │   ✗ START   │                             │  ✗ DENIED   │              │
│    └─────────────┘                             └─────────────┘              │
│                                                                             │
│  Tried paths:                                                               │
│    ✗ parent->edit: eve has no relation to resource:studio                   │
│    ✗ booker: no tuple (booking:session, booker, user:eve)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Node States

```tsx
type NodeState =
  | 'subject'    // Starting point (user)
  | 'target'     // Ending point (object being checked)
  | 'passed'     // Traversal succeeded through this node
  | 'failed'     // Traversal attempted but failed
  | 'skipped';   // Not visited

const nodeColors = {
  subject: '#3b82f6',  // Blue
  target: '#8b5cf6',   // Purple
  passed: '#22c55e',   // Green
  failed: '#ef4444',   // Red
  skipped: '#6b7280',  // Gray
};
```

### Edge Animation

```tsx
// Animate edges as traversal progresses
const AnimatedEdge = ({ data, style }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (data.traversalOrder !== undefined) {
      setTimeout(() => setAnimated(true), data.traversalOrder * 500);
    }
  }, [data.traversalOrder]);

  return (
    <BaseEdge
      style={{
        ...style,
        stroke: animated ? '#22c55e' : '#e5e7eb',
        strokeWidth: animated ? 3 : 1,
        transition: 'all 0.3s ease-in-out',
      }}
    />
  );
};
```

### Step-by-Step Playback

```tsx
const TraversalGraph = ({ result }) => {
  const [step, setStep] = useState(0);
  const maxSteps = result.path.length;

  return (
    <>
      <ReactFlow nodes={nodes} edges={edges} />
      <div className="playback-controls">
        <button onClick={() => setStep(0)}>⏮ Reset</button>
        <button onClick={() => setStep(s => Math.max(0, s - 1))}>◀ Back</button>
        <span>Step {step} of {maxSteps}</span>
        <button onClick={() => setStep(s => Math.min(maxSteps, s + 1))}>Next ▶</button>
        <button onClick={() => setStep(maxSteps)}>⏭ End</button>
      </div>
    </>
  );
};
```

---

## Backend Enhancement: Detailed Traversal Path

Currently `can()` returns:

```typescript
{ allowed: boolean, reason: string, path: string[] }
```

For rich visualization, enhance to return:

```typescript
{
  allowed: boolean,
  reason: string,
  traversal: {
    steps: Array<{
      node: { type: string, id: string },
      edge: { relation: string, direction: 'forward' | 'backward' } | null,
      check: { permission: string, result: 'passed' | 'failed' } | null,
      rule: string | null,  // DSL expression if rule was evaluated
    }>,
    triedPaths: Array<{
      path: string,
      failedAt: { type: string, id: string },
      reason: string,
    }>,
  }
}
```

This gives the UI enough information to:
1. Draw all nodes visited
2. Animate the successful path
3. Show failed attempts (for debugging)

---

## File Structure

```
zanvex/
└── react/
    ├── index.ts
    ├── ZanvexPermissionManager.tsx
    ├── graph/
    │   ├── index.ts
    │   ├── SchemaGraph.tsx           # Object types + relations
    │   ├── TraversalGraph.tsx        # Permission check visualization
    │   ├── nodes/
    │   │   ├── ObjectTypeNode.tsx    # Node for schema view
    │   │   └── InstanceNode.tsx      # Node for traversal view
    │   ├── edges/
    │   │   ├── RelationEdge.tsx      # Edge for schema view
    │   │   └── TraversalEdge.tsx     # Animated edge for traversal
    │   └── controls/
    │       ├── GraphToolbar.tsx      # Zoom, layout, export
    │       └── PlaybackControls.tsx  # Step through traversal
    └── hooks/
        ├── useSchemaGraph.ts         # Transform objectTypes → nodes/edges
        └── useTraversalGraph.ts      # Transform can() result → nodes/edges
```

---

## Hooks

### useSchemaGraph

```tsx
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export function useSchemaGraph(api) {
  const objectTypes = useQuery(api.listObjectTypes);

  return useMemo(() => {
    if (!objectTypes) return { nodes: [], edges: [] };

    const nodes = objectTypes.map((type, index) => ({
      id: type.name,
      type: 'objectType',
      position: { x: 0, y: 0 }, // Will be laid out by dagre
      data: {
        name: type.name,
        description: type.description,
        relationsCount: type.relations.length,
      },
    }));

    const edges = objectTypes.flatMap((type) =>
      type.relations.map((rel) => ({
        id: `${type.name}-${rel.name}-${rel.targetType}`,
        source: type.name,
        target: rel.targetType,
        type: 'relation',
        label: rel.name,
        data: { relationName: rel.name },
      }))
    );

    return layoutWithDagre(nodes, edges);
  }, [objectTypes]);
}
```

### useTraversalGraph

```tsx
export function useTraversalGraph(traversalResult) {
  return useMemo(() => {
    if (!traversalResult?.traversal) return { nodes: [], edges: [] };

    const { steps, triedPaths } = traversalResult.traversal;
    const nodes = [];
    const edges = [];
    const seenNodes = new Set();

    steps.forEach((step, index) => {
      const nodeId = `${step.node.type}:${step.node.id}`;

      if (!seenNodes.has(nodeId)) {
        seenNodes.add(nodeId);
        nodes.push({
          id: nodeId,
          type: 'instance',
          data: {
            ...step.node,
            state: index === 0 ? 'subject'
                 : index === steps.length - 1 ? 'target'
                 : 'passed',
            stepNumber: index,
          },
        });
      }

      if (step.edge && index > 0) {
        const prevNodeId = `${steps[index - 1].node.type}:${steps[index - 1].node.id}`;
        edges.push({
          id: `edge-${index}`,
          source: prevNodeId,
          target: nodeId,
          type: 'traversal',
          data: {
            relation: step.edge.relation,
            traversalOrder: index,
            state: 'passed',
          },
        });
      }
    });

    return layoutWithDagre(nodes, edges);
  }, [traversalResult]);
}
```

---

## Integration with Permission Manager

The graphs integrate into the main Permission Manager UI:

```tsx
import { SchemaGraph } from './graph/SchemaGraph';
import { TraversalGraph } from './graph/TraversalGraph';

export function ZanvexPermissionManager() {
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [testResult, setTestResult] = useState(null);

  return (
    <div>
      <Tabs value={view} onChange={setView}>
        <Tab value="list">List View</Tab>
        <Tab value="graph">Graph View</Tab>
      </Tabs>

      {view === 'list' && (
        <>
          <ObjectTypeManager />
          <RuleManager />
        </>
      )}

      {view === 'graph' && (
        <SchemaGraph />
      )}

      <RuleTester onResult={setTestResult} />

      {testResult && (
        <TraversalGraph result={testResult} />
      )}
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Basic Schema Graph

| Task | Complexity |
|------|------------|
| Install react-flow-renderer | Small |
| Create ObjectTypeNode component | Small |
| Create RelationEdge component | Small |
| Create useSchemaGraph hook | Medium |
| Create SchemaGraph component | Medium |
| Integrate dagre layout | Small |

### Phase 2: Interactive Schema Editing

| Task | Complexity |
|------|------------|
| Click node → open editor modal | Small |
| Click edge → edit relation | Small |
| Drag to create new relation | Medium |
| Delete node/edge | Small |
| Undo/redo support | Medium |

### Phase 3: Basic Traversal Graph

| Task | Complexity |
|------|------------|
| Enhance can() to return detailed path | Medium |
| Create InstanceNode component | Small |
| Create TraversalEdge with animation | Medium |
| Create useTraversalGraph hook | Medium |
| Create TraversalGraph component | Medium |

### Phase 4: Traversal Animation

| Task | Complexity |
|------|------------|
| Step-by-step playback controls | Medium |
| Edge animation on traversal | Medium |
| Node state transitions | Small |
| Show failed paths (grayed out) | Medium |

### Phase 5: Polish

| Task | Complexity |
|------|------------|
| Zoom/pan controls | Small (built-in) |
| Export graph as image | Small |
| Minimap for large graphs | Small (built-in) |
| Dark mode support | Small |
| Mobile/touch support | Medium |

---

## Dependencies

```json
{
  "dependencies": {
    "reactflow": "^11.x",
    "dagre": "^0.8.x"
  }
}
```

React Flow is MIT licensed and has excellent documentation.

---

## Open Questions

### 1. Instance Graph?

Should we also visualize actual tuple data (not just schema)?

```
Show all tuples for org:acme:
  org:acme ──admin_of──▶ user:daniel
  org:acme ──admin_of──▶ user:sarah
  org:acme ──member_of──▶ user:mike
```

Could get large. Maybe filter by object or subject.

### 2. Live Updates?

Should the graph update in real-time as tuples change?

React Flow + Convex's reactive queries = automatic updates. Just need to handle animations smoothly.

### 3. Diff View?

Show what changed between two permission checks?

"Before: denied, After: allowed, Because: new tuple (org:acme, admin_of, user:eve)"

---

## Success Criteria

- [ ] Schema Graph displays all object types as nodes
- [ ] Relations shown as labeled edges between nodes
- [ ] Dagre layout produces clean hierarchical view
- [ ] Click node opens ObjectTypeEditor
- [ ] Traversal Graph shows permission check path
- [ ] Nodes colored by state (subject/target/passed/failed)
- [ ] Edges animate during traversal playback
- [ ] Failed paths shown for debugging
- [ ] Integrates into ZanvexPermissionManager component

---

## Related Plans

- `object-types-schema-registry.md` - Data layer for Schema Graph
- `react-permission-manager.md` - UI that contains the graphs
