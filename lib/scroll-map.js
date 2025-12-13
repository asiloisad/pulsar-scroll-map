/** @babel */
/** @jsx etch.dom */

const etch = require("etch");

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

}

module.exports = ScrollMap;
