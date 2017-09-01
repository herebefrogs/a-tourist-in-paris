import {rand, choice, randRGB} from './utils';

// globals

const TITLE_SCREEN = 0;
const GAME_SCREEN = 1;
const END_SCREEN = 1;
let screen = GAME_SCREEN;

const PLAYER_SIZE = 10; // in px
const BLOCK_SIZE = 20; // in px (size of a building)
const PLATE_SIZE = BLOCK_SIZE * 3; // in px (3x3 blocks in a plate)
const MAP_WIDTH = 10; // in plates
const MAP_HEIGHT = 8; // in plates

const CTX = c.getContext('2d');
const WIDTH = MAP_WIDTH * PLATE_SIZE;
const HEIGHT = MAP_HEIGHT * PLATE_SIZE;
const BUFFER = c.cloneNode();
const BUFFER_CTX = BUFFER.getContext('2d');

let currentTime;
let lastTime;
let requestId;
let running = true;

const INDEX_X = 0
const INDEX_Y = 1;
const INDEX_W = 2;
const INDEX_H = 3;
const INDEX_COLOR = 4;
const INDEX_MOVEUP = 5;
const INDEX_MOVEDOWN = 6;
const INDEX_MOVELEFT = 7
const INDEX_MOVERIGHT = 8;
const INDEX_SPEED = 9;
const PLAYER_SPEED = 100; // px/s
const ROAD_TOP = 1;
const ROAD_RIGHT = 2;
const ROAD_BOTTOM = 4;
const ROAD_LEFT = 8;
let player = [BLOCK_SIZE, BLOCK_SIZE, PLAYER_SIZE, PLAYER_SIZE, 'blue', 0, 0, 0, 0, PLAYER_SPEED];
let entities = [];
let map = [];

function generateMap() {
  const map = [];
  let plate;
  for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; i++) {
    if (i === 0) {
      // turn in top left corner
      plate = ROAD_RIGHT + ROAD_BOTTOM;
    }
    else if (i === MAP_WIDTH - 1) {
      // turn in top right corner
      plate = ROAD_LEFT + ROAD_BOTTOM;
    }
    else if (i === MAP_WIDTH * (MAP_HEIGHT - 1)) {
      // turn in bottom left corner
      plate = ROAD_RIGHT + ROAD_TOP;
    }
    else if (i === (MAP_WIDTH * MAP_HEIGHT) - 1) {
      // turn in bottom right corner
      plate = ROAD_LEFT + ROAD_TOP;
    }
    else if (i < MAP_WIDTH - 1) {
      // horizontal road or T road at the top edge of the map
      plate = choice([ROAD_LEFT + ROAD_RIGHT, ROAD_LEFT + ROAD_BOTTOM + ROAD_RIGHT]);
    }
    else if (MAP_WIDTH * (MAP_HEIGHT - 1) < i) {
      // horizontal road or upside down T road at the bottom edge of the map
      plate = choice([ROAD_LEFT + ROAD_RIGHT, ROAD_LEFT + ROAD_TOP + ROAD_RIGHT]);
    }
    else if (!(i % MAP_WIDTH)) {
      // vertical road or |- road at the left edge of the map
      plate = choice([ROAD_TOP + ROAD_BOTTOM, ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM]);
    }
    else if ((i % MAP_WIDTH) === (MAP_WIDTH - 1)) {
      // vertical road or -| road at the right edge of the map
      plate = choice([ROAD_TOP + ROAD_BOTTOM, ROAD_TOP + ROAD_LEFT + ROAD_BOTTOM]);
    }
    else {
      // TODO must ensure it matches with the surrounding plates
      plate = choice([ROAD_LEFT + ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM,
               ROAD_TOP + ROAD_LEFT + ROAD_BOTTOM,
               ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM,
               ROAD_LEFT + ROAD_TOP + ROAD_RIGHT,
               ROAD_LEFT + ROAD_BOTTOM + ROAD_RIGHT,
               ROAD_TOP + ROAD_BOTTOM,
               ROAD_LEFT + ROAD_RIGHT]);
    }
    map[i] = plate;
  }

  return map;
}

function createEntity(entities, x, y, w, h) {
  entities.push([x, y, w, h, randRGB()]);
}

