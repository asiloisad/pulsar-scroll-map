const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  // ***** package ***** //

  activate() {
    this.layers = {};
    this.services = {};
    this.disposables = new CompositeDisposable();
    this.setObservers()
  },

  deactivate() {
    this.layers = {};
    this.disposables.dispose();
  },

  // ***** core ***** //

  patchEditor(editor) {
    const editorView = editor.getElement();
    if (!editorView) {
      return;
    }
    const scrollView = editorView.querySelector(".vertical-scrollbar");
    if (!scrollView) {
      return;
    }
    const ScrollMap = require("./scroll-map");
    editor.scrollmap = new ScrollMap(editor);
    for (const [name, Layer] of Object.entries(this.layers)) {
      editor.scrollmap.addLayer(name, Layer);
    }
    let disposable = new Disposable(() => {
      editor.scrollmap.destroy();
    });
    editor.disposables.add(disposable);
    this.disposables.add(disposable);
    scrollView.parentNode.insertBefore(
      editor.scrollmap.element,
      scrollView.nextSibling
    );
  },

  setObservers() {
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor);
      }),
      atom.workspace.getCenter().observePanes((pane) => {
        let count = 0;
        let resizeObserver = new ResizeObserver(() => {
          if ((count += 1) === 1) {
            return;
          }
          for (let item of pane.getItems()) {
            if (atom.workspace.isTextEditor(item)) {
              item.scrollmap.update();
            }
          }
        });
        resizeObserver.observe(pane.getElement());
        let onWillDestroy = pane.onWillDestroy(() => {
          resizeObserver.disconnect();
          this.disposables.add(onWillDestroy);
        });
        this.disposables.add(
          new Disposable(() => {
            resizeObserver.disconnect();
          })
        );
      }),
      atom.config.observe("scroll-map.cursorLayer.state",
        () => this.cursorLayer()),
      atom.config.observe("scroll-map.findLayer.state",
        () => this.findLayer()),
      atom.config.observe("scroll-map.naviLayer.state",
        () => this.naviLayer()),
      atom.config.observe("scroll-map.linterLayer.state",
        () => this.linterLayer()),
      atom.config.observe("scroll-map.hydrogenLayer.state",
        () => this.hydrogenLayer()),
      atom.config.observe("scroll-map.diffLayer.state",
        () => this.diffLayer()),
      atom.config.observe("scroll-map.highlightLayer.state",
        () => this.highlightLayer()),
    );
  },

  // ***** registration ***** //

  registerLayer(name, Layer) {
    if (name in this.layers) {
      return;
    }
    this.layers[name] = Layer;
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.addLayer(name, Layer);
    }
  },

  unregisterLayer(name) {
    if (!(name in this.layers)) {
      return;
    }
    delete this.layers[name];
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.delLayer(name);
    }
  },

  // ***** cursor layer ***** //

  cursorLayer() {
    if (atom.config.get("scroll-map.cursorLayer.state")) {
      const CursorLayer = require("./layers/cursor");
      this.registerLayer("cursor", CursorLayer);
    } else {
      this.unregisterLayer("cursor");
    }
  },

  // ***** find layer ***** //

  findLayer() {
    if (
      atom.config.get("scroll-map.findLayer.state") &&
      this.services.findAndReplace
    ) {
      const FindLayer = require("./layers/find");
      this.registerLayer("find", FindLayer);
    } else {
      this.unregisterLayer("find");
    }
  },

  consumeFindService(service) {
    const findPackage =
      atom.packages.getLoadedPackage("find-and-replace-plus") ||
      atom.packages.getLoadedPackage("find-and-replace");
    const findModel = findPackage?.mainModule?.findModel;
    this.services.findAndReplace = true;
    this.findLayer();
    const updateFindLayers = () => {
      atom.workspace.getTextEditors().forEach((editor) => {
        const layer = editor.scrollmap?.layers["find"];
        if (layer && findModel) {
          layer.setData({
            editor: findModel.editor,
            markers: findModel.markers,
          });
        }
      });
    };
    let modelSubscription = findModel?.onDidUpdate?.(updateFindLayers);
    let panelSubscription = atom.workspace.onDidAddBottomPanel?.((event) => {
      event.panel.onDidChangeVisible?.(updateFindLayers);
    });
    return new Disposable(() => {
      this.services.findAndReplace = false;
      this.unregisterLayer("find");
      modelSubscription?.dispose();
      panelSubscription?.dispose();
    });
  },

  // ***** navi layer ***** //

  naviLayer() {
    if (
      atom.config.get("scroll-map.naviLayer.state") &&
      this.services.navigationPanel
    ) {
      const NaviLayer = require("./layers/navi");
      this.registerLayer("navi", NaviLayer);
    } else {
      this.unregisterLayer("navi");
    }
  },

  consumeNaviService(naviService) {
    this.naviService = naviService;
    this.services.navigationPanel = true;
    this.naviLayer();
    const updateNaviLayer = (editor) => {
      if (!editor) { return; }
      const layer = editor.scrollmap?.layers["navi"];
      if (!layer) { return; }
      const headers = naviService.getFlattenHeaders()
      layer.setData(headers);
    };
    let subscription = null;
    if (naviService.observeHeaders) {
      subscription = naviService.observeHeaders(updateNaviLayer);
    }
    return new Disposable(() => {
      this.services.navigationPanel = false;
      this.unregisterLayer("navi");
      this.naviService = null;
      subscription?.dispose();
    });
  },

  // ***** linter layer ***** //

  linterLayer() {
    if (
      atom.config.get("scroll-map.linterLayer.state") &&
      this.services.linter
    ) {
      const LinterLayer = require("./layers/linter");
      this.registerLayer("linter", LinterLayer);
    } else {
      this.unregisterLayer("linter");
    }
  },

  linterProvider() {
    this.services.linter = true;
    this.linterLayer();
    return {
      name: "scroll-map",
      render: (args) => {
        atom.workspace.getTextEditors().forEach((editor) => {
          const layer = editor.scrollmap?.layers["linter"];
          if (layer) { layer.setData(args) };
        });
      },
      didBeginLinting() {},
      didFinishLinting() {},
      dispose: () => {
        this.services.linter = false;
        this.unregisterLayer("linter");
      },
    };
  },

  // ***** hydrogen layer ***** //

  hydrogenLayer() {
    if (
      atom.config.get("scroll-map.hydrogenLayer.state") &&
      this.services.hydrogen
    ) {
      const HydrogenLayer = require("./layers/hydrogen");
      this.registerLayer("hydrogen", HydrogenLayer);
    } else {
      this.unregisterLayer("hydrogen");
    }
  },

  consumeHydrogenService(hydrogenService) {
    this.hydrogenService = hydrogenService;
    this.services.hydrogen = true;
    this.hydrogenLayer();
    const updateHydrogenLayers = () => {
      atom.workspace.getTextEditors().forEach((editor) => {
        const layer = editor.scrollmap?.layers["hydrogen"];
        if (layer) {
          const breakpoints = hydrogenService.getBreakpoints(editor);
          layer.setData(breakpoints);
        }
      });
    };
    let subscription = null;
    if (hydrogenService.onDidUpdate) {
      subscription = hydrogenService.onDidUpdate(updateHydrogenLayers);
    }
    return new Disposable(() => {
      this.services.hydrogen = false;
      this.unregisterLayer("hydrogen");
      this.hydrogenService = null;
      subscription?.dispose();
    });
  },

  // ***** diff layer ***** //

  diffLayer() {
    if (
      atom.config.get("scroll-map.diffLayer.state") &&
      this.services.diffView
    ) {
      const DiffLayer = require("./layers/diff");
      this.registerLayer("diff", DiffLayer);
    } else {
      this.unregisterLayer("diff");
    }
  },

  consumeDiffService(diffService) {
    this.diffService = diffService;
    this.services.diffView = true;
    this.diffLayer();
    const updateDiffLayers = () => {
      const data = diffService.getDiffView();
      atom.workspace.getTextEditors().forEach((editor) => {
        const layer = editor.scrollmap?.layers["diff"];
        if (layer) {
          layer.setData(data);
        }
      });
    };
    let subscription = null;
    if (diffService.onDidUpdate) {
      subscription = diffService.onDidUpdate(updateDiffLayers);
    }
    return new Disposable(() => {
      this.services.diffView = false;
      this.unregisterLayer("diff");
      this.diffService = null;
      subscription?.dispose();
    });
  },

  // ***** highlight layer ***** //

  highlightLayer() {
    if (
      atom.config.get("scroll-map.highlightLayer.state") &&
      this.services.highlightSimple
    ) {
      const HighlightLayer = require("./layers/highlight");
      this.registerLayer("highlight", HighlightLayer);
    } else {
      this.unregisterLayer("highlight");
    }
  },

  consumeHighlightService(highlightService) {
    this.highlightService = highlightService;
    this.services.highlightSimple = true;
    this.highlightLayer();
    const updateHighlightLayers = () => {
      atom.workspace.getTextEditors().forEach((editor) => {
        const layer = editor.scrollmap?.layers["highlight"];
        if (layer) {
          layer.setData(highlightService);
        }
      });
    };
    let addSubscription = highlightService.onDidFinishAddingMarkers?.(updateHighlightLayers);
    let removeSubscription = highlightService.onDidRemoveAllMarkers?.(updateHighlightLayers);
    return new Disposable(() => {
      this.services.highlightSimple = false;
      this.unregisterLayer("highlight");
      this.highlightService = null;
      addSubscription?.dispose();
      removeSubscription?.dispose();
    });
  },

  // ***** service ***** //

  serviceProvider() {
    return {
      registerLayer: (name, LayerClass) => {
        return this.registerLayer(name, LayerClass);
      },
      unregisterLayer: (name) => {
        return this.unregisterLayer(name);
      },
      ScrollMap:
        require("./scroll-map"),
      SimpleMap:
        require("./simple-map"),
      Layer:
        require("./layer"),
    };
  },
};
