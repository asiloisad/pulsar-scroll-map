const Layer = require("../layer");

class NaviLayer extends Layer {

  constructor(editor) {
    super({ editor: editor, name: "navi", timer: 50 });
    this.data = null;
    this.disposables.add(
      atom.config.observe("scroll-map.naviLayer.maxDepth", (value) => {
        this.maxDepth = value;
        this.update();
      })
    );
  }

  setData(data) {
    this.data = data;
    this.update();
  }

  recalculate() {
    this.items = [];
    if (!this.data) {
      return;
    }
    if (this.threshold && this.threshold < this.data.length) {
      return;
    }
    for (let header of this.data) {
      if (this.maxDepth && header.revel > this.maxDepth) {
        continue;
      }
      this.items.push({
        row: this.editor.screenPositionForBufferPosition(header.startPoint).row,
      });
    }
  }
}

module.exports = NaviLayer;
