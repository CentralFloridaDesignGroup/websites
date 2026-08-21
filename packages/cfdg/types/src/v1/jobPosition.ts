import { POSITION_SALARY_TYPES, POSITION_LOCATIONS } from "./constants";
import { State } from "./common";

// #region Type Definitions

export type JobPositionSalaryType = typeof POSITION_SALARY_TYPES[number];

export type JobPositionLocation = typeof POSITION_LOCATIONS[number];

// #endregion

// #region JobPosition Interface

/** Interface representing a job position. */
export interface JobPosition {
  /** Unique identifier for the job position */
  id: string;
  /** Human-readable name for the job position */
  displayName: string;
  /** Is this position currently active and accepting applications */
  isActive: boolean;
  /** basic information relating to the position */
  basicInfo: {
    /** The date the position is supposed to open. */
    positionOpenDate: string;
    /** The date the position is supposed to close. If no end date is selected, enter 0 */
    positionEndDate: string;
    /** What is the salary type of the position */
    positionSalaryType: JobPositionSalaryType;
    /** What is the lowest salary offered for this position. For hourly positions, post the per-hour compensation. For salary positions, post the yearly compensation. */
    startingSalary: number;
    /** What is the highest salary offered for this position. For hourly positions, post the per-hour compensation. For salary positions, post the yearly compensation. */
    endingSalary?: number;
    /** Where is the position located? For remote positions, enter 'Remote'. For hybrid positions, enter the primary location (e.g., 'New York, NY'). */
    positionCity: string;
    /** What state is the position being offered in? For remote positions, state where the company is headquartered. */
    positionState: State;
    /** What is the type of position offered? */
    positionType: JobPositionLocation;
    /** What department is this position in? This can be used for internal categorization and filtering but is not required to be displayed on the front-end. */
    department: string;
    /** Any additional information related to the position */
    [k: string]: unknown;
  };

  /** A detailed description of the job position, including responsibilities, qualifications, and any other relevant information. */
  description: {
    /** The type of description item. */
    type: "paragraph" | "list-bulleted" | "list-numbered";
    /** The content of the description item. For 'paragraph' type, this should be a single string. For 'list' type, this should be a string with items separated by newlines. */
    content: string;
    /** Any additional information related to the description item */
    [k: string]: unknown;
  }[];

  /** A list of benefits offered for this position. */
  benefits: string[];
  /** A list of requirements for this position. */
  requirements: string[];
  /** Additional metadata about the job position that is used in back-end systems but not displayed on the front-end. This can include information such as internal notes, tags for categorization, or any other relevant data that should not be exposed to the public. */
  meta: {
    /** Tags associated with the job position */
    tags: string[];
    /** The method by which applications should be submitted */
    submissionType: "Email" | "ATS";
    /** Settings related to the submission method */
    submissionSettings: {
      /** The email address to which applications should be sent. This is only applicable if the submissionType is 'Email'. */
      recipientEmail?: string[];
      /** The URL of the Applicant Tracking System (ATS) where applications should be submitted. This is only applicable if the submissionType is 'ATS'. */
      atsUrl?: string;
    },
    /** Whether a resume upload is required for the application */
    requireResumeUpload: boolean;
    /** Whether a cover letter is required for the application */
    requireCoverLetter: boolean;
  };
  /** Any additional information related to the job position */
  [k: string]: unknown;
}

// #endregion
