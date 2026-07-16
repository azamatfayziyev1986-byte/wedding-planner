const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk(path.join(__dirname, 'frontend', 'src'));
let replacedCount = 0;

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('http://localhost:5000')) {
    const newContent = content.replace(/http:\/\/localhost:5000/g, '');
    fs.writeFileSync(file, newContent, 'utf8');
    replacedCount++;
  }
});

console.log(`Replaced hardcoded localhost URL in ${replacedCount} files.`);
