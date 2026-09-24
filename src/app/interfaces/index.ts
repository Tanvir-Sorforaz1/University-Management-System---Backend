export interface IQuery {
  searchTerm?: string;
  page?: string;
  limit?: string;
  sortOrder?: string;
  sortBy?: string;

  // any other filter fields (status, departmentId, programId, etc.)
  [key: string]: any;
}
