# School MIS Pro - Quick Start Guide

## Overview

School MIS Pro is an **offline-first, multi-platform School Management Information System** built for Kenyan schools using the CBC curriculum. This MVP includes core functionality for student management, marks entry with automatic CBC grading, and PDF report generation.

## What's Been Built (MVP)

### Phase 1: Core Infrastructure
- **IndexedDB Database Layer** - Multi-tenant database with 10 stores for offline storage
- **Authentication System** - Secure login with email/password + school admin key
- **Role-Based Access Control** - 5 roles (Admin, Principal, Teacher, Accountant, Student)
- **CBC Grading System** - Automatic grade conversion (EE/ME/AE/BE) with analytics

### Phase 2: SMIS Core Features
- **Student Management** - Register students, assign to classes (full CRUD)
- **Class Management** - Create classes, assign teachers (full CRUD)
- **Marks Entry Interface** - Teachers enter marks with real-time CBC grade conversion
- **Dashboard** - Role-specific home page with quick stats

### Phase 3: Advanced Features
- **User Management** - Create/edit/delete staff accounts with role assignment
- **Analytics Dashboard** - Performance charts, grade distribution, top performers
- **PDF Report Cards** - Generate student report cards with all marks and grades
- **Class Summary Reports** - Generate class performance analysis
- **Audit Trail System** - Track all system activities with CSV export

## Getting Started

### 1. First-Time Setup

When you open the app for the first time, you'll see a setup wizard:

1. **School Information Page**
   - Enter school name
   - Create a unique admin key (e.g., `NAIROBI2024SECURE`)
   - Enter school email and phone

2. **Admin Account Page**
   - Create your administrator account
   - Set up a strong password (min 8 characters)

3. **Review & Complete**
   - Review your information
   - Click "Complete Setup"

### 2. Login

After setup, login with:
- **Admin Key**: The key you created during setup
- **Email**: Your administrator email
- **Password**: Your password

### 3. Create Classes (Admin/Principal)

1. Go to **Classes** from sidebar
2. Click **Add Class**
3. Enter:
   - Class name (e.g., "Form 1A")
   - Level (Junior or Senior School)
   - Form number (1-4)
   - Select a class teacher

### 4. Add Subjects (Admin/Principal)

First, you'll need to add subjects:
- Use the database directly for now (mark entry page filters by class level)
- Subjects should be created with max marks (typically 100)

### 5. Register Students (Admin/Principal/Teacher)

1. Go to **Students**
2. Click **Add Student**
3. Enter:
   - First and last name
   - Admission number (unique per student)
   - Date of birth
   - Gender
   - Class assignment
   - Parent contact info

### 6. Enter Marks (Teacher)

1. Go to **Marks Entry**
2. Select **Class** → **Subject** → **Term** → **Year**
3. Click **Load Marks**
4. Click **Enter Marks** and input marks for each student
5. Grades are calculated automatically (EE/ME/AE/BE)
6. Click **Save All Marks**

**CBC Grade Scale:**
- **EE** (80-100%) - Excellent
- **ME** (65-79%) - Mastery
- **AE** (50-64%) - Approaching Excellence
- **BE** (0-49%) - Below Expected

### 7. Manage Users (Admin/Principal)

1. Go to **Users**
2. Click **Add User**
3. Enter name, email, role, and password
4. Click **Save**
5. Admins can manage all roles; Principals can manage teachers only

### 8. View Analytics (Admin/Principal/Teacher)

1. Go to **Analytics & Insights**
2. View key metrics:
   - Average school performance
   - Grade distribution (EE/ME/AE/BE)
   - Performance by class
   - Top 5 performing students

### 9. Generate Reports

1. Go to **Reports**
2. Choose:
   - **Student Report Card** - Individual student report
   - **Class Summary** - Class performance analysis
3. Select student/class, term, and year
4. Click **Generate & Download PDF**

### 10. Monitor System Activity (Admin/Principal)

1. Go to **Audit Logs**
2. View all system activities:
   - Login/logout events
   - Data creation, modification, deletion
   - Report generation
3. Click **Export CSV** to download activity report

## Key Features

### Offline-First Operation
- All data is stored locally in your browser using IndexedDB
- Works without internet connection
- Perfect for schools with limited connectivity

