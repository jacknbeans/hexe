'use babel';

import {readFile} from './json'

export default class HexeView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('hexe');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The Hexe package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);

    readFile();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
