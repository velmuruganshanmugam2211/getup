# Design System Documentation

## Visual Direction
Clean, calm, data-first design system with one confident brand color (`#008000`). Designed for continuous daily agency operations with quiet neutrals and purposeful semantic colors for status and calls-to-action.

## Design Tokens

### Colors
| Token | Hex / Value | Purpose |
|---|---|---|
| `primary-600` | `#008000` | Confident brand green |
| `primary-50` | `#E6F4E6` | Soft brand green tint for badges and active states |
| `primary-700` | `#006400` | Hover and active pressed states |
| `accent` | `#F59E0B` | Highlights, badges, and attention points |
| `background` | `#F6F7FB` | Soft application canvas background |
| `surface` | `#FFFFFF` | Card and panel surfaces |
| `border` | `#E2E8F0` | Subtle, clean component borders |
| `text` | `#0F172A` | Primary typography |
| `text-muted` | `#64748B` | Secondary labels and descriptive text |

### Semantic Status Colors
| Meaning | Color Token | Hex | Usages |
|---|---|---|---|
| **Good, Done** | `semantic-success` | `#16A34A` | Paid, Approved, Delivered, Done, Active |
| **In Progress** | `semantic-info` | `#0284C7` | In progress, Scheduled, Review, Sent |
| **Needs Attention** | `semantic-warning` | `#D97706` | Partial payment, Changes requested, Due soon |
| **Problem** | `semantic-danger` | `#DC2626` | Overdue, Missed meeting, Cancelled |
| **Neutral** | `semantic-slate` | `#64748B` | Draft, Planned, Paused, Lead |

### Typography & Numbers
- **Font**: Inter (`Inter, system-ui, sans-serif`)
- **Scale**: 12px (`text-xs`), 14px (`text-sm`), 16px (`text-base`), 18px (`text-lg`), 20px (`text-xl`), 24px (`text-2xl`), 30px (`text-3xl`)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Tabular Numbers**: Enabled with `tabular-nums` (`font-variant-numeric: tabular-nums`) on all monetary, date, and metrics figures.

### Elevation & Motion
- **Elevation**: Border-first approach (`border border-border`). Subtle shadows used only for overlays (`shadow-soft`) and dialogs (`shadow-modal`).
- **Radii**: 8px (`rounded-control`) for inputs and buttons; 12px (`rounded-card`) for cards; 9999px (`rounded-pill`) for tags and badges.
- **Transitions**: 150ms ease-out with full `prefers-reduced-motion` compliance.

---

## Interactive Preview Route
View the complete live showcase at:
```
/design-system
```
