import type { Grade } from '../db/schema';

/**
 * CBC (Competency-Based Curriculum) Grading System
 * Supports both Junior and Senior School grading scales
 */

export interface GradingScale {
  minScore: number;
  maxScore: number;
  grade: Grade;
  description: string;
}

/**
 * Standard CBC Grading Scale (out of 100)
 * EE (Excellent) - 80-100
 * ME (Mastery) - 65-79
 * AE (Approaching Excellence) - 50-64
 * BE (Below Expected) - 0-49
 */
export const GRADING_SCALE: GradingScale[] = [
  { minScore: 80, maxScore: 100, grade: 'EE', description: 'Excellent' },
  { minScore: 65, maxScore: 79, grade: 'ME', description: 'Mastery' },
  { minScore: 50, maxScore: 64, grade: 'AE', description: 'Approaching Excellence' },
  { minScore: 0, maxScore: 49, grade: 'BE', description: 'Below Expected' },
];

/**
 * Alternative grading scale (out of 80) - used in some schools
 */
export const GRADING_SCALE_80: GradingScale[] = [
  { minScore: 64, maxScore: 80, grade: 'EE', description: 'Excellent' },
  { minScore: 52, maxScore: 63, grade: 'ME', description: 'Mastery' },
  { minScore: 40, maxScore: 51, grade: 'AE', description: 'Approaching Excellence' },
  { minScore: 0, maxScore: 39, grade: 'BE', description: 'Below Expected' },
];

class GradingSystem {
  /**
   * Convert raw marks to CBC grade
   * @param marksObtained - Marks scored by student
   * @param maxMarks - Total marks for the subject
   * @param scale - Grading scale to use (default: 100-point scale)
   */
  getGrade(marksObtained: number, maxMarks: number, scale: GradingScale[] = GRADING_SCALE): Grade {

    const percentage = (marksObtained / maxMarks) * 100;

    // Find matching grade
    const gradeInfo = scale.find(
      (g) => percentage >= g.minScore && percentage <= g.maxScore
    );

    return gradeInfo?.grade || 'BE';
  }

  /**
   * Get grade description
   */
  getGradeDescription(grade: Grade): string {
    const gradeInfo = GRADING_SCALE.find((g) => g.grade === grade);
    return gradeInfo?.description || 'Unknown';
  }

  /**
   * Get score range for a grade
   */
  getScoreRange(grade: Grade, maxMarks: number, scale: GradingScale[] = GRADING_SCALE): {
    min: number;
    max: number;
  } {
    const gradeInfo = scale.find((g) => g.grade === grade);
    if (!gradeInfo) return { min: 0, max: 0 };

    return {
      min: Math.round((gradeInfo.minScore * maxMarks) / 100),
      max: Math.round((gradeInfo.maxScore * maxMarks) / 100),
    };
  }

