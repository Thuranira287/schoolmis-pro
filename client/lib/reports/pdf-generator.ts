import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { grading } from '../grades/grading';
import type { Student, School, Mark, Subject, Class } from '../db/schema';

interface ReportCardData {
  school: School;
  student: Student;
  class: Class;
  marks: Array<{
    subject: Subject;
    mark: Mark;
  }>;
  term: number;
  year: number;
}

interface ClassSummaryData {
  school: School;
  class: Class;
  term: number;
  year: number;
  studentMarks: Array<{
    student: Student;
    marks: Mark[];
  }>;
}

export class PDFGenerator {
//Generate a student report card PDF
  static generateReportCard(data: ReportCardData): jsPDF {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header
    this.addHeader(doc, data.school, pageWidth, yPosition);
    yPosition += 35;

    // Report Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Student Report Card - Term ${data.term}, ${data.year}`, pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 12;

    // Student Info
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const infoStartY = yPosition;

    doc.setFont(undefined, 'bold');
    doc.text('Student Information:', 15, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.text(
      `Name: ${data.student.firstName} ${data.student.lastName}`,
      15,
      yPosition
    );
    doc.text(`Admission No.: ${data.student.admissionNumber}`, 110, yPosition);
    yPosition += 6;

    doc.text(`Class: ${data.class.name}`, 15, yPosition);
    doc.text(`Date of Birth: ${data.student.dateOfBirth || 'N/A'}`, 110, yPosition);
    yPosition += 10;

    // Marks Table
    const tableData: string[][] = [];
    let totalMarks = 0;
    let totalMaxMarks = 0;

    data.marks.forEach(({ subject, mark }) => {
      const percentage = ((mark.marksObtained / subject.maxMarks) * 100).toFixed(1);
      tableData.push([
        subject.name,
        `${mark.marksObtained}/${subject.maxMarks}`,
        `${percentage}%`,
        mark.grade,
        grading.getGradeDescription(mark.grade),
      ]);

      totalMarks += mark.marksObtained;
      totalMaxMarks += subject.maxMarks;
    });

    const totalPercentage = ((totalMarks / totalMaxMarks) * 100).toFixed(1);
    const totalGrade = grading.getGrade(totalMarks, totalMaxMarks);

    tableData.push([
      'TOTAL',
      `${totalMarks}/${totalMaxMarks}`,
      `${totalPercentage}%`,
      totalGrade,
      grading.getGradeDescription(totalGrade),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Subject', 'Marks', 'Percentage', 'Grade', 'Performance']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.pages.length - 1;
        doc.setFontSize(9);
        doc.text(
          `Page ${doc.internal.getPageInfo(doc.internal.getCurrentPageIndex()).pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      },
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont(undefined, 'bold');
    doc.text('Summary:', 15, finalY);

    doc.setFont(undefined, 'normal');
    doc.text(`Term Average: ${totalPercentage}%`, 15, finalY + 7);
    doc.text(`Term Grade: ${totalGrade}`, 110, finalY + 7);
    doc.text(`Performance: ${grading.getGradeDescription(totalGrade)}`, 15, finalY + 14);

    // Teacher & Date
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, pageHeight - 20);

    return doc;
  }

//Generate a class summary report
  static generateClassSummary(data: ClassSummaryData): jsPDF {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header
    this.addHeader(doc, data.school, pageWidth, yPosition);
    yPosition += 35;

    // Report Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(
      `Class Summary Report - ${data.class.name} (Term ${data.term}, ${data.year})`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 12;

    // Class Info
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Total Students: ${data.studentMarks.length} | Class Level: ${
        data.class.level === 'junior' ? 'Junior School' : 'Senior School'
      }`,
      15,
      yPosition
    );
    yPosition += 10;

    // Performance Summary by Subject
    const subjectSummary: Record<string, { scores: number[]; maxMarks: number }> = {};

    data.studentMarks.forEach(({ marks }) => {
      marks.forEach((mark) => {
        if (!subjectSummary[mark.subjectId]) {
          subjectSummary[mark.subjectId] = { scores: [], maxMarks: 0 };
        }
        subjectSummary[mark.subjectId].scores.push(mark.marksObtained);
      });
    });

    // Build summary table
    const summaryData: string[][] = [];
    Object.entries(subjectSummary).forEach(([_, data]) => {
      if (data.scores.length > 0) {
        const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        const percentage = ((avg / data.maxMarks) * 100).toFixed(1);
        const grade = grading.getGrade(avg, data.maxMarks);
        const min = Math.min(...data.scores);
        const max = Math.max(...data.scores);

        summaryData.push([
          `${percentage}%`,
          grade,
          `${min}`,
          `${max}`,
          `${avg.toFixed(1)}`,
        ]);
      }
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Avg %', 'Grade', 'Lowest', 'Highest', 'Mean']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
    });

    // Grade Distribution
    const gradeCounts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    data.studentMarks.forEach(({ marks }) => {
      marks.forEach((mark) => {
        gradeCounts[mark.grade]++;
      });
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont(undefined, 'bold');
    doc.text('Grade Distribution:', 15, finalY);

    doc.setFont(undefined, 'normal');
    const total = Object.values(gradeCounts).reduce((a, b) => a + b, 0) || 1;
    let distY = finalY + 7;
    Object.entries(gradeCounts).forEach(([grade, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      doc.text(`${grade}: ${count} students (${percentage}%)`, 15, distY);
      distY += 6;
    });

    // Footer
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, pageHeight - 10);

    return doc;
  }

// Document  header {School Name}
  private static addHeader(doc: jsPDF, school: School, pageWidth: number, yPosition: number) {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(school.name, pageWidth / 2, yPosition, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    if (school.email) {
      doc.text(`Email: ${school.email}`, pageWidth / 2, yPosition + 6, { align: 'center' });
    }
    if (school.phoneNumber) {
      doc.text(`Phone: ${school.phoneNumber}`, pageWidth / 2, yPosition + 10, {
        align: 'center',
      });
    }

    // Line separator
    doc.setDrawColor(100);
    doc.line(15, yPosition + 14, pageWidth - 15, yPosition + 14);
  }

//Generate and download PDF
  static downloadPDF(pdf: jsPDF, filename: string) {
    pdf.save(filename);
  }
}
