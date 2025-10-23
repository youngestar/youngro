export const chromaticHueDefault = 220.44;

export const fonts = {
  sans: "DM Sans",
  mono: "Fira Code",
  cjk: "Xiaolai",
};

export function safelistAllPrimaryBackgrounds() {
  const shades = [
    undefined,
    50,
    100,
    200,
    300,
    400,
    500,
    600,
    700,
    800,
    900,
    950,
  ];
  const opacities = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const all: string[] = [];
  for (const shade of shades) {
    const prefix = shade ? `bg-primary-${shade}` : `bg-primary`;
    all.push(prefix);
    for (const o of opacities) {
      all.push(`${prefix}/${o}`);
    }
  }
  return all;
}
