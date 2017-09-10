import {rand, choice, randRGB} from './utils';

// globals

const TITLE_SCREEN = 0;
const GOAL_SCREEN = 1;
const GAME_SCREEN = 2;
const END_SCREEN = 3;
let screen = TITLE_SCREEN;

const PLAYER_SIZE = 10; // in px
const BLOCK_SIZE = 20; // in px (size of a building)
const PLATE_SIZE = BLOCK_SIZE * 3; // in px (3x3 blocks in a plate)
const MAP_WIDTH = 14; // in plates
const MAP_HEIGHT = 10; // in plates

const OFFSET_BOUND = 100; // px, offset from side of visible screen that moves the viewport if player goes beyond
let bufferOffsetX = 0;
let bufferOffsetY = 0;

const CTX = c.getContext('2d');         // visible canvas
const WIDTH = 600;
const HEIGHT = 480;
const BG = c.cloneNode();               // full map rendered off screen
const BG_CTX = BG.getContext('2d');
const BUFFER = c.cloneNode();           // visible portion of map
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
const INDEX_MAP_INDEX = 5; // for buildings
const INDEX_MOVEUP = 5;    // for player
const INDEX_MOVEDOWN = 6;
const INDEX_MOVELEFT = 7
const INDEX_MOVERIGHT = 8;
const INDEX_SPEED = 9;
const PLAYER_SPEED = 100; // px/s
const ROAD_TOP = 1;
const ROAD_RIGHT = 2;
const ROAD_BOTTOM = 4;
const ROAD_LEFT = 8;
const PLATE_MONUMENT = 31;
const LEVEL_TIME = 60; // in seconds
let player = [BLOCK_SIZE, BLOCK_SIZE, PLAYER_SIZE, PLAYER_SIZE, 'blue', 0, 0, 0, 0, PLAYER_SPEED];
let entities;
let redrawEntity;
let map;
let nbMonuments;
let nbMonumentsSnapped;
let startNewGame;
let retryGame;
let winGame;
let timeLeft; // in seconds

function generateMap() {
  map = [];
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
      plate = choice([ROAD_LEFT + ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM,
        ROAD_TOP + ROAD_LEFT + ROAD_BOTTOM,
        ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM,
        ROAD_LEFT + ROAD_TOP + ROAD_RIGHT,
        ROAD_LEFT + ROAD_BOTTOM + ROAD_RIGHT,
        ROAD_TOP + ROAD_BOTTOM,
        ROAD_LEFT + ROAD_RIGHT,
        PLATE_MONUMENT]);
    }
    map[i] = plate;
  }
}

