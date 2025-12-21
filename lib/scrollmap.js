/** @babel */
/** @jsx etch.dom */

const etch = require("etch");

class Scrollmap {

  constructor(editor) {
    this.editor = editor;
    this.layers = {};
    etch.initialize(this);
  }

  addLayer(name, Layer) {
    if (name in this.layers) { return; }
    this.layers[name] = new Layer(this.editor);
  }

  delLayer(name) {
    if (!(name in this.layers)) { return; }
    this.layers[name].destroy();
    delete this.layers[name];
  }

  render() {
    if (!this.editor || !this.editor.component) {
      return <div class="scrollmap"/>
    }
    let editorHeight
    if (!this.editor.component.refs.gutterContainer) {
      editorHeight = 1e9; // fallback
      this.editor.element.style.removeProperty('--scrollmap-marker-height');
    } else {
      editorHeight = this.editor.component.refs.gutterContainer.props.scrollHeight;
      let lineHeight = this.editor.component.refs.gutterContainer.props.lineHeight;
      let containerHeight = this.editor.component.measurements.clientContainerHeight;
      let markerHeight = lineHeight/editorHeight*containerHeight;
      this.editor.element.style.setProperty('--scrollmap-marker-height', `${markerHeight}px`);
    }
    const items = [];
    for (let [name, layer] of Object.entries(this.layers)) {
      for (let item of layer.items) {
        item.stl = `top:${(item.pix / editorHeight) * 100}%`;
        items.push(<div class={item.cls} style={item.stl} on={item.clk} />);
      }
    }
    return <div class="scrollmap">{items}</div>;
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

module.exports = Scrollmap;
