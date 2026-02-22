const padTwo = (value: number) => String(value).padStart(2, "0");

export const formatIsoDateToEuropean = (value: string) => {
  const trimmed = (value || "").trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return `${padTwo(parsed.getDate())}/${padTwo(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
};

export const formatIsoDateTimeToEuropean = (value: string) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return `${padTwo(parsed.getDate())}/${padTwo(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${padTwo(parsed.getHours())}:${padTwo(parsed.getMinutes())}`;
};
