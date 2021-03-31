import { isMobile } from './mobile';
import { checkMonetization } from './monetization';
import { save, load } from './storage';
import { ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT, CHARSET_SIZE, initCharset, renderText } from './text';
import { choice, getSeed, initRand, lerp, randRGB, randB, randG, randR } from './utils';


// GAMEPLAY VARIABLES

const TITLE_SCREEN = 0;
const GOAL_SCREEN = 1;
const GAME_SCREEN = 2;
const END_SCREEN = 3;
let screen = TITLE_SCREEN;

// factor by which to reduce both moveX and moveY when player moving diagonally
// so they don't seem to move faster than when traveling vertically or horizontally
const RADIUS_ONE_AT_45_DEG = Math.cos(Math.PI / 4);
const FULL_ACCELERATION_DURATION = 200;                // in millis, duration before moving to a new direction at full speed

let difficulty;
const DIFFICULTY_EASY = 0;
const DIFFICULTY_MEDIUM = 1;
const DIFFICULTY_HARD = 2;

let seed;
let countdown; // in seconds
let hero;
let entities;
let winGame;
let nbMonuments;
let nbMonumentsSnapped;
let webMonetizationEnabled = true;

// RENDER VARIABLES

const CTX = c.getContext('2d');         // visible canvas
const MAP = c.cloneNode();              // full map rendered off screen
const MAP_CTX = MAP.getContext('2d');
const VIEWPORT = c.cloneNode();           // visible portion of map/viewport
const VIEWPORT_CTX = VIEWPORT.getContext('2d');
VIEWPORT.width = 640;                      // viewport size
VIEWPORT.height = 480;

let monuments;
let colorTitleScreen;
let colorGoalScreen;
let colorEndScreen;
let OUTLINES; // array of pixels
let PLAYER_SIZE; // in px
let BLOCK_SIZE; // in px (size of a building)
let PLATE_SIZE; // in px (3x3 blocks in a plate)
const MAP_WIDTH = 14; // in plates
const MAP_HEIGHT = 10; // in plates
const ROAD_TOP = 1;
const ROAD_RIGHT = 2;
const ROAD_BOTTOM = 4;
const ROAD_LEFT = 8;

// camera-window & edge-snapping settings
let CAMERA_WINDOW_X;
let CAMERA_WINDOW_Y;
let CAMERA_WINDOW_WIDTH;
let CAMERA_WINDOW_HEIGHT;
let viewportOffsetX = 0;
let viewportOffsetY = 0;

// LOOP VARIABLES

let currentTime;
let elapsedTime;
let lastTime;
let requestId;
let running = true;

// GAMEPLAY HANDLERS

function unlockExtraContent() {
  // this will be checked upon game start
  // and give 20% more time to Coil subscribers
  webMonetizationEnabled = true;
}

