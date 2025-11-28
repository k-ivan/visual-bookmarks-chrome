const DEFAULTS = {
  total: 20,
  minSize: 7,
  maxSize: 24,
  image: 'snowflake.png'
};

const randomMinMax = (min, max) => {
  let rand = min + Math.random() * (max + 1 - min);
  return Math.floor(rand);
};

class Snow {
  constructor(options) {
    this.options = {
      ...DEFAULTS,
      ...options
    };
    this.flakes    = [];
    this.angle     = 0;
    this.rotate    = 0;
    this.width     = 0;
    this.height    = 0;
    this.timeout   = null;
    this.raf = null;
    this.create();
  }
  dimensions() {
    // const dpr = window.devicePixelRatio || 1;
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
  }
  resize = () => {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.dimensions();
    }, 100);
  };
  create() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
    `;
    this.context = this.canvas.getContext('2d');
    document.body.appendChild(this.canvas);
    this.dimensions();

    for (let i = 0; i < this.options.total; i++) {
      this.flakes.push({
        x: Math.floor(Math.random() * this.width),
        y: -10,
        s: randomMinMax(this.options.minSize, this.options.maxSize),
        d: Math.floor(Math.random() * this.options.total)
      });
    }

    window.addEventListener('resize', this.resize);

    this.loadImage()
      .then(() => {
        window.requestAnimationFrame(() => this.draw());
      })
      .catch(() => console.warn(`Canvas: image ${this.options.image} not found`));
  }
  loadImage() {
    return new Promise((resolve, reject) => {
      this.image = new Image();
      this.image.onload = resolve;
      this.image.onerror = reject;
      this.image.src = this.options.image;
    });
  }
  draw() {
    this.context.clearRect(0, 0, this.width, this.height);

    this.context.fillStyle = this.options.color;

    for (let i = 0; i < this.options.total; i++) {
      const f = this.flakes[i];
      const dx = f.x + f.s / 2;
      const dy = f.y + f.s / 2;
      this.context.save();
      this.context.translate(dx, dy);
      this.context.rotate((this.rotate * Math.PI) / 90);
      this.context.translate(-dx, -dy);
      this.context.drawImage(this.image, f.x, f.y, f.s, f.s);
      this.context.restore();
    }
    this.update();
    this.raf = window.requestAnimationFrame(() => this.draw());
  }
  update() {
    this.angle += 0.01 * 0.75;
    this.rotate += 1;
    for (let i = 0; i < this.options.total; i++) {
      const f = this.flakes[i];
      f.y += (Math.cos(this.angle + f.d) + 1 + f.s / 2) * 0.45;
      f.x += (Math.sin(this.angle) * 2) * 0.45;

      if (f.x > this.width + 5 || f.x < -5 || f.y > this.height) {
        f.x = Math.floor(Math.random() * this.width);
        f.y = -10;
      }
    }
  }
  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}

export default Snow;
