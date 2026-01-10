export type Service = {
  id: string;
  name: string;
  duration: string;
  price: number;
  description?: string | null;
  isActive?: boolean;
};

export const services: Service[] = [
  {
    id: "sisanje",
    name: "Sisanje",
    duration: "20 min",
    price: 700,
  },
  {
    id: "fade",
    name: "Fade",
    duration: "40 min",
    price: 1000,
  },
  {
    id: "sisanje-pranje",
    name: "Sisanje i pranje",
    duration: "40 min",
    price: 1000,
  },
  {
    id: "fade-pranje",
    name: "Fade i pranje",
    duration: "40 min",
    price: 1200,
  },
  {
    id: "fade-brada",
    name: "Fade i brada",
    duration: "40 min",
    price: 1200,
  },
  {
    id: "sisanje-brada",
    name: "Sisanje i brada",
    duration: "40 min",
    price: 1000,
  },
  {
    id: "fade-brada-pranje",
    name: "Fade brada pranje",
    duration: "1 h",
    price: 1500,
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
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
  }));
};

export const getActiveServices = (items: Service[]) =>
  items.filter((service) => service.isActive !== false);
