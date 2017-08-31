export function rand(min, max) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
};

export function choice(values) {
  return values[rand(0, values.length - 1)];
};

export function randRGB() {
  let rgb = '#';
  for (let i = 0; i < 6; i++) {
    rgb += rand(0, 9);
  }
  return rgb;
};

export default rand;
