import assert from 'node:assert/strict';

export async function probarPlancha(page){
  await page.getByRole('link',{name:'Planchas',exact:true}).click();
  const frame=page.frameLocator('.armador-frame');
  const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=200;c.height=120;
    const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,200,120);
    ctx.fillStyle='red';ctx.fillRect(30,30,140,60);return c.toDataURL().split(',')[1];
  });
  await frame.locator('#files').setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await frame.locator('summary').click();await frame.locator('[data-action=auto]').click();
  await frame.locator('[data-k=border]').selectOption('on');
  await frame.locator('#status').filter({hasText:/1 diseños · 1 copias/}).waitFor();
  const counts=await frame.locator('#status').innerText();assert.match(counts,/1 diseños · 1 copias/);
  await frame.locator('#space').selectOption('spread');assert.equal(await frame.locator('#status').innerText(),counts);
  const pending=page.waitForEvent('download');await frame.locator('#download').click();
  const stream=await (await pending).createReadStream();const chunks=[];for await(const bytes of stream)chunks.push(bytes);
  const data=Buffer.concat(chunks);assert.equal(data.readUInt32BE(16),2480);assert.equal(data.readUInt32BE(20),3508);
  assert.equal(data.readUInt32BE(41),11811);
  await frame.locator('#save').click();await frame.getByText('Plancha guardada en este dispositivo.').waitFor();
  await page.reload();await frame.getByText('prueba.png',{exact:true}).waitFor();
  assert.equal(await frame.locator('[data-k=border]').inputValue(),'on');
  const batch=Array.from({length:44},(_,i)=>({name:'foto-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}));
  await frame.locator('#files').setInputFiles(batch);
  await frame.locator('#status').filter({hasText:/45 diseños · 45 copias/}).waitFor();
  assert.ok(await frame.locator('#page option').count()>1);
  await frame.locator('[data-k=cm]').first().fill('8');
  await frame.locator('[data-k=cm]').first().press('Tab');
  await frame.locator('#maxCm').fill('3');
  await frame.locator('#maxCm').press('Tab');
  await frame.locator('#download:enabled').waitFor();
  assert.equal(await frame.locator('[data-k=cm]').first().inputValue(),'8');
  assert.equal(await frame.locator('[data-k=cm]').nth(1).inputValue(),'');
}
