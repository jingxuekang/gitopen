const fs=require('fs') 
const file=process.argv[2] 
const start=Number(process.argv[3]) 
const end=Number(process.argv[4]) 
const lines=fs.readFileSync(file,'utf8').split(/\r?\n/) 
for(let i=start;i<=end;i++){const l=lines[i-1];if(l!==undefined) console.log(i+': '+l)} 
