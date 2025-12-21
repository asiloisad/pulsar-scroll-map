const { CompositeDisposable } = require("atom");
const etch = require("etch");

class Layer {

  constructor(props) {
    this.editor = props.editor;
    this.name = props.name;
    this.items = [];
    this.clickHandlers = new Map();
    this.baseClass = `scroll-item ${this.name}-layer`;
    this.update = throttle(() => this.updateSync(), props.timer);
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.config.observe(`scroll-map.${this.name}Layer.threshold`, (value) => {
        this.threshold = value;
      }),
      atom.config.onDidChange(`scroll-map.${this.name}Layer.threshold`, (value) => {
        this.update()
      }),
      this.editor.displayLayer.onDidChange(this.update)
    );
  }

  updateSync() {
    if (!this.editor.scrollmap) {
      return;
    }
    this.recalculate();
    this.prepareItems();
    etch.update(this.editor.scrollmap);
  }

  prepareItems() {
    if (!this.editor.component) {
      return;
    }
    for (let item of this.items) {
      item.pix = this.editor.component.pixelPositionAfterBlocksForRow(item.row);
      item.c = item.cls ? `${this.baseClass} ${item.cls}` : this.baseClass;
      item.o = this.clickHandler(item.row);
    }
  }

  clickHandler(row) {
    let handler = this.clickHandlers.get(row);
    if (!handler) {
      this.clickHandlers.set(row, {
        click: () =>
          this.editor.scrollToScreenPosition([row, 0], { center: true }),
      });
    }
    return handler;
  }

  destroy() {
    this.items = [];
    this.clickHandlers.clear();
    this.disposables.dispose();
  }
}

function throttle(func, timeout) {
  let timer = null;
  let pending = false;
  return (...args) => {
    if (timer) {
      pending = true;
      return;
    }
    func.apply(null, args);
    timer = setTimeout(() => {
      timer = null;
      if (pending) {
        pending = false;
        func.apply(null, args);
      }
    }, timeout);
  };
}

module.exports = Layer;
