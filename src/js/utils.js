export function rand(min, max) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
};

export function choice(values) {
  return values[rand(0, values.length - 1)];
};

export function randRGB() {
  return `#${randChannel()}${randChannel()}${randChannel()}`;
};

function randChannel() {
  let value = '';
  for (let i = 0; i < 2; i++) {
    value += rand(0, 9);
  }
  return value;
};

export function randR() {
  return `#${randChannel()}0000`;
};

export function randG() {
  return `#00${randChannel()}00`;
};

export default rand;
