// Ejecutar localmente. No subir ni compartir el resultado: contiene secretos.
import {webcrypto} from 'node:crypto';
const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const jwk=await webcrypto.subtle.exportKey('jwk',pair.privateKey),raw=await webcrypto.subtle.exportKey('raw',pair.publicKey);console.log(JSON.stringify({ACCESS_KEY:Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url'),VAPID_PUBLIC_KEY:Buffer.from(raw).toString('base64url'),VAPID_PRIVATE_JWK:JSON.stringify(jwk)},null,2));
