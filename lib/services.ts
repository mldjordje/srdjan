export type Service = {
  id: string;
  name: string;
  duration: string;
  price: number;
};

export const services: Service[] = [
  {
    id: "sisanje",
    name: "Šišanje",
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
    name: "Šišanje i pranje",
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
    name: "Šišanje i brada",
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
