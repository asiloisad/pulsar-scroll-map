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
    if (!this.editor && !this.editor.component) {
      return <div class="scroll-map"/>
    }

    // marker height
    let editorHeight = this.editor.component.getScrollHeight();
    let lineHeight = this.editor.component.getLineHeight();
    let containerHeight = this.editor.component.getScrollContainerClientHeight()
    let markerHeight = lineHeight/editorHeight*containerHeight
    atom.workspace.element.style.setProperty('--scroll-marker-height', `${markerHeight}px`);

    const items = [];
    for (let [name, layer] of Object.entries(this.layers)) {
      for (let item of layer.items) {
        item.s = `top:${(item.pix / editorHeight) * 100}%`;
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
