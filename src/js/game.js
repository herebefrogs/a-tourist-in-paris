// globals

const TITLE_SCREEN = 0;
const GAME_SCREEN = 1;
const END_SCREEN = 1;
let screen = GAME_SCREEN;

const CTX = c.getContext('2d');
const WIDTH = 640;
const HEIGHT = 480;
const BUFFER = c.cloneNode();
const BUFFER_CTX = BUFFER.getContext('2d');

let currentTime;
let lastTime;
let requestId;
let running = true;

const INDEX_X = 0
const INDEX_Y = 1;
const INDEX_MOVEUP = 2;
const INDEX_MOVEDOWN = 3;
const INDEX_MOVELEFT = 4
const INDEX_MOVERIGHT = 5;
const INDEX_SPEED = 6;
const PLAYER_SPEED = 100; // px/s
let player = [0, 0, 0, 0, 0, 0, PLAYER_SPEED];

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
      break;
  }

  blit();
};

function renderEntity(entity) {
  BUFFER_CTX.fillStyle = 'red';
  BUFFER_CTX.fillRect(Math.round(entity[INDEX_X]), Math.round(entity[INDEX_Y]), 44, 44);
}

function setPlayerPosition(elapsedTime) {
  const distance = elapsedTime * player[INDEX_SPEED];
  player[INDEX_X] += (player[INDEX_MOVELEFT] + player[INDEX_MOVERIGHT]) * distance;
  player[INDEX_Y] += (player[INDEX_MOVEUP] + player[INDEX_MOVEDOWN]) * distance;
};

function update(elapsedTime) {
  switch (screen) {
    case GAME_SCREEN:
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

onmousedown = ontouchstart = onpointerdown = function(e) {
  switch (screen) {
    case GAME_SCREEN:
      console.log('pointer down', pointer_location(e));
      break;
  }
};

onmousemove = ontouchmove = onpointermove = function(e) {
  switch (screen) {
    case GAME_SCREEN:
      console.log('pointer move', pointer_location(e));
      break;
  }
}

onmouseup = ontouchend = onpointerup = function(e) {
  switch (screen) {
    case GAME_SCREEN:
      console.log('pointer up', pointer_location(e));
      break;
  }
};

// utilities
function pointer_location(e) {
  return [e.pageX || e.changedTouches[0].pageX, e.pageY || e.changedTouches[0].pageY];
};
