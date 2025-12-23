function throttle(func, timeout) {
  let timer = null;
  return (...args) => {
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, timeout);
  };
}

module.exports = { throttle };
