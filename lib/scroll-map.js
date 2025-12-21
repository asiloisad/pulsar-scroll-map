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
    if (!this.editor || !this.editor.component) {
      return <div class="scroll-map"/>
    }
    this.calculate()
    const items = [];
    for (let [name, layer] of Object.entries(this.layers)) {
      for (let item of layer.items) {
        item.s = `top:${(item.pix / this.editorHeight) * 100}%`;
        items.push(<div class={item.c} style={item.s} on={item.o} />);
      }
    }
    return <div class="scroll-map">{items}</div>;
  }

  calculate() {
    if (!this.editor.component.refs.gutterContainer) {
      this.editor.element.style.remvoeProperty('--scroll-marker-height', `${markerHeight}px`);
      return;
    }
    this.editorHeight = this.editor.component.refs.gutterContainer.props.scrollHeight;
    let lineHeight = this.editor.component.refs.gutterContainer.props.lineHeight;
    let containerHeight = this.editor.component.measurements.clientContainerHeight;
    let markerHeight = lineHeight/this.editorHeight*containerHeight;
    this.editor.element.style.setProperty('--scroll-marker-height', `${markerHeight}px`);
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
