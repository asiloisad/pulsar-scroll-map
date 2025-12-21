const { CompositeDisposable, Emitter } = require("atom");
const { SelectListView, highlightMatches, createTwoLineItem } = require("pulsar-select-list");

class ToggleView {
  constructor(getLayers) {
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();
    this.disabledLayers = [];
    this.getLayers = getLayers;
    this.selectList = new SelectListView({
      items: [],
      className: "scrollmap-list",
      emptyMessage: "No scrollmap layers found",
      filterKeyForItem: (item) => item.name,
      willShow: () => {
        this.selectList.update({ items: this.getLayers() });
      },
      elementForItem: (item, { filterKey, matchIndices }) => {
        const isDisabled = this.disabledLayers.includes(item.name);
        return createTwoLineItem({
          primary: highlightMatches(filterKey, matchIndices),
          secondary: item.description,
          icon: isDisabled ? ["icon-circle-slash"] : ["icon-check"],
        });
      },
      didConfirmSelection: (item) => {
        const index = this.selectList.selectionIndex;
        this.toggle(item.name);
        this.selectList.update({ items: this.getLayers() });
        this.selectList.selectIndex(index);
      },
      didCancelSelection: () => {
        this.selectList.hide();
      },
    });
    this.subscriptions.add(
      this.emitter,
      atom.config.observe("scrollmap.disabledLayers", (disabledLayers) => {
        this.disabledLayers = disabledLayers || [];
      })
    );
  }

  toggle(name) {
    const index = this.disabledLayers.indexOf(name);
    if (index === -1) {
      this.disabledLayers.push(name);
    } else {
      this.disabledLayers.splice(index, 1);
    }
    atom.config.set("scrollmap.disabledLayers", this.disabledLayers);
    this.emitter.emit("did-toggle", name);
  }

  show() {
    this.selectList.show();
  }

  onDidToggle(callback) {
    return this.emitter.on("did-toggle", callback);
  }

  dispose() {
    this.subscriptions.dispose();
    this.selectList.destroy();
  }
}

module.exports = ToggleView;
