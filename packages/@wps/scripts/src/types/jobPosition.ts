
export interface JobPosition {
  /**
   * Unique identifier for the job position
   */
  id: string;
  /**
   * Human-readable name for the job position
   */
  displayName: string;
  /**
   * Is this position currently active and accepting applications?
   */
  isActive: boolean;
  /**
   * basic information relating to the position
   */
  basicInfo: {
    /**
     * The date the position is supposed to open.
     */
    positionOpenDate: string;
    /**
     * The date the position is supposed to close. If no end date is selected, enter 0
     */
    positionEndDate: string;
    /**
     * What is the salary type of the position
     */
    positionSalaryType: "Full-Time Salary" | "Full-Time Hourly" | "Part-Time Hourly" | "Seasonal" | "Internship";
    /**
     * What is the lowest salary offered for this position. For hourly positions, post the per-hour compensation. For salary positions, post the yearly compensation.
     */
    startingSalary: number;
    /**
     * What is the highest salary offered for this position. For hourly positions, post the per-hour compensation. For salary positions, post the yearly compensation.
     */
    endingSalary?: number;
    /**
     * Where is the position located? For remote positions, enter 'Remote'. For hybrid positions, enter the primary location (e.g., 'New York, NY').
     */
    positionCity: string;
    /**
     * What state is the position being offered in? For remote positions, state where the company is headquartered.
     */
    positionState:
    | "AL"
    | "AK"
    | "AZ"
    | "AR"
    | "CA"
    | "CO"
    | "CT"
    | "DE"
    | "FL"
    | "GA"
    | "HI"
    | "ID"
    | "IL"
    | "IN"
    | "IA"
    | "KS"
    | "KY"
    | "LA"
    | "ME"
    | "MD"
    | "MA"
    | "MI"
    | "MN"
    | "MS"
    | "MO"
    | "MT"
    | "NE"
    | "NV"
    | "NH"
    | "NJ"
    | "NM"
    | "NY"
    | "NC"
    | "ND"
    | "OH"
    | "OK"
    | "OR"
    | "PA"
    | "RI"
    | "SC"
    | "SD"
    | "TN"
    | "TX"
    | "UT"
    | "VT"
    | "VA"
    | "WA"
    | "WV"
    | "WI"
    | "WY";
    /**
     * What is the type of position offered?
     */
    positionType: "Office" | "Field" | "Remote" | "Hybrid Office / Field" | "Hybrid Office / Remote";
    /**
     * What department is this position in? This can be used for internal categorization and filtering but is not required to be displayed on the front-end.
     */
    department: string;
    [k: string]: unknown;
  };
  /**
   * A detailed description of the job position, including responsibilities, qualifications, and any other relevant information.
   */
  description: {
    /**
     * The type of description item.
     */
    type: "paragraph" | "list-bulleted" | "list-numbered";
    /**
     * The content of the description item. For 'paragraph' type, this should be a single string. For 'list' type, this should be a string with items separated by newlines.
     */
    content: string;
    [k: string]: unknown;
  }[];
  /**
   * A list of benefits offered for this position.
   */
  benefits: string[];
  /**
   * A list of requirements for this position.
   */
  requirements: string[];
  /**
   * Additional metadata about the job position that is used in back-end systems but not displayed on the front-end. This can include information such as internal notes, tags for categorization, or any other relevant data that should not be exposed to the public.
   */
  meta: {
    tags: string[];
    submissionType: "Email" | "ATS";
    submissionSettings: {
      recipientEmail?: string[];
      atsUrl?: string;
    },
    requireResumeUpload: boolean;
    requireCoverLetter: boolean;
  };
  [k: string]: unknown;
}