function generateMapEntitiesAndBus() {
  // step 1: determine general layout of city streets by connecting LEGO-like plates (made of 3x3 blocks)
  // e.g.   _ _ _                                 _ _ _
  //       |x|x|x|                               |x| |x|
  //       |_   _| T shaped intersection         |_   _| + crossing intersection
  //       |x|_|x|                               |x|_|x|
  //
  //        _ _ _                                 _ _ _
  //       |x|x|x|                               |x|x|x|
  //       |_ _ _| straight line                 |_  |x| left turn
  //       |x|x|x|                               |x|_|x|
  //
  const map = [];
  let plate;
  for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; i++) {
    if (i === 0) {
      // turn in top left corner
      plate = ROAD_RIGHT + ROAD_BOTTOM;
    } else if (i === MAP_WIDTH - 1) {
      // turn in top right corner
      plate = ROAD_LEFT + ROAD_BOTTOM;
    } else if (i === MAP_WIDTH * (MAP_HEIGHT - 1)) {
      // turn in bottom left corner
      plate = ROAD_RIGHT + ROAD_TOP;
    } else if (i === MAP_WIDTH * MAP_HEIGHT - 1) {
      // turn in bottom right corner
      plate = ROAD_LEFT + ROAD_TOP;
    } else if (i < MAP_WIDTH - 1) {
      // horizontal road or T road at the top edge of the map
      plate = choice([
        ROAD_LEFT + ROAD_RIGHT,
        ROAD_LEFT + ROAD_BOTTOM + ROAD_RIGHT
      ]);
    } else if (MAP_WIDTH * (MAP_HEIGHT - 1) < i) {
      // horizontal road or upside down T road at the bottom edge of the map
      plate = choice([
        ROAD_LEFT + ROAD_RIGHT,
        ROAD_LEFT + ROAD_TOP + ROAD_RIGHT
      ]);
    } else if (!(i % MAP_WIDTH)) {
      // vertical road or |- road at the left edge of the map
      plate = choice([
        ROAD_TOP + ROAD_BOTTOM,
        ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM
      ]);
    } else if (i % MAP_WIDTH === MAP_WIDTH - 1) {
      // vertical road or -| road at the right edge of the map
      plate = choice([
        ROAD_TOP + ROAD_BOTTOM,
        ROAD_TOP + ROAD_LEFT + ROAD_BOTTOM
      ]);
    } else {
      plate = choice([
        ROAD_LEFT + ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM,
        ROAD_TOP + ROAD_LEFT + ROAD_BOTTOM,
        ROAD_TOP + ROAD_RIGHT + ROAD_BOTTOM,
        ROAD_LEFT + ROAD_TOP + ROAD_RIGHT,
        ROAD_LEFT + ROAD_BOTTOM + ROAD_RIGHT,
        ROAD_TOP + ROAD_BOTTOM,
        ROAD_LEFT + ROAD_RIGHT,
        'monument'
      ]);
    }
    map[i] = plate;
  }

  // step 2: convert the full blocks of each plate into entities
  entities = [];
  for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; i++) {
    const x = i % MAP_WIDTH;
    const y = (i - x) / MAP_WIDTH;
    if (map[i] === 'monument') {
      entities.push(
        createEntity(
          x * PLATE_SIZE + BLOCK_SIZE,
          y * PLATE_SIZE + BLOCK_SIZE,
          BLOCK_SIZE,
          randR(),
          'monument'
        )
      );
      continue;
    }
    // corner blocks are on all plates
    entities.push(
      createEntity(
        x * PLATE_SIZE,
        y * PLATE_SIZE,
        BLOCK_SIZE,
        randRGB()
      )
    );
    entities.push(
      createEntity(
        x * PLATE_SIZE + 2 * BLOCK_SIZE,
        y * PLATE_SIZE,
        BLOCK_SIZE,
        randRGB()
      )
    );
    entities.push(
      createEntity(
        x * PLATE_SIZE,
        y * PLATE_SIZE + 2 * BLOCK_SIZE,
        BLOCK_SIZE,
        randRGB()
      )
    );
    entities.push(
      createEntity(
        x * PLATE_SIZE + 2 * BLOCK_SIZE,
        y * PLATE_SIZE + 2 * BLOCK_SIZE,
        BLOCK_SIZE,
        randRGB()
      )
    );
    if (!(map[i] & ROAD_TOP)) {
      entities.push(
      createEntity(
          x * PLATE_SIZE + BLOCK_SIZE,
          y * PLATE_SIZE,
          BLOCK_SIZE,
          randRGB()
        )
      );
    }
    if (!(map[i] & ROAD_LEFT)) {
      entities.push(
        createEntity(
          x * PLATE_SIZE,
          y * PLATE_SIZE + BLOCK_SIZE,
          BLOCK_SIZE,
          randRGB()
        )
      );
    }
    if (!(map[i] & ROAD_BOTTOM)) {
      entities.push(
        createEntity(
          x * PLATE_SIZE + BLOCK_SIZE,
          y * PLATE_SIZE + 2 * BLOCK_SIZE,
          BLOCK_SIZE,
          randRGB()
        )
      );
    }
    if (!(map[i] & ROAD_RIGHT)) {
      entities.push(
        createEntity(
          x * PLATE_SIZE + 2 * BLOCK_SIZE,
          y * PLATE_SIZE + BLOCK_SIZE,
          BLOCK_SIZE,
          randRGB()
        )
      );
    }
  }

  // turn one of the monuments into the bus the tourist has to catch
  const monuments = entities.filter(entity => entity.type === 'monument');
  bus = choice(monuments);
  bus.type = 'bus';
  bus.color = randB();
};

