# scroll-map

Show markers on the scroll bar of text-editor. The build-in layer are designed to create markers of cursors position, find-and-replace results and navigation-panel headers. The style of the markers is adjusted for one-light and one-dark themes. Markers work like hyperlinks.

![context-menu](https://github.com/asiloisad/pulsar-scroll-map/blob/master/assets/demo.png?raw=true)

## Installation

To install `scroll-map` search for [scroll-map](https://web.pulsar-edit.dev/packages/scroll-map) in the Install pane of the Pulsar settings or run `ppm install scroll-map`. Alternatively, you can run `ppm install asiloisad/pulsar-scroll-map` to install a package directly from the GitHub repository.

## Customize the appearance

Markers can be customized to meet the user's needs. The customization file `styles.less` can be opened by menu bar `File/Stylesheet...` or by command `application:open-your-stylesheet`.

- e.g. change color of cursors markers:
  ```less
  .scroll-map .scroll-item.cursor-layer {
    background-color: red;
  }
  ```

- e.g. change color of find-and-replace markers:
  ```less
  .scroll-map .scroll-item.find-layer {
    background-color: red;
  }
  ```

- e.g. change color of navigation-panel markers:
  ```less
  .scroll-map .scroll-item.navi-layer {
    background-color: red;
  }
  ```

- e.g. change height of all markers:
  ```less
  .scroll-map .scroll-item {
    height: 5px !important;
  }
  ```

- e.g. change width of markers:
  ```less
  .scroll-map .scroll-item {
    width: 10px;
  }
  ```

- e.g. fit scroll-marker width to scroll-bar width (default is 10px):
  ```less
  .scroll-map {
    width: 15px;
  }
  ```

## API Documentation

The chapter is under development.

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!
