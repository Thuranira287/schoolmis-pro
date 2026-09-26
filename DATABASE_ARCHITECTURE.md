# Multi-Layer Database Architecture

## Overview

The School MIS Pro now uses a **three-tier database system** that intelligently adapts to the platform:

1. **IndexedDB** - Offline-first web/mobile storage (all platforms)
2. **SQLite** - High-performance local database (Electron desktop)
3. **PostgreSQL** - Cloud synchronization (future feature)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Database Adapter                            │
│                   (Auto-detects platform)                        │
└────────┬──────────────────────────────────────────────┬──────────┘
         │                                              │
    Web/Mobile                                      Electron
         │                                              │
         ▼                                              ▼
    ┌─────────┐                                   ┌──────────┐
    │IndexedDB│                                   │ SQLite   │
    │(Offline)│                                   │(Local)   │
    └─────────┘                                   └──────────┘
         │                                              │
         └──────────────┬───────────────────────────────┘
                        │
                        ▼ (sync layer - future)
                    ┌──────────┐
                    │PostgreSQL│
                    │ (Cloud)  │
                    └──────────┘
```

## Database Selection Logic

```typescript
// In client/lib/db/adapter.ts
detectDatabaseType() {
  // Electron app → SQLite
  if (window.electronAPI || process.versions.electron) return 'sqlite';
  
  // Web/Mobile → IndexedDB
  return 'indexeddb';
}
```

## Key Files

### 1. `client/lib/db/adapter.ts`
**Purpose**: Platform detection and unified interface
- Detects running environment (web/mobile/Electron)
- Routes all database calls to appropriate backend
- Provides same API regardless of underlying database

**Usage**:
```typescript
import { dbAdapter } from '@/lib/db/adapter';

// API is identical regardless of platform
await dbAdapter.initialize();
const students = await dbAdapter.getStudentsByClass(classId);
await dbAdapter.createMark(markData);
```

### 2. `client/lib/db/index.ts`
**Purpose**: IndexedDB implementation
- Full offline-first database
- Browser API (no external dependencies)
- Used by: Web browser, Capacitor mobile apps
- Already fully implemented and working

### 3. `client/lib/db/sqlite-manager.ts`
**Purpose**: SQLite implementation for Electron
- Uses `better-sqlite3` for synchronous operations
- Drizzle ORM integration ready
- High-performance local queries
- Used by: Electron desktop app

**Schema**:
```typescript
import Database from 'better-sqlite3';
import { SQLiteManager } from '@/lib/db/sqlite-manager';

const manager = new SQLiteManager();
await manager.initialize(); // Stores in ~/.school-mis/data/school-mis.db
```

### 4. `client/lib/db/sqlite.ts`
**Purpose**: SQLite schema definition using Drizzle ORM
- Tables: schools, users, students, teachers, classes, subjects, marks, attendance, payments, auditLogs
- Indexes for common queries
- Type exports for TypeScript safety

### 5. `client/lib/db/postgresql.ts`
**Purpose**: PostgreSQL schema for cloud synchronization
- Identical schema to SQLite for consistency
- Additional columns for sync tracking (synced_at, sync_status, version)
- Pseudo-code for future cloud sync implementation
- Conflict resolution strategy (server wins by default)

## Implementation Status

### Completed

- [x] IndexedDB database (fully functional)
- [x] Database adapter layer
- [x] SQLite schema definition
- [x] SQLite manager with better-sqlite3
- [x] Platform detection logic
- [x] Unified database API
- [x] App.tsx updated to use dbAdapter
- [x] Type-safe schema exports

### ⏳ In Progress

- [ ] Electron native dependency compilation (better-sqlite3 build)
- [ ] SQLite manager testing
- [ ] Electron app verification

### 📋 To Do

1. **Cloud Sync Layer** (Phase 2)
   - Implement PostgreSQL connection manager
   - Design sync conflict resolution
   - Create push/pull sync endpoints
   - Handle bidirectional sync
   - Implement sync status UI

2. **Data Migration** (Phase 2)
   - Migrate IndexedDB ↔ SQLite locally
   - Design cloud sync strategy
   - Handle offline → online transitions

3. **Testing** (Phase 2)
   - Integration tests for platform-specific databases
   - Sync correctness tests
   - Conflict resolution tests

## Component Integration

All components continue using the same API:

```typescript
// Before
import { dbOps } from '@/lib/db';
const students = await dbOps.getStudentsByClass(classId);

