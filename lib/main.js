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
      ScrollMapLayer: Layer,
      ScrollMapSimple: Simple,
    };
  },
};

/**
 * ScrollMap component attached to a text editor.
 * Manages multiple layers and renders markers on the scroll bar.
 */
class ScrollMap {
  /**
   * @param {TextEditor} editor - The text editor instance
   */
  constructor(editor) {
    this.editor = editor;
    this.layers = {};
    etch.initialize(this);
  }

  /**
   * Adds a layer to this scroll map.
   * @param {string} name - The layer name
   * @param {typeof Layer} Layer - The layer class constructor
   */
  addLayer(name, Layer) {
    if (name in this.layers) {
      return;
    }
    this.layers[name] = new Layer(this.editor);
  }

  /**
   * Removes a layer from this scroll map.
   * @param {string} name - The layer name to remove
   */
  delLayer(name) {
    if (!(name in this.layers)) {
      return;
    }
    this.layers[name].destroy();
    delete this.layers[name];
    etch.update(this);
  }

  /**
   * Renders the scroll map with all layer items.
   * @returns {Object} Virtual DOM element
   */
  render() {
    const items = [];
    for (let [name, layer] of Object.entries(this.layers)) {
      for (let item of layer.items) {
        items.push(<div class={item.c} style={item.s} on={item.o} />);
      }
    }
    return <div class="scroll-map">{items}</div>;
  }

  /**
   * Triggers update on all layers.
   */
  update() {
    for (let name in this.layers) {
      this.layers[name].update();
    }
  }

  /**
   * Destroys all layers and the scroll map component.
   */
  destroy() {
    for (let name in this.layers) {
      this.layers[name].destroy();
    }
    etch.destroy(this);
  }

  /**
   * Scrolls the editor to a specific screen row.
   * @param {number} screenRow - The screen row to scroll to
   */
  scrollTo(screenRow) {
    this.editor.scrollToScreenPosition([screenRow, 0], { center: true });
  }
}

/**
 * Simple scroll-map component for non-editor pane items (e.g., PDF viewer).
 * @example
 * const scrollMap = new ScrollMapSimple();
 * scrollMap.setItems([
 *   { percent: 25, cls: "header", click: () => goToSection(1) }
 * ]);
 * container.appendChild(scrollMap.element);
 */
class Simple {
  /**
   * Creates a new simple scroll map.
   */
  constructor() {
    /** @type {Array<{percent: number, cls?: string, click?: Function}>} */
    this.items = [];
    etch.initialize(this);
  }

  /**
   * Sets items to display on the scroll map.
   * @param {Array<{percent: number, cls?: string, click?: Function}>} items - Marker items
   */
  setItems(items) {
    this.items = items;
    etch.update(this);
  }

  /**
   * Renders the scroll map.
   * @returns {Object} Virtual DOM element
   */
  render() {
    const elements = this.items.map((item) => {
      const cls = item.cls ? `scroll-item ${item.cls}` : "scroll-item";
      const style = `top:${item.percent}%`;
      const handlers = item.click ? { click: item.click } : {};
      return <div class={cls} style={style} on={handlers} />;
    });
    return <div class="scroll-map">{elements}</div>;
  }

  /**
   * Updates the scroll map component.
   * @returns {Promise} Etch update promise
   */
  update() {
    return etch.update(this);
  }

  /**
   * Destroys the scroll map component.
   */
  destroy() {
    etch.destroy(this);
  }
}

/**
 * Base class for scroll map layers. Extend this class to create custom layers.
 * @example
 * class MyLayer extends ScrollMapLayer {
 *   constructor(editor) {
 *     super({ editor, name: "myname", timer: 50 });
 *     this.disposables.add(editor.onDidStopChanging(this.update));
 *   }
 *   recalculate() {
 *     this.items = [{ row: 10 }, { row: 20, cls: "special" }];
 *   }
 * }
 */
