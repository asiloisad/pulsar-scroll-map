const Layer = require("../layer");

class FindLayer extends Layer {
  
  constructor(editor) {
    super({ editor: editor, name: "find", timer: 50 });
    this.data = null;
  }

  setData(data) {
    this.data = data;
    this.update();
  }

  recalculate() {
    this.items = [];
    if (!this.data || this.data.editor !== this.editor) {
      return;
    }
    let markers = this.data.markers;
    if (this.threshold && this.threshold < markers.length) {
      return;
    }
    for (let marker of markers) {
      this.items.push({ row: marker.getScreenRange().start.row });
    }
  }
}

module.exports = FindLayer;
