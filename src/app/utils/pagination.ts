import type { IQuery } from "../interfaces/index.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export const parseQuery = (query: IQuery) => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(Number(query.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  const orderBy = query.sortBy
    ? { [query.sortBy]: query.sortOrder === "desc" ? "desc" : "asc" as const }
    : undefined;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
  };
};

export const buildMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