class Layer {
  /**
   * @param {Object} props - Layer properties
   * @param {TextEditor} props.editor - The text editor instance
   * @param {string} props.name - Layer name (used for CSS class)
   * @param {number} props.timer - Throttle interval in milliseconds
   */
  constructor(props) {
    /** @type {TextEditor} */
    this.editor = props.editor;
    /** @type {string} */
    this.name = props.name;
    /** @type {Array<{row: number, cls?: string}>} */
    this.items = [];
    /** @type {Map<number, Object>} */
    this.clickHandlers = new Map();
    /** @type {string} */
    this.baseClass = `scroll-item ${this.name}-layer`;
    /** @type {Function} */
    this.update = throttle(() => this.updateSync(), props.timer);
    /** @type {CompositeDisposable} */
    this.disposables = new CompositeDisposable();
    /** @type {number} */
    this.threshold = 0;
    this.disposables.add(
      atom.config.observe(`scroll-map.${this.name}Layer.threshold`, (value) => {
        this.threshold = value;
      })
    );
  }

  /**
   * Synchronously updates the layer and triggers etch render.
   * @private
   */
  updateSync() {
    if (!this.editor.scrollmap) {
      return;
    }
    this.recalculate();
    this.prepareItems();
    etch.update(this.editor.scrollmap);
  }

  /**
   * Gets or creates a click handler for a specific row.
   * @param {number} row - The screen row
   * @returns {Object} Click handler object
   * @private
   */
  getClickHandler(row) {
    let handler = this.clickHandlers.get(row);
    if (!handler) {
      handler = { click: () => this.editor.scrollToScreenPosition([row, 0], { center: true }) };
      this.clickHandlers.set(row, handler);
    }
    return handler;
  }

  /**
   * Prepares items for rendering by calculating positions and CSS.
   * @private
   */
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

  /**
   * Override this method to calculate marker items.
   * Populate `this.items` with objects containing `row` and optional `cls`.
   * @abstract
   */
  recalculate() {}

  /**
   * Destroys the layer and releases resources.
   */
  destroy() {
    this.items = [];
    this.clickHandlers.clear();
    this.disposables.dispose();
  }
}

/**
 * Built-in layer for cursor position markers.
 * @extends Layer
 */
class CursorLayer extends Layer {
  /**
   * @param {TextEditor} editor - The text editor instance
   */
  constructor(editor) {
    super({ editor: editor, name: "cursor", timer: 50 });
    this.disposables.add(
      this.editor.observeCursors(this.update),
      this.editor.onDidRemoveCursor(this.update),
      this.editor.onDidChangeCursorPosition(this.update),
      atom.config.observe("scroll-map.cursorLayer.showAll", (value) => {
        this.showAll = value; this.update();
      })
    );
  }

  /**
   * Calculates cursor positions for markers.
   * @override
   */
  recalculate() {
    this.items = [];
    if (!this.editor.component) {
      return;
    }
    let positions;
    if (this.showAll) {
      positions = this.editor.getCursorScreenPositions();
    } else {
      positions = [this.editor.getCursorScreenPosition()];
    }
    if (this.threshold && this.threshold < positions.length) {
      return;
    }
    this.items = positions.map((position) => {
      return { row: position.row };
    });
  }
}

/**
 * Built-in layer for find-and-replace result markers.
 * @extends Layer
 */
class FindLayer extends Layer {
  /**
   * @param {TextEditor} editor - The text editor instance
   */
  constructor(editor) {
    super({ editor: editor, name: "find", timer: 50 });
    this.findModel = atom.packages.getLoadedPackage("scroll-map")?.mainModule?.findModel;
    this.findPackage = atom.packages.getLoadedPackage("find-and-replace")?.mainModule;
    if (this.findModel) {
      this.disposables.add(this.findModel.onDidUpdate(this.update));
    }
    this.disposables.add(
      atom.config.observe("scroll-map.findLayer.permanent", (value) => {
        this.permanent = value; this.update();
      })
    );
  }

  /**
   * Checks if the find-and-replace panel is visible.
   * @returns {boolean} True if the panel is visible
   * @private
   */
  isPanelVisible() {
    if (!this.findPackage) {
      return false;
    }
    const panel = this.findPackage.findPanel;
    return panel && panel.isVisible();
  }

  /**
   * Calculates find result positions for markers.
   * @override
   */
  recalculate() {
    this.items = [];
    if (!this.findModel || this.findModel.editor !== this.editor) {
      return;
    }
    if (!this.permanent && !this.isPanelVisible()) {
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
 * Creates a throttled function that executes at most once per timeout period.
 * If called while throttled, executes once more after the timeout.
 * @param {Function} func - The function to throttle
 * @param {number} timeout - The throttle interval in milliseconds
 * @returns {Function} The throttled function
 * @private
 */
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
