const { ipcRenderer } = require('electron');

function getMeta() {
  const metas = document.getElementsByTagName('meta');
  const data = [];
  for (let i = 0; i < metas.length; i += 1) {
    const name = metas[i].getAttribute('name');
    const content = metas[i].getAttribute('content');
    if (name && content) {
      data.push([name, content]);
    }
  }

  return data;
}

// function getOpenGraphData() {
//   const properties = ['title', 'type', 'image', 'url'];
//   const data = {};
//   properties.forEach((property) => {
//     const element = document.head.querySelector(
//       `[property~="og:${property}"][content]`
//     );
//     data[property] = element === null ? '' : element.content;
//   });
//   return data;
// }

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('meta-info', getMeta());
});

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('dom-content-loaded');
});

function genTriggers() {
  const things = [
    'change',
    'click',
    'contextmenu',
    'dblclick',
    'mouseup',
    'pointerup',
    'reset',
    'submit',
    'touchend',
  ];
  things.forEach((thing) => {
    window.addEventListener(thing, () => {
      ipcRenderer.send('gesture', thing);
    });
  });
}

genTriggers();

ipcRenderer.on('get-scroll-height', (_, id) => {
  ipcRenderer.send('scroll-height', [id, window.pageYOffset]);
});

ipcRenderer.on('scroll-to', (_, height) => {
  window.scroll(0, height);
});
