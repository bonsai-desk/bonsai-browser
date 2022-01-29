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
  const properties = ['title', 'type', 'image', 'url', 'description '];
  const data = {};
  properties.forEach((property) => {
    const element = document.head.querySelector(
      `[property~="og:${property}"][content]`
    );
    data[property] = element === null ? '' : element.content;
  });
  return data;
}

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

function removeChars(validChars, inputString) {
  const regex = new RegExp(`[^${validChars}]`, 'g');
  return inputString.replace(regex, '');
}

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('meta-info', getMeta());
  ipcRenderer.send('dom-content-loaded');

  function drop(e) {
    if (e.dataTransfer) {
      const { files } = e.dataTransfer;
      for (let i = 0; i < files.length; i += 1) {
        const { path } = files[i];
        ipcRenderer.send('search-url', [`file:///${path}`]);
      }
    }
  }

  function dragover(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  document.addEventListener('drop', drop);
  document.addEventListener('dragover', dragover);

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      ipcRenderer.send('page-wheel-event', e.deltaY);
    }
  });

  let biggestText = '';
  // const elementWhiteList = [
  //   'p',
  //   'DIV',
  //   'H1',
  //   'H2',
  //   'H3',
  //   'H4',
  //   'H5',
  //   'H6',
  //   'SPAN',
  // ];
  const elementBlackList = ['HTML', 'HEAD', 'BODY', 'SCRIPT'];
  const elements = document.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i += 1) {
    if (
      // elementWhiteList.includes(elements[i].tagName) &&
      !elementBlackList.includes(elements[i].tagName)
    ) {
      const text = elements[i].innerText;
      if (typeof text === 'string' && text.length > biggestText.length) {
        biggestText = text;
      }
    }
  }
  const maxLength = 500;
  const openGraphData = getOpenGraphData();
  let output =
    typeof openGraphData.description === 'undefined'
      ? ''
      : `${openGraphData.description} `;
  const lines = biggestText.split(/\r\n|\r|\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].length > 50) {
      output += `${lines[i]} `;
    }
    if (output.length >= maxLength) {
      break;
    }
  }
  if (output.length < maxLength) {
    const longest = lines.reduce((a, b) => {
      return a.length > b.length ? a : b;
    });
    output += `${longest} ${biggestText}`;
  }
  output = output.substr(0, maxLength);
  output = removeChars(
    ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890()-+=/',
    output
  );

  ipcRenderer.send('scrape-data', output);
});