function setSizes() {
  PLAYER_SIZE =
    difficulty === DIFFICULTY_EASY
      ? 10
      : difficulty === DIFFICULTY_MEDIUM
      ? 15
      : 20;
  BLOCK_SIZE =
    difficulty === DIFFICULTY_EASY
      ? 20
      : difficulty === DIFFICULTY_MEDIUM
      ? 40
      : 80;
  PLATE_SIZE = BLOCK_SIZE * 3;
  MAP.width = MAP_WIDTH * PLATE_SIZE;
  MAP.height = MAP_HEIGHT * PLATE_SIZE;
  CAMERA_WINDOW_X = CAMERA_WINDOW_Y =
    difficulty === DIFFICULTY_EASY
      ? 100
      : difficulty === DIFFICULTY_MEDIUM
      ? 150
      : 200;
  CAMERA_WINDOW_WIDTH = VIEWPORT.width - CAMERA_WINDOW_X;
  CAMERA_WINDOW_HEIGHT = VIEWPORT.height - CAMERA_WINDOW_Y;
  PLAYER_SPEED =
    difficulty === DIFFICULTY_EASY
      ? 100
      : difficulty === DIFFICULTY_MEDIUM
      ? 150
      : 200;
  OUTLINES =
    difficulty === DIFFICULTY_EASY
      ? [0, 1, 2]
      : difficulty === DIFFICULTY_MEDIUM
      ? [0, 1, 2, 3]
      : [0, 1, 2, 3, 4, 5];
}

function createEntity(x = 0, y = 0, size = BLOCK_SIZE, color, type) {
  let extraProps;

  switch(type) {
    case 'hero':
      extraProps = {
        moveDown: 0,
        moveLeft: 0,
        moveRight: 0,
        moveUp: 0,
        moveX: 0,
        moveY: 0,
        outline: 0,
        type,
        speed: PLAYER_SPEED
      };
      break;
    case 'monument':
      extraProps = {
        outline: 0,
        type,
        visited: false
      };
      break;
    default:
      extraProps = {
        outline: choice(OUTLINES)
      };
  }

  // TODO in this game h === w is always true, replace with 1 size attribute
  return {
    color,
    h: size,
    w: size,
    x,
    y,
    ...extraProps
  };
};

function startGame() {
  initRand(seed);
  setSizes();
  colorTitleScreen = randRGB();
  colorGoalScreen = randRGB();
  colorEndScreen = randRGB();
  winGame = false;
  nbMonumentsSnapped = 0;
  // give coil subscribers 20% more time to look for monuments
  countdown = 120 * (webMonetizationEnabled ? 1.2 : 1);
  viewportOffsetX = viewportOffsetY = 0;
  hero = createEntity(BLOCK_SIZE, BLOCK_SIZE, PLAYER_SIZE, 'blue', 'hero');
  generateMapEntitiesAndBus();
  monuments = entities.filter(entity => entity.type === 'monument');
  nbMonuments = monuments.length;
  renderMap();

  screen = GAME_SCREEN;
};

function testAABBCollision(entity) {
  const bounds = {
    entity1MaxX: hero.x + hero.w,
    entity1MaxY: hero.y + hero.h,
    entity2MaxX: entity.x + entity.w,
    entity2MaxY: entity.y + entity.h,
  };

  bounds.collided = hero.x < bounds.entity2MaxX
    && bounds.entity1MaxX > entity.x
    && hero.y < bounds.entity2MaxY
    && bounds.entity1MaxY > entity.y;

  return bounds;
};

