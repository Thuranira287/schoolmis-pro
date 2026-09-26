# School MIS Pro - Developer Guide

## Overview

This guide is for developers extending or maintaining School MIS Pro.

## Project Setup

### Prerequisites
- Node.js 18+
- pnpm 10.14.0+

### Installation
```bash
pnpm install
pnpm dev       # Start development server
pnpm build     # Production build
pnpm test      # Run tests
pnpm typecheck # Check types
```

## Architecture

### Core Layers

#### Database Layer (`client/lib/db/`)
**Files:**
- `schema.ts` - TypeScript types and IndexedDB store definitions
- `index.ts` - Database manager class and convenience functions

**Key Classes:**
- `DatabaseManager` - Singleton managing all DB operations
- `dbOps` - Convenience functions for common queries

**Usage:**
```typescript
import { db, dbOps } from '@/lib/db';

// Initialize
await db.initialize();

// Read
const student = await dbOps.getStudent('student_123');

// Write
await dbOps.createStudent(studentData);

// Query by index
const classStudents = await dbOps.getStudentsByClass('class_456');

// Batch operations
await db.batchWrite('students', studentArray);

// Backup/Restore
const backup = await db.exportAll();
await db.importAll(backup);
```

#### Authentication Layer (`client/lib/auth/`)
**Files:**
- `index.ts` - AuthManager class for login, logout, sessions

**Key Features:**
- Password hashing (SHA-256)
- Session management with 24-hour expiry
- Multi-tenant support via admin key
- Audit logging

**Usage:**
```typescript
import { auth } from '@/lib/auth';

// Initialize
await auth.initialize();

// Login
const result = await auth.login({
  email: 'user@school.com',
  password: 'password',
  adminKey: 'school_key'
});

// Check auth status
if (!auth.isAuthenticated()) {
  navigate('/login');
}

// Get current user info
const userId = auth.getCurrentUserId();
const schoolId = auth.getCurrentSchoolId();
const role = auth.getCurrentRole();

// Logout
await auth.logout();
```

#### RBAC Layer (`client/lib/rbac/`)
**Files:**
- `index.ts` - RBACManager for permission checking

**Key Features:**
- 5 roles with granular permissions
- Route protection
- UI-level permission enforcement

**Usage:**
```typescript
import { rbac, usePermission, useRole } from '@/lib/rbac';

// Check permission
if (rbac.currentUserHasPermission('enter_marks')) {
  // Show marks entry UI
}

// Check role
const role = rbac.getRole();
if (role === 'admin') {
  // Admin-only logic
}

// Get menu items
const menu = rbac.getMenuItems(role);

// React hooks
function MyComponent() {
  const hasPermission = usePermission('manage_students');
  const role = useRole();
  
  return hasPermission ? <div>Content</div> : null;
}
```

#### Grading Layer (`client/lib/grades/`)
**Files:**
- `grading.ts` - GradingSystem class for CBC grade conversion

**Key Features:**
- Automatic grade conversion (EE/ME/AE/BE)
- Statistical analysis
- Performance trends

**Usage:**
```typescript
import { grading } from '@/lib/grades/grading';

// Convert marks to grade
const grade = grading.getGrade(85, 100); // Returns 'EE'

// Get class average
const avg = grading.calculateClassAverage([85, 90, 78], 100);
// { average: 84.33, percentage: 84.33, grade: 'EE' }

// Get rank
const rank = grading.getStudentRank(85, [85, 90, 78]);
// { rank: 2, totalStudents: 3, percentile: 67 }

// Grade distribution
const dist = grading.getGradeDistribution(
  [{ studentName: 'John', mark: 85 }],
  100
);
```

#### Reports Layer (`client/lib/reports/`)
**Files:**
- `pdf-generator.ts` - PDFGenerator utility for PDF creation

**Key Features:**
- Student report card generation
- Class summary generation
- Professional formatting

**Usage:**
```typescript
import { PDFGenerator } from '@/lib/reports/pdf-generator';

// Generate student report
const pdf = PDFGenerator.generateReportCard({
  school,
  student,
  class: classData,
  marks: marksWithSubjects,
  term: 1,
  year: 2024
});

// Download
PDFGenerator.downloadPDF(pdf, 'student_report.pdf');

// Generate class summary
const classPdf = PDFGenerator.generateClassSummary({
  school,
  class: classData,
  term: 1,
  year: 2026,
  studentMarks: [ /* ... */ ]
});
```

## Adding New Features

### 1. Add New Database Store

In `client/lib/db/schema.ts`:

```typescript
// 1. Define type
export interface NewEntity {
  id: string;
  schoolId: string;
  // ... fields
  createdAt: number;
  updatedAt: number;
}

// 2. Add to DB_STORES
export const DB_STORES = {
  // ...
  newEntities: {
    keyPath: 'id',
    indexes: [
      { name: 'schoolId', keyPath: 'schoolId' },
      // ... other indexes
    ],
  },
};
```

In `client/lib/db/index.ts`:

```typescript
// 3. Add convenience functions to dbOps
export const dbOps = {
  // ...
  async getNewEntity(entityId: string): Promise<NewEntity | undefined> {
    return db.read('newEntities', entityId);
  },

  async createNewEntity(entity: NewEntity): Promise<void> {
    return db.write('newEntities', entity);
  },
};
```

