export type JobMapQueryResult =
  | {
      ok: true;
      value: {
        lat: number;
        lng: number;
        radius: number;
      };
    }
  | {
      ok: false;
      error: string;
      message: string;
      field: string;
    };

export function parseJobMapQuery(searchParams: URLSearchParams): JobMapQueryResult;
