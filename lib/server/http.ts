import { NextResponse } from "next/server";

export const jsonOk = <T>(payload: T, status = 200) =>
  NextResponse.json(payload, { status });

export const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const parseJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

