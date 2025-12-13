const Layer = require("../layer");

class HydrogenLayer extends Layer {
  
  constructor(editor) {
    super({ editor: editor, name: "hydrogen", timer: 50 });
    this.data = [];
  }

  setData(data) {
    this.data = data || [];
    this.update();
  }

  recalculate() {
    this.items = [];
    if (!this.editor.component) {
      return;
    }

    if (this.threshold && this.threshold < this.data.length) {
      return;
    }

    for (const breakpoint of this.data) {
      this.items.push({
        row: this.editor.screenPositionForBufferPosition(breakpoint).row,
      });
    }
  }
}

module.exports = HydrogenLayer;