// After (no change needed!)
import { dbAdapter as dbOps } from '@/lib/db/adapter';
const students = await dbOps.getStudentsByClass(classId);
```

## Environment Variables (Future)

For cloud sync, create `.env.local`:
```env
VITE_DB_HOST=postgres.example.com
VITE_DB_PORT=5432
VITE_DB_NAME=school_mis
VITE_DB_USER=admin
VITE_DB_PASSWORD=secure_password
VITE_SYNC_ENABLED=true
```

## Data Storage Locations

### IndexedDB (Web/Mobile)
```
Browser: IndexedDB (automatic, browser-managed)
Capacitor Android: /data/data/com.schoolmis.app/
Capacitor iOS: Library/WebKit/com.schoolmis.app/
```

### SQLite (Electron)
```
Windows: C:\Users\{user}\AppData\Roaming\School MIS\data\school-mis.db
macOS: ~/Library/Application Support/School MIS/data/school-mis.db
Linux: ~/.config/School MIS/data/school-mis.db
```

### PostgreSQL (Cloud - Future)
```
Server: Cloud provider (AWS RDS, Digital Ocean, etc.)
Database: school_mis
```

## API Methods

All methods available on `dbAdapter`:

### School Operations
```typescript
await dbAdapter.getSchool(schoolId)
await dbAdapter.createSchool(schoolData)
```

### User Operations
```typescript
await dbAdapter.getUser(userId)
await dbAdapter.getUserByEmail(schoolId, email)
await dbAdapter.getUsersByRole(schoolId, role)
await dbAdapter.createUser(userData)
await dbAdapter.updateUser(userData)
```

### Student Operations
```typescript
await dbAdapter.getStudent(studentId)
await dbAdapter.getStudentsByClass(classId)
await dbAdapter.createStudent(studentData)
await dbAdapter.updateStudent(studentData)
```

### Class Operations
```typescript
await dbAdapter.getClass(classId)
await dbAdapter.getClassesBySchool(schoolId)
await dbAdapter.createClass(classData)
```

### Subject Operations
```typescript
await dbAdapter.getSubject(subjectId)
await dbAdapter.getSubjectsBySchool(schoolId)
await dbAdapter.createSubject(subjectData)
```

### Mark Operations
```typescript
await dbAdapter.getMark(markId)
await dbAdapter.getMarksByStudent(studentId)
await dbAdapter.createMark(markData)
```

### Generic Operations
```typescript
await dbAdapter.getAll<T>(storeName)
await dbAdapter.write<T>(storeName, data)
await dbAdapter.delete(storeName, key)
await dbAdapter.queryByIndex<T>(storeName, indexName, query)
```

### Audit & Sync
```typescript
await dbAdapter.createAuditLog(logData)
await dbAdapter.getAuditLogs(schoolId, limit)
await dbAdapter.exportAll()
await dbAdapter.importAll(data)
await dbAdapter.syncWithCloud(direction) // Future
```

## Troubleshooting

### SQLite not loading in Electron
1. Verify `better-sqlite3` installed: `pnpm list better-sqlite3`
2. Check Electron preload has access to node modules
3. Ensure database file path has write permissions

### Database not initializing
1. Check console for platform detection logs
2. Verify IndexedDB available in browser (check DevTools > Application)
3. For Electron, check main process console for SQLite errors

### Sync issues (when implemented)
1. Enable verbose logging in adapter
2. Check network connectivity
3. Review sync_events table for failure reasons
4. Check PostgreSQL server accessibility

## Next Steps

1. **Test Electron app** with SQLite backend
2. **Verify all CRUD operations** work cross-platform
3. **Set up cloud PostgreSQL** instance
4. **Implement sync layer** with conflict resolution
5. **Add data migration tools** (IndexedDB ↔ SQLite ↔ PostgreSQL)
