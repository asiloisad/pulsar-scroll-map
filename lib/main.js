/** @babel */
/** @jsx etch.dom */

const { CompositeDisposable, Disposable } = require("atom");
const etch = require("etch");

/**
 * Scroll Map Package
 * Displays a minimap-style scroll indicator with customizable layers.
 * Supports cursor, find, navigation, and linter layers.
 */
module.exports = {
  /**
   * Activates the package and initializes scroll map layers.
   */
  activate() {
    this.layers = {}; // list of classes
    this.services = {}; // track available services
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor);
      }),
      atom.workspace.getCenter().observePanes((pane) => {
        let count = 0;
        let resizeObserver = new ResizeObserver(() => {
          if ((count += 1) === 1) {
            return;
          }
          for (let item of pane.getItems()) {
            if (atom.workspace.isTextEditor(item)) {
              item.scrollmap.update();
            }
          }
        });
        resizeObserver.observe(pane.getElement());
        let onWillDestroy = pane.onWillDestroy(() => {
          resizeObserver.disconnect();
          this.disposables.add(onWillDestroy);
        });
        this.disposables.add(
          new Disposable(() => {
            resizeObserver.disconnect();
          })
        );
      }),
      // Observe layer state changes for live toggling
      atom.config.observe("scroll-map.cursorLayer.state", () => this.cursorLayer()),
      atom.config.observe("scroll-map.findLayer.state", () => this.findLayer())
    );
  },

  /**
   * Deactivates the package and disposes resources.
   */
  deactivate() {
    this.layers = {};
    this.disposables.dispose();
  },

  /**
   * Patches an editor with a scroll map component.
   * @param {TextEditor} editor - The text editor to patch
   */
  patchEditor(editor) {
    const editorView = editor.getElement();
    if (!editorView) {
      return;
    }
    const scrollView = editorView.querySelector(".vertical-scrollbar");
    if (!scrollView) {
      return;
    }
    editor.scrollmap = new ScrollMap(editor);
    for (const [name, Layer] of Object.entries(this.layers)) {
      editor.scrollmap.addLayer(name, Layer);
    }
    let disposable = new Disposable(() => {
      editor.scrollmap.destroy();
    });
    editor.disposables.add(disposable);
    this.disposables.add(disposable);
    scrollView.parentNode.insertBefore(
      editor.scrollmap.element,
      scrollView.nextSibling
    );
  },

  /**
   * Registers a new layer type for all scroll maps.
   * @param {string} name - The layer name
   * @param {Function} Layer - The layer class constructor
   */
  registerLayer(name, Layer) {
    if (name in this.layers) {
      return;
    }
    this.layers[name] = Layer;
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.addLayer(name, Layer);
    }
  },

  /**
   * Unregisters a layer type from all scroll maps.
   * @param {string} name - The layer name to remove
   */
  unregisterLayer(name) {
    if (!(name in this.layers)) {
      return;
    }
    delete this.layers[name];
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.delLayer(name);
    }
  },

  /**
   * Toggles the cursor layer based on configuration.
   */
  cursorLayer() {
    if (atom.config.get("scroll-map.cursorLayer.state")) {
      this.registerLayer("cursor", CursorLayer);
    } else {
      this.unregisterLayer("cursor");
    }
  },

  /**
   * Toggles the find results layer based on configuration.
   * Requires find-and-replace service to be available.
   */
  findLayer() {
    if (atom.config.get("scroll-map.findLayer.state") && this.services.findAndReplace) {
      this.registerLayer("find", FindLayer);
    } else {
      this.unregisterLayer("find");
    }
  },

  /**
   * Consumes the find-and-replace service.
   * @param {Object} service - The find-and-replace service
   * @returns {Disposable} Disposable to unregister the layer
   */
  consumeFindService(service) {
    // Store reference to findModel for event subscription
    const findPackage = atom.packages.getLoadedPackage("find-and-replace");
    this.findModel = findPackage?.mainModule?.findModel;
    this.services.findAndReplace = true;
    this.findLayer();
    return new Disposable(() => {
      this.services.findAndReplace = false;
      this.unregisterLayer("find");
      this.findModel = null;
    });
  },

  /**
   * Provides the scroll-map service for layer registration.
   * @returns {Object} Service with registerLayer, unregisterLayer, and Layer base class
   */
  serviceProvider() {
    return {
      registerLayer: (name, LayerClass) => {
        return this.registerLayer(name, LayerClass);
      },
      unregisterLayer: (name) => {
        return this.unregisterLayer(name);
      },
      Layer,
      ScrollMapSimple,
    };
  },
};