// hero collided into entity
function correctAABBCollision(entity, bounds) {
  const { entity1MaxX, entity1MaxY, entity2MaxX, entity2MaxY } = bounds;

  const deltaMaxX = entity1MaxX - entity.x;
  const deltaMaxY = entity1MaxY - entity.y;
  const deltaMinX = entity2MaxX - hero.x;
  const deltaMinY = entity2MaxY - hero.y;

  // AABB collision response (homegrown wall sliding, not physically correct
  // because just pushing along one axis by the distance overlapped)

  // hero moving down/right
  if (hero.moveX > 0 && hero.moveY > 0) {
    if (deltaMaxX < deltaMaxY) {
      // collided right side first
      hero.x -= deltaMaxX;
    } else {
      // collided top side first
      hero.y -= deltaMaxY;
    }
  }
  // hero moving up/right
  else if (hero.moveX > 0 && hero.moveY < 0) {
    if (deltaMaxX < deltaMinY) {
      // collided right side first
      hero.x -= deltaMaxX;
    } else {
      // collided bottom side first
      hero.y += deltaMinY;
    }
  }
  // hero moving right
  else if (hero.moveX > 0) {
    hero.x -= deltaMaxX;
  }
  // hero moving down/left
  else if (hero.moveX < 0 && hero.moveY > 0) {
    if (deltaMinX < deltaMaxY) {
      // collided left side first
      hero.x += deltaMinX;
    } else {
      // collided top side first
      hero.y -= deltaMaxY;
    }
  }
  // hero moving up/left
  else if (hero.moveX < 0 && hero.moveY < 0) {
    if (deltaMinX < deltaMinY) {
      // collided left side first
      hero.x += deltaMinX;
    } else {
      // collided bottom side first
      hero.y += deltaMinY;
    }
  }
  // hero moving left
  else if (hero.moveX < 0) {
    hero.x += deltaMinX;
  }
  // hero moving down
  else if (hero.moveY > 0) {
    hero.y -= deltaMaxY;
  }
  // hero moving up
  else if (hero.moveY < 0) {
    hero.y += deltaMinY;
  }
};

function constrainToViewport() {
  if (hero.x < 0) {
    hero.x = 0;
  } else if (hero.x > MAP.width - hero.w) {
    hero.x = MAP.width - hero.w;
  }
  if (hero.y < 0) {
    hero.y = 0;
  } else if (hero.y > MAP.height - hero.h) {
    hero.y = MAP.height - hero.h;
  }
};

function updateCameraWindow() {
  // edge snapping
  if (0 < viewportOffsetX && hero.x < viewportOffsetX + CAMERA_WINDOW_X) {
    viewportOffsetX = Math.max(0, hero.x - CAMERA_WINDOW_X);
  }
  else if (viewportOffsetX < MAP.width - VIEWPORT.width && hero.x + hero.w > viewportOffsetX + CAMERA_WINDOW_WIDTH) {
    viewportOffsetX = Math.min(MAP.width - VIEWPORT.width, hero.x + hero.w - CAMERA_WINDOW_WIDTH);
  }
  if (0 < viewportOffsetY && hero.y < viewportOffsetY + CAMERA_WINDOW_Y) {
    viewportOffsetY = Math.max(0, hero.y - CAMERA_WINDOW_Y);
  }
  else if (viewportOffsetY < MAP.height - VIEWPORT.height && hero.y + hero.h > viewportOffsetY + CAMERA_WINDOW_HEIGHT) {
    viewportOffsetY = Math.min(MAP.height - VIEWPORT.height, hero.y + hero.h - CAMERA_WINDOW_HEIGHT);
  }
};

function updateHeroInput() {
  if (isTouch) {
    hero.moveX = hero.moveLeft + hero.moveRight;
    hero.moveY = hero.moveUp + hero.moveDown;
  } else {
    if (hero.moveLeft || hero.moveRight) {
      hero.moveX = (hero.moveLeft > hero.moveRight ? -1 : 1) * lerp(0, 1, (currentTime - Math.max(hero.moveLeft, hero.moveRight)) / FULL_ACCELERATION_DURATION)
    } else {
      hero.moveX = 0;
    }
    if (hero.moveDown || hero.moveUp) {
      hero.moveY = (hero.moveUp > hero.moveDown ? -1 : 1) * lerp(0, 1, (currentTime - Math.max(hero.moveUp, hero.moveDown)) / FULL_ACCELERATION_DURATION)
    } else {
      hero.moveY = 0;
    }
  }
}

function updatePlayerPosition() {
  const scale = hero.moveX && hero.moveY ? RADIUS_ONE_AT_45_DEG : 1;
  const distance = hero.speed * elapsedTime * scale;
  hero.x += distance * hero.moveX;
  hero.y += distance * hero.moveY;
};

