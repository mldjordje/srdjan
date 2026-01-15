export type Service = {
  id: string;
  name: string;
  duration: string;
  price: number;
  description?: string | null;
  color?: string | null;
  isActive?: boolean;
};

export const services: Service[] = [
  {
    id: "sisanje",
    name: "Sisanje",
    duration: "20 min",
    price: 700,
    color: "#3c9468",
  },
  {
    id: "fade",
    name: "Fade",
    duration: "40 min",
    price: 1000,
    color: "#d0893c",
  },
  {
    id: "sisanje-pranje",
    name: "Sisanje i pranje",
    duration: "40 min",
    price: 1000,
    color: "#2f6f9a",
  },
  {
    id: "fade-pranje",
    name: "Fade i pranje",
    duration: "40 min",
    price: 1200,
    color: "#5d7f8c",
  },
  {
    id: "fade-brada",
    name: "Fade i brada",
    duration: "40 min",
    price: 1200,
    color: "#c35a76",
  },
  {
    id: "sisanje-brada",
    name: "Sisanje i brada",
    duration: "40 min",
    price: 1000,
    color: "#2f8b7c",
  },
  {
    id: "fade-brada-pranje",
    name: "Fade brada pranje",
    duration: "1 h",
    price: 1500,
    color: "#8a5a2b",
  },
];

type FetchServicesOptions = {
  adminKey?: string;
  includeInactive?: boolean;
};

export const fetchServices = async (
  apiBaseUrl: string,
  options: FetchServicesOptions = {}
): Promise<Service[]> => {
  if (!apiBaseUrl) {
    return services;
  }

  const headers: Record<string, string> = {};
  if (options.adminKey) {
    headers["X-Admin-Key"] = options.adminKey;
  }

  const query = options.includeInactive ? "?include=all" : "";
  const response = await fetch(`${apiBaseUrl}/services.php${query}`, {
    headers,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Ne mogu da preuzmem usluge.");
  }

  const items = Array.isArray(data.services) ? data.services : [];
  return items.map((item: Service) => ({
    id: String(item.id),
    name: item.name,
    duration: item.duration,
    price: Number(item.price) || 0,
    description: item.description ?? null,
    color: typeof item.color === "string" && item.color.trim() !== "" ? item.color : null,
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
  }));
};

export const getActiveServices = (items: Service[]) =>
  items.filter((service) => service.isActive !== false);
