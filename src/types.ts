export interface Course {
  id: string;
  name: string;
  credits: number;
  gradePoint: number;
}

export interface Semester {
  id: string;
  number: number;
  courses: Course[];
}
