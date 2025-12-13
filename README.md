# scroll-map

Show markers on the scroll bar of text-editor. Built-in layers display markers for cursor positions, find-and-replace results, navigation-panel headers, linter messages, hydrogen breakpoints, and diff chunks. Markers work like hyperlinks - click to navigate. If layer threshold is exceeded, markers are hidden.

![demo](https://github.com/asiloisad/pulsar-scroll-map/blob/master/assets/demo.png?raw=true)

## Installation

To install `scroll-map` search for [scroll-map](https://web.pulsar-edit.dev/packages/scroll-map) in the Install pane of the Pulsar settings or run `ppm install scroll-map`. Alternatively, you can run `ppm install asiloisad/pulsar-scroll-map` to install a package directly from the GitHub repository.

## Built-in Layers

| Layer | Source Package | Description |
|-------|----------------|-------------|
| cursor | built-in | Cursor positions |
| find | find-and-replace | Search results |
| navi | navigation-panel | Document headers |
| linter | linter-bundle | Error/warning/info messages |
| hydrogen | hydrogen-next | Cell breakpoints |
| diff | diff-view | Diff chunks (added/removed) |

Each layer can be enabled/disabled and has a configurable threshold in package settings.

## Customize Appearance

Markers can be customized in your `styles.less` (open via `File > Stylesheet...` or command `application:open-your-stylesheet`).

```less
// Change cursor marker color
.scroll-map .scroll-item.cursor-layer {
  background-color: red;
}

// Change find marker color
.scroll-map .scroll-item.find-layer {
  background-color: yellow;
}

// Change linter error color
.scroll-map .scroll-item.linter-layer.error {
  background-color: magenta;
}

// Change all marker heights
.scroll-map .scroll-item {
  height: 5px !important;
}

// Change scroll-map width
.scroll-map {
  width: 15px;
}
```

## API Documentation

The package provides a service for other packages to create custom layers.

### Consuming the Service

```javascript
// In package.json:
"consumedServices": {
  "scroll-map": {
    "versions": { "3.0.0": "consumeScrollMap" }
  }
}

// In your main module:
consumeScrollMap(service) {
  service.registerLayer("myLayer", MyLayerClass);
  return new Disposable(() => {
    service.unregisterLayer("myLayer");
  });
}
```

### Creating a Custom Layer

Extend the `Layer` base class:

```javascript
class MyLayer extends service.Layer {
  constructor(editor) {
    super({ editor, name: "myname", timer: 50 });
    this.data = null;
    // Subscribe to update events if needed
    this.disposables.add(
      editor.onDidStopChanging(this.update)
    );
  }

  // Optional: receive data from service consumer
  setData(data) {
    this.data = data;
    this.update();
  }

  // Required: compute marker positions
  recalculate() {
    this.items = [];
    this.items.push({ row: 10 });           // basic marker
    this.items.push({ row: 20, cls: "special" }); // with extra class
  }
}
```

Layer properties:
- `this.editor` - Text editor instance
- `this.name` - Layer name (CSS class: `{name}-layer`)
- `this.items` - Array of markers to render
- `this.threshold` - Max items threshold from config
- `this.update()` - Throttled recalculation trigger
- `this.disposables` - CompositeDisposable for cleanup

### SimpleMap for Non-Editor Panes

For custom panes (like PDF viewer), use `SimpleMap`:

```javascript
const scrollMap = new service.SimpleMap();

scrollMap.setItems([
  { percent: 10, cls: "marker-1", click: () => goTo(1) },
  { percent: 50, cls: "marker-2", click: () => goTo(2) }
]);

container.appendChild(scrollMap.element);
scrollMap.destroy(); // cleanup
```

## Contributing

Got ideas, found a bug, or want to help? Drop your thoughts on GitHub!
