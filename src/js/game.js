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
      BUFFER_CTX.fillStyle = 'green';
      BUFFER_CTX.fillRect(0, 0, WIDTH, HEIGHT);
      break;
  }

  blit();
};

function update() {
  switch (screen) {
    case GAME_SCREEN:
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
  switch (screen) {
    case GAME_SCREEN:
      console.log('key down', e.which);
      break;
  }
};

onkeyup = function(e) {
  switch (screen) {
    case GAME_SCREEN:
      console.log('key up', e.which);
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
