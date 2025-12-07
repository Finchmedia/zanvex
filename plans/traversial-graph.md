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
