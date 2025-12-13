const Layer = require("../layer");

class CursorLayer extends Layer {

  constructor(editor) {
    super({ editor: editor, name: "cursor", timer: 10 });
    this.disposables.add(
      this.editor.observeCursors(this.update),
      this.editor.onDidRemoveCursor(this.update),
      this.editor.onDidChangeCursorPosition(this.update),
      atom.config.observe("scroll-map.cursorLayer.total", (value) => {
        this.total = value;
        this.update();
      })
    );
  }

  recalculate() {
    this.items = [];
    if (!this.editor.component) {
      return;
    }
    let positions;
    if (this.total) {
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

module.exports = CursorLayer;
