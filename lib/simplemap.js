/** @babel */
/** @jsx etch.dom */

const etch = require("etch");

class Simplemap {

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
      const cls = item.cls ? `marker ${item.cls}` : "marker";
      const stl = `top:${item.percent}%`;
      const clk = item.click ? { click: item.click } : {};
      return <div class={cls} style={stl} on={clk} />;
    });
    return <div class="simplemap">{elements}</div>;
  }

  update() {
    return etch.update(this);
  }

  destroy() {
    etch.destroy(this);
  }

}

module.exports = Simplemap;
