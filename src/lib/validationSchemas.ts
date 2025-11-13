import { z } from "zod";

// Student Management Validation
export const studentSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  name: z.string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  rollNumber: z.string()
    .trim()
    .regex(/^[A-Z0-9-]+$/i, { message: "Roll number can only contain letters, numbers, and hyphens" })
    .min(1, { message: "Roll number is required" })
    .max(20, { message: "Roll number must be less than 20 characters" }),
  course: z.string()
    .trim()
    .min(1, { message: "Course is required" })
    .max(50, { message: "Course must be less than 50 characters" }),
  section: z.string()
    .trim()
    .min(1, { message: "Section is required" })
    .max(10, { message: "Section must be less than 10 characters" }),
  year: z.number()
    .int({ message: "Year must be a whole number" })
    .min(1, { message: "Year must be at least 1" })
    .max(6, { message: "Year cannot exceed 6" }),
});

export type StudentFormData = z.infer<typeof studentSchema>;

// Announcement Validation
export const announcementSchema = z.object({
  title: z.string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" }),
  content: z.string()
    .trim()
    .min(1, { message: "Content is required" })
    .max(5000, { message: "Content must be less than 5000 characters" }),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

// File Upload Validation
export const validateFile = (file: File, allowedTypes: string[], maxSize: number): { valid: boolean; error?: string } => {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
};

// CSV Whitelist Entry Validation
export const csvWhitelistSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email too long" }),
  name: z.string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name too long" }),
  role: z.enum(["STUDENT", "FACULTY", "PARENT", "ADMIN"], {
    errorMap: () => ({ message: "Role must be STUDENT, FACULTY, PARENT, or ADMIN" }),
  }),
});

export type CSVWhitelistEntry = z.infer<typeof csvWhitelistSchema>;
