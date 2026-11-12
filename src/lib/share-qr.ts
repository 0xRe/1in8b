import qrcode from 'qrcode-generator';
/** Entirely local: no image service receives the invitation or game data. */
export function shareQrMatrix(url:string):boolean[][]{
 const qr=qrcode(0,'M');qr.addData(url);qr.make();
 const count=qr.getModuleCount();return Array.from({length:count},(_,row)=>Array.from({length:count},(_,col)=>qr.isDark(row,col)));
}
export function drawShareQr(ctx:CanvasRenderingContext2D,url:string,x:number,y:number,size:number){
 const matrix=shareQrMatrix(url),quiet=4,cells=matrix.length+quiet*2;
 ctx.save();ctx.fillStyle='#ffffff';ctx.fillRect(x,y,size,size);ctx.fillStyle='#13212a';
 for(let row=0;row<matrix.length;row++)for(let col=0;col<matrix.length;col++)if(matrix[row][col]){
  const left=Math.round(x+(col+quiet)*size/cells),top=Math.round(y+(row+quiet)*size/cells);
  ctx.fillRect(left,top,Math.round(x+(col+quiet+1)*size/cells)-left,Math.round(y+(row+quiet+1)*size/cells)-top);
 }
 ctx.restore();
}
