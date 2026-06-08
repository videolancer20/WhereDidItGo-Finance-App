const fs = require('fs');
const p = require('path');
const lucide = require('lucide-react');
const icons = Object.keys(lucide);
let missing = [];
function check(dir){
  fs.readdirSync(dir).forEach(f => {
    const full = p.join(dir,f);
    if(fs.statSync(full).isDirectory()) check(full);
    else if(full.endsWith('.tsx') || full.endsWith('.ts')){
      const text = fs.readFileSync(full,'utf8');
      const match = text.match(/import\s+{([^}]+)}\s+from\s+["']lucide-react["']/);
      if(match){
        match[1].split(',').forEach(i => {
          const name = i.trim().split(/\s+as\s+/)[0];
          if(name && name !== 'lucide-react' && !icons.includes(name)) missing.push(name + ' in ' + f);
        });
      }
    }
  });
}
check('./src');
console.log('Missing:', missing);
