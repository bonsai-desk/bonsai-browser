import { makeAutoObservable } from 'mobx';
import { ipcRenderer } from 'electron';

export interface Author {
  name: string;
}

type Data = [string, string][];

function authors(data: Data): Author[] {
  const authorEntries = data.filter((entry) => entry[0] === 'citation_author');
  return authorEntries.map((entry) => ({
    name: entry[1],
  }));
}

function abstract(data: Data): string {
  const abstracts = data.filter((entry) => entry[0] === 'citation_abstract');
  if (abstracts.length > 0) {
    return abstracts[0][1];
  }
  return '';
}

function title(data: Data): string {
  const titles = data.filter((entry) => entry[0] === 'citation_title');
  if (titles.length > 0) {
    return titles[0][1];
  }
  return '';
}

export default class MetaStore {
  authors: Author[] = [];

  abstract = '';

  title = '';

  constructor() {
    makeAutoObservable(this);
    ipcRenderer.on('meta-info', (_, data) => {
      console.log(data);
      this.title = title(data);
      this.authors = authors(data);
      this.abstract = abstract(data);
    });
  }
}
