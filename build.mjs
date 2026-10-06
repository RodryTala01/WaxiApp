import {createHash} from 'node:crypto';
import {mkdir,copyFile,cp,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});for(const file of ['index.html','generar-claves.html','styles.css','app.js','core.js','storage.js','selectores.js','documentos.js','sw.js','manifest.webmanifest'])await copyFile(file,'dist/'+file);await cp('assets','dist/assets',{recursive:true});

const hash=createHash('sha256');for(const file of ['app.js','styles.css','core.js','storage.js','selectores.js','documentos.js'])hash.update(await readFile(file));const sw=await readFile('sw.js','utf8');await writeFile('dist/sw.js',sw.replace('waxi-v1','waxi-'+hash.digest('hex').slice(0,12)));