### 2. Add New Permission

In `client/lib/rbac/index.ts`:

```typescript
// 1. Add to Permission type
export type Permission = 
  | 'existing_permission'
  | 'new_permission';

// 2. Add to rolePermissions
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    // ... existing
    'new_permission',
  ],
  // ... other roles
};
```

### 3. Add New Page

Create `client/pages/NewFeature.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { dbOps } from '@/lib/db';
import { rbac } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppShell from '@/components/AppShell';

export default function NewFeature() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const schoolId = auth.getCurrentSchoolId();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load data
      const allData = await dbOps.getAll('newEntities');
      const schoolData = allData.filter((item: any) => item.schoolId === schoolId);
      setData(schoolData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Feature</h1>
      </div>
      {/* Component content */}
    </div>
  );
}
```

Add route in `client/App.tsx`:

```typescript
import NewFeature from "./pages/NewFeature";

// In Routes:
<Route
  path="/new-feature"
  element={
    <ProtectedRoute requiredRoles={['admin']}>
      <AppShell>
        <NewFeature />
      </AppShell>
    </ProtectedRoute>
  }
/>
```

## Common Patterns

### Data Loading Pattern
```typescript
const [data, setData] = useState<Data[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    const allData = await dbOps.getAll('store');
    const filtered = allData.filter((item: any) => item.schoolId === schoolId);
    setData(filtered);
  } catch (err) {
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};
```

### CRUD Operations
```typescript
// Create
const newItem: Item = {
  id: `item_${Date.now()}_${Math.random()}`,
  schoolId,
  // ... fields
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
await dbOps.write('items', newItem);

// Update
item.field = newValue;
item.updatedAt = Date.now();
await dbOps.write('items', item);

// Delete (soft delete)
item.isActive = false;
item.updatedAt = Date.now();
await dbOps.write('items', item);

// Log action
await dbOps.createAuditLog({
  id: `log_${Date.now()}_${Math.random()}`,
  schoolId,
  userId: auth.getCurrentUserId() || '',
  action: 'create', // or 'update', 'delete'
  entityType: 'item',
  entityId: newItem.id,
  timestamp: Date.now(),
});
```

### Permission Checking
```typescript
// Function-level
if (!rbac.currentUserHasPermission('manage_users')) {
  return <AccessDenied />;
}

// Component-level
<ProtectedRoute requiredRoles={['admin', 'principal']}>
  <FeatureComponent />
</ProtectedRoute>

// UI-level
{rbac.currentUserHasPermission('enter_marks') && (
  <Button onClick={handleEnterMarks}>Enter Marks</Button>
)}
```

## Debugging

### Browser DevTools
1. **IndexedDB**: Chrome DevTools → Application → IndexedDB → SchoolMISPro
2. **Local Storage**: Chrome DevTools → Application → Local Storage
3. **Console**: Check for TypeScript/React errors

### Common Issues

**"School ID not found"**
- Check if user is logged in: `auth.getSession()`
- Verify school exists in IndexedDB

**"Database not initialized"**
- Call `await db.initialize()` in useEffect
- Check browser supports IndexedDB

**"Permission denied"**
- Verify user role: `auth.getCurrentRole()`
- Check RBAC permissions

**Build errors**
- Run `pnpm typecheck`
- Check for missing imports
- Verify component paths

## Testing

### Unit Tests
Use Vitest for component and utility testing:

```bash
pnpm test
```

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { grading } from '@/lib/grades/grading';

describe('Grading System', () => {
  it('converts 85% to EE grade', () => {
    const grade = grading.getGrade(85, 100);
    expect(grade).toBe('EE');
  });
});
```

### Integration Tests
Test with actual IndexedDB:

```typescript
import { db } from '@/lib/db';

it('creates and retrieves student', async () => {
  await db.initialize();
  
  const student: Student = { /* ... */ };
  await dbOps.createStudent(student);
  
  const retrieved = await dbOps.getStudent(student.id);
  expect(retrieved).toEqual(student);
});
```

## Performance Tips

1. **Pagination** - Use `getAllPaginated()` for large datasets
2. **Indexing** - Create indexes for frequently queried fields
3. **Lazy Loading** - Load data only when needed
4. **Memoization** - Use `useMemo()` for expensive calculations
5. **Component Splitting** - Break large pages into smaller components

## Deployment

### Web (Netlify/Vercel)
```bash
pnpm build
# Deploy dist/ folder
```

### Self-hosted
```bash
pnpm build
pnpm start
# Runs on http://localhost:3000
```

### Development
```bash
pnpm dev
# Hot reload on file changes
```

## Extending for Other Platforms

### Electron (Desktop)
1. Keep all business logic in `client/lib/`
2. Avoid DOM-dependent code outside components
3. Use file APIs for backup/restore

### Capacitor (Mobile)
1. Test touch interactions
2. Handle permission requests
3. Optimize for mobile viewport
4. Use Capacitor plugins for camera, storage

## Contributing

1. Follow existing code patterns
2. Keep components small and focused
3. Add audit logging for data changes
4. Update types in schema.ts
5. Test role-based access
6. Document new APIs

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [Recharts Documentation](https://recharts.org)

---

**Questions?** Check the code comments and existing implementations for patterns.
