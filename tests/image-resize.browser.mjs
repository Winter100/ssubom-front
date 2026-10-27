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
const requests=[];
const alerts=[];
const stageRequests=[];
let failingStage;
let uploadGate;
socket.addEventListener('message',async event=>{
  const message=JSON.parse(event.data);
  if(message.method!=='Page.javascriptDialogOpening')return;
  alerts.push(message.params.message);
  await send('Page.handleJavaScriptDialog',{accept:true});
});
socket.addEventListener('message',async event=>{
 const m=JSON.parse(event.data);if(m.method!=='Fetch.requestPaused')return;
 const {requestId,request}=m.params;
 const url=new URL(request.url);
 let response;
 let stage;
 if(request.method==='OPTIONS')response={};
 else if(request.method==='POST' && url.pathname.endsWith('/storage/presigned-url')){
 stage='issue';
 const payload=JSON.parse(request.postData);response=payload.images.map((image,index)=>({clientId:image.clientId,key:'resize-test-'+index,url:'http://localhost:3000/__resize_test_upload/'+index}));
 } else if(url.pathname.startsWith('/__resize_test_upload/')){
   stage='upload';
   if(uploadGate)await uploadGate;
   response={};
 }
 else if(request.method==='POST' && url.pathname.endsWith('/reviews')){stage='review';requests.push(JSON.parse(request.postData));response={id:999};}
 else {await send('Fetch.continueRequest',{requestId});return;}
 if(stage)stageRequests.push(stage);
 if(stage && stage===failingStage)response={message:`${stage} failure`};
 await send('Fetch.fulfillRequest',{requestId,responseCode:stage && stage===failingStage ? 400 : 200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://localhost:3000'},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'content-type,authorization'},{name:'Access-Control-Allow-Methods',value:'POST,PUT,OPTIONS'}],body:Buffer.from(JSON.stringify(response)).toString('base64')});
});
const imageSelector = '.ProseMirror img';
const dimensions = () => evaluate(`(() => {
  const img=document.querySelector('${imageSelector}');
  return {width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height};
})()`);
const drag = async (direction, sign) => {
  const handle = `[data-resize-handle="${direction}"]`;
  const {x,y,width,height} = await point(handle);
  assert(width>0 && height>0, `${direction} must be grabbable`);
  const dx = direction.includes('left') ? -60*sign : direction.includes('right') ? 60*sign : 0;
  const dy = direction.includes('top') ? -30*sign : direction.includes('bottom') ? 30*sign : 0;
  await mouse('mousePressed',x,y,{button:'left',clickCount:1});
  for (let step=1;step<=5;step++) {
    await mouse('mouseMoved',x+dx*step/5,y+dy*step/5,{button:'left',buttons:1});
  }
  await mouse('mouseReleased',x+dx,y+dy,{button:'left',clickCount:1});
};
try {
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', {cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride', {width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate', {url:'http://localhost:3000/reviews/new'});
  await waitFor(`document.querySelector('.ProseMirror')?.editor`);
  await evaluate(`(async () => {
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=400;
    const ctx=canvas.getContext('2d');ctx.fillStyle='orange';ctx.fillRect(0,0,800,400);
    const editor=document.querySelector('.ProseMirror').editor;
    editor.chain().setContent({type:'doc',content:[
      {type:'paragraph',content:[{type:'text',text:'before image'}]},
      {type:'paragraph',content:[{type:'text',text:'after image'}]}
    ]}).setTextSelection(13).run();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve));
    const transfer=new DataTransfer();transfer.items.add(new File([blob],'resize.png',{type:'image/png'}));
    const input=document.querySelector('input[type=file].hidden');
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(requestAnimationFrame);
    return editor.getJSON();
  })()`);
  await waitFor(`document.querySelector('.ProseMirror img')?.naturalWidth > 0`);
  assert.equal(await evaluate(`document.querySelector('.ProseMirror').editor.getJSON().content[1].attrs.width`),null);
  assert.equal(await evaluate(`document.querySelector('.ProseMirror').editor.getJSON().content[1].attrs.height`),null);
  await click(imageSelector);
  assert.equal(await evaluate(`document.querySelector('[data-node="image"]').classList.contains('ProseMirror-selectednode')`),true);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-resize-wrapper]')).outlineWidth`),'1px');
  assert.equal(await evaluate(`document.querySelectorAll('[data-resize-handle]').length`),1);
  const handles = await evaluate(`(() => {
    const image = document.querySelector('.ProseMirror img').getBoundingClientRect();
    return [...document.querySelectorAll('[data-resize-handle]')].map((handle) => {
      const rect = handle.getBoundingClientRect();
      const style = getComputedStyle(handle);
      const direction = handle.dataset.resizeHandle;
      return {
        direction, width:rect.width, height:rect.height,
        background:style.backgroundColor, radius:style.borderRadius,
        x:rect.x+rect.width/2, y:rect.y+rect.height/2,
        expectedX:direction.includes('left') ? image.left : direction.includes('right') ? image.right : image.x+image.width/2,
        expectedY:direction.includes('top') ? image.top : direction.includes('bottom') ? image.bottom : image.y+image.height/2,
      };
    });
  })()`);
  for (const handle of handles) {
    assert.equal(handle.width,10);
    assert.equal(handle.height,10);
    assert.equal(handle.background,'rgb(255, 255, 255)');
    assert.equal(handle.radius,'0px');
    assert(Math.abs(handle.x-handle.expectedX)<1, `${handle.direction} horizontal placement`);
    assert(Math.abs(handle.y-handle.expectedY)<1, `${handle.direction} vertical placement`);
  }
  for (const direction of ['bottom-right']) {

    const before=await dimensions();
    await drag(direction,-1);
    const smaller=await dimensions();
    assert(smaller.width < before.width-10, `${direction} shrinks: ${JSON.stringify({before,smaller})}`);
    await drag(direction,1);
    const larger=await dimensions();
    assert(larger.width > smaller.width+10, `${direction} grows`);
    assert(Math.abs(larger.width/larger.height-2)<0.02, `${direction} keeps aspect ratio`);
    const attrs=await evaluate(`document.querySelector('.ProseMirror').editor.getJSON().content[1].attrs`);
    assert(Math.abs(attrs.width-larger.width)<1);
    assert(Math.abs(attrs.height-larger.height)<1);
    console.log(`PASS ${direction}: ${before.width} -> ${smaller.width} -> ${larger.width}`);
  }
  await click('.ProseMirror p');
  assert.equal(await evaluate(`document.querySelector('[data-node="image"]').classList.contains('ProseMirror-selectednode')`),false);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-resize-handle]')).display`),'none');
  assert.equal(await evaluate(`document.querySelector('.ProseMirror').editor.getText().includes('before image') && document.querySelector('.ProseMirror').editor.getText().includes('after image')`),true);
  await click(imageSelector);
  assert.equal(await evaluate(`document.querySelector('[data-node="image"]').classList.contains('ProseMirror-selectednode')`),true);
  await drag('bottom-right', -1);
  
  await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  for(const max of [100,80,30]){await click('input[maxlength="'+max+'"]');await send('Input.insertText',{text:'test'});}
  const selectedCategoryId = await evaluate(`(() => {
    const select = document.querySelector('select');
    select.value = select.options[2].value;
    select.dispatchEvent(new Event('change', {bubbles:true}));
    return Number(select.value);
  })()`);
  await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='\uC804\uC1A1').id='resize-test-submit'`);
  const decreaseRating = 'button[aria-label="평점 0.1점 낮추기"]';
  const increaseRating = 'button[aria-label="평점 0.1점 높이기"]';
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(decreaseRating)}).disabled`),true);
  for (let count=0;count<3;count++) await click(increaseRating);
  assert.equal(await evaluate(`document.querySelector('#review-rating').value`),'0.3');
  await click(decreaseRating);
  assert.equal(await evaluate(`document.querySelector('#review-rating').value`),'0.2');
  await evaluate(`document.querySelector('#review-rating').focus()`);
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});
  assert.equal(await evaluate(`document.querySelector('#review-rating').value`),'5');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(increaseRating)}).disabled`),true);
  await click(decreaseRating);
  assert.equal(await evaluate(`document.querySelector('#review-rating').value`),'4.9');
  await evaluate(`document.querySelector('#review-rating').focus()`);
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  assert.equal(await evaluate(`document.querySelector('#review-rating').value`),'0');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(decreaseRating)}).disabled`),true);
  let releaseUpload;
  uploadGate=new Promise(resolve=>{releaseUpload=resolve;});
  await click('#resize-test-submit');
  await waitFor(`document.querySelector('#resize-test-submit').disabled`);
  assert.equal(requests.length,0);
  await click('#resize-test-submit');
  assert.equal(requests.length,0);
  releaseUpload();
  uploadGate=undefined;
  for(let i=0;i<80 && !requests.length;i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(requests.length,1);
  assert.equal(requests[0].categoryId,selectedCategoryId);
  assert.equal(requests[0].rating,0);
  assert.equal(await evaluate(`!!document.querySelector('#review-rating-error')`),false);
  assert.equal('category' in requests[0],false);
  const displayed = await dimensions();
  const submittedImage = requests[0].body.content[1].attrs;
  assert.equal(submittedImage.src,'resize-test-0');
  assert.equal(requests[0].mainImageKey,null);
  assert.deepEqual(requests[0].subImageKeys,['resize-test-0']);
  assert(Math.abs(submittedImage.width-displayed.width)<1);
  assert(Math.abs(submittedImage.height-displayed.height)<1);
  assert.equal(requests[0].body.content[0].content[0].text,'before image');
  assert.equal(requests[0].body.content[2].content[0].text,'after image');
  await waitFor(`!document.querySelector('#resize-test-submit').disabled`);
  assert.deepEqual(alerts,[]);
  for(const stage of ['issue','upload','review']){
    failingStage=stage;
    const alertCount=alerts.length;
    const requestCount=stageRequests.length;
    const reviewCount=requests.length;
    await click('#resize-test-submit');
    for(let attempt=0;attempt<80 && alerts.length===alertCount;attempt++){
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    await waitFor(`!document.querySelector('#resize-test-submit').disabled`);
    assert.deepEqual(alerts.slice(alertCount),[`${stage} failure`]);
    assert.deepEqual(stageRequests.slice(requestCount),
      stage==='issue' ? ['issue'] : stage==='upload' ? ['issue','upload'] : ['issue','upload','review']);
    assert.equal(requests.length,reviewCount+(stage==='review' ? 1 : 0));
  }
  failingStage=undefined;
  console.log('PASS mutation pending state, duplicate-click prevention, and one alert per failed stage');
  await evaluate(`(() => {
    const editor = document.querySelector('.ProseMirror').editor;
    const source = editor.getJSON().content[1].attrs.src;
    const saved = JSON.parse(${JSON.stringify(JSON.stringify(requests[0].body))});
    // Storage keys are resolved to display URLs before rendering a saved body.
    saved.content[1].attrs.src = source;
    editor.commands.clearContent();
    editor.setEditable(false);
    editor.commands.setContent(saved);
  })()`);
  await waitFor(`document.querySelector('.ProseMirror img')?.naturalWidth > 0`);
  const restored = await dimensions();
  assert(Math.abs(restored.width-displayed.width)<1);
  assert(Math.abs(restored.height-displayed.height)<1);
  console.log(`PASS real file insertion, submit payload, and read-only reload: ${submittedImage.width}x${submittedImage.height}`);
  await send('Fetch.disable');
  console.log('PASS selection, deselection, bottom-right-only resizing, aspect ratio, saved dimensions, surrounding text');
} finally {
  await send('Fetch.disable');
  socket.close();
}