function checkGameEnd() {
  if (bus.visited) {
    screen = END_SCREEN;
    winGame = true;
  } else if (countdown < 0) {
    screen = END_SCREEN;
    winGame = false;
  }
};

function update() {
  switch (screen) {
    case GAME_SCREEN:
      countdown -= elapsedTime;

      updateHeroInput();
      updatePlayerPosition();
      hero.color = randRGB();
      entities.forEach(entity => {
        const {collided, ...bounds} = testAABBCollision(entity);
        if (collided) {
          correctAABBCollision(entity, bounds);
        }
        if (entity.type === 'monument' && !entity.visited) {
          // change the monument's color to make it stand out
          entity.color = randR();

          if (collided) {
            entity.visited = true;
            entity.color = randG();
            nbMonumentsSnapped++;
          }
        }
        if (entity.type === 'bus' && !entity.visited) {
          // change the bus's color to make it stand out
          entity.color = randB();

          if (collided) {
            entity.visited = true;
          }
        }

      });
      constrainToViewport();
      updateCameraWindow();
      checkGameEnd();
      break;
  }
};

// RENDER HANDLERS

function blit() {
  // copy backbuffer onto visible canvas, scaling it to screen dimensions
  CTX.drawImage(
    VIEWPORT,
    0, 0, VIEWPORT.width, VIEWPORT.height,
    0, 0, c.width, c.height
  );
};

function render() {
  const halfWidth = VIEWPORT.width / 2;
  const halfHeight = VIEWPORT.height / 2;
  const twoThirdHeight = VIEWPORT.height * 2 / 3;

  switch (screen) {
    case TITLE_SCREEN:
      VIEWPORT_CTX.fillStyle = colorTitleScreen;
      VIEWPORT_CTX.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

      renderText('a tourist in paris', VIEWPORT_CTX, halfWidth, 112, ALIGN_CENTER, 4);

      if (isMobile) {
        renderText('tap to start', VIEWPORT_CTX, halfWidth, halfHeight, ALIGN_CENTER);
      } else {
        renderText('press e for easy', VIEWPORT_CTX, halfWidth, halfHeight, ALIGN_CENTER);
        renderText('m for medium, h for hard', VIEWPORT_CTX, halfWidth, halfHeight + 24, ALIGN_CENTER);
      }

      renderText('proudly made in canada', VIEWPORT_CTX, halfWidth, VIEWPORT.height - 80, ALIGN_CENTER);
      renderText('by jerome lecomte', VIEWPORT_CTX, halfWidth, VIEWPORT.height - 56, ALIGN_CENTER);
      renderText('for js13kgames 2017', VIEWPORT_CTX, VIEWPORT.width / 2, VIEWPORT.height - 32, ALIGN_CENTER);
      break;
    case GOAL_SCREEN:
      VIEWPORT_CTX.fillStyle = colorGoalScreen;
      VIEWPORT_CTX.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

      renderText('tourist: noun. person geographically', VIEWPORT_CTX, 16, 32);
      renderText('and culturally lost, trying to cross', VIEWPORT_CTX, 16, 56);
      renderText('iconic monuments off their bucket', VIEWPORT_CTX, 16, 80);
      renderText('list before their tour bus departs.', VIEWPORT_CTX, 16, 104);

      renderText('controls:', VIEWPORT_CTX, 16, 176);
      renderText(isMobile ? 'swipe screen to move' : 'arrow keys or wasd to move.', VIEWPORT_CTX, VIEWPORT.width - 16, 200, ALIGN_RIGHT);
      renderText('goal:', VIEWPORT_CTX, 16, 248);
      renderText('touch all red blinking squares', VIEWPORT_CTX, VIEWPORT.width - 16, 272, ALIGN_RIGHT);
      renderText('then touch the blue square', VIEWPORT_CTX, VIEWPORT.width - 16, 296, ALIGN_RIGHT);
      renderText('before time runs out.', VIEWPORT_CTX, VIEWPORT.width - 16, 320, ALIGN_RIGHT);

      if (Math.floor(currentTime / 1000) % 2) {
        renderText(isMobile ? 'tap to start.' : 'press any key to start.', VIEWPORT_CTX, 16, VIEWPORT.height - 32);
      }
      break;
    case GAME_SCREEN:
      monuments.forEach(renderEntityOnCachedMap);
      renderEntityOnCachedMap(bus);
      VIEWPORT_CTX.drawImage(
        MAP,
        // adjust x/y offset
        viewportOffsetX, viewportOffsetY, VIEWPORT.width, VIEWPORT.height,
        0, 0, VIEWPORT.width, VIEWPORT.height
      );
      renderEntity(hero);
      renderCountdown();
      renderText(`${nbMonumentsSnapped}/${nbMonuments} monuments visited`, VIEWPORT_CTX, 16, VIEWPORT.height - 32, ALIGN_LEFT);
      // uncomment to debug mobile input handlers
      // renderDebugTouch();
      break;
    case END_SCREEN:
      VIEWPORT_CTX.fillStyle = colorEndScreen;
      VIEWPORT_CTX.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

      renderText(`you saw`, VIEWPORT_CTX, halfWidth, halfHeight - 128, ALIGN_CENTER, 2);
      renderText(` ${nbMonumentsSnapped} out of ${nbMonuments} monuments`, VIEWPORT_CTX, halfWidth, halfHeight - 96, ALIGN_CENTER, 3);
      renderText(`before`, VIEWPORT_CTX, halfWidth, halfHeight - 52, ALIGN_CENTER, 2);
      renderText(`${winGame ? 'catch' : 'miss'}ing your bus!`, VIEWPORT_CTX, halfWidth, halfHeight - 18, ALIGN_CENTER, 3);
      renderText('press r to retry same level', VIEWPORT_CTX, halfWidth, twoThirdHeight, ALIGN_CENTER);
      renderText('press n to start new level', VIEWPORT_CTX, halfWidth, twoThirdHeight + 24, ALIGN_CENTER);
      renderText('press t to tweet your score', VIEWPORT_CTX, halfWidth, twoThirdHeight + 48, ALIGN_CENTER);
  }

  blit();
};