function generateEntities() {
  const entities = [];
  for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; i++) {
    const x = i % MAP_WIDTH;
    const y = (i - x) / MAP_WIDTH;
    // corner blocks are on all plates
    entities.push([x*PLATE_SIZE, y*PLATE_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    entities.push([x*PLATE_SIZE + 2*BLOCK_SIZE, y*PLATE_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    entities.push([x*PLATE_SIZE, y*PLATE_SIZE + 2*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    entities.push([x*PLATE_SIZE + 2*BLOCK_SIZE, y*PLATE_SIZE + 2*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    if (!(map[i] & ROAD_TOP)) {
      entities.push([x * PLATE_SIZE + BLOCK_SIZE, y*PLATE_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    }
    if (!(map[i] & ROAD_LEFT)) {
      entities.push([x*PLATE_SIZE, y*PLATE_SIZE + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    }
    if (!(map[i] & ROAD_BOTTOM)) {
      entities.push([x*PLATE_SIZE + BLOCK_SIZE, y*PLATE_SIZE + 2*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    }
    if (!(map[i] & ROAD_RIGHT)) {
      entities.push([x*PLATE_SIZE + 2*BLOCK_SIZE, y*PLATE_SIZE + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB()]);
    }
  }
  return entities
}

function loop() {
  if (running) {
    requestId = requestAnimationFrame(loop);
    render();
    currentTime = Date.now();
    update((currentTime - lastTime) / 1000);
    lastTime = currentTime;
  }
};

function toggleLoop(value) {
  running = value;
  if (running) {
    lastTime = Date.now();
    loop();
  } else {
    cancelAnimationFrame(requestId);
  }
};

// copy backbuffer onto visible canvas, scaling it to screen dimensions
function blit() {
  CTX.drawImage(
    BUFFER,
    0, 0, WIDTH, HEIGHT,
    0, 0, c.width, c.height
  );
};

function render() {
  switch (screen) {
    case GAME_SCREEN:
      BUFFER_CTX.fillStyle = 'white';
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);
      renderEntity(player);
      for (let entity of entities) {
        renderEntity(entity);
      }
      break;
  }

  blit();
};

function renderEntity(entity) {
  BUFFER_CTX.fillStyle = entity[INDEX_COLOR];
  BUFFER_CTX.fillRect(Math.round(entity[INDEX_X]), Math.round(entity[INDEX_Y]),
                      entity[INDEX_W], entity[INDEX_H]);
}

function setPlayerPosition(elapsedTime) {
  const distance = elapsedTime * player[INDEX_SPEED];
  player[INDEX_X] += (player[INDEX_MOVELEFT] + player[INDEX_MOVERIGHT]) * distance;
  player[INDEX_Y] += (player[INDEX_MOVEUP] + player[INDEX_MOVEDOWN]) * distance;

  for (let entity of entities) {
    const player_right_x = player[INDEX_X] + player[INDEX_W];
    const player_bottom_y = player[INDEX_Y] + player[INDEX_H];
    const entity_right_x = entity[INDEX_X] + entity[INDEX_W];
    const entity_bottom_y = entity[INDEX_Y] + entity[INDEX_H];

    // AABB collision
    if (player[INDEX_X] < entity_right_x &&
        player_right_x > entity[INDEX_X] &&
        player[INDEX_Y] < entity_bottom_y &&
        player_bottom_y > entity[INDEX_Y]) {

      const delta_right_x = player_right_x - entity[INDEX_X];
      const delta_bottom_y = player_bottom_y - entity[INDEX_Y];
      const delta_left_x = entity_right_x - player[INDEX_X];
      const delta_top_y = entity_bottom_y - player[INDEX_Y];

      // AABB collision response (homegrown wall sliding, not physically correct
      // because just pushing along one axis by the distance overlapped)
      if (player[INDEX_MOVERIGHT] && player[INDEX_MOVEDOWN]) {
        if (delta_right_x < delta_bottom_y) {
          // collided right side first
          player[INDEX_X] -= delta_right_x;
        } else {
          // collided top side first
          player[INDEX_Y] -= delta_bottom_y;
        }
      }
      else if (player[INDEX_MOVERIGHT] && player[INDEX_MOVEUP]) {
        if (delta_right_x < delta_top_y) {
          // collided righ side first
          player[INDEX_X] -= delta_right_x;
        } else {
          // collided bottom side first
          player[INDEX_Y] += delta_top_y;
        }
      }
      else if (player[INDEX_MOVERIGHT]) {
        player[INDEX_X] -= delta_right_x;
      }
      else if (player[INDEX_MOVELEFT] && player[INDEX_MOVEDOWN]) {
        if (delta_left_x < delta_bottom_y) {
          // collided with left side first
          player[INDEX_X] += delta_left_x;
        } else {
          // collided with top side first
          player[INDEX_Y] -= delta_bottom_y;
        }
      }
      else if (player[INDEX_MOVELEFT] && player[INDEX_MOVEUP]) {
        if (delta_left_x < delta_top_y) {
          // collided with left side first
          player[INDEX_X] += delta_left_x;
        } else {
          // collided with bottom side first
          player[INDEX_Y] += delta_top_y;
        }
      }
      else if (player[INDEX_MOVELEFT]) {
        player[INDEX_X] += delta_left_x;
      }
      else if (player[INDEX_MOVEDOWN]) {
        player[INDEX_Y] -= delta_bottom_y;
      }
      else if (player[INDEX_MOVEUP]) {
        player[INDEX_Y] += delta_top_y;
      }
    }
  }
};

function update(elapsedTime) {
  switch (screen) {
    case GAME_SCREEN:
      // TODO better done on the title screen or loadding screen
      if (!map.length) {
        map = generateMap();
        // TODO transcribe the map into entities
        entities = generateEntities();
      }
      setPlayerPosition(elapsedTime);
      break;
  }
};

// event handlers

// main entrypoint
onload = function(e) {
  document.title = 'A Tourist in Paris';

  BUFFER.width = WIDTH;
  BUFFER.height = HEIGHT;

  onresize();

  toggleLoop(true);
};

document.onvisibilitychanged = function(e) {
  toggleLoop(!e.target.hidden);
};

onresize = onrotate = function() {
  // scale canvas to fit screen while maintaining aspect ratio
  const scaleToFit = Math.min(innerWidth / WIDTH, innerHeight / HEIGHT);
  c.width = WIDTH * scaleToFit;
  c.height = HEIGHT * scaleToFit;
  // disable smoothing on image scaling
  [ CTX, BUFFER_CTX ].forEach(function(ctx) {
    ctx.mozImageSmoothingEnabled = ctx.msImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
  });
};

// input handlers
onkeydown = function(e) {
  // prevent itch.io from scrolling the page up/down
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      switch (e.which) {
        case 37: // Left arrow
        case 65: // A - QWERTY
        case 81: // Q - AZERTY
          player[INDEX_MOVELEFT] = -1;
          break;
        case 38: // Up arrow
        case 90: // W - QWERTY
        case 87: // Z - AZERTY
          player[INDEX_MOVEUP] = -1;
          break;
        case 39: // Right arrow
        case 68: // D
          player[INDEX_MOVERIGHT] = 1;
          break;
        case 40: // Down arrow
        case 83: // S
          player[INDEX_MOVEDOWN] = 1;
          break;
      }
      break;
  }
};

onkeyup = function(e) {
  // prevent itch.io from scrolling the page up/down
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      switch (e.which) {
        case 37: // Left arrow
        case 65: // A - QWERTY
        case 81: // Q - AZERTY
          player[INDEX_MOVELEFT] = 0;
          break;
        case 38: // Up arrow
        case 90: // W - QWERTY
        case 87: // Z - AZERTY
          player[INDEX_MOVEUP] = 0;
          break;
        case 39: // Right arrow
        case 68: // D
          player[INDEX_MOVERIGHT] = 0;
          break;
        case 40: // Down arrow
        case 83: // S
          player[INDEX_MOVEDOWN] = 0;
          break;
      }
      break;
  }
};

// mobile support
/*
const INDEX_TAPX = 0
const INDEX_TAPY = 1;
const TOUCH = [0, 0];

// TODO adding onmousedown/move/up triggers a MouseEvent and a PointerEvent
// on platform that support both (duplicate event, could be filtered
// with timestamp maybe? or listener only installed if supported?
// pointer > mouse || touch)
ontouchstart = onpointerdown = function(e) {
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      const [x, y] = pointer_location(e);
      TOUCH[INDEX_TAPX] = x;
      TOUCH[INDEX_TAPY] = y;
      break;
  }
};

ontouchmove = onpointermove = function(e) {
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      if (TOUCH[INDEX_TAPX] && TOUCH[INDEX_TAPY]) {
        const [x, y] = pointer_location(e);
        // TODO quit choppy motion, should add leeway for touch radius
        player[INDEX_MOVEUP] = y < TOUCH[INDEX_TAPY] ? -1 : 0;
        player[INDEX_MOVEDOWN] = y > TOUCH[INDEX_TAPY] ? 1 : 0;
        player[INDEX_MOVELEFT] = x < TOUCH[INDEX_TAPX] ? -1 : 0;
        player[INDEX_MOVERIGHT] = x > TOUCH[INDEX_TAPX] ? 1 : 0;
        TOUCH[INDEX_TAPX] = x;
        TOUCH[INDEX_TAPY] = y;
      }
      break;
  }
}

ontouchend = onpointerup = function(e) {
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      TOUCH[INDEX_TAPX] = 0;
      TOUCH[INDEX_TAPY] = 0;
      player[INDEX_MOVEUP] = 0;
      player[INDEX_MOVEDOWN] = 0;
      player[INDEX_MOVELEFT] = 0;
      player[INDEX_MOVERIGHT] = 0;
      break;
  }
};

// utilities
function pointer_location(e) {
  return [e.pageX || e.changedTouches[0].pageX, e.pageY || e.changedTouches[0].pageY];
};
*/
