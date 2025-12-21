# scrollmap

Show markers on the scroll bar of text-editor. This is the core package that provides the scrollmap infrastructure. Install layer packages to add markers for different features.

![demo](https://github.com/asiloisad/pulsar-scrollmap/blob/master/assets/demo.png?raw=true)

## Installation

To install `scrollmap` search for [scrollmap](https://web.pulsar-edit.dev/packages/scrollmap) in the Install pane of the Pulsar settings or run `ppm install scrollmap`. Alternatively, you can run `ppm install asiloisad/pulsar-scrollmap` to install a package directly from the GitHub repository.

## Layer Packages

Install these packages to add markers for specific features:

| Package | Description |
|---------|-------------|
| [scrollmap-cursors](https://github.com/asiloisad/pulsar-scrollmap-cursors) | Cursor positions |
| [scrollmap-git-diff](https://github.com/asiloisad/pulsar-scrollmap-git-diff) | Git changes (added/modified/removed) |
| [scrollmap-find-ar](https://github.com/asiloisad/pulsar-scrollmap-find-ar) | Find-and-replace results |
| [scrollmap-navigation](https://github.com/asiloisad/pulsar-scrollmap-navigation) | Navigation-panel headers |
| [scrollmap-linter](https://github.com/asiloisad/pulsar-scrollmap-linter) | Linter messages |
| [scrollmap-hydrogen](https://github.com/asiloisad/pulsar-scrollmap-hydrogen) | Hydrogen breakpoints |
| [scrollmap-diff-view](https://github.com/asiloisad/pulsar-scrollmap-diff-view) | Diff-view chunks |
| [scrollmap-highlight](https://github.com/asiloisad/pulsar-scrollmap-highlight) | Highlight-simple markers |

Each layer package has its own settings for enabling/disabling and threshold configuration.

## Customize Appearance

Markers can be customized in your `styles.less` (open via `File > Stylesheet...` or command `application:open-your-stylesheet`).

```less
// Change all marker heights to fixed
.scrollmap .scrollmap-item {
  height: 5px !important;
}
```

## API Documentation

The package consumes a `scrollmap` service from other packages to add custom layers.

### Providing a Layer

```javascript
// In package.json:
"providedServices": {
  "scrollmap": {
    "versions": { "1.0.0": "provideScrollmap" }
  }
}

// In your main module:
provideScrollmap() {
  return (Layer) => {
    class MyLayer extends Layer {
      constructor(editor) {
        super({ editor, name: "mylayer", timer: 50 });
        this.disposables.add(
          editor.onDidStopChanging(this.update)
        );
      }

      recalculate() {
        this.items = [];
        this.items.push({ row: 10 });           // basic marker
        this.items.push({ row: 20, cls: "special" }); // with extra class
      }
    }
    return { name: "mylayer", Layer: MyLayer };
  };
}
```

The factory function receives the `Layer` base class for creating custom layers.

### Layer Properties

- `this.editor` - Text editor instance
- `this.name` - Layer name (CSS class: `scrollmap-{name}`)
- `this.configPath` - Config path for threshold (default: `scrollmap-{name}`)
- `this.items` - Array of markers to render
- `this.threshold` - Max items threshold from config
- `this.update()` - Throttled recalculation trigger
- `this.disposables` - CompositeDisposable for cleanup

### SimpleMap for Non-Editor Panes

For custom panes (like PDF viewer), consume the `simplemap` service:

```javascript
// In package.json:
"consumedServices": {
  "simplemap": {
    "versions": { "1.0.0": "consumeSimpleMap" }
  }
}

// In your main module:
consumeSimpleMap(SimpleMap) {
  const scrollMap = new SimpleMap();
  scrollMap.setItems([
    { percent: 10, cls: "marker-1", click: () => goTo(1) },
    { percent: 50, cls: "marker-2", click: () => goTo(2) }
  ]);
  container.appendChild(scrollMap.element);
  return new Disposable(() => scrollMap.destroy());
}
```

## Contributing

Got ideas, found a bug, or want to help? Drop your thoughts on GitHub!
