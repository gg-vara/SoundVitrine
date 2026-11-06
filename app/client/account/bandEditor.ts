// Choosing the colors of the user's animated band, on the account page
import { waitTransitionEnd } from '../shell/waiting';
import { bandRule, colorsOfGradient } from './bandColors';

const STYLE_ID = 'bbStyle';

// kept when the account panel loads the page again, as it stays for the rest of the page's life
function bandStyle(): HTMLElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing) return existing;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.body.appendChild(style);
  return style;
}

export function startBandEditor(elementId: string) {
  const editor = document.getElementById(elementId);
  if (!editor) return;

  const siblings = [...(editor.parentElement?.children ?? [])].filter(element => element !== editor) as HTMLElement[];
  const colorPicker = editor.querySelector('.colorPicker') as HTMLElement;
  const pickers = [...colorPicker.querySelectorAll<HTMLInputElement>('.colors > *')];
  const band = editor.querySelector('.wAnim') as HTMLElement;
  const style = bandStyle();

  let saved = colorsOfGradient(getComputedStyle(band, '::after').backgroundImage);

  // the pickers go the other way around
  const picked = () => pickers.map(picker => picker.value).reverse();

  function show(colors: string[]) {
    [...colors].reverse().forEach((color, index) => {
      const picker = pickers[index];
      if (picker) picker.value = color;
    });
    style.textContent = bandRule(band.dataset.owner ?? '', colors);
  }

  const siblingsDone = (change: (sibling: HTMLElement) => void) =>
    Promise.all(siblings.map(sibling => waitTransitionEnd(sibling, () => change(sibling))));

  function open() {
    editor?.removeEventListener('click', open);
    void siblingsDone(sibling => {
      sibling.style.pointerEvents = 'none';
      sibling.style.opacity = '0';
    }).then(() => editor?.classList.add('open'));
  }

  async function close() {
    await waitTransitionEnd(colorPicker, () => editor?.classList.remove('open'));
    show(saved);
    await siblingsDone(sibling => {
      sibling.style.pointerEvents = '';
      sibling.style.opacity = '';
    });
    editor?.addEventListener('click', open);
  }

  for (const picker of pickers) picker.addEventListener('change', () => show(picked()));

  (editor.querySelector('.validate') as HTMLElement).addEventListener('click', () => {
    saved = picked();
    fetch('/account/bb', { method: 'POST', body: JSON.stringify(saved) }).catch(error => {
      console.error('The colors could not be saved', error);
    });
    void close();
  });
  (editor.querySelector('.cancel') as HTMLElement).addEventListener('click', () => void close());

  show(saved);
  editor.addEventListener('click', open);
}