function renderCountdown() {
  const minutes = Math.floor(Math.ceil(countdown) / 60);
  const seconds = Math.ceil(countdown) - minutes * 60;
  renderText(`bus leaving in ${minutes}:${seconds <= 9 ? '0' : ''}${seconds}`, VIEWPORT_CTX, VIEWPORT.width - CHARSET_SIZE, CHARSET_SIZE, ALIGN_RIGHT);

};

function renderEntityOnCachedMap(entity) {
  renderEntity(entity, MAP_CTX, 0, 0);
};

function renderEntity(entity, ctx = VIEWPORT_CTX, offsetX = viewportOffsetX, offsetY = viewportOffsetY) {
  ctx.fillStyle = entity.color;

  ctx.fillRect(
    Math.round(entity.x - offsetX - entity.outline),
    Math.round(entity.y - offsetY - entity.outline),
    entity.w + 2 * entity.outline,
    entity.h + 2 * entity.outline
  );
};

function renderMap() {
  MAP_CTX.fillStyle = '#fff';
  MAP_CTX.fillRect(0, 0, MAP.width, MAP.height);
  
  // cache map by rendering static entities on the MAP canvas
  entities.forEach(renderEntityOnCachedMap);
};

// LOOP HANDLERS

function loop() {
  if (running) {
    requestId = requestAnimationFrame(loop);
    render();
    currentTime = Date.now();
    elapsedTime = (currentTime - lastTime) / 1000;
    update();
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

// EVENT HANDLERS


// the real "main" of the game
onload = async (e) => {
  document.title = 'A Tourist in Paris';

  onresize();
  checkMonetization(unlockExtraContent);

  seed = getSeed();
  colorTitleScreen = randRGB();
  colorGoalScreen = randRGB();

  await initCharset();

  toggleLoop(true);
};

onresize = onrotate = function() {
  // scale canvas to fit screen while maintaining aspect ratio
  const scaleToFit = Math.min(innerWidth / VIEWPORT.width, innerHeight / VIEWPORT.height);
  c.width = VIEWPORT.width * scaleToFit;
  c.height = VIEWPORT.height * scaleToFit;
  // disable smoothing on image scaling
  CTX.imageSmoothingEnabled = MAP_CTX.imageSmoothingEnabled = VIEWPORT_CTX.imageSmoothingEnabled = false;
};

// UTILS

document.onvisibilitychange = function(e) {
  // pause loop and game timer when switching tabs
  toggleLoop(!e.target.hidden);
};


// INPUT HANDLERS

onkeydown = function(e) {
  // prevent itch.io from scrolling the page up/down
  e.preventDefault();

  if (!e.repeat) {
    switch (screen) {
      case GAME_SCREEN:
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
          case 'KeyQ':  // French keyboard support
            hero.moveLeft = currentTime;
            break;
          case 'ArrowUp':
          case 'KeyW':
          case 'KeyZ':  // French keyboard support
            hero.moveUp = currentTime;
            break;
          case 'ArrowRight':
          case 'KeyD':
            hero.moveRight = currentTime;
            break;
          case 'ArrowDown':
          case 'KeyS':
            hero.moveDown = currentTime;
            break;
          case 'KeyP':
            // Pause game as soon as key is pressed
            toggleLoop(!running);
            break;
        }
        break;
    }
  }
};

onkeyup = function(e) {
  switch (screen) {
    case TITLE_SCREEN:
      switch (e.code) {
        case 'KeyE':
          difficulty = DIFFICULTY_EASY;
          screen = GOAL_SCREEN;
          break;
        case 'KeyM':
          difficulty = DIFFICULTY_MEDIUM;
          screen = GOAL_SCREEN;
          break;
        case 'KeyH':
          difficulty = DIFFICULTY_HARD;
          screen = GOAL_SCREEN;
          break;
      }
      break;
    case GOAL_SCREEN:
        startGame();
        break;
    case GAME_SCREEN:
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
        case 'KeyQ': // French keyboard support
          if (hero.moveRight) {
            // reversing right while hero moving left
            hero.moveRight = currentTime;
          }
          hero.moveLeft = 0;
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (hero.moveLeft) {
            // reversing left while hero moving right
            hero.moveLeft = currentTime;
          }
          hero.moveRight = 0;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyZ': // French keyboard support
          if (hero.moveDown) {
            // reversing down while hero moving up
            hero.moveDown = currentTime;
          }
          hero.moveUp = 0;
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (hero.moveUp) {
            // reversing up while hero moving down
            hero.moveUp = currentTime;
          }
          hero.moveDown = 0;
          break;
        }
      break;
    case END_SCREEN:
      switch (e.code) {
        case 'Enter':
        case 'KeyN':
          seed = getSeed(true);
          startGame();
          break;
        case 'KeyR':
          startGame();
          break;
        case 'KeyT':
          open(
            `https://twitter.com/intent/tweet?text=I%20visited%20${nbMonumentsSnapped}%20monument${
              nbMonumentsSnapped > 1 ? 's' : ''
            }%20before%20${winGame ? 'catch' : 'miss'}ing%20my%20bus%20in%20A%20Tourist%20In%20Paris,%20a%20%23js13k%20game%20by%20%40herebefrogs%0A%0ATry%20to%20beat%20my%20score%3A%20${
              encodeURIComponent(location)
            }`,
          '_blank' 
          ); 
          break;
      }
      break;
  }
};