### Multi-Tenant Isolation
- Each school is completely isolated
- Schools identified by unique admin key
- Multiple schools can use the same installation

### Role-Based Access
- **Admin**: Full system access
- **Principal**: Manage users, view reports, no settings
- **Teacher**: Manage classes, enter marks
- **Accountant**: Manage payments, view reports
- **Student**: View own marks and reports

### Automatic Audit Logging
- All actions logged (create, update, delete, login)
- Tracks user, action, timestamp, affected record

## Database Structure

The system uses these IndexedDB stores:

```
schools         - School records with admin keys
users           - User accounts with role assignments
students        - Student information and enrollment
classes         - Class definitions
subjects        - Subject definitions
marks           - Student marks and grades
attendance      - Attendance records
payments        - Fee payment tracking
auditLogs       - System audit trail
```

## Architecture

```
School MIS Pro
├── client/
│   ├── lib/
│   │   ├── db/              (Database operations)
│   │   ├── auth/            (Authentication & sessions)
│   │   ├── rbac/            (Role-based access control)
│   │   ├── grades/          (CBC grading logic)
│   │   └── reports/         (PDF generation)
│   ├── components/          (Reusable UI components)
│   ├── pages/               (Route pages)
│   └── App.tsx              (Main app entry)
```

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: IndexedDB (offline-first)
- **UI**: Radix UI + TailwindCSS
- **Reports**: jsPDF + jspdf-autotable
- **Routing**: React Router v6
- **State Management**: React hooks + Context API

## Testing the System

### Demo Credentials (After Setup)
After completing setup, you can:
1. Create multiple users (Admin/Principal)
2. Create classes and assign teachers
3. Register students
4. Enter marks and generate reports

### Sample Workflow

1. **Admin**: Create 2 classes (Form 1A, Form 1B)
2. **Admin**: Create 5 subjects (Math, English, Kiswahili, Science, Social Studies)
3. **Admin**: Create 2 teacher accounts and assign to classes
4. **Principal/Admin**: Register 30 students and distribute into classes
5. **Teacher**: Enter marks for their class across all subjects
6. **Admin**: Generate and view PDF reports

## Next Steps (Not Yet Implemented)

The following features are planned but not in this MVP:

1. **User Management Page** - Add/edit/delete users (currently use API)
2. **Analytics Dashboard** - Charts showing performance trends
3. **Attendance Management** - Track student attendance
4. **Payment Management** - Fee tracking and payment status
5. **Audit Dashboard** - View system activity logs
6. **QR Code Transfer** - Transfer data between devices
7. **Cloud Sync** - Sync data to Firebase
8. **PWA Setup** - Progressive Web App installation
9. **Electron Packaging** - Desktop application
10. **Capacitor Android** - APK generation

## Deployment Options

### Web (Currently Available)
- Deploy to Netlify or Vercel
- Runs in browser as PWA
- No server needed (fully client-side)

### Desktop (Planned)
- Package with Electron.js
- Distribute as .exe or .dmg
- File system access for backups

### Mobile (Planned)
- Convert to APK with Capacitor.js
- Install on Android devices
- Native camera access for QR scanning

## Security Notes

### Implemented
- Password hashing (SHA-256)
- Session management with expiry
- Role-based access control
- Audit logging of all actions

### Recommended Practices
- Use strong admin keys
- Change default passwords
- Back up database regularly
- Keep school data secure
- Use HTTPS when online

## Troubleshooting

### Data Not Saving?
- Check browser's IndexedDB storage
- Ensure localStorage is enabled
- Check browser console for errors

### Can't Login?
- Verify admin key is correct
- Check email matches user record
- Verify user is set as active

### PDF Generation Failed?
- Ensure all marks are entered
- Check student has marks in selected term
- Verify subjects are properly configured

### Missing Menu Items?
- Check user role permissions
- Verify role is correctly assigned
- Log out and log back in

## Support & Contributing

For issues or improvements:
1. Check existing data in IndexedDB
2. Review audit logs for errors
3. Test with fresh data first
4. Report issues with error details

## License

School MIS Pro - Built for Kenyan schools using CBC curriculum

---

**Version**: 1.0.0 MVP
**Last Updated**: 2024
**Status**: Production-ready for offline-first deployment