class ScrollMap {
  constructor(editor) {
    this.editor = editor;
    this.layers = {};
    etch.initialize(this);
  }

  addLayer(name, Layer) {
    if (name in this.layers) {
      return;
    }
    this.layers[name] = new Layer(this.editor);
  }

  delLayer(name) {
    if (!(name in this.layers)) {
      return;
    }
    this.layers[name].destroy();
    delete this.layers[name];
  }

  render() {
    const items = [];
    for (let [name, layer] of Object.entries(this.layers)) {
      for (let item of layer.items) {
        items.push(<div class={item.c} style={item.s} on={item.o} />);
      }
    }
    return <div class="scroll-map">{items}</div>;
  }

  update() {
    for (let name in this.layers) {
      this.layers[name].update();
    }
  }

  destroy() {
    for (let name in this.layers) {
      this.layers[name].destroy();
    }
    etch.destroy(this);
  }

  scrollTo(screenRow) {
    this.editor.scrollToScreenPosition([screenRow, 0], { center: true });
  }
}

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
      })
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

  getClickHandler(row) {
    let handler = this.clickHandlers.get(row);
    if (!handler) {
      handler = { click: () => this.editor.scrollToScreenPosition([row, 0], { center: true }) };
      this.clickHandlers.set(row, handler);
    }
    return handler;
  }

  prepareItems() {
    if (!this.editor.component) {
      return;
    }
    let editorHeight = this.editor.component.getScrollHeight();
    if (!editorHeight) {
      return;
    }
    for (let item of this.items) {
      const pixelPos = this.editor.component.pixelPositionAfterBlocksForRow(item.row);
      item.c = item.cls ? `${this.baseClass} ${item.cls}` : this.baseClass;
      item.s = `top:${(pixelPos / editorHeight) * 100}%`;
      item.o = this.getClickHandler(item.row);
    }
  }

  destroy() {
    this.items = [];
    this.clickHandlers.clear();
    this.disposables.dispose();
  }
}

class CursorLayer extends Layer {
  constructor(editor) {
    super({ editor: editor, name: "cursor", timer: 50 });
    this.disposables.add(
      this.editor.observeCursors(this.update),
      this.editor.onDidRemoveCursor(this.update),
      this.editor.onDidChangeCursorPosition(this.update)
    );
  }

  recalculate() {
    this.items = [];
    if (!this.editor.component) {
      return;
    }
    let positions = this.editor.getCursorScreenPositions();
    if (this.threshold && this.threshold < positions.length) {
      return;
    }
    this.items = positions.map((position) => {
      return { row: position.row };
    });
  }
}

class FindLayer extends Layer {
  constructor(editor) {
    super({ editor: editor, name: "find", timer: 50 });
    // Get findModel from main module's stored reference
    this.findModel = atom.packages.getLoadedPackage("scroll-map")?.mainModule?.findModel;
    if (this.findModel) {
      this.disposables.add(this.findModel.onDidUpdate(this.update));
    }
  }

  recalculate() {
    this.items = [];
    if (!this.findModel || this.findModel.editor !== this.editor) {
      return;
    }
    let markers = this.findModel.markers;
    if (this.threshold && this.threshold < markers.length) {
      return;
    }
    for (let marker of markers) {
      this.items.push({ row: marker.getScreenRange().start.row });
    }
  }
}


/**
 * Simple scroll-map component for non-editor pane items (e.g., PDF viewer).
 * Items should have: { percent: 0-100, cls?: string, click?: function }
 */
class ScrollMapSimple {
  constructor() {
    this.items = [];
    etch.initialize(this);
  }

  /**
   * Set items to display.
   * @param {Array} items - Array of { percent, cls?, click? }
   */
  setItems(items) {
    this.items = items;
    etch.update(this);
  }

  render() {
    const elements = this.items.map((item) => {
      const cls = item.cls ? `scroll-item ${item.cls}` : "scroll-item";
      const style = `top:${item.percent}%`;
      const handlers = item.click ? { click: item.click } : {};
      return <div class={cls} style={style} on={handlers} />;
    });
    return <div class="scroll-map">{elements}</div>;
  }

  update() {
    return etch.update(this);
  }

  destroy() {
    etch.destroy(this);
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
