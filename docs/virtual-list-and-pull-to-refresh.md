# Virtual List & Pull-to-Refresh Checklist

## Component Overview

### 1. VirtualList (`src/components/VirtualList.tsx`)

- **Virtual list**: `@tanstack/react-virtual`, renders only visible items
- **Pull-to-refresh**: Optional `onRefresh` / `refreshing`, triggered by pulling down at top
- **Event capture**: `onTouchStartCapture` + `onTouchEndCapture` with `stopPropagation` in capture phase to avoid triggering outer page refresh
- **Top threshold**: `SCROLL_TOP_THRESHOLD = 15` (within ~15px of top to allow refresh)

### 2. VirtualTable (`src/components/VirtualTable.tsx`)

- **Virtual table**: Same as above, with header and grid columns
- **Pull-to-refresh**: Optional `onRefresh` / `refreshing`
- **Load more**: Optional `onLoadMore` / `hasMore` / `loadMoreThreshold`, triggered when scrolling near bottom
- **Event capture**: Same as VirtualList; uses `onTouchStartCapture` / `onTouchEndCapture`

### 3. PullToRefresh (`src/components/PullToRefresh.tsx`)

- **Page-level pull-to-refresh**: Wraps scrollable content; pull down at top to show “Pull to refresh” and trigger `onRefresh`
- **Event capture**: `stopPropagation` in `touchStart` / `touchMove` / `touchEnd` to avoid bubbling

---

## Usage

| Page / Component        | List / Refresh Used                                                   | Refresh Source                                              | Event capture                         |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| **HomePage**            | NetworkList → VirtualList                                             | `refresh` (fetch network list)                              | ✅ VirtualList capture                |
| **NetworkPage**         | PullToRefresh (page) + VirtualTable (token list)                      | Page `refresh`, table `onRefresh={refresh}`                 | ✅ VirtualTable capture               |
| **TokenPage**           | PullToRefresh (page) + VirtualTable (Recent Tx) + VirtualList (Pools) | Page `refresh`, Events/Pools both get `onRefresh={refresh}` | ✅ VirtualTable / VirtualList capture |
| **TokenPageEventsCard** | VirtualTable, height 50vh                                             | `onRefresh` / `refreshing` from TokenPage                   | ✅                                    |
| **TokenPagePoolsCard**  | VirtualList, maxHeight 320                                            | `onRefresh` / `refreshing` from Sidebar → TokenPage         | ✅                                    |

---

## Behavior

1. **Inner list wins**: When pulling down at top of VirtualList / VirtualTable, the list handles refresh and stops propagation; outer PullToRefresh does not fire.
2. **Page refresh**: When pulling down at top of other scrollable areas (not the above lists), PullToRefresh runs page `onRefresh`.
3. **Load more**: Only VirtualTable supports it; requires `onLoadMore`, `hasMore`. NetworkPage token list does not use pagination yet; can be wired as needed.

---

## Recent changes

- **VirtualTable**: Added `onTouchStartCapture` and `onTouchEndCapture` for pull-to-refresh, aligned with VirtualList, so pulling on Network page token list or Token page Recent Transactions does not trigger page-level refresh.
