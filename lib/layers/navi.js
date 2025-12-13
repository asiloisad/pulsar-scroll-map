const Layer = require("../layer");

class NaviLayer extends Layer {

  constructor(editor) {
    super({ editor: editor, name: "navi", timer: 50 });
    this.data = null;
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
    const { editor, headers } = this.data;
    if (!editor || !editor.buffer || editor.buffer.id !== this.editor.buffer.id) {
      return;
    }
    if (!headers) {
      return;
    }
    if (this.threshold && this.threshold < headers.length) {
      return;
    }
    for (let header of headers) {
      this.items.push({
        row: this.editor.screenPositionForBufferPosition(header.startPoint).row,
      });
    }
  }
}

module.exports = NaviLayer;
