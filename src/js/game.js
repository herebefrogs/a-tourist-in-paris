import {rand, choice, randRGB, randR, randG} from './utils';

// globals

const TITLE_SCREEN = 0;
const GOAL_SCREEN = 1;
const GAME_SCREEN = 2;
const END_SCREEN = 3;
let screen = TITLE_SCREEN;

const PLAYER_SIZE = 20; // in px
const BLOCK_SIZE = 80; // in px (size of a building)
const PLATE_SIZE = BLOCK_SIZE * 3; // in px (3x3 blocks in a plate)
const MAP_WIDTH = 14; // in plates
const MAP_HEIGHT = 10; // in plates

const OFFSET_BOUND = 200; // px, offset from side of visible screen that moves the viewport if player goes beyond
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
const INDEX_VISITED= 6;      // for buildings
const INDEX_MOVEDOWN = 6;  // for player
const INDEX_MOVELEFT = 7
const INDEX_MOVERIGHT = 8;
const INDEX_SPEED = 9;
const PLAYER_SPEED = 200; // px/s
const ROAD_TOP = 1;
const ROAD_RIGHT = 2;
const ROAD_BOTTOM = 4;
const ROAD_LEFT = 8;
const PLATE_MONUMENT = 31;
const LEVEL_TIME = 120; // in seconds
let player = [BLOCK_SIZE, BLOCK_SIZE, PLAYER_SIZE, PLAYER_SIZE, 'blue', 0, 0, 0, 0, PLAYER_SPEED];
let entities;
let map;
let nbMonuments;
let nbMonumentsSnapped;
let startNewGame;
let retryGame;
let winGame;
let timeLeft; // in seconds
let colorTitleScreen = randRGB();
let colorGoalScreen = randRGB();
let colorEndScreen = randRGB();
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789.:!-%,/';
const ALIGN_LEFT = 0;
const ALIGN_CENTER = 1;
const ALIGN_RIGHT = 2;
const CHARSET_SIZE = 8; // in px
let charset = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVgAAAAICAYAAAC8lecDAAACCUlEQVR42uVa2WoDMQxc6Fvf+v8fmzYlC5vFOmZGsl26EILjlSzrGMuKjq/Pjwf7OV6PN8/SIjJk56rWZOW5y4HKMqKx+GRs48mh0u/4ye6pgmdGP4osGVkRX2R1we7/KH4U/pn4YmX5HVjP+VLH/NUBZq0fjSvWj/iPADZLPxpbOoz0e3eoavoO+6weIzqq0i8yn/WN6J2Mbav2XwmwDO+TztKnLAcaAN0AdP39PwJshf7+6vwKgFxFjyQYUZx4vsHE1z0DrrSfArJeVukBYybDjw6aaH2TvsNBPANWAITF31Jk5gQe8RkZqAKAFYDdOQPsDlCGPuOjqH9E2R8aP1kAZeTP8MgCvOX/Ix4/W0vFf1WGGgFslEEjcRqt//bO7AymM4NlADACWJa/F4DeAXH/3jUDiwAIOQgr/MvSY8UV1rIhkoGyWSQLwKz9UZDx/OUE2ch/kAyRmWfsqwD42/zsK3ZnBsvUMGeXSBT9VK6fqfFVXHEjB1VrfKr+Vflml6CQOKjwP0U/1ywWATkU4NQSgZc0ePXaFDivchAlQHYIAPWKyAKs8ieX18nQVWNkr3AdAGvpb+cDgNGvmqFX2O8Jrl1XcGYeKT14QIrKLbUxrWzTQovYShsO2p4ys80IbbPJtrkorT9Mm47SBqTYv7tNqdsXojawqjaq7vnOEkG6pcrhk9nXiP834OoPrkvjIKMAAAAASUVORK5CYII=';


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
      entities.push([x*PLATE_SIZE + BLOCK_SIZE, y*PLATE_SIZE + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, randR(), i, false]);
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