function generateEntities() {
  entities = [];
  for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; i++) {
    const x = i % MAP_WIDTH;
    const y = (i - x) / MAP_WIDTH;
    if (map[i] === PLATE_MONUMENT) {
      entities.push([x*PLATE_SIZE + BLOCK_SIZE, y*PLATE_SIZE + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, 'red', i]);
      continue;
    }
    // corner blocks are on all plates
    entities.push([x*PLATE_SIZE, y*PLATE_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    entities.push([x*PLATE_SIZE + 2*BLOCK_SIZE, y*PLATE_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    entities.push([x*PLATE_SIZE, y*PLATE_SIZE + 2*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    entities.push([x*PLATE_SIZE + 2*BLOCK_SIZE, y*PLATE_SIZE + 2*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    if (!(map[i] & ROAD_TOP)) {
      entities.push([x * PLATE_SIZE + BLOCK_SIZE, y*PLATE_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    }
    if (!(map[i] & ROAD_LEFT)) {
      entities.push([x*PLATE_SIZE, y*PLATE_SIZE + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    }
    if (!(map[i] & ROAD_BOTTOM)) {
      entities.push([x*PLATE_SIZE + BLOCK_SIZE, y*PLATE_SIZE + 2*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    }
    if (!(map[i] & ROAD_RIGHT)) {
      entities.push([x*PLATE_SIZE + 2*BLOCK_SIZE, y*PLATE_SIZE + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randRGB(), i]);
    }
  }
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
    case TITLE_SCREEN:
      BUFFER_CTX.fillStyle = 'white';
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);

      renderText('a Tourist in Paris', WIDTH / 2, 128, '64px Arial');
      if (Math.floor(currentTime/1000)%2) {
        renderText('press N to start', WIDTH / 2, HEIGHT * 2 / 3, '24px Arial');
      }
      renderText('proudly made in Canada', WIDTH / 2, HEIGHT - 2.5*BLOCK_SIZE, '24px Arial');
      renderText('by Jerome Lecomte for JS13KGAMES 2017', WIDTH / 2, HEIGHT - BLOCK_SIZE, '24px Arial');
      break;
    case GOAL_SCREEN:
      BUFFER_CTX.fillStyle = 'white';
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);

      renderText('Tourist: person geographically and culturally', 2*BLOCK_SIZE, 2*BLOCK_SIZE, '24px Arial', 'left');
      renderText('lost, trying to cross iconic sightseeings from his', 2*BLOCK_SIZE, 4*BLOCK_SIZE, '24px Arial', 'left');
      renderText('bucket list before his tour bus departs.', 2*BLOCK_SIZE, 6*BLOCK_SIZE, '24px Arial', 'left');
      renderText('Arrow keys or WASD/ZQSD to move around.', 2*BLOCK_SIZE, 10*BLOCK_SIZE, '24px Arial', 'left');
      renderText('Touch all red squares before time runs out.', 2*BLOCK_SIZE, 12*BLOCK_SIZE, '24px Arial', 'left');
      if (Math.floor(currentTime/1000)%2) {
        renderText('Press any key.', 2*BLOCK_SIZE, 16*BLOCK_SIZE, '24px Arial', 'left');
      }
      break;
    case GAME_SCREEN:
      BUFFER_CTX.drawImage(
        BG,
        // adjust x/y offset
        bufferOffsetX, bufferOffsetY, WIDTH, HEIGHT,
        0, 0, WIDTH, HEIGHT
      );

      player[INDEX_COLOR] = randRGB();
      renderEntity(player);
      if (redrawEntity) {
        renderEntity(redrawEntity, BG_CTX);
        redrawEntity = null;
      }

      const minutes = Math.floor(Math.ceil(timeLeft) / 60);
      const seconds = Math.ceil(timeLeft) - minutes * 60;
      renderText(`${minutes}:${seconds <= 9 ? '0' : ''}${seconds}`,
                 WIDTH - BLOCK_SIZE, 2*BLOCK_SIZE, '24px Arial', 'right');
      break;
    case END_SCREEN:
      BUFFER_CTX.fillStyle = 'white';
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);

      renderText(`You ${winGame ? 'won' : 'lost'}!`, WIDTH / 2, 128);
      renderText(`${nbMonumentsSnapped} out of ${nbMonuments} sightseeings`, WIDTH / 2, HEIGHT / 2);
      renderText('press N to start new level', WIDTH / 2, HEIGHT * 2 / 3, '24px Arial');
      renderText('press R to retry same level', WIDTH / 2, HEIGHT * 2 / 3 + 2*BLOCK_SIZE, '24px Arial');
      renderText('press T to share your score on Twitter', WIDTH / 2, HEIGHT * 2 / 3 + 4*BLOCK_SIZE, '24px Arial');
      break;
  }

  blit();
};

function renderMap() {
  BG_CTX.fillStyle = 'white';
  BG_CTX.fillRect(0, 0, BG.width, BG.height);

  for (let entity of entities) {
    renderEntity(entity, BG_CTX);
  }
};

function renderEntity(entity, ctx = BUFFER_CTX) {
  ctx.fillStyle = entity[INDEX_COLOR];
  const x = entity[INDEX_X] - (entity === player ? bufferOffsetX: 0);
  const y = entity[INDEX_Y] - (entity === player ? bufferOffsetY: 0);
  var outline = (entity !== player && map[entity[INDEX_MAP_INDEX]] !== PLATE_MONUMENT) ? choice([0, 1, 2]) : 0;
  ctx.fillRect(Math.round(x - outline), Math.round(y - outline),
               entity[INDEX_W] + 2*outline, entity[INDEX_H] + 2*outline);
}

function renderText(msg, x, y, font = '48px Arial', align = 'center', color = 'black') {
  BUFFER_CTX.fillStyle = color;
  BUFFER_CTX.font = font;
  BUFFER_CTX.textAlign = align;
  BUFFER_CTX.fillText(msg, x, y);
}

function setPlayerPosition(elapsedTime) {
  const distance = elapsedTime * player[INDEX_SPEED];
  player[INDEX_X] += (player[INDEX_MOVELEFT] + player[INDEX_MOVERIGHT]) * distance;
  player[INDEX_Y] += (player[INDEX_MOVEUP] + player[INDEX_MOVEDOWN]) * distance;
}

function checkCollision(entity) {
    const player_right_x = player[INDEX_X] + player[INDEX_W];
    const player_bottom_y = player[INDEX_Y] + player[INDEX_H];
    const entity_right_x = entity[INDEX_X] + entity[INDEX_W];
    const entity_bottom_y = entity[INDEX_Y] + entity[INDEX_H];

    // AABB collision
    return [ player[INDEX_X] < entity_right_x &&
             player_right_x > entity[INDEX_X] &&
             player[INDEX_Y] < entity_bottom_y &&
             player_bottom_y > entity[INDEX_Y],
             player_right_x, player_bottom_y, entity_right_x, entity_bottom_y ];
}

function applyCollisionResponse(entity, values) {
  const [ player_right_x, player_bottom_y, entity_right_x, entity_bottom_y ] = values;

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
};

function checkMonument(entity) {
  if (map[entity[INDEX_MAP_INDEX]] === PLATE_MONUMENT &&
      entity[INDEX_COLOR] === 'red') {
    entity[INDEX_COLOR] = 'green';
    redrawEntity = entity;
    nbMonumentsSnapped++;
  }
}

function setBufferOffsets() {
  if (0 < bufferOffsetX && player[INDEX_X] < bufferOffsetX + OFFSET_BOUND) {
    bufferOffsetX = Math.max(0, player[INDEX_X] - OFFSET_BOUND);
  }
  else if (bufferOffsetX < BG.width - WIDTH && player[INDEX_X] + player[INDEX_W] > bufferOffsetX + WIDTH - OFFSET_BOUND) {
    bufferOffsetX = Math.min(BG.width - WIDTH, player[INDEX_X] + player[INDEX_W] - WIDTH + OFFSET_BOUND);
  }
  if (0 < bufferOffsetY && player[INDEX_Y] < bufferOffsetY + OFFSET_BOUND) {
    bufferOffsetY = Math.max(0, player[INDEX_Y] - OFFSET_BOUND);
  }
  else if (bufferOffsetY < BG.height - HEIGHT && player[INDEX_Y] + player[INDEX_H] > bufferOffsetY + HEIGHT - OFFSET_BOUND) {
    bufferOffsetY = Math.min(BG.height - HEIGHT, player[INDEX_Y] + player[INDEX_H] - HEIGHT + OFFSET_BOUND);
  }
};

function checkVictoryAndGameOver() {
  if (nbMonumentsSnapped === nbMonuments) {
    screen = END_SCREEN;
    winGame = true;
  }
  else if (timeLeft < 0) {
    screen = END_SCREEN;
    winGame = false;
  }
}

function newGame() {
  generateMap();
  generateEntities();
  renderMap();
  nbMonuments = map.reduce(function(sum, plate) {
    return sum + (plate === PLATE_MONUMENT ? 1 : 0);
  }, 0);
  startNewGame = false;
  resetGame();
}

function resetGame() {
  entities.forEach(function(entity) {
    if (map[entity[INDEX_MAP_INDEX]] === PLATE_MONUMENT) {
      entity[INDEX_COLOR] = 'red';
    }
  });
  nbMonumentsSnapped = 0;
  bufferOffsetX = bufferOffsetY = player[INDEX_MOVEUP] = player[INDEX_MOVEDOWN] = player[INDEX_MOVELEFT] = player[INDEX_MOVERIGHT] = 0;
  player[INDEX_X] = player[INDEX_Y] = BLOCK_SIZE;
  redrawEntity = null;
  winGame = false;
  retryGame = false;
  timeLeft = LEVEL_TIME;
  screen = GAME_SCREEN;
}

function update(elapsedTime) {
  switch (screen) {
    case END_SCREEN:
      if (retryGame) {
        resetGame();
      }
      // no break to also handle title/goal screen keys/commands
    case GOAL_SCREEN:
      if (startNewGame) {
        newGame();
      }
      break;
    case GAME_SCREEN:
      timeLeft -= elapsedTime;
      setPlayerPosition(elapsedTime);
      for (let entity of entities) {
        const [collision, ...values] = checkCollision(entity);
        if (collision) {
          applyCollisionResponse(entity, values);
          checkMonument(entity);
        }
      }
      setBufferOffsets();
      checkVictoryAndGameOver();
      break;
  }
};

// event handlers

// main entrypoint
onload = function(e) {
  document.title = 'A Tourist in Paris';

  BG.width = MAP_WIDTH * PLATE_SIZE;
  BG.height = MAP_HEIGHT * PLATE_SIZE;
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
  [ CTX, BG_CTX, BUFFER_CTX ].forEach(function(ctx) {
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
        case 80: // P
          // TODO pause game
      }
      break;
  }
};

onkeyup = function(e) {
  // prevent itch.io from scrolling the page up/down
  e.preventDefault();
  switch (screen) {
    case TITLE_SCREEN:
      switch (e.which) {
        case 13: // Enter
        case 78: // N
          screen = GOAL_SCREEN;
          break;
      }
      break;
    case GOAL_SCREEN:
      startNewGame = true;
      break;
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
    case END_SCREEN:
      switch (e.which) {
        case 13: // Enter
        case 78: // N
          startNewGame = true;
          break;
        case 82: // R
          retryGame = true;
          break;
        case 84: // T
          open(`https://twitter.com/intent/tweet?text=I%20just%20visited%20${nbMonumentsSnapped}%20monument${nbMonumentsSnapped > 1 ? 's' : ''}%20in%20A%20Tourist%20In%20Paris,%20a%20%23js13k%20game%20by%20%40herebefrogs%20https%3A%2F%2Fgoo.gl%2FKPNCyr`, '_blank');
          break;
      }
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
