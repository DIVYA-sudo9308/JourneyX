export class QueryError extends Error {
  supabaseCode?: string;
  supabaseHint?: string;
  supabaseDetails?: string;

  constructor(message: string, opts?: SupabaseErrorLike) {
    super(message);
    this.name = "QueryError";
    this.supabaseCode = opts?.code;
    this.supabaseHint = opts?.hint;
    this.supabaseDetails = opts?.details;
  }
}

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  hint?: string;
  details?: string;
}

export function raise(scope: string, error: SupabaseErrorLike): never {
  console.error(`[query:${scope}]`, error);
  throw new QueryError(`${scope}: ${error.message || "Unknown Supabase error"}`, error);
}

/** Read beyond PostgREST's row cap. Callers must provide stable ordering. */
export async function readAll<T>(
  scope: string,
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: SupabaseErrorLike | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + 499);
    if (error) raise(scope, error);
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

/** URL dates are calendar dates, not arbitrary Date.parse inputs. */
export function dateRange(dateFrom?: string, dateTo?: string) {
  const parse = (value: string | undefined, field: string) => {
    if (!value) return undefined;
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new QueryError(`"${field}" must be a valid YYYY-MM-DD date.`);
    }
    return date;
  };
  const from = parse(dateFrom, "dateFrom");
  const to = parse(dateTo, "dateTo");
  if (from && to && from > to) {
    throw new QueryError('"dateFrom" must not be after "dateTo".');
  }
  return {
    fromIso: from?.toISOString(),
    // Exclusive next-day bound includes sub-millisecond database timestamps.
    untilIso: to ? new Date(to.getTime() + 86_400_000).toISOString() : undefined,
  };
}