function loadImg(dataUri) {
  return new Promise(function(resolve) {
    var img = new Image();
    // TODO try img.onload = function() {}
    img.addEventListener('load', function() {
      resolve(img);
    })
    img.src = dataUri;
  });
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
      BUFFER_CTX.fillStyle = colorTitleScreen;
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);

      renderText('a tourist in paris', WIDTH / 2, 112, ALIGN_CENTER, 4);
      if (Math.floor(currentTime/1000)%2) {
        renderText('press n or tap screen to start', WIDTH / 2, HEIGHT / 2, ALIGN_CENTER);
      }
      renderText('proudly made in canada', WIDTH / 2, HEIGHT - 80, ALIGN_CENTER);
      renderText('by jerome lecomte', WIDTH / 2, HEIGHT - 56, ALIGN_CENTER);
      renderText('for js13kgames 2017', WIDTH / 2, HEIGHT - 32, ALIGN_CENTER);
      break;
    case GOAL_SCREEN:
      BUFFER_CTX.fillStyle = colorGoalScreen;
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);

      renderText('tourist: person geographically and', 16, 32);
      renderText('culturally lost, trying to cross', 16, 56);
      renderText('iconic monuments from his bucket', 16, 80);
      renderText('list before his tour bus departs.', 16, 104);

      renderText('arrow keys, wasd/zqsd or tap', 16, 176);
      renderText('screen to move.', 16, 200);
      renderText('visit all blinking monuments', 16, 224);
      renderText('before time runs out.', 16, 248);

      if (Math.floor(currentTime/1000)%2) {
        renderText('press any key or tap screen.', 16, 320);
      }
      break;
    case GAME_SCREEN:
      for (let entity of entities) {
        if (map[entity[INDEX_MAP_INDEX]] === PLATE_MONUMENT) {
          entity[INDEX_COLOR] = entity[INDEX_VISITED] ? randG() : randR();
          renderEntity(entity, BG_CTX);
        }
      }
      BUFFER_CTX.drawImage(
        BG,
        // adjust x/y offset
        bufferOffsetX, bufferOffsetY, WIDTH, HEIGHT,
        0, 0, WIDTH, HEIGHT
      );

      player[INDEX_COLOR] = randRGB();
      renderEntity(player);

      const minutes = Math.floor(Math.ceil(timeLeft) / 60);
      const seconds = Math.ceil(timeLeft) - minutes * 60;
      renderText(`bus leaving in ${minutes}:${seconds <= 9 ? '0' : ''}${seconds}`,
                 WIDTH - 16, 32, ALIGN_RIGHT);

      renderText(`${nbMonumentsSnapped}/${nbMonuments} monuments visited`,
                 16, HEIGHT - 32);
      break;
    case END_SCREEN:
      BUFFER_CTX.fillStyle = colorEndScreen;
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);

      renderText(`you ${winGame ? 'won' : 'lost'}!`, WIDTH / 2, 112, ALIGN_CENTER, 4);
      renderText(`${nbMonumentsSnapped} out of ${nbMonuments}`, WIDTH / 2, HEIGHT / 2 - 32, ALIGN_CENTER, 3);
      renderText(`monuments visited`, WIDTH / 2, HEIGHT / 2, ALIGN_CENTER, 3);
      renderText('press r to retry same level', WIDTH / 2, HEIGHT * 2 / 3, ALIGN_CENTER);
      renderText('press n to start new level', WIDTH / 2, HEIGHT * 2 / 3 + 32, ALIGN_CENTER);
      renderText('press t to tweet your score', WIDTH / 2, HEIGHT * 2 / 3 + 56, ALIGN_CENTER);
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
  var outline = (entity !== player && map[entity[INDEX_MAP_INDEX]] !== PLATE_MONUMENT) ? choice([0, 1, 2, 3, 4, 5]) : 0;
  ctx.fillRect(Math.round(x - outline), Math.round(y - outline),
               entity[INDEX_W] + 2*outline, entity[INDEX_H] + 2*outline);
}

function renderText(msg, x, y, align = ALIGN_LEFT, scale = 2) {
  const SCALED_SIZE = scale * CHARSET_SIZE;
  const MSG_WIDTH = msg.length * (SCALED_SIZE);
  const ALIGN_OFFSET = align === ALIGN_RIGHT ? MSG_WIDTH :
                       align === ALIGN_CENTER ? MSG_WIDTH / 2 :
                       0;
  for (let i = 0; i < msg.length; i++) {
    BUFFER_CTX.drawImage(
      charset,
      // TODO could memoize the characters index or hardcode a lookup table
      ALPHABET.indexOf(msg[i])*CHARSET_SIZE, 0, CHARSET_SIZE, CHARSET_SIZE,
      x + i*(SCALED_SIZE) - ALIGN_OFFSET, y, SCALED_SIZE, SCALED_SIZE
    );
  };
};

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
      !entity[INDEX_VISITED]) {
    entity[INDEX_VISITED] = true;
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
      entity[INDEX_VISITED] = false;
    }
  });
  nbMonumentsSnapped = 0;
  bufferOffsetX = bufferOffsetY = player[INDEX_MOVEUP] = player[INDEX_MOVEDOWN] = player[INDEX_MOVELEFT] = player[INDEX_MOVERIGHT] = 0;
  player[INDEX_X] = player[INDEX_Y] = BLOCK_SIZE;
  winGame = false;
  retryGame = false;
  timeLeft = LEVEL_TIME;
  colorEndScreen = randRGB();
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

  loadImg(charset).then(function(img) {
    charset = img;
    toggleLoop(true);
  });
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
  centerX = innerWidth / 2;
  centerY = innerHeight / 2;
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
const INDEX_TAPX = 0
const INDEX_TAPY = 1;
let tapped = false;
let centerX;
let centerY;

// adding onmousedown/move/up triggers a MouseEvent and a PointerEvent
// on platform that support both (duplicate event, could be filtered
// with timestamp maybe? or listener only installed if supported?
// pointer > mouse || touch)
ontouchstart = onpointerdown = function(e) {
  e.preventDefault();
  tapped = true;
  switch (screen) {
    case GAME_SCREEN:
      const [x, y] = pointer_location(e);
      tapToKeyInput(x, y);
      break;
  }
};

ontouchmove = onpointermove = function(e) {
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      if (tapped) {
        const [x, y] = pointer_location(e);
        tapToKeyInput(x, y);
      }
      break;
  }
}

ontouchend = onpointerup = function(e) {
  e.preventDefault();
  tapped = false;
  switch (screen) {
    case TITLE_SCREEN:
      screen = GOAL_SCREEN;
      break;
    case GOAL_SCREEN:
    case END_SCREEN:
      startNewGame = true;
      break;
    case GAME_SCREEN:
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

function tapToKeyInput(x, y) {
  let dx = (x - centerX) / centerX;
  let dy = (y - centerY) / centerY;
  player[INDEX_MOVELEFT] = Math.min(dx, 0);
  player[INDEX_MOVERIGHT] = Math.max(dx, 0);
  player[INDEX_MOVEUP] = Math.min(dy, 0);
  player[INDEX_MOVEDOWN] = Math.max(dy, 0);
}