  /**
   * Calculate class average
   */
  calculateClassAverage(marks: number[], maxMarks: number): {
    average: number;
    percentage: number;
    grade: Grade;
  } {
    if (marks.length === 0) {
      return { average: 0, percentage: 0, grade: 'BE' };
    }

    const sum = marks.reduce((acc, mark) => acc + mark, 0);
    const average = sum / marks.length;
    const percentage = (average / maxMarks) * 100;

    return {
      average: Math.round(average * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      grade: this.getGrade(average, maxMarks),
    };
  }

  /**
   * Calculate percentile rank (what percentage of students scored below this mark)
   */
  calculatePercentile(studentMark: number, allMarks: number[]): number {
    const belowCount = allMarks.filter((m) => m < studentMark).length;
    return Math.round((belowCount / allMarks.length) * 100);
  }

  /**
   * Get student rank in class
   */
  getStudentRank(
    studentMark: number,
    allMarks: number[]
  ): { rank: number; totalStudents: number; percentile: number } {
    const sortedMarks = [...allMarks].sort((a, b) => b - a);
    const rank = sortedMarks.findIndex((m) => m === studentMark) + 1;

    return {
      rank,
      totalStudents: allMarks.length,
      percentile: this.calculatePercentile(studentMark, allMarks),
    };
  }

  /**
   * Calculate term average from multiple subjects
   */
  calculateTermAverage(subjectMarks: Array<{ mark: number; maxMarks: number }>): {
    average: number;
    percentage: number;
    grade: Grade;
  } {
    if (subjectMarks.length === 0) {
      return { average: 0, percentage: 0, grade: 'BE' };
    }

    const totalMarks = subjectMarks.reduce((acc, s) => acc + s.maxMarks, 0);
    const totalObtained = subjectMarks.reduce((acc, s) => acc + s.mark, 0);

    const percentage = (totalObtained / totalMarks) * 100;

    return {
      average: Math.round(totalObtained),
      percentage: Math.round(percentage * 100) / 100,
      grade: this.getGrade(totalObtained, totalMarks),
    };
  }

  /**
   * Get subject performance summary for a student
   */
  getSubjectPerformanceSummary(
    subjectMarks: Array<{ subjectName: string; mark: number; maxMarks: number }>
  ): Array<{
    subject: string;
    mark: number;
    maxMarks: number;
    percentage: number;
    grade: Grade;
  }> {
    return subjectMarks.map((s) => {
      const percentage = (s.mark / s.maxMarks) * 100;
      const grade = this.getGrade(s.mark, s.maxMarks);

      return {
        subject: s.subjectName,
        mark: s.mark,
        maxMarks: s.maxMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade,
      };
    });
  }

  /**
   * Validate marks (check if within range)
   */
  validateMarks(marks: number, maxMarks: number): { valid: boolean; error?: string } {
    if (marks < 0) {
      return { valid: false, error: 'Marks cannot be negative' };
    }

    if (marks > maxMarks) {
      return { valid: false, error: `Marks cannot exceed ${maxMarks}` };
    }

    if (!Number.isFinite(marks)) {
      return { valid: false, error: 'Marks must be a valid number' };
    }

    return { valid: true };
  }

  /**
   * Get grade distribution for a class
   */
  getGradeDistribution(
    marks: Array<{ studentName: string; mark: number }>,
    maxMarks: number
  ): Record<Grade, { count: number; percentage: number; students: string[] }> {
    const distribution: Record<Grade, { count: number; percentage: number; students: string[] }> = {
      EE: { count: 0, percentage: 0, students: [] },
      ME: { count: 0, percentage: 0, students: [] },
      AE: { count: 0, percentage: 0, students: [] },
      BE: { count: 0, percentage: 0, students: [] },
    };

    marks.forEach(({ studentName, mark }) => {
      const grade = this.getGrade(mark, maxMarks);
      distribution[grade].count++;
      distribution[grade].students.push(studentName);
    });

    const total = marks.length;
    Object.values(distribution).forEach((dist) => {
      dist.percentage = total > 0 ? Math.round((dist.count / total) * 100) : 0;
    });

    return distribution;
  }

  /**
   * Get performance trend (for multiple terms/years)
   */
  getPerformanceTrend(
    historicalMarks: Array<{ period: string; mark: number; maxMarks: number }>
  ): Array<{
    period: string;
    mark: number;
    percentage: number;
    grade: Grade;
    trend?: 'up' | 'down' | 'stable';
  }> {
    const trend = historicalMarks.map((h, index) => {
      const percentage = (h.mark / h.maxMarks) * 100;
      const grade = this.getGrade(h.mark, h.maxMarks);

      let trendDirection: 'up' | 'down' | 'stable' | undefined;
      if (index > 0) {
        const prevPercentage = (historicalMarks[index - 1].mark / historicalMarks[index - 1].maxMarks) * 100;
        if (percentage > prevPercentage + 2) {
          trendDirection = 'up';
        } else if (percentage < prevPercentage - 2) {
          trendDirection = 'down';
        } else {
          trendDirection = 'stable';
        }
      }

      return {
        period: h.period,
        mark: h.mark,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        trend: trendDirection,
      };
    });

    return trend;
  }
}

// Export singleton instance
export const grading = new GradingSystem();
