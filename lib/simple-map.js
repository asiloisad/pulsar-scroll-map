/** @babel */
/** @jsx etch.dom */

const etch = require("etch");

class SimpleMap {

  constructor() {
    this.items = [];
    etch.initialize(this);
  }

  setItems(items) {
    this.items = items;
    etch.update(this);
  }

  render() {
    const elements = this.items.map((item) => {
      const cls = item.cls ? `scroll-item ${item.cls}` : "scroll-item";
      const style = `top:${item.percent}%`;
      const handlers = item.click ? { click: item.click } : {};
      return <div class={cls} style={style} on={handlers} />;
    });
    return <div class="scroll-map">{elements}</div>;
  }

  update() {
    return etch.update(this);
  }

  destroy() {
    etch.destroy(this);
  }

}

module.exports = SimpleMap;
