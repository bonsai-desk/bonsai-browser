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

function getOpenGraphData() {
  const properties = ['title', 'type', 'image', 'url'];
  const data = {};
  properties.forEach((property) => {
    const element = document.head.querySelector(
      `[property~="og:${property}"][content]`
    );
    data[property] = element === null ? '' : element.content;
  });
  return data;
}

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('meta-info', getMeta());
  // ipcRenderer.send('open-graph-data', getOpenGraphData());
});

ipcRenderer.on('get-scroll-height', () => {
  ipcRenderer.send('scroll-height', window.pageYOffset);
});

ipcRenderer.on('scroll-to', (_, height) => {
  window.scroll(0, height);
});
