// EMBERFALL — keyboard + mouse input. One object owns the whole input state; the
// game reads it each fixed step. Keys are tracked by code (layout independent), the
// mouse position is kept in logical arena coordinates, and every press is also
// recorded as an "edge" (pressedThisFrame) so menus can react to a single tap.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last consume
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mousePressed = false; // left button pressed since last consume
    this.anyGesture = false; // first key/mouse gesture (unlocks audio)
    this._onKeyDown = (e) => this._key(e, true);
    this._onKeyUp = (e) => this._key(e, false);
    this._onMouseMove = (e) => this._mouse(e);
    this._onMouseDown = (e) => this._mouseButton(e, true);
    this._onMouseUp = (e) => this._mouseButton(e, false);
    this._onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    // Touch: drag to move, touch-and-hold to fire toward the touch point.
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.anyGesture = true;
      const t = e.touches[0];
      this._setMouseFromClient(t.clientX, t.clientY);
      this.mouseDown = true;
      this.mousePressed = true;
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this._setMouseFromClient(t.clientX, t.clientY);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) this.mouseDown = false;
    }, { passive: false });
  }

  _key(e, down) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.anyGesture = true;
    if (down) {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    } else {
      this.keys.delete(e.code);
    }
  }

  _mouse(e) {
    this._setMouseFromClient(e.clientX, e.clientY);
  }

  _setMouseFromClient(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouseX = (clientX - rect.left) * scaleX;
    this.mouseY = (clientY - rect.top) * scaleY;
  }

  _mouseButton(e, down) {
    if (e.button !== 0) return;
    this.anyGesture = true;
    if (down) {
      this._setMouseFromClient(e.clientX, e.clientY);
      this.mouseDown = true;
      this.mousePressed = true;
    } else {
      this.mouseDown = false;
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // Edge-triggered: true once per physical press, then cleared by consumeEdges().
  wasPressed(code) {
    return this.pressed.has(code);
  }

  wasMousePressed() {
    return this.mousePressed;
  }

  consumeEdges() {
    this.pressed.clear();
    this.mousePressed = false;
  }

  // Movement vector from WASD / arrows, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  firing() {
    return this.mouseDown || this.isDown('Space');
  }

  dashPressed() {
    return this.wasPressed('ShiftLeft') || this.wasPressed('ShiftRight');
  }
}
