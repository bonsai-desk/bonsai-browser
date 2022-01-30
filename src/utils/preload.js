const { ipcRenderer } = require('electron');

function getMeta() {
  const metas = document.getElementsByTagName('meta');
  const data = [];
  const descriptions = [];
  let bestDescription = '';
  for (let i = 0; i < metas.length; i += 1) {
    const name = metas[i].getAttribute('name');
    const property = metas[i].getAttribute('property');
    const content = metas[i].getAttribute('content');

    if (content) {
      if (name) {
        data.push([name, content]);
      }
      if (name && name.includes('description')) {
        descriptions.push([name, content]);
        if (name === 'description' && bestDescription === '') {
          bestDescription = content;
        }
      }
      if (property && property.includes('description')) {
        descriptions.push([property, content]);
        if (property === 'description' && bestDescription === '') {
          bestDescription = content;
        }
      }
    }
  }

  if (bestDescription === '' && descriptions.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    bestDescription = descriptions[0][1];
  }

  return [data, bestDescription];
}

function getOpenGraphData() {
  const properties = ['title', 'type', 'image', 'url', 'description'];
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

const stopPropagationFuncTemp = Event.prototype.stopPropagation;
Event.prototype.stopPropagation = () => {
  stopPropagationFuncTemp.apply(this);
  ipcRenderer.send('log-data', 'prop');
};

window.addEventListener('DOMContentLoaded', () => {
  const meta = getMeta();
  const metaDescription = meta[1];
  ipcRenderer.send('meta-info', meta[0]);
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
  const maxLength = 250;
  const openGraphData = getOpenGraphData();
  let output =
    typeof openGraphData.description === 'undefined'
      ? `${metaDescription} `
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
  output = output.replace(/\r\n|\r|\n/i, ' ');
  output = removeChars(
    ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890()-+=/',
    output
  );

  ipcRenderer.send('scrape-data', output);

  genTriggers();

  const interactions = [
    'mousewheel',
    'onmousemove',
    'onmousedown',
    'onmouseup',
    'onpointermove',
    'onpointerdown',
    'onpointerup',
    'onkeydown',
    'onkeyup',
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
  interactions.forEach((interaction) => {
    document.addEventListener(interaction, () => {
      ipcRenderer.send('interact');
    });
  });
});