// MOBILE INPUT HANDLERS

let minX = 0;
let minY = 0;
let maxX = 0;
let maxY = 0;
let MIN_DISTANCE = 30; // in px
let touches = [];
let isTouch = false;

// adding onmousedown/move/up triggers a MouseEvent and a PointerEvent
// on platform that support both (duplicate event, pointer > mouse || touch)
ontouchstart = onpointerdown = function(e) {
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      isTouch = true;
      [maxX, maxY] = [minX, minY] = pointerLocation(e);
      break;
  }
};

ontouchmove = onpointermove = function(e) {
  e.preventDefault();
  switch (screen) {
    case GAME_SCREEN:
      if (minX && minY) {
        setTouchPosition(pointerLocation(e));
      }
      break;
  }
}

ontouchend = onpointerup = function(e) {
  e.preventDefault();
  switch (screen) {
    case TITLE_SCREEN:
      screen = GOAL_SCREEN;
      break;
    case GOAL_SCREEN:
    case END_SCREEN:
      startGame();
      break;
    case GAME_SCREEN:
      isTouch = false;
      // stop hero
      hero.moveLeft = hero.moveRight = hero.moveDown = hero.moveUp = 0;
      // end touch
      minX = minY = maxX = maxY = 0;
      break;
  }
};

// utilities
function pointerLocation(e) {
  return [e.pageX || e.changedTouches[0].pageX, e.pageY || e.changedTouches[0].pageY];
};

