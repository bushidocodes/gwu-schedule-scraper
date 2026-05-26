export interface Schedule {
  location: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
}

export interface Course {
  crn: number;
  department: string;
  courseID: number;
  section: string;
  name: string;
  credit: string;
  instructor: string;
  schedule: Schedule[];
  startDate: string;
  endDate: string;
}
