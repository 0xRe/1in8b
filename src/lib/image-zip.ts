/** Small, uncompressed ZIP writer for locally generated PNGs. No server or extra dependency. */
export function imageZip(entries:readonly {name:string;data:Uint8Array}[]):Uint8Array{
 if(!entries.length||entries.length>10)throw Error('Invalid image count');
 const encoder=new TextEncoder(),locals:Uint8Array[]=[],central:Uint8Array[]=[];
 let offset=0;
 for(const entry of entries){
  if(!/^[a-zA-Z0-9_-]+\.png$/.test(entry.name)||entry.data.length>32_000_000)throw Error('Invalid image entry');
  const name=encoder.encode(entry.name),crc=crc32(entry.data),local=new Uint8Array(30+name.length+entry.data.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,entry.data.length,true);v.setUint32(22,entry.data.length,true);v.setUint16(26,name.length,true);local.set(name,30);local.set(entry.data,30+name.length);
  const directory=new Uint8Array(46+name.length),d=new DataView(directory.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,entry.data.length,true);d.setUint32(24,entry.data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);directory.set(name,46);
  locals.push(local);central.push(directory);offset+=local.length;
 }
 const directorySize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,directorySize,true);v.setUint32(16,offset,true);
 const result=new Uint8Array(offset+directorySize+end.length);let at=0;for(const part of [...locals,...central,end]){result.set(part,at);at+=part.length;}return result;
}
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data:Uint8Array){let crc=0xffffffff;for(const byte of data)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
