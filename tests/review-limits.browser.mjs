import assert from 'node:assert/strict';

// Run with a dedicated headless Chromium/Edge profile exposing CDP on port 9227.
const tabs = await (await fetch('http://localhost:9227/json/list')).json();
const socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const response = JSON.parse(event.data);
  if (!response.id) return;
  const task = pending.get(response.id);
  pending.delete(response.id);
  if (response.error) task.reject(new Error(response.error.message));
  else task.resolve(response.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
  pending.set(id, {
    resolve: (result) => { clearTimeout(timeout); resolve(result); },
    reject: (error) => { clearTimeout(timeout); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out: ${expression}`);
};
const point = async (selector) => evaluate(`(async () => {
  const element = document.querySelector(${JSON.stringify(selector)});
  element.scrollIntoView({block:'center',behavior:'instant'});
  await new Promise(requestAnimationFrame);
  const rect = element.getBoundingClientRect();
  return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,width:rect.width,height:rect.height};
})()`);
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, ...extra });
const click = async (selector) => {
  const {x,y} = await point(selector);
  await mouse('mousePressed',x,y,{button:'left',clickCount:1});
  await mouse('mouseReleased',x,y,{button:'left',clickCount:1});
  await evaluate('new Promise(requestAnimationFrame)');
};

try {
  await send('Network.enable');
  await send('Network.setCacheDisabled', {cacheDisabled:true});
  await send('Page.navigate', {url:'http://localhost:3000/reviews/new'});
  await waitFor(`document.querySelector('.ProseMirror')?.editor`);
  await evaluate(`document.querySelector('.ProseMirror').editor.commands.clearContent()`);
  await waitFor(`document.querySelector('#review-body-image-count').textContent.includes('0/10')`);
  await evaluate(`(async () => {
    const canvas=document.createElement('canvas');canvas.width=80;canvas.height=40;
    const context=canvas.getContext('2d');context.fillStyle='orange';context.fillRect(0,0,80,40);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve));
    window.addLimitImage=()=>{
      const editor=document.querySelector('.ProseMirror').editor;
      editor.chain().insertContentAt(editor.state.doc.content.size,{type:'paragraph'}).focus('end').run();
      const transfer=new DataTransfer();
      transfer.items.add(new File([blob],'limit.png',{type:'image/png'}));
      const input=document.querySelector('input[type=file].hidden');
      input.files=transfer.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    };
  })()`);
  for(let count=1;count<=10;count++){
    await evaluate(`window.addLimitImage()`);
    await waitFor(`document.querySelector('#review-body-image-count').textContent.includes('${count}/10')`);
  }
  assert.equal(await evaluate(`document.querySelector('input[type=file].hidden').disabled`),true);
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.includes('이미지')).disabled`),true);
  await evaluate(`window.addLimitImage()`);
  assert.equal(await evaluate(`document.querySelectorAll('.ProseMirror img').length`),10);
  await evaluate(`(() => {
    const editor=document.querySelector('.ProseMirror').editor;
    let position;
    editor.state.doc.descendants((node,pos)=>{if(position===undefined && node.type.name==='image')position=pos;});
    editor.chain().setNodeSelection(position).deleteSelection().run();
  })()`);
  await waitFor(`document.querySelector('#review-body-image-count').textContent.includes('9/10')`);
  assert.equal(await evaluate(`document.querySelector('input[type=file].hidden').disabled`),false);
  await evaluate(`document.querySelector('.ProseMirror').editor.commands.undo()`);
  await waitFor(`document.querySelector('#review-body-image-count').textContent.includes('10/10')`);
  await evaluate(`document.querySelector('.ProseMirror').editor.commands.redo()`);
  await waitFor(`document.querySelector('#review-body-image-count').textContent.includes('9/10')`);
  await evaluate(`window.addLimitImage()`);
  await waitFor(`document.querySelector('#review-body-image-count').textContent.includes('10/10')`);
  await evaluate(`(() => {
    const element=document.querySelector('.ProseMirror');
    const source=element.querySelector('img').src;
    element.editor.commands.focus('end');
    const clipboardData=new DataTransfer();
    clipboardData.setData('text/html','<img src="'+source+'">');
    element.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));
  })()`);
  await evaluate('new Promise(requestAnimationFrame)');
  assert.equal(await evaluate(`document.querySelectorAll('.ProseMirror img').length`),10);
  await click('textarea');
  await send('Input.insertText',{text:'가'.repeat(30)});
  await waitFor(`document.querySelector('#review-verdict-count').textContent.includes('30/500')`);
  await send('Input.insertText',{text:'가'.repeat(600)});
  assert.equal(await evaluate(`document.querySelector('textarea').value.length`),500);
  await waitFor(`document.querySelector('#review-verdict-count').textContent.includes('500/500')`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  await waitFor(`document.querySelector('#review-verdict-count').textContent.includes('499/500')`);
  console.log('PASS image limit, counter, removal, undo/redo, paste limit, and recommendation character count');
} finally {
  socket.close();
}
