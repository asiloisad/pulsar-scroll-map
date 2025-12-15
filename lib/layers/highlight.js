const Layer = require("../layer");

class HighlightLayer extends Layer {

  constructor(editor) {
    super({ editor: editor, name: "highlight", timer: 50 });
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
    const layers = this.data.editorToMarkerLayerMap?.[this.editor.id];
    if (!layers?.markerLayer) {
      return;
    }
    const markers = layers.markerLayer.getMarkers();
    if (this.threshold && this.threshold < markers.length) {
      return;
    }
    for (let marker of markers) {
      this.items.push({ row: marker.getScreenRange().start.row });
    }
  }
}

module.exports = HighlightLayer;