function setTouchPosition([x, y]) {
  // touch moving further right
  if (x > maxX) {
    maxX = x;
    hero.moveRight = lerp(0, 1, (maxX - minX) / MIN_DISTANCE)
  }
  // touch moving further left
  else if (x < minX) {
    minX = x;
    hero.moveLeft = -lerp(0, 1, (maxX - minX) / MIN_DISTANCE)
  }
  // touch reversing left while hero moving right
  else if (x < maxX && hero.moveX > 0) {
    minX = x;
    hero.moveRight = 0;
  }
  // touch reversing right while hero moving left
  else if (minX < x && hero.moveX < 0) {
    maxX = x;
    hero.moveLeft = 0;
  }

  // touch moving further down
  if (y > maxY) {
    maxY = y;
    hero.moveDown = lerp(0, 1, (maxY - minY) / MIN_DISTANCE)

  }
  // touch moving further up
  else if (y < minY) {
    minY = y;
    hero.moveUp = -lerp(0, 1, (maxY - minY) / MIN_DISTANCE)

  }
  // touch reversing up while hero moving down
  else if (y < maxY && hero.moveY > 0) {
    minY = y;
    hero.moveDown = 0;
  }
  // touch reversing down while hero moving up
  else if (minY < y && hero.moveY < 0) {
    maxY = y;
    hero.moveUp = 0;
  }

  // uncomment to debug mobile input handlers
  // addDebugTouch(x, y);
};

function addDebugTouch(x, y) {
  touches.push([x / innerWidth * VIEWPORT.width, y / innerHeight * VIEWPORT.height]);
  if (touches.length > 10) {
    touches = touches.slice(touches.length - 10);
  }
};

function renderDebugTouch() {
  let x = maxX / innerWidth * VIEWPORT.width;
  let y = maxY / innerHeight * VIEWPORT.height;
  renderDebugTouchBound(x, x, 0, VIEWPORT.height, '#f00');
  renderDebugTouchBound(0, VIEWPORT.width, y, y, '#f00');
  x = minX / innerWidth * VIEWPORT.width;
  y = minY / innerHeight * VIEWPORT.height;
  renderDebugTouchBound(x, x, 0, VIEWPORT.height, '#ff0');
  renderDebugTouchBound(0, VIEWPORT.width, y, y, '#ff0');

  if (touches.length) {
    VIEWPORT_CTX.strokeStyle = VIEWPORT_CTX.fillStyle =   '#02d';
    VIEWPORT_CTX.beginPath();
    [x, y] = touches[0];
    VIEWPORT_CTX.moveTo(x, y);
    touches.forEach(function([x, y]) {
      VIEWPORT_CTX.lineTo(x, y);
    });
    VIEWPORT_CTX.stroke();
    VIEWPORT_CTX.closePath();
    VIEWPORT_CTX.beginPath();
    [x, y] = touches[touches.length - 1];
    VIEWPORT_CTX.arc(x, y, 2, 0, 2 * Math.PI)
    VIEWPORT_CTX.fill();
    VIEWPORT_CTX.closePath();
  }
};

function renderDebugTouchBound(_minX, _maxX, _minY, _maxY, color) {
  VIEWPORT_CTX.strokeStyle = color;
  VIEWPORT_CTX.beginPath();
  VIEWPORT_CTX.moveTo(_minX, _minY);
  VIEWPORT_CTX.lineTo(_maxX, _maxY);
  VIEWPORT_CTX.stroke();
  VIEWPORT_CTX.closePath();
};
