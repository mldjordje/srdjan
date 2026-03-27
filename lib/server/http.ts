import { NextResponse } from "next/server";

export const jsonOk = <T>(payload: T, init: number | ResponseInit = 200) =>
  NextResponse.json(payload, typeof init === "number" ? { status: init } : init);

export const jsonError = (message: string, init: number | ResponseInit = 400) =>
  NextResponse.json({ error: message }, typeof init === "number" ? { status: init } : init);

export const parseJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};
