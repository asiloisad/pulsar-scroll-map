const { CompositeDisposable } = require("atom");
const { throttle } = require("./utils");

class Layer {

  constructor(editor, props) {
    this.editor = editor;
    this.props = props;
    this.cache = new Map();
    this.items = [];
    this.disposables = new CompositeDisposable()
    this.update = throttle(() => {
      this.updateSync() }, this.props.timer ?? 50);
    this.refresh = throttle(() => {
      this.refreshSync() }, this.props.timer ?? 50);
    if ('initialize' in this.props) {
      this.props.initialize(this)
    }
  }

  updateSync() {
    if (!this.editor.scrollmap) {
      return;
    }
    if (!this.editor.component) {
      return;
    }
    if ('getItems' in this.props) {
      const items = this.props.getItems(this);
      if (items) { this.items = items; }
    }
    this.refreshSync();
  }

  refreshSync() {
    this.prepareItems();
    this.editor.scrollmap.updateView();
  }

  // calculate pixel position based on screen position
  prepareItems() {
    for (let item of this.items) {
      item.pix = this.editor.component.pixelPositionAfterBlocksForRow(item.row);
      item.cls = `marker marker-${this.props.name} ${this.props.position ?? ""}` + (item.cls ? ' '+item.cls : '');
    }
  }

  destroy() {
    this.cache.clear();
    this.items = [];
    this.disposables.dispose();
  }
}

module.exports = Layer;
